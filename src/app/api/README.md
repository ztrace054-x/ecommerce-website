# Future API routes

This folder reserves the App Router API boundary. It has no `route.ts` files,
so Phase 0 exposes no order, payment, delivery, or administrator endpoints.

Later handlers must validate input and apply server-side authorization and the
relevant abuse protections. Never trust a price, status, role, or voucher claim
from a browser. Do not add placeholder handlers that approve every request.
