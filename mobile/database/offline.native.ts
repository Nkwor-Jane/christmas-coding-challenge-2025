import * as SQLite from "expo-sqlite";
import type { CachedDocument, OfflineStore, QueuedEvent } from "./offline";

let database: SQLite.SQLiteDatabase | null = null;

async function db() {
  if (!database) {
    database = await SQLite.openDatabaseAsync("reading-companion.db");
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_documents (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        payload TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        event_id TEXT PRIMARY KEY NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return database;
}

export const offline: OfflineStore = {
  async saveDocument(document) {
    const connection = await db();
    await connection.runAsync(
      `INSERT OR REPLACE INTO cached_documents (id, title, author, payload, saved_at)
       VALUES (?, ?, ?, ?, ?)`,
      document.id,
      document.title,
      document.author,
      JSON.stringify(document),
      document.savedAt,
    );
  },
  async loadDocument(id) {
    const connection = await db();
    const row = await connection.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM cached_documents WHERE id = ?",
      id,
    );
    return row ? (JSON.parse(row.payload) as CachedDocument) : null;
  },
  async enqueue(event) {
    const connection = await db();
    await connection.runAsync(
      `INSERT OR REPLACE INTO sync_queue (event_id, event_type, payload, created_at)
       VALUES (?, ?, ?, ?)`,
      event.event_id,
      event.type,
      JSON.stringify(event.payload),
      event.created_at,
    );
  },
  async listQueue() {
    const connection = await db();
    const rows = await connection.getAllAsync<{
      event_id: string;
      event_type: string;
      payload: string;
      created_at: string;
    }>("SELECT event_id, event_type, payload, created_at FROM sync_queue ORDER BY created_at");
    return rows.map((row) => ({
      event_id: row.event_id,
      type: row.event_type,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      created_at: row.created_at,
    }));
  },
  async removeEvents(ids) {
    if (ids.length === 0) return;
    const connection = await db();
    const marks = ids.map(() => "?").join(",");
    await connection.runAsync(`DELETE FROM sync_queue WHERE event_id IN (${marks})`, ...ids);
  },
};
