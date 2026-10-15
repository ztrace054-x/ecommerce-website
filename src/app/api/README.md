Implemented product list/single-product GET, quote, payment-claim, private-tracking
and protected admin routes. Keep handlers thin: validate input, enforce access,
call server-only catalog/RPC services, and return the shared private/no-store JSON
error shape. The browser must never import database adapters. See docs/api.md for
contracts and docs/phase-2-foundation-audit.md for current scope. No new admin UI,
provider activation or deployment belongs to this phase.
