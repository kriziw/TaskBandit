import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * Handles outbound calls from the runtime to the control plane for tenant
 * management operations: provisioning new tenants and updating package codes.
 *
 * All methods degrade gracefully — failures are logged and returned as errors
 * rather than thrown, so callers can decide how to handle them.
 */
@Injectable()
export class ControlPlaneManagementService {
  private readonly logger = new Logger(ControlPlaneManagementService.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * Registers a newly provisioned tenant on the control plane with a given
   * package code so the control plane can begin serving runtime feature configs.
   */
  async provisionTenant(tenantId: string, packageCode: string): Promise<void> {
    const { baseUrl, token } = this.getConfig();
    if (!baseUrl || !token) {
      this.logger.warn(
        `Cannot provision tenant ${tenantId} on control plane: management config not set.`,
      );
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/internal/management/tenants`, {
        method: 'POST',
        headers: this.buildHeaders(token),
        body: JSON.stringify({ tenantId, packageCode }),
      });

      if (!response.ok) {
        this.logger.error(
          `Control plane rejected provisionTenant for ${tenantId}: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to call control plane provisionTenant for ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Updates the package code for an existing tenant on the control plane.
   * Used when graduating beta tenants to a paid/free package.
   *
   * Returns an error message string on failure, undefined on success.
   */
  async updateTenantPackage(
    tenantId: string,
    packageCode: string,
  ): Promise<string | undefined> {
    const { baseUrl, token } = this.getConfig();
    if (!baseUrl || !token) {
      const msg = 'Control plane management config not set';
      this.logger.warn(`Cannot update package for tenant ${tenantId}: ${msg}`);
      return msg;
    }

    try {
      const response = await fetch(
        `${baseUrl}/internal/management/tenants/${encodeURIComponent(tenantId)}`,
        {
          method: 'PATCH',
          headers: this.buildHeaders(token),
          body: JSON.stringify({ packageCode }),
        },
      );

      if (!response.ok) {
        const msg = `HTTP ${response.status}`;
        this.logger.error(
          `Control plane rejected updateTenantPackage for ${tenantId}: ${msg}`,
        );
        return msg;
      }

      return undefined;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to call control plane updateTenantPackage for ${tenantId}: ${msg}`,
      );
      return msg;
    }
  }

  /**
   * Returns the list of available package codes from the control plane.
   * Falls back to ['free'] if the control plane is unavailable or not configured.
   */
  async listAvailablePackages(): Promise<string[]> {
    const { baseUrl, token } = this.getConfig();
    if (!baseUrl || !token) {
      return ['free'];
    }

    try {
      const response = await fetch(`${baseUrl}/internal/management/packages`, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        this.logger.warn(
          `Control plane returned HTTP ${response.status} for listAvailablePackages — using fallback.`,
        );
        return ['free'];
      }

      const data = (await response.json()) as { packages?: string[] };
      return Array.isArray(data.packages) && data.packages.length > 0
        ? data.packages
        : ['free'];
    } catch (error) {
      this.logger.warn(
        `Failed to fetch available packages from control plane: ${error instanceof Error ? error.message : String(error)} — using fallback.`,
      );
      return ['free'];
    }
  }

  private getConfig(): { baseUrl: string; token: string } {
    return {
      baseUrl: this.appConfigService.controlPlaneRuntimeBaseUrl,
      token: this.appConfigService.controlPlaneInternalServiceToken,
    };
  }

  private buildHeaders(token: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-internal-service-token': token,
    };
  }
}
