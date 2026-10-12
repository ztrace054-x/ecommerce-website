import "server-only";
import { adminUsers } from "../db/schema.ts";
import { adminCreationSchema } from "./validators.ts";
import { hashPassword } from "./security/password.ts";
import { getDatabase, type Database } from "./database/connection.ts";
import { DataAccessError, isDatabaseError } from "./database/errors.ts";

/** Terminal provisioning only; creates an unenrolled identity, never a session. */
export async function createAdminUser(input: unknown, db?: Database) {
  const data = adminCreationSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    const [admin] = await (db ?? getDatabase()).insert(adminUsers).values({ email: data.email, passwordHash })
      .returning({ id: adminUsers.id });
    if (!admin) throw new DataAccessError();
    return admin;
  } catch (error) {
    if (isDatabaseError(error, "23505", "admin_users_email_unique")) {
      throw new DataAccessError("An administrator with this email already exists. No password was changed.");
    }
    throw new DataAccessError("Administrator creation failed.");
  }
}
