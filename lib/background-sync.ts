// ============================================
// BACKGROUND SYNC UTILITIES
// ============================================

/**
 * Request background sync from the service worker
 * This will queue a sync to run when the device is online
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Check if service worker and background sync are supported
  if (!("serviceWorker" in navigator)) {
    console.log("[BG Sync] Service Worker not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if background sync is supported
    if (!("sync" in registration)) {
      console.log("[BG Sync] Background Sync not supported");
      return false;
    }

    // Register for background sync
    await (
      registration as ServiceWorkerRegistration & { sync: SyncManager }
    ).sync.register("background-sync");
    console.log("[BG Sync] Background sync registered");
    return true;
  } catch (error) {
    console.error("[BG Sync] Failed to register:", error);
    return false;
  }
}

/**
 * Post message to service worker to trigger sync
 */
export function triggerServiceWorkerSync(): void {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "TRIGGER_SYNC",
    });
  }
}

/**
 * Listen for sync responses from service worker
 */
export function onSyncComplete(callback: (data: unknown) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === "SYNC_COMPLETE") {
      callback(event.data.payload);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);

  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}

/**
 * Check if periodic background sync is supported and register
 */
export async function registerPeriodicSync(
  minInterval: number = 12 * 60 * 60 * 1000 // 12 hours default
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if periodic sync is supported
    if (!("periodicSync" in registration)) {
      console.log("[BG Sync] Periodic sync not supported");
      return false;
    }

    // Check permission
    const status = await navigator.permissions.query({
      // @ts-expect-error - periodicBackgroundSync is not in the standard yet
      name: "periodic-background-sync",
    });

    if (status.state === "granted") {
      // @ts-expect-error - periodicSync is not in the standard types
      await registration.periodicSync.register("sync-data", {
        minInterval,
      });
      console.log("[BG Sync] Periodic sync registered");
      return true;
    } else {
      console.log("[BG Sync] Periodic sync permission denied");
      return false;
    }
  } catch (error) {
    console.error("[BG Sync] Failed to register periodic sync:", error);
    return false;
  }
}

// SyncManager type definition
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}
