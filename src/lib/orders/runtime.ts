import "server-only";
import { loadOrderEnv } from "../env/orders.ts";
import { createOrderStore } from "./store.ts";
let runtime: { config: ReturnType<typeof loadOrderEnv>; store: ReturnType<typeof createOrderStore> } | undefined;
export function orderRuntime() {
  if (!runtime) {
    const config = loadOrderEnv();
    runtime = { config, store: createOrderStore(config.DATABASE_URL) };
  }
  return runtime;
}
