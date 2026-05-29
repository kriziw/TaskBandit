import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AppConfigService } from '../../common/config/app-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ControlPlaneManagementService } from '../../common/tenancy/control-plane-management.service';
import { SmtpService } from '../settings/smtp.service';
import { BootstrapService } from '../bootstrap/bootstrap.service';
import { BetaSignupRepository } from './beta-signup.repository';
import { GraduateBetaTenantsDto } from './dto/graduate-beta-tenants.dto';
import { ReviewBetaSignupDto } from './dto/review-beta-signup.dto';
import { SubmitBetaSignupDto } from './dto/submit-beta-signup.dto';
import { UpdateBetaSignupSettingsDto } from './dto/update-beta-signup-settings.dto';
import { UpdateTenantPackageDto } from './dto/update-tenant-package.dto';

@Injectable()
export class BetaSignupService {
  private readonly logger = new Logger(BetaSignupService.name);

  constructor(
    private readonly repository: BetaSignupRepository,
    private readonly bootstrapService: BootstrapService,
    private readonly controlPlaneManagement: ControlPlaneManagementService,
    private readonly smtpService: SmtpService,
    private readonly appConfigService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public signup submission
  // ---------------------------------------------------------------------------

  async submitRequest(dto: SubmitBetaSignupDto) {
    if (!this.appConfigService.betaSignupEnabled) {
      throw new ServiceUnavailableException({
        code: 'beta_signup_not_enabled',
        message: 'Beta signup is not currently available.',
      });
    }

    const existing = await this.repository.findByEmail(dto.email);
    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      throw new ConflictException({
        code: 'beta_signup_already_submitted',
        message: 'A signup request for this email already exists.',
      });
    }

    const request = await this.repository.createRequest(dto);

    this.sendConfirmationEmail(request.email, request.displayName).catch((error: unknown) => {
      this.logger.warn(
        `Failed to send confirmation email to ${request.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    return { id: request.id, status: request.status };
  }

  // ---------------------------------------------------------------------------
  // Admin — list requests
  // ---------------------------------------------------------------------------

  async listRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.repository.listRequests(status);
  }

  // ---------------------------------------------------------------------------
  // Admin — review (approve / reject)
  // ---------------------------------------------------------------------------

  async reviewRequest(id: string, dto: ReviewBetaSignupDto) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundException({ code: 'beta_signup_not_found', message: 'Request not found.' });
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException({
        code: 'beta_signup_already_reviewed',
        message: 'This request has already been reviewed.',
      });
    }

    if (dto.action === 'reject') {
      const updated = await this.repository.markRejected(id, dto.rejectionReason);
      this.sendRejectionEmail(request.email, request.displayName, dto.rejectionReason).catch(
        (error: unknown) => {
          this.logger.warn(
            `Failed to send rejection email to ${request.email}: ${error instanceof Error ? error.message : String(error)}`,
          );
        },
      );
      return updated;
    }

    // --- Approve ---

    const settings = await this.repository.getSettings();
    const packageCode = dto.packageCode?.trim() || settings.defaultPackageCode;

    // 1. Provision tenant + household + owner user
    const placeholderPassword = randomBytes(32).toString('hex');
    const provisioned = await this.bootstrapService.provisionHostedHousehold(
      {
        householdName: request.householdName,
        ownerDisplayName: request.displayName,
        ownerEmail: request.email,
        ownerPassword: placeholderPassword,
        selfSignupEnabled: false,
      },
      'en',
    );

    const tenantId = provisioned.householdId; // householdId == tenantId by convention
    const owner = provisioned.members[0];

    // 2. Tag the tenant as beta
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isBeta: true, betaSignupRequestId: request.id },
    });

    // 3. Register on control plane (best-effort)
    await this.controlPlaneManagement.provisionTenant(tenantId, packageCode);

    // 4. Create invite token (72 h TTL)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAtUtc = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const identity = await this.prisma.authIdentity.findFirst({
      where: { userId: owner.id },
    });

    if (identity) {
      await this.prisma.passwordResetToken.create({
        data: { authIdentityId: identity.id, tokenHash, expiresAtUtc },
      });
    }

    // 5. Record approval
    const updated = await this.repository.markApproved(id, tenantId, packageCode);

    // 6. Send invite email (fire-and-forget; always log raw token as fallback)
    const inviteUrl = `${this.appConfigService.publicWebBaseUrl}/set-password?token=${encodeURIComponent(rawToken)}`;
    this.logger.warn(
      `[beta-signup] Invite token for ${request.email} (tenant ${tenantId}): ${rawToken} — url: ${inviteUrl}`,
    );
    this.sendApprovalEmail(request.email, request.displayName, inviteUrl).catch(
      (error: unknown) => {
        this.logger.warn(
          `Failed to send approval email to ${request.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Admin — settings
  // ---------------------------------------------------------------------------

  async getSettings() {
    const settings = await this.repository.getSettings();
    const availablePackages = await this.controlPlaneManagement.listAvailablePackages();
    return { ...settings, availablePackages };
  }

  async updateSettings(dto: UpdateBetaSignupSettingsDto) {
    return this.repository.updateSettings(dto.defaultPackageCode);
  }

  // ---------------------------------------------------------------------------
  // Admin — per-tenant package update
  // ---------------------------------------------------------------------------

  async updateTenantPackage(requestId: string, dto: UpdateTenantPackageDto) {
    const request = await this.repository.findById(requestId);
    if (!request || request.status !== 'APPROVED' || !request.provisionedTenantId) {
      throw new NotFoundException({
        code: 'beta_signup_not_found',
        message: 'Approved beta signup request with provisioned tenant not found.',
      });
    }

    const error = await this.controlPlaneManagement.updateTenantPackage(
      request.provisionedTenantId,
      dto.packageCode,
    );

    if (error) {
      throw new ConflictException({
        code: 'control_plane_update_failed',
        message: `Failed to update package on control plane: ${error}`,
      });
    }

    // Update the stored packageCode for audit purposes
    return this.prisma.betaSignupRequest.update({
      where: { id: requestId },
      data: { packageCode: dto.packageCode },
    });
  }

  // ---------------------------------------------------------------------------
  // Admin — graduate beta tenants
  // ---------------------------------------------------------------------------

  async graduateBetaTenants(dto: GraduateBetaTenantsDto) {
    const where = {
      isBeta: true,
      ...(dto.tenantIds?.length ? { id: { in: dto.tenantIds } } : {}),
    };

    const betaTenants = await this.prisma.tenant.findMany({ where });

    const succeeded: string[] = [];
    const failed: Array<{ tenantId: string; reason: string }> = [];

    await Promise.all(
      betaTenants.map(async (tenant) => {
        const error = await this.controlPlaneManagement.updateTenantPackage(
          tenant.id,
          dto.targetPackageCode,
        );
        if (error) {
          failed.push({ tenantId: tenant.id, reason: error });
        } else {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { isBeta: false },
          });
          // Keep packageCode in BetaSignupRequest up to date
          await this.prisma.betaSignupRequest.updateMany({
            where: { provisionedTenantId: tenant.id },
            data: { packageCode: dto.targetPackageCode },
          });
          succeeded.push(tenant.id);
        }
      }),
    );

    return { succeeded, failed };
  }

  // ---------------------------------------------------------------------------
  // Email helpers
  // ---------------------------------------------------------------------------

  private async sendConfirmationEmail(to: string, displayName: string) {
    const smtp = this.appConfigService.systemSmtpConfig;
    if (!smtp) {
      this.logger.warn(`System SMTP not configured — skipping confirmation email to ${to}`);
      return;
    }
    await this.smtpService.sendMail(smtp, {
      to,
      subject: "We received your TaskBandit beta signup request",
      text: `Hi ${displayName},\n\nThanks for signing up for the TaskBandit beta! We've received your request and will review it shortly.\n\nWe'll email you once a decision has been made.\n\n— The TaskBandit Team`,
      html: `<p>Hi ${escapeHtml(displayName)},</p>
<p>Thanks for signing up for the TaskBandit beta! We've received your request and will review it shortly.</p>
<p>We'll email you once a decision has been made.</p>
<p>— The TaskBandit Team</p>`,
    });
  }

  private async sendApprovalEmail(to: string, displayName: string, inviteUrl: string) {
    const smtp = this.appConfigService.systemSmtpConfig;
    if (!smtp) {
      this.logger.warn(`System SMTP not configured — skipping approval email to ${to}`);
      return;
    }
    await this.smtpService.sendMail(smtp, {
      to,
      subject: "You're in — set up your TaskBandit account",
      text: `Hi ${displayName},\n\nGreat news — your TaskBandit beta signup has been approved!\n\nClick the link below to set your password and get started. This link expires in 72 hours.\n\n${inviteUrl}\n\n— The TaskBandit Team`,
      html: `<p>Hi ${escapeHtml(displayName)},</p>
<p>Great news — your TaskBandit beta signup has been approved!</p>
<p>Click the link below to set your password and get started. This link expires in 72 hours.</p>
<p><a href="${inviteUrl}">${inviteUrl}</a></p>
<p>— The TaskBandit Team</p>`,
    });
  }

  private async sendRejectionEmail(to: string, displayName: string, reason?: string) {
    const smtp = this.appConfigService.systemSmtpConfig;
    if (!smtp) {
      this.logger.warn(`System SMTP not configured — skipping rejection email to ${to}`);
      return;
    }
    const reasonHtml = reason
      ? `<p>Reason: ${escapeHtml(reason)}</p>`
      : '';
    await this.smtpService.sendMail(smtp, {
      to,
      subject: 'Your TaskBandit beta signup request',
      text: `Hi ${displayName},\n\nThank you for your interest in the TaskBandit beta. Unfortunately we're unable to approve your request at this time.\n${reason ? `\nReason: ${reason}\n` : ''}\n— The TaskBandit Team`,
      html: `<p>Hi ${escapeHtml(displayName)},</p>
<p>Thank you for your interest in the TaskBandit beta. Unfortunately we're unable to approve your request at this time.</p>
${reasonHtml}
<p>— The TaskBandit Team</p>`,
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
