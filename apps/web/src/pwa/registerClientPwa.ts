let clientRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerClientPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("./client-sw.js", window.location.href);
    clientRegistrationPromise = navigator.serviceWorker
      .register(serviceWorkerUrl, {
        scope: "./"
      })
      .catch(() => null);
  });
}

export async function getClientServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  if (!clientRegistrationPromise) {
    const serviceWorkerUrl = new URL("./client-sw.js", window.location.href);
    clientRegistrationPromise = navigator.serviceWorker
      .register(serviceWorkerUrl, {
        scope: "./"
      })
      .then((registration) => registration)
      .catch(() => null);
  }

  return clientRegistrationPromise;
}
