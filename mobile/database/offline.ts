export type CachedPage = {
  page_number: number;
  extracted_text: string;
};

export type CachedDocument = {
  id: string;
  title: string;
  author: string | null;
  total_pages: number;
  pages: CachedPage[];
  savedAt: string;
};

export type QueuedEvent = {
  event_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type OfflineStore = {
  saveDocument: (document: CachedDocument) => Promise<void>;
  loadDocument: (id: string) => Promise<CachedDocument | null>;
  enqueue: (event: QueuedEvent) => Promise<void>;
  listQueue: () => Promise<QueuedEvent[]>;
  removeEvents: (ids: string[]) => Promise<void>;
};

const DOCUMENTS = "reading.documents";
const QUEUE = "reading.syncQueue";

function read<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const offline = {
  async saveDocument(document: CachedDocument) {
    const rows = read<CachedDocument>(DOCUMENTS).filter((row) => row.id !== document.id);
    rows.unshift(document);
    write(DOCUMENTS, rows);
  },
  async loadDocument(id: string) {
    return read<CachedDocument>(DOCUMENTS).find((row) => row.id === id) ?? null;
  },
  async enqueue(event: QueuedEvent) {
    const rows = read<QueuedEvent>(QUEUE).filter((row) => row.event_id !== event.event_id);
    rows.push(event);
    write(QUEUE, rows);
  },
  async listQueue() {
    return read<QueuedEvent>(QUEUE);
  },
  async removeEvents(ids: string[]) {
    const drop = new Set(ids);
    write(
      QUEUE,
      read<QueuedEvent>(QUEUE).filter((row) => !drop.has(row.event_id)),
    );
  },
};
