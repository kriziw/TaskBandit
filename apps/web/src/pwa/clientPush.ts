import { taskBanditApi } from "../api/taskbanditApi";
import type { AppLanguage } from "../i18n/I18nProvider";
import { getClientServiceWorkerRegistration } from "./registerClientPwa";

const webPushInstallationStorageKey = "taskbandit-web-push-installation-id";

export type ClientWebPushStatus = {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  needsPrompt: boolean;
};

function getOrCreateWebPushInstallationId() {
  const existing = window.localStorage.getItem(webPushInstallationStorageKey);
  if (existing) {
    return existing;
  }

  const created = `web-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}`;
  window.localStorage.setItem(webPushInstallationStorageKey, created);
  return created;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function buildBrowserDeviceName() {
  const platform = navigator.platform || "Unknown platform";
  return `Browser client (${platform})`;
}

function getPushPermission() {
  if (!("Notification" in window)) {
    return "unsupported" as const;
  }

  return Notification.permission;
}

export function getClientWebPushSupportStatus() {
  return Boolean(
    "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
  );
}

export async function syncClientWebPushRegistration(input: {
  token: string;
  language: AppLanguage;
  appVersion: string;
}) {
  if (!getClientWebPushSupportStatus()) {
    return {
      supported: false,
      enabled: false,
      permission: "unsupported" as const,
      needsPrompt: false
    } satisfies ClientWebPushStatus;
  }

  const registration = await getClientServiceWorkerRegistration();
  if (!registration) {
    return {
      supported: true,
      enabled: false,
      permission: getPushPermission(),
      needsPrompt: false
    } satisfies ClientWebPushStatus;
  }

  const webPushPublicKey = await taskBanditApi.getWebPushPublicKey(input.token, input.language);
  if (!webPushPublicKey.supported || !webPushPublicKey.publicKey) {
    return {
      supported: false,
      enabled: false,
      permission: getPushPermission(),
      needsPrompt: false
    } satisfies ClientWebPushStatus;
  }

  const permission = getPushPermission();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (permission !== "granted") {
    return {
      supported: true,
      enabled: Boolean(existingSubscription),
      permission,
      needsPrompt: permission === "default"
    } satisfies ClientWebPushStatus;
  }

  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(webPushPublicKey.publicKey)
    }));

  const subscriptionJson = subscription.toJSON();
  await taskBanditApi.registerNotificationDevice(input.token, input.language, {
    installationId: getOrCreateWebPushInstallationId(),
    platform: "web",
    provider: "web_push",
    pushToken: subscription.endpoint,
    webPushP256dh: subscriptionJson.keys?.p256dh,
    webPushAuth: subscriptionJson.keys?.auth,
    deviceName: buildBrowserDeviceName(),
    appVersion: input.appVersion,
    locale: input.language,
    notificationsEnabled: true
  });

  return {
    supported: true,
    enabled: true,
    permission: "granted" as const,
    needsPrompt: false
  } satisfies ClientWebPushStatus;
}

export async function enableClientWebPush(input: {
  token: string;
  language: AppLanguage;
  appVersion: string;
}) {
  if (!getClientWebPushSupportStatus()) {
    return {
      supported: false,
      enabled: false,
      permission: "unsupported" as const,
      needsPrompt: false
    } satisfies ClientWebPushStatus;
  }

  if (Notification.permission === "default") {
    const nextPermission = await Notification.requestPermission();
    if (nextPermission !== "granted") {
      return {
        supported: true,
        enabled: false,
        permission: nextPermission,
        needsPrompt: false
      } satisfies ClientWebPushStatus;
    }
  }

  return syncClientWebPushRegistration(input);
}
