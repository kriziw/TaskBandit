import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AuthProvider,
  AssignmentStrategyType,
  ChoreAttachment,
  ChoreChecklistCompletion,
  ChoreState,
  Difficulty,
  HouseholdRole,
  Prisma
} from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateChoreInstanceDto } from "../chores/dto/create-chore-instance.dto";
import { SubmitAttachmentDto } from "../chores/dto/submit-chore.dto";
import { CreateChoreTemplateDto } from "../chores/dto/create-chore-template.dto";
import { CreateHouseholdMemberDto } from "../settings/dto/create-household-member.dto";
import { UpdateSettingsDto } from "../settings/dto/update-settings.dto";

@Injectable()
export class HouseholdRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBootstrapStatus() {
    const householdCount = await this.prisma.household.count();
    return {
      isBootstrapped: householdCount > 0,
      householdCount
    };
  }

  async bootstrapHousehold(
    householdName: string,
    ownerDisplayName: string,
    ownerEmail: string,
    ownerPasswordHash: string,
    selfSignupEnabled: boolean
  ) {
    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const household = await this.prisma.household.create({
      data: {
        name: householdName.trim(),
        settings: {
          create: {
            selfSignupEnabled,
            membersCanSeeFullHouseholdChoreDetails: true,
            enablePushNotifications: true,
            enableOverduePenalties: true
          }
        },
        members: {
          create: {
            displayName: ownerDisplayName.trim(),
            role: HouseholdRole.ADMIN,
            points: 0,
            currentStreak: 0,
            identities: {
              create: {
                provider: AuthProvider.LOCAL,
                providerSubject: normalizedEmail,
                email: normalizedEmail,
                passwordHash: ownerPasswordHash
              }
            }
          }
        }
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: {
              where: {
                provider: AuthProvider.LOCAL
              },
              take: 1
            }
          }
        }
      }
    });

    return this.mapHousehold(household);
  }

  async getHousehold(householdId: string) {
    const household = await this.prisma.household.findFirstOrThrow({
      where: {
        id: householdId
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: {
              where: {
                provider: AuthProvider.LOCAL
              },
              take: 1
            }
          }
        }
      }
    });

    return this.mapHousehold(household);
  }

  async updateSettings(dto: UpdateSettingsDto, householdId: string) {
    const household = await this.prisma.household.findFirstOrThrow({
      where: {
        id: householdId
      },
      include: {
        settings: true,
        members: {
          include: {
            identities: {
              where: {
                provider: AuthProvider.LOCAL
              },
              take: 1
            }
          }
        }
      }
    });

    await this.prisma.householdSettings.update({
      where: {
        householdId: household.id
      },
      data: {
        selfSignupEnabled: dto.selfSignupEnabled ?? household.settings?.selfSignupEnabled,
        membersCanSeeFullHouseholdChoreDetails:
          dto.membersCanSeeFullHouseholdChoreDetails ??
          household.settings?.membersCanSeeFullHouseholdChoreDetails,
        enablePushNotifications:
          dto.enablePushNotifications ?? household.settings?.enablePushNotifications,
        enableOverduePenalties:
          dto.enableOverduePenalties ?? household.settings?.enableOverduePenalties
      }
    });

    return this.getHousehold(householdId);
  }

  async createHouseholdMember(
    dto: CreateHouseholdMemberDto,
    householdId: string,
    passwordHash: string,
    emailInUseMessage: string
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingIdentity) {
      throw new ConflictException({
        message: emailInUseMessage
      });
    }

    await this.prisma.user.create({
      data: {
        householdId,
        displayName: dto.displayName.trim(),
        role: dto.role === "child" ? HouseholdRole.CHILD : HouseholdRole.PARENT,
        identities: {
          create: {
            provider: AuthProvider.LOCAL,
            providerSubject: normalizedEmail,
            email: normalizedEmail,
            passwordHash
          }
        }
      }
    });

    return this.getHousehold(householdId);
  }

  async getDashboardSummary(householdId: string) {
    const [household, instances] = await Promise.all([
      this.prisma.household.findFirstOrThrow({
        where: {
          id: householdId
        },
        include: {
          members: {
            include: {
              identities: {
                where: {
                  provider: AuthProvider.LOCAL
                },
                take: 1
              }
            }
          }
        }
      }),
      this.prisma.choreInstance.findMany({
        where: {
          householdId
        }
      })
    ]);

    const pendingApprovals = instances.filter((instance) => instance.state === ChoreState.PENDING_APPROVAL).length;
    const activeChores = instances.filter(
      (instance) =>
        instance.state === ChoreState.OPEN ||
        instance.state === ChoreState.ASSIGNED ||
        instance.state === ChoreState.IN_PROGRESS
    ).length;
    const leaderboard = household.members
      .map((member) => this.mapMember(member))
      .sort((left, right) => right.points - left.points || right.currentStreak - left.currentStreak);
    const streakLeader =
      [...leaderboard].sort(
        (left, right) => right.currentStreak - left.currentStreak || right.points - left.points
      )[0]?.displayName ?? "Nobody";

    return {
      pendingApprovals,
      activeChores,
      streakLeader,
      leaderboard
    };
  }

  async getTemplates(householdId: string) {
    const templates = await this.prisma.choreTemplate.findMany({
      where: {
        householdId
      },
      include: {
        checklistItems: true,
        dependencies: true
      },
      orderBy: {
        title: "asc"
      }
    });

    return templates.map((template) => this.mapTemplate(template));
  }

  async createTemplate(dto: CreateChoreTemplateDto, householdId: string) {
    const template = await this.prisma.choreTemplate.create({
      data: {
        householdId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        difficulty: dto.difficulty,
        basePoints: this.getBasePoints(dto.difficulty),
        assignmentStrategy: dto.assignmentStrategy,
        requirePhotoProof: dto.requirePhotoProof,
        checklistItems: {
          create:
            dto.checklist?.map((item, index) => ({
              title: item.title.trim(),
              required: item.required,
              sortOrder: index + 1
            })) ?? []
        }
      },
      include: {
        checklistItems: true,
        dependencies: true
      }
    });

    return this.mapTemplate(template);
  }

  async createInstance(dto: CreateChoreInstanceDto, householdId: string) {
    const template = await this.prisma.choreTemplate.findFirstOrThrow({
      where: {
        id: dto.templateId,
        householdId
      },
      include: {
        checklistItems: true
      }
    });

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: {
          id: dto.assigneeId,
          householdId
        }
      });

      if (!assignee) {
        throw new NotFoundException({
          message: "That assignee could not be found."
        });
      }
    }

    const instance = await this.prisma.choreInstance.create({
      data: {
        householdId,
        templateId: template.id,
        title: dto.title?.trim() || template.title,
        state: dto.assigneeId ? ChoreState.ASSIGNED : ChoreState.OPEN,
        assigneeId: dto.assigneeId ?? null,
        dueAtUtc: dto.dueAt
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        checklistCompletions: true,
        attachments: true
      }
    });

    return this.mapInstance(instance);
  }

  async getInstances(householdId: string) {
    const instances = await this.prisma.choreInstance.findMany({
      where: {
        householdId
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        checklistCompletions: true,
        attachments: true
      },
      orderBy: {
        dueAtUtc: "asc"
      }
    });

    return instances.map((instance) => this.mapInstance(instance));
  }

  async getInstanceForHousehold(instanceId: string, householdId: string) {
    const instance = await this.prisma.choreInstance.findFirst({
      where: {
        id: instanceId,
        householdId
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        checklistCompletions: true,
        attachments: true
      }
    });

    return instance ? this.mapInstance(instance) : null;
  }

  async submitInstance(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    completedChecklistItemIds: string[];
    attachments: SubmitAttachmentDto[];
    note?: string;
    awardedPoints: number;
    nextState: "pending_approval" | "completed";
  }) {
    const updatedInstance = await this.prisma.$transaction(async (tx) => {
      await tx.choreChecklistCompletion.deleteMany({
        where: {
          choreInstanceId: input.instanceId
        }
      });

      await tx.choreAttachment.deleteMany({
        where: {
          choreInstanceId: input.instanceId
        }
      });

      if (input.completedChecklistItemIds.length > 0) {
        await tx.choreChecklistCompletion.createMany({
          data: input.completedChecklistItemIds.map((checklistItemId) => ({
            choreInstanceId: input.instanceId,
            checklistItemId,
            completedById: input.actingUserId
          })),
          skipDuplicates: true
        });
      }

      if (input.attachments.length > 0) {
        await tx.choreAttachment.createMany({
          data: input.attachments.map((attachment) => ({
            choreInstanceId: input.instanceId,
            submittedById: input.actingUserId,
            clientFilename: attachment.clientFilename?.trim() || "proof-image",
            contentType: attachment.contentType?.trim() || null,
            storageKey: attachment.storageKey?.trim() || null
          }))
        });
      }

      const attachmentCount = input.attachments.length;
      const completedChecklistItems = input.completedChecklistItemIds.length;

      return tx.choreInstance.update({
        where: {
          id: input.instanceId
        },
        data: {
          state:
            input.nextState === "pending_approval" ? ChoreState.PENDING_APPROVAL : ChoreState.COMPLETED,
          submittedAtUtc: new Date(),
          submittedById: input.actingUserId,
          submissionNote: input.note?.trim() || null,
          attachmentCount,
          completedChecklistItems,
          awardedPoints: input.awardedPoints,
          completedAtUtc: input.nextState === "completed" ? new Date() : null,
          completedById: input.nextState === "completed" ? input.actingUserId : null
        },
        include: {
          template: {
            include: {
              checklistItems: true
            }
          },
          checklistCompletions: true,
          attachments: true
        }
      });
    });

    if (input.nextState === "completed") {
      const beneficiaryUserId = updatedInstance.assigneeId ?? input.actingUserId;
      await this.prisma.user.update({
        where: {
          id: beneficiaryUserId
        },
        data: {
          points: {
            increment: input.awardedPoints
          },
          currentStreak: {
            increment: 1
          }
        }
      });
    }

    return this.mapInstance(updatedInstance);
  }

  async reviewInstance(input: {
    instanceId: string;
    actingUserId: string;
    householdId: string;
    approved: boolean;
    note?: string;
    awardedPoints: number;
  }) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: input.instanceId
      },
      data: {
        state: input.approved ? ChoreState.COMPLETED : ChoreState.NEEDS_FIXES,
        reviewedAtUtc: new Date(),
        reviewedById: input.actingUserId,
        reviewNote: input.note?.trim() || null,
        awardedPoints: input.approved ? input.awardedPoints : 0,
        completedAtUtc: input.approved ? new Date() : null,
        ...(input.approved ? {} : { completedById: null })
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        checklistCompletions: true,
        attachments: true
      }
    });

    if (input.approved) {
      const beneficiaryUserId = updatedInstance.assigneeId ?? updatedInstance.submittedById;
      if (beneficiaryUserId) {
        await this.prisma.user.update({
          where: {
            id: beneficiaryUserId
          },
          data: {
            points: {
              increment: input.awardedPoints
            },
            currentStreak: {
              increment: 1
            }
          }
        });
      }
    }

    return this.mapInstance(updatedInstance);
  }

  async cancelInstance(instanceId: string) {
    const updatedInstance = await this.prisma.choreInstance.update({
      where: {
        id: instanceId
      },
      data: {
        state: ChoreState.CANCELLED
      },
      include: {
        template: {
          include: {
            checklistItems: true
          }
        },
        checklistCompletions: true,
        attachments: true
      }
    });

    return this.mapInstance(updatedInstance);
  }

  throwNotFound(message: string): never {
    throw new NotFoundException({ message });
  }

  throwForbidden(message: string): never {
    throw new ForbiddenException({ message });
  }

  throwConflict(message: string): never {
    throw new ConflictException({ message });
  }

  async seedDemoDataIfNeeded(enabled: boolean) {
    if (!enabled) {
      return;
    }

    const existingCount = await this.prisma.household.count();
    if (existingCount > 0) {
      return;
    }

    const householdId = "b5a1f703-c90a-4227-8345-4dfe1ce2fd75";
    const adminId = "e4ff7c6d-d986-4fdc-9b97-9b525cab4f29";
    const parentId = "b3d2f3c6-b1ea-43d5-9f1b-4f6bc6c2b6c4";
    const childId = "07b7df84-a4b4-4d46-8688-5ca8b0d31f8c";
    const laundryTemplateId = "3ab30e4c-06b0-4c89-90df-b1c4094a49d2";
    const dryingTemplateId = "8931210f-1c7e-4890-87da-ebda235fd6f1";
    const demoPasswordHash = await hash("TaskBandit123!", 12);

    await this.prisma.household.create({
      data: {
        id: householdId,
        name: "TaskBandit Home",
        settings: {
          create: {
            selfSignupEnabled: false,
            membersCanSeeFullHouseholdChoreDetails: true,
            enablePushNotifications: true,
            enableOverduePenalties: true
          }
        },
        members: {
          create: [
            {
              id: adminId,
              displayName: "Alex",
              role: HouseholdRole.ADMIN,
              points: 120,
              currentStreak: 4,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "alex@taskbandit.local",
                  email: "alex@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            },
            {
              id: parentId,
              displayName: "Maya",
              role: HouseholdRole.PARENT,
              points: 95,
              currentStreak: 3,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "maya@taskbandit.local",
                  email: "maya@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            },
            {
              id: childId,
              displayName: "Luca",
              role: HouseholdRole.CHILD,
              points: 40,
              currentStreak: 2,
              identities: {
                create: {
                  provider: AuthProvider.LOCAL,
                  providerSubject: "luca@taskbandit.local",
                  email: "luca@taskbandit.local",
                  passwordHash: demoPasswordHash
                }
              }
            }
          ]
        },
        choreTemplates: {
          create: [
            {
              id: laundryTemplateId,
              title: "Run the washing machine",
              description: "Load, start, and confirm the wash cycle.",
              difficulty: Difficulty.MEDIUM,
              basePoints: 20,
              assignmentStrategy: AssignmentStrategyType.ROUND_ROBIN,
              requirePhotoProof: false,
              checklistItems: {
                create: [
                  { title: "Add detergent", required: true, sortOrder: 1 },
                  { title: "Start cycle", required: true, sortOrder: 2 }
                ]
              },
              dependencies: {
                create: [
                  {
                    followUpTemplateId: dryingTemplateId
                  }
                ]
              }
            },
            {
              id: dryingTemplateId,
              title: "Hang clothes to dry",
              description: "Move the washed laundry to the drying rack.",
              difficulty: Difficulty.EASY,
              basePoints: 10,
              assignmentStrategy: AssignmentStrategyType.LEAST_COMPLETED_RECENTLY,
              requirePhotoProof: true,
              checklistItems: {
                create: [{ title: "Hang all clothes", required: true, sortOrder: 1 }]
              }
            }
          ]
        },
        choreInstances: {
          create: [
            {
              title: "Run the washing machine",
              state: ChoreState.ASSIGNED,
              templateId: laundryTemplateId,
              assigneeId: childId,
              dueAtUtc: new Date(Date.now() + 4 * 60 * 60 * 1000)
            }
          ]
        }
      }
    });
  }

  private getBasePoints(difficulty: Difficulty) {
    switch (difficulty) {
      case Difficulty.EASY:
        return 10;
      case Difficulty.MEDIUM:
        return 20;
      case Difficulty.HARD:
        return 40;
      default:
        return 10;
    }
  }

  private mapHousehold(
    household: Prisma.HouseholdGetPayload<{
      include: {
        settings: true;
        members: {
          include: {
            identities: true;
          };
        };
      };
    }>
  ) {
    return {
      householdId: household.id,
      name: household.name,
      settings: {
        selfSignupEnabled: household.settings?.selfSignupEnabled ?? false,
        membersCanSeeFullHouseholdChoreDetails:
          household.settings?.membersCanSeeFullHouseholdChoreDetails ?? true,
        enablePushNotifications: household.settings?.enablePushNotifications ?? true,
        enableOverduePenalties: household.settings?.enableOverduePenalties ?? true
      },
      members: household.members
        .map((member) => this.mapMember(member))
        .sort((left, right) => left.displayName.localeCompare(right.displayName))
    };
  }

  private mapMember(
    member: Prisma.UserGetPayload<{
      include: {
        identities: true;
      };
    }>
  ) {
    return {
      id: member.id,
      displayName: member.displayName,
      role: member.role.toLowerCase(),
      email: member.identities[0]?.email ?? null,
      points: member.points,
      currentStreak: member.currentStreak
    };
  }

  private mapTemplate(
    template: Prisma.ChoreTemplateGetPayload<{
      include: { checklistItems: true; dependencies: true };
    }>
  ) {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      difficulty: template.difficulty.toLowerCase(),
      basePoints: template.basePoints,
      assignmentStrategy: this.mapAssignmentStrategy(template.assignmentStrategy),
      requirePhotoProof: template.requirePhotoProof,
      checklist: template.checklistItems
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.title,
          required: item.required
        })),
      dependencyTemplateIds: template.dependencies.map((dependency) => dependency.followUpTemplateId)
    };
  }

  private mapInstance(
    instance: Prisma.ChoreInstanceGetPayload<{
      include: {
        template: { include: { checklistItems: true } };
        checklistCompletions: true;
        attachments: true;
      };
    }>
  ) {
    return {
      id: instance.id,
      templateId: instance.templateId,
      title: instance.title,
      state: instance.state.toLowerCase(),
      assigneeId: instance.assigneeId,
      dueAt: instance.dueAtUtc,
      difficulty: instance.template.difficulty.toLowerCase() as "easy" | "medium" | "hard",
      basePoints: instance.template.basePoints,
      requirePhotoProof: instance.template.requirePhotoProof,
      awardedPoints: instance.awardedPoints,
      completedChecklistItems: instance.completedChecklistItems,
      isOverdue:
        instance.state === ChoreState.OVERDUE ||
        ((instance.state !== ChoreState.COMPLETED && instance.state !== ChoreState.CANCELLED) &&
          instance.dueAtUtc.getTime() < Date.now()),
      attachmentCount: instance.attachmentCount,
      submittedAt: instance.submittedAtUtc,
      submittedById: instance.submittedById,
      submissionNote: instance.submissionNote,
      reviewedAt: instance.reviewedAtUtc,
      reviewedById: instance.reviewedById,
      reviewNote: instance.reviewNote,
      checklist: instance.template.checklistItems
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.title,
          required: item.required
        })),
      checklistCompletionIds: instance.checklistCompletions.map(
        (completion: ChoreChecklistCompletion) => completion.checklistItemId
      ),
      attachments: instance.attachments.map((attachment: ChoreAttachment) => ({
        id: attachment.id,
        clientFilename: attachment.clientFilename,
        contentType: attachment.contentType,
        storageKey: attachment.storageKey,
        createdAt: attachment.createdAtUtc
      }))
    };
  }

  private mapAssignmentStrategy(strategy: AssignmentStrategyType) {
    switch (strategy) {
      case AssignmentStrategyType.ROUND_ROBIN:
        return "round_robin";
      case AssignmentStrategyType.LEAST_COMPLETED_RECENTLY:
        return "least_completed_recently";
      case AssignmentStrategyType.HIGHEST_STREAK:
        return "highest_streak";
      case AssignmentStrategyType.MANUAL_DEFAULT_ASSIGNEE:
        return "manual_default_assignee";
      default:
        return "round_robin";
    }
  }
}
