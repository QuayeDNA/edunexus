import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

export function createClient(connectionString?: string) {
  const pool = new Pool({
    connectionString: connectionString ?? process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

export type DatabaseClient = ReturnType<typeof createClient>;
