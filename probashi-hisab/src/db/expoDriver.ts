import * as SQLite from 'expo-sqlite';

import type { SqlDriver, SqlValue } from './driver';

export async function openExpoDriver(name = 'probashi-hisab.db'): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => {
      await db.runAsync(sql, params);
    },
    all: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
  };
}
