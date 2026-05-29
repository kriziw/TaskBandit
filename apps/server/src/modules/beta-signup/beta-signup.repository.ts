import { Injectable } from '@nestjs/common';
import { BetaSignupStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubmitBetaSignupDto } from './dto/submit-beta-signup.dto';

@Injectable()
export class BetaSignupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: SubmitBetaSignupDto) {
    return this.prisma.betaSignupRequest.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        displayName: dto.displayName.trim(),
        phone: dto.phone.trim(),
        householdName: dto.householdName.trim(),
        householdSizeEstimate: dto.householdSizeEstimate ?? null,
        billingAddressLine1: dto.billingAddressLine1.trim(),
        billingCity: dto.billingCity.trim(),
        billingPostalCode: dto.billingPostalCode.trim(),
        billingCountry: dto.billingCountry.trim().toUpperCase(),
        message: dto.message?.trim() ?? null,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.betaSignupRequest.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async findById(id: string) {
    return this.prisma.betaSignupRequest.findUnique({ where: { id } });
  }

  async listRequests(status?: BetaSignupStatus) {
    return this.prisma.betaSignupRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAtUtc: 'desc' },
    });
  }

  async markApproved(id: string, provisionedTenantId: string, packageCode: string) {
    return this.prisma.betaSignupRequest.update({
      where: { id },
      data: {
        status: BetaSignupStatus.APPROVED,
        provisionedTenantId,
        packageCode,
        reviewedAtUtc: new Date(),
      },
    });
  }

  async markRejected(id: string, rejectionReason?: string) {
    return this.prisma.betaSignupRequest.update({
      where: { id },
      data: {
        status: BetaSignupStatus.REJECTED,
        rejectionReason: rejectionReason ?? null,
        reviewedAtUtc: new Date(),
      },
    });
  }

  async getSettings() {
    return this.prisma.betaSignupSettings.upsert({
      where: { id: 1 },
      create: { id: 1, defaultPackageCode: 'free' },
      update: {},
    });
  }

  async updateSettings(defaultPackageCode: string) {
    return this.prisma.betaSignupSettings.upsert({
      where: { id: 1 },
      create: { id: 1, defaultPackageCode },
      update: { defaultPackageCode },
    });
  }
}
