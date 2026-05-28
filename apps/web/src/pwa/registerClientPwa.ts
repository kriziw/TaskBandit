let clientRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerClientPwa() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    clientRegistrationPromise = navigator.serviceWorker
      .register('/client-sw.js', {
        scope: '/',
      })
      .catch(() => null);
  });
}

export async function getClientServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  if (!clientRegistrationPromise) {
    clientRegistrationPromise = navigator.serviceWorker
      .register('/client-sw.js', {
        scope: '/',
      })
      .then((registration) => registration)
      .catch(() => null);
  }

  return clientRegistrationPromise;
}
