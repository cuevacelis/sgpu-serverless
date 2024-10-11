import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { DB } from "../lib/types/typesDB";

let dbInstance: Kysely<DB> | null = null;

export default function getDbPostgres(): Kysely<DB> {
  if (!dbInstance) {
    const pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });

    dbInstance = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
    });
  }
  return dbInstance;
}
