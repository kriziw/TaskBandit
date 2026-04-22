import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantRequestContext } from "../http/request-url.util";
import { PrismaService } from "../prisma/prisma.service";
import { AppConfigService } from "../config/app-config.service";

export type ResolvedTenantContext = {
  tenantId: string;
  householdId: string;
  slug: string;
  displayName: string;
  source: "hosted_env" | "hostname" | "path" | "self_hosted_default";
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

  async resolveFromRequest(request?: TenantRequestContext | null): Promise<ResolvedTenantContext> {
    return this.resolveTenantContext(request);
  }

  async resolveFromRequestHost(hostHeader?: string | null): Promise<ResolvedTenantContext> {
    return this.resolveTenantContext({
      hostHeader
    });
  }

  private async resolveTenantContext(request?: TenantRequestContext | null): Promise<ResolvedTenantContext> {
    if (this.appConfigService.hostedModeEnabled && this.appConfigService.hostedTenantId) {
      return this.mapTenantContext(
        await this.getTenantById(this.appConfigService.hostedTenantId),
        "hosted_env"
      );
    }

    const normalizedHost = this.normalizeHost(request?.hostHeader);

    if (
      this.appConfigService.hostedModeEnabled &&
      this.appConfigService.hostedTenantRoutingMode === "path"
    ) {
      const pathSlug = this.resolveSlugFromPath(request?.originalUrl);
      if (pathSlug) {
        return this.mapTenantContext(await this.getTenantBySlug(pathSlug), "path");
      }

      if (normalizedHost && this.isConfiguredHostedPathHost(normalizedHost)) {
        throw new NotFoundException("Tenant was not found.");
      }
    }

    const slug = normalizedHost ? this.resolveSlugFromHost(normalizedHost) : null;
    if (slug) {
      return this.mapTenantContext(await this.getTenantBySlug(slug), "hostname");
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

  private async getTenantBySlug(slug: string): Promise<TenantRecord> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
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

  private resolveSlugFromPath(originalUrl?: string | null) {
    const pathname = this.normalizePathname(originalUrl);
    if (!pathname) {
      return null;
    }

    const match = pathname.match(
      new RegExp(
        `^${this.escapeRegExp(this.appConfigService.tenantPathPrefix)}/([a-z0-9][a-z0-9-]*)(?:/.*)?$`,
        "i"
      )
    );

    return match?.[1]?.toLowerCase() ?? null;
  }

  private normalizePathname(originalUrl?: string | null) {
    const rawValue = String(originalUrl ?? "").trim();
    if (!rawValue) {
      return null;
    }

    try {
      return new URL(rawValue, "http://taskbandit.local").pathname.replace(/\/+$/, "") || "/";
    } catch {
      return null;
    }
  }

  private isConfiguredHostedPathHost(host: string) {
    return [this.appConfigService.publicWebBaseUrl, this.appConfigService.publicApiBaseUrl]
      .map((value) => this.extractHostname(value))
      .filter(Boolean)
      .includes(host);
  }

  private extractHostname(value: string) {
    if (!value) {
      return null;
    }

    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
