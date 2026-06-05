import { Injectable } from '@nestjs/common';
import { sign as jwtSign } from 'jsonwebtoken';
import * as https from 'node:https';
import { createHash } from 'node:crypto';
import { NotificationDeviceProvider } from '../../generated/prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { AppLogService } from '../logging/app-log.service';
import { HostedRuntimeConfigService } from '../tenancy/hosted-runtime-config.service';
import { PushDeliveryResult } from './push-delivery-result.type';

type WebPushModule = typeof import('web-push');
type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};
type ResolvedFcmCredentials = {
  serviceAccount: FirebaseServiceAccount;
  source: 'env' | 'hosted_runtime_config';
  sourceKey: string;
};
type CachedAccessToken = {
  token: string;
  expiresAt: number;
};

@Injectable()
export class PushDeliveryService {
  private webPushModulePromise: Promise<WebPushModule | null> | null = null;
  private fcmTokenCache = new Map<string, CachedAccessToken>();
  private webPushInitialized = false;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly appLogService: AppLogService,
    private readonly hostedRuntimeConfigService: HostedRuntimeConfigService,
  ) {}

  async deliver(input: {
    tenantId?: string | null;
    provider: NotificationDeviceProvider;
    pushToken: string | null;
    webPushP256dh?: string | null;
    webPushAuth?: string | null;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    notificationId: string;
    deviceId: string;
  }): Promise<PushDeliveryResult> {
    switch (input.provider) {
      case NotificationDeviceProvider.FCM:
        if (!input.pushToken) {
          return {
            status: 'failed',
            errorMessage: 'No push token is registered for this device.',
          };
        }

        return this.deliverWithFcm({
          ...input,
          pushToken: input.pushToken,
        });
      case NotificationDeviceProvider.WEB_PUSH:
        if (!input.pushToken || !input.webPushP256dh || !input.webPushAuth) {
          return {
            status: 'failed',
            errorMessage: 'The browser push subscription is incomplete for this device.',
          };
        }

        return this.deliverWithWebPush({
          ...input,
          pushToken: input.pushToken,
          webPushP256dh: input.webPushP256dh,
          webPushAuth: input.webPushAuth,
        });
      case NotificationDeviceProvider.GENERIC:
      default:
        return {
          status: 'failed',
          errorMessage: `Provider ${input.provider.toLowerCase()} is not configured for server delivery.`,
        };
    }
  }

  private async deliverWithFcm(input: {
    tenantId?: string | null;
    pushToken: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    notificationId: string;
    deviceId: string;
  }): Promise<PushDeliveryResult> {
    const credentials = await this.resolveFcmCredentials(input.tenantId ?? null);
    if (!credentials) {
      return {
        status: 'failed',
        errorMessage: 'FCM server delivery is not configured.',
      };
    }

    try {
      const accessToken = await this.getFcmAccessToken(credentials);
      const { projectId } = credentials.serviceAccount;
      const body = JSON.stringify({
        message: {
          token: input.pushToken,
          notification: {
            title: input.title,
            body: input.message,
          },
          data: {
            entityType: input.entityType ?? '',
            entityId: input.entityId ?? '',
            notificationId: input.notificationId,
            deviceId: input.deviceId,
          },
        },
      });

      const responseText = await this.httpPost(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        body,
        { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      );

      const responseData = JSON.parse(responseText) as {
        name?: string;
        error?: { message?: string };
      };
      if (responseData.error) {
        return {
          status: 'failed',
          errorMessage: responseData.error.message ?? 'FCM delivery failed.',
        };
      }

      return {
        status: 'sent',
        providerMessageId: responseData.name ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FCM delivery failed.';
      return { status: 'failed', errorMessage: message };
    }
  }

  private async deliverWithWebPush(input: {
    pushToken: string;
    webPushP256dh: string;
    webPushAuth: string;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    notificationId: string;
    deviceId: string;
  }): Promise<PushDeliveryResult> {
    const webPushConfig = this.appConfigService.webPushConfig;
    if (!webPushConfig) {
      return {
        status: 'failed',
        errorMessage: 'Web Push delivery is not configured.',
      };
    }

    try {
      const webPushModule = await this.loadWebPushModule();
      if (!webPushModule) {
        return {
          status: 'failed',
          errorMessage: 'The web-push module is not available in the server runtime.',
        };
      }

      if (!this.webPushInitialized) {
        webPushModule.setVapidDetails(
          webPushConfig.subject,
          webPushConfig.publicKey,
          webPushConfig.privateKey,
        );
        this.webPushInitialized = true;
        this.appLogService.log('Web Push delivery has been initialized.', 'PushDelivery');
      }

      const payload = JSON.stringify({
        notificationId: input.notificationId,
        deviceId: input.deviceId,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? '',
        entityId: input.entityId ?? '',
        path: './#notifications',
      });

      const result = await webPushModule.sendNotification(
        {
          endpoint: input.pushToken,
          keys: {
            p256dh: input.webPushP256dh,
            auth: input.webPushAuth,
          },
        },
        payload,
        {
          TTL: 60,
        },
      );

      return {
        status: 'sent',
        providerMessageId: result.headers?.location ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Web push delivery failed.';
      return { status: 'failed', errorMessage: message };
    }
  }

  private async loadWebPushModule() {
    if (!this.webPushModulePromise) {
      this.webPushModulePromise = import('web-push')
        .then((module) => module.default ?? module)
        .catch((error) => {
          this.appLogService.warn(
            `Web Push SDK could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
            'PushDelivery',
          );
          return null;
        });
    }

    return this.webPushModulePromise;
  }

  private async getFcmAccessToken(credentials: ResolvedFcmCredentials): Promise<string> {
    const cached = this.fcmTokenCache.get(credentials.sourceKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const now = Math.floor(Date.now() / 1000);
    const jwt = jwtSign(
      {
        iss: credentials.serviceAccount.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      },
      credentials.serviceAccount.privateKey,
      { algorithm: 'RS256' },
    );

    const tokenBody = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const tokenResponse = await this.httpPost('https://oauth2.googleapis.com/token', tokenBody, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const tokenData = JSON.parse(tokenResponse) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!tokenData.access_token) {
      throw new Error(
        `OAuth2 token exchange failed: ${tokenData.error ?? 'no access_token in response'}`,
      );
    }

    const expiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000;
    this.fcmTokenCache.set(credentials.sourceKey, { token: tokenData.access_token, expiresAt });
    this.appLogService.log(
      `Firebase Cloud Messaging delivery initialized with ${credentials.source}.`,
      'PushDelivery',
    );
    return tokenData.access_token;
  }

  private httpPost(
    url: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const bodyBuffer = Buffer.from(body, 'utf8');
      const req = https.request(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Length': bodyBuffer.length,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${text}`));
            } else {
              resolve(text);
            }
          });
        },
      );
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });
  }

  private async resolveFcmCredentials(
    tenantId: string | null,
  ): Promise<ResolvedFcmCredentials | null> {
    if (tenantId) {
      const hostedCredentials = await this.resolveHostedFcmCredentials(tenantId);
      if (hostedCredentials) {
        return hostedCredentials;
      }
    }

    const envCredentials = this.appConfigService.fcmServiceAccount;
    if (!this.appConfigService.fcmEnabled || !envCredentials) {
      return null;
    }

    return {
      serviceAccount: envCredentials,
      source: 'env',
      sourceKey: this.buildCredentialSourceKey('env', envCredentials),
    };
  }

  private async resolveHostedFcmCredentials(
    tenantId: string,
  ): Promise<ResolvedFcmCredentials | null> {
    try {
      const hostedRuntimeConfig =
        await this.hostedRuntimeConfigService.getTenantRuntimeConfig(tenantId);
      const hostedFcmConfig = hostedRuntimeConfig?.hostedPushConfig?.fcm;
      if (!hostedFcmConfig?.enabled || !hostedFcmConfig.serviceAccountBase64) {
        return null;
      }

      const decodedJson = Buffer.from(hostedFcmConfig.serviceAccountBase64, 'base64').toString(
        'utf8',
      );
      const parsed = this.parseFirebaseServiceAccount(decodedJson);
      if (!parsed) {
        this.appLogService.warn(
          'Hosted FCM service account payload is invalid for tenant runtime config.',
          'PushDelivery',
        );
        return null;
      }

      return {
        serviceAccount: parsed,
        source: 'hosted_runtime_config',
        sourceKey: this.buildCredentialSourceKey('hosted_runtime_config', parsed),
      };
    } catch (error) {
      this.appLogService.warn(
        `Hosted runtime config was unavailable while resolving FCM credentials: ${error instanceof Error ? error.message : String(error)}`,
        'PushDelivery',
      );
      return null;
    }
  }

  private parseFirebaseServiceAccount(rawJson: string): FirebaseServiceAccount | null {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        return null;
      }

      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      };
    } catch {
      return null;
    }
  }

  private buildCredentialSourceKey(
    source: 'env' | 'hosted_runtime_config',
    account: FirebaseServiceAccount,
  ) {
    const fingerprint = createHash('sha256')
      .update(`${account.projectId} ${account.clientEmail} ${account.privateKey}`)
      .digest('hex')
      .slice(0, 24);
    return `${source}:${fingerprint}`;
  }
}
