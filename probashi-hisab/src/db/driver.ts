export type SqlValue = string | number | null;

/** The minimal SQL surface the repository needs. Implemented by expo-sqlite and, in tests, node:sqlite. */
export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}
