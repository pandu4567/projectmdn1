// Manual service worker registration for EASY FINMA (equivalent of the
// inline <script> before </body> in a classic index.html — this app is SSR,
// so registration runs from the root component after page load).
export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed", err);
    });
  });
}
