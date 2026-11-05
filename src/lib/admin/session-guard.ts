import "server-only";
import type postgres from "postgres";
import { digest } from "./crypto.ts";
export class AdminSessionExpired extends Error {}
export async function lockAdminSession(tx: postgres.TransactionSql, token: string, admin: string) {
  const [user] = await tx`SELECT id FROM admin_users WHERE id=${admin} AND totp_enabled FOR UPDATE`;
  if (!user) throw new AdminSessionExpired();
  const [session] = await tx`SELECT id FROM admin_sessions WHERE id=${digest(token)} AND admin_id=${admin} AND authenticated AND expires_at>clock_timestamp() AND last_seen_at>clock_timestamp()-interval '30 minutes' FOR UPDATE`;
  if (!session) throw new AdminSessionExpired();
}
