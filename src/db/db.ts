import Dexie, { type EntityTable } from "dexie";
import type { HistoryRecord } from "../types";

const DB_NAME = "resume-optimizer";
const DB_VERSION = 1;
const MAX_HISTORY = 5;

const db = new Dexie(DB_NAME) as Dexie & {
  history: EntityTable<HistoryRecord, "id">;
};

db.version(DB_VERSION).stores({
  history: "id, createdAt",
});

/** 写入记录并自动清理超出上限的旧记录（保留最新 MAX_HISTORY 条） */
async function putHistory(record: HistoryRecord): Promise<void> {
  await db.history.put(record);
  const all = await db.history.orderBy("createdAt").reverse().toArray();
  if (all.length > MAX_HISTORY) {
    const toDelete = all.slice(MAX_HISTORY).map((r) => r.id);
    await db.history.bulkDelete(toDelete);
  }
}

export { db, putHistory };
export type { HistoryRecord };
