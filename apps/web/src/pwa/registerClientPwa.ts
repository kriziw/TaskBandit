export function registerClientPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("./client-sw.js", window.location.href);
    void navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: "./"
    });
  });
}
