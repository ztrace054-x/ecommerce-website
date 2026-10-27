export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { loadOrderEnv } = await import("./lib/env/orders.ts");
    loadOrderEnv();
  }
}
