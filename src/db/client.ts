import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export function connectDatabase(url: string) {
  const client = postgres(url, { max: 5, prepare: false, connect_timeout: 5, idle_timeout: 20 });
  return { db: drizzle(client), close: () => client.end() };
}
