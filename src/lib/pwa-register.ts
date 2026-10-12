// Guarded service worker registration for EASY FINMA.
// Registers /sw.js only in production on the real published app — never in
// dev, iframes, or Lovable preview hosts. In refused contexts it unregisters
// any stale matching registration instead.

const REFUSED_HOSTS = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (REFUSED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterStale() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => r.active?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    await unregisterStale();
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("SW registration failed", err);
  }
}
