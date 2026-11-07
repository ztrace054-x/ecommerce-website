export async function register() {
  // Preview deployments are intentionally UI-only: no admin/database secrets are required.
  if (process.env.VERCEL_ENV === "preview") return;
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { loadAdminEnv } = await import("./lib/admin/config.ts");
    loadAdminEnv();
  }
}
