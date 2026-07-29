type RuntimeBindings = typeof globalThis & {
  __REKOLT_D1_DATABASE__?: D1Database;
};

/** Worker entrypoint installs the request-scoped D1 binding before routing. */
export function setRuntimeDatabase(database?: D1Database): void {
  (globalThis as RuntimeBindings).__REKOLT_D1_DATABASE__ = database;
}

/** Application modules use this portable helper instead of runtime-only imports. */
export function getRuntimeDatabase(): D1Database {
  const database = (globalThis as RuntimeBindings).__REKOLT_D1_DATABASE__;
  if (!database) {
    throw new Error("Shop account storage is unavailable.");
  }
  return database;
}
