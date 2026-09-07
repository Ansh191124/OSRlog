// Offline caching for Driver vehicle-status updates in low-network areas —
// queues the update locally and flushes it once connectivity is restored.
import { apiClient } from "../api/client";

const STORAGE_KEY = "osr_offline_vehicle_status_queue";

export interface QueuedStatusUpdate {
  vehicleId: string;
  status: "available" | "maintenance";
  queuedAt: string;
}

export function getQueue(): QueuedStatusUpdate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedStatusUpdate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable — nothing more we can do client-side.
  }
}

export function enqueueStatusUpdate(vehicleId: string, status: "available" | "maintenance") {
  const queue = getQueue().filter((q) => q.vehicleId !== vehicleId);
  queue.push({ vehicleId, status, queuedAt: new Date().toISOString() });
  setQueue(queue);
}

// Attempts to send every queued update; entries that still fail stay queued.
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const stillQueued: QueuedStatusUpdate[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await apiClient.patch(`/vehicles/${item.vehicleId}/driver-status`, { status: item.status });
      flushed += 1;
    } catch {
      stillQueued.push(item);
    }
  }

  setQueue(stillQueued);
  return { flushed, remaining: stillQueued.length };
}
