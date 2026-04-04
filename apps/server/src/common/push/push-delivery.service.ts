import { Injectable } from "@nestjs/common";
import { NotificationDeviceProvider } from "@prisma/client";
import { AppConfigService } from "../config/app-config.service";
import { AppLogService } from "../logging/app-log.service";
import { PushDeliveryResult } from "./push-delivery-result.type";

type FirebaseAdminModule = typeof import("firebase-admin");
type FirebaseMessagingModule = typeof import("firebase-admin/messaging");

@Injectable()
export class PushDeliveryService {
  private firebaseAdminModulePromise: Promise<FirebaseAdminModule | null> | null = null;
  private firebaseMessagingModulePromise: Promise<FirebaseMessagingModule | null> | null = null;
  private firebaseAppInitialized = false;
  private initializationAttempted = false;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly appLogService: AppLogService
  ) {}

  async deliver(input: {
    provider: NotificationDeviceProvider;
    pushToken: string | null;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    notificationId: string;
    deviceId: string;
  }): Promise<PushDeliveryResult> {
    if (!input.pushToken) {
      return {
        status: "failed",
        errorMessage: "No push token is registered for this device."
      };
    }

    switch (input.provider) {
      case NotificationDeviceProvider.FCM:
        return this.deliverWithFcm({
          ...input,
          pushToken: input.pushToken
        });
      case NotificationDeviceProvider.GENERIC:
      default:
        return {
          status: "failed",
          errorMessage: `Provider ${input.provider.toLowerCase()} is not configured for server delivery.`
        };
    }
  }

  private async deliverWithFcm(input: {
    pushToken: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    notificationId: string;
    deviceId: string;
  }): Promise<PushDeliveryResult> {
    if (!this.appConfigService.fcmEnabled || !this.appConfigService.fcmServiceAccount) {
      return {
        status: "failed",
        errorMessage: "FCM server delivery is not configured."
      };
    }

    try {
      const adminModule = await this.loadFirebaseAdminModule();
      const messagingModule = await this.loadFirebaseMessagingModule();

      if (!adminModule || !messagingModule) {
        return {
          status: "failed",
          errorMessage: "Firebase Admin SDK is not available in the server runtime."
        };
      }

      if (!this.firebaseAppInitialized) {
        adminModule.initializeApp({
          credential: adminModule.credential.cert(this.appConfigService.fcmServiceAccount)
        });
        this.firebaseAppInitialized = true;
        this.appLogService.log("Firebase Cloud Messaging delivery has been initialized.", "PushDelivery");
      }

      const messageId = await messagingModule.getMessaging().send({
        token: input.pushToken,
        notification: {
          title: input.title,
          body: input.message
        },
        data: {
          entityType: input.entityType ?? "",
          entityId: input.entityId ?? "",
          notificationId: input.notificationId,
          deviceId: input.deviceId
        }
      });

      return {
        status: "sent",
        providerMessageId: messageId
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "FCM delivery failed.";
      return {
        status: "failed",
        errorMessage: message
      };
    }
  }

  private async loadFirebaseAdminModule() {
    if (!this.firebaseAdminModulePromise) {
      this.firebaseAdminModulePromise = import("firebase-admin")
        .then((module) => module)
        .catch((error) => {
          if (!this.initializationAttempted) {
            this.appLogService.warn(
              `Firebase Admin SDK could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
              "PushDelivery"
            );
          }

          return null;
        });
    }

    this.initializationAttempted = true;
    return this.firebaseAdminModulePromise;
  }

  private async loadFirebaseMessagingModule() {
    if (!this.firebaseMessagingModulePromise) {
      this.firebaseMessagingModulePromise = import("firebase-admin/messaging")
        .then((module) => module)
        .catch((error) => {
          this.appLogService.warn(
            `Firebase Messaging SDK could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
            "PushDelivery"
          );
          return null;
        });
    }

    return this.firebaseMessagingModulePromise;
  }
}
