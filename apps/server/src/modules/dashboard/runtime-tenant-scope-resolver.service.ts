import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

type TenantScopeResolutionInput = {
  tenantScope: string;
  userId?: string;
  deviceId?: string;
};

@Injectable()
export class RuntimeTenantScopeResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTenantIdForDiagnostics(input: TenantScopeResolutionInput) {
    const tenantScope = input.tenantScope.trim();
    if (isUuidLike(tenantScope)) {
      return tenantScope;
    }

    const userId = input.userId?.trim();
    if (userId && isUuidLike(userId)) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          tenantId: true
        }
      });
      if (user?.tenantId) {
        return user.tenantId;
      }
    }

    const deviceId = input.deviceId?.trim();
    if (deviceId && isUuidLike(deviceId)) {
      const device = await this.prisma.notificationDevice.findUnique({
        where: {
          id: deviceId
        },
        select: {
          tenantId: true
        }
      });
      if (device?.tenantId) {
        return device.tenantId;
      }
    }

    throw new NotFoundException({
      message: "Could not resolve a runtime tenant id for diagnostics."
    });
  }
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
