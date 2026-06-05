import { NotificationDeviceProvider } from '../src/generated/prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushDeliveryService } from '../src/common/push/push-delivery.service';

const validServiceAccountBase64 = Buffer.from(
  JSON.stringify({
    project_id: 'project-a',
    client_email: 'bot@project-a.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
  }),
  'utf8',
).toString('base64');

describe('PushDeliveryService', () => {
  let appConfigService: {
    fcmEnabled: boolean;
    fcmServiceAccount: {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    } | null;
    webPushConfig: null;
  };
  let appLogService: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let hostedRuntimeConfigService: {
    getTenantRuntimeConfig: ReturnType<typeof vi.fn>;
  };
  let service: PushDeliveryService;

  beforeEach(() => {
    appConfigService = {
      fcmEnabled: false,
      fcmServiceAccount: null,
      webPushConfig: null,
    };
    appLogService = {
      log: vi.fn(),
      warn: vi.fn(),
    };
    hostedRuntimeConfigService = {
      getTenantRuntimeConfig: vi.fn().mockResolvedValue({
        hostedPushConfig: {
          fcm: {
            enabled: true,
            serviceAccountBase64: validServiceAccountBase64,
          },
        },
      }),
    };

    service = new PushDeliveryService(
      appConfigService as never,
      appLogService as never,
      hostedRuntimeConfigService as never,
    );
  });

  it('reads hosted FCM credentials from runtime config for tenant deliveries', async () => {
    (service as unknown as { getFcmAccessToken: ReturnType<typeof vi.fn> }).getFcmAccessToken = vi
      .fn()
      .mockResolvedValue('test-access-token');
    (service as unknown as { httpPost: ReturnType<typeof vi.fn> }).httpPost = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ name: 'projects/project-a/messages/msg-1' }));

    const result = await service.deliver({
      tenantId: 'tenant-a',
      provider: NotificationDeviceProvider.FCM,
      pushToken: 'device-token',
      title: 'hello',
      message: 'world',
      notificationId: 'notification-1',
      deviceId: 'device-1',
    });

    expect(hostedRuntimeConfigService.getTenantRuntimeConfig).toHaveBeenCalledWith('tenant-a');
    expect(result).toMatchObject({ status: 'sent' });
  });

  it('falls back to env FCM credentials when hosted config is absent', async () => {
    appConfigService.fcmEnabled = true;
    appConfigService.fcmServiceAccount = {
      projectId: 'env-project',
      clientEmail: 'env@project.iam.gserviceaccount.com',
      privateKey: 'env-key',
    };
    hostedRuntimeConfigService.getTenantRuntimeConfig.mockResolvedValue({
      hostedPushConfig: {
        fcm: { enabled: false, serviceAccountBase64: null },
      },
    });
    (service as unknown as { getFcmAccessToken: ReturnType<typeof vi.fn> }).getFcmAccessToken = vi
      .fn()
      .mockResolvedValue('test-access-token');
    (service as unknown as { httpPost: ReturnType<typeof vi.fn> }).httpPost = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ name: 'projects/env-project/messages/msg-2' }));

    const result = await service.deliver({
      tenantId: 'tenant-a',
      provider: NotificationDeviceProvider.FCM,
      pushToken: 'device-token',
      title: 'hello',
      message: 'world',
      notificationId: 'notification-1',
      deviceId: 'device-1',
    });

    expect(result).toMatchObject({ status: 'sent' });
  });
});
