// ============================================
// CUSTOM SERVICE WORKER - Background Sync
// ============================================

// This file provides background sync capabilities
// It will be merged with the auto-generated PWA service worker

const SYNC_TAG = "background-sync";

// Listen for sync events
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    console.log("[SW] Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Get stored sync data from IndexedDB
    const syncData = await getSyncData();

    if (syncData && syncData.length > 0) {
      console.log(`[SW] Found ${syncData.length} items to sync`);

      for (const item of syncData) {
        try {
          await syncItemToServer(item);
          await markItemSynced(item.id);
        } catch (error) {
          console.error("[SW] Failed to sync item:", error);
        }
      }
    }

    console.log("[SW] Background sync complete");
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
    throw error; // Re-throw to retry
  }
}

// Get sync data from IndexedDB
async function getSyncData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("time-tracker-db", 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(["sessions"], "readonly");
      const store = transaction.objectStore("sessions");
      const index = store.index("by-sync-status");
      const getRequest = index.getAll("pending");

      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Sync item to server (this would be the actual API call)
async function syncItemToServer(item) {
  // The actual sync happens through the main thread
  // This is a placeholder - real sync uses the app's sync functions
  console.log("[SW] Would sync item:", item.id);

  // Post message to main thread to handle actual sync
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: "BACKGROUND_SYNC_REQUEST",
      payload: item,
    });
  }
}

// Mark item as synced
async function markItemSynced(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("time-tracker-db", 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(["sessions"], "readwrite");
      const store = transaction.objectStore("sessions");
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          session.syncStatus = "synced";
          store.put(session);
        }
        resolve();
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Listen for messages from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    // Register for background sync
    self.registration.sync
      .register(SYNC_TAG)
      .then(() => {
        console.log("[SW] Background sync registered");
      })
      .catch((error) => {
        console.error("[SW] Background sync registration failed:", error);
      });
  }
});

// Periodic sync for browsers that support it
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(doBackgroundSync());
  }
});

console.log("[SW] Custom service worker loaded with background sync support");
