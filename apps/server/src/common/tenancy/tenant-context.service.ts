import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AppConfigService } from "../config/app-config.service";

export type ResolvedTenantContext = {
  tenantId: string;
  householdId: string;
  slug: string;
  displayName: string;
  source: "hosted_env" | "hostname" | "self_hosted_default";
};

type TenantRecord = {
  id: string;
  slug: string;
  displayName: string;
  household: {
    id: string;
  } | null;
};

@Injectable()
export class TenantContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService
  ) {}

  async resolveFromRequestHost(hostHeader?: string | null): Promise<ResolvedTenantContext> {
    if (this.appConfigService.hostedModeEnabled && this.appConfigService.hostedTenantId) {
      return this.mapTenantContext(
        await this.getTenantById(this.appConfigService.hostedTenantId),
        "hosted_env"
      );
    }

    const normalizedHost = this.normalizeHost(hostHeader);
    const slug = normalizedHost ? this.resolveSlugFromHost(normalizedHost) : null;
    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug },
        include: {
          household: {
            select: { id: true }
          }
        }
      });

      if (tenant?.household) {
        return this.mapTenantContext(tenant, "hostname");
      }
    }

    return this.mapTenantContext(await this.getDefaultTenant(), "self_hosted_default");
  }

  async resolveByTenantId(tenantId: string): Promise<ResolvedTenantContext> {
    return this.mapTenantContext(await this.getTenantById(tenantId), "hosted_env");
  }

  private async getDefaultTenant(): Promise<TenantRecord> {
    const tenant = await this.prisma.tenant.findFirst({
      orderBy: {
        createdAtUtc: "asc"
      },
      include: {
        household: {
          select: { id: true }
        }
      }
    });

    if (!tenant?.household) {
      throw new NotFoundException("No tenant is available yet.");
    }

    return tenant;
  }

  private async getTenantById(tenantId: string): Promise<TenantRecord> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        household: {
          select: { id: true }
        }
      }
    });

    if (!tenant?.household) {
      throw new NotFoundException("Tenant was not found.");
    }

    return tenant;
  }

  private mapTenantContext(
    tenant: TenantRecord,
    source: ResolvedTenantContext["source"]
  ): ResolvedTenantContext {
    return {
      tenantId: tenant.id,
      householdId: tenant.household!.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      source
    };
  }

  private normalizeHost(hostHeader?: string | null) {
    const host = String(hostHeader ?? "").trim().toLowerCase();
    if (!host) {
      return null;
    }

    return host.split(",")[0].trim().replace(/:\d+$/, "");
  }

  private resolveSlugFromHost(host: string) {
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return null;
    }

    const segments = host.split(".");
    if (segments.length < 3) {
      return null;
    }

    return segments[0];
  }
}
