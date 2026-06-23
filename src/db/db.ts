import Dexie, { type EntityTable } from "dexie";
import type { HistoryRecord } from "../types";

const DB_NAME = "resume-optimizer";
const MAX_HISTORY = 5;

const db = new Dexie(DB_NAME) as Dexie & {
  history: EntityTable<HistoryRecord, "id">;
  settings: EntityTable<{ key: string; value: any }, "key">;
};

db.version(1).stores({
  history: "id, createdAt",
});

db.version(2).stores({
  history: "id, createdAt",
  settings: "key",
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

/** 读取配置项 */
async function getSetting<T = any>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

/** 写入配置项 */
async function setSetting(key: string, value: any): Promise<void> {
  await db.settings.put({ key, value });
}

/** 删除配置项 */
async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}

export { db, putHistory, getSetting, setSetting, deleteSetting };
export type { HistoryRecord };
