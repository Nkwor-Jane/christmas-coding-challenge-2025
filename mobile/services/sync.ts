import { offline } from "../database/offline";
import { api } from "./api";

function eventId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function queueProgress(payload: Record<string, unknown>) {
  await offline.enqueue({
    event_id: eventId(),
    type: "progress",
    payload,
    created_at: new Date().toISOString(),
  });
  await flushQueue();
}

export async function flushQueue() {
  const events = await offline.listQueue();
  if (events.length === 0) return;
  try {
    const result = await api<{ results: { event_id: string; status: string }[] }>("/sync/push", {
      method: "POST",
      body: JSON.stringify({
        events: events.map((event) => ({
          event_id: event.event_id,
          type: event.type,
          payload: event.payload,
        })),
      }),
    });
    await offline.removeEvents(result.results.map((item) => item.event_id));
  } catch {
    // Leave the queue in place until the network is back.
  }
}
