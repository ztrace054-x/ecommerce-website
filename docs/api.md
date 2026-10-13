# API contract

All responses use JSON. Failures use `{ "error": { "code": "…", "message": "…" } }`;
validation errors may include field names, never their submitted values.
All responses are `no-store`; admin/customer private data is never cacheable.
Mutation and tracking requests must carry the exact APP_URL Origin and
`Content-Type: application/json`. Cross-origin credentials/CORS are not enabled.
Bodies are streamed with a 16 KiB limit (login: 4 KiB).

## Quote and claim

POST `/api/orders/quote` accepts only `{ "productId": "<UUID>" }` and returns a
`quote` with `orderCode`, `quoteToken`, `product`, `amountPoisha`, `recipient`,
`paymentMethod` and `expiresAt`. The quote contains no customer record. The token
is secret; store/copy it privately, never put it in links or logs.

POST `/api/orders` accepts `quoteToken`, `customerName`, `customerEmail`,
`bkashSender`, optional `whatsapp`, `trxId`, `turnstileToken`, `acceptedTerms:true`.
Client prices/product IDs/status values are rejected. A fresh provider challenge
is required for each attempt, including retry. Successful responses contain
`order:{orderCode,status}` and `accessKey`; the access key is the checkout token.
Identical claims are idempotent; different data for a consumed session conflicts.
TrxID matching never marks payment verified.

POST `/api/orders/track` accepts `orderCode`, `customerEmail`, `accessKey`.
Missing orders/wrong credentials use the same 404 message. It returns only the
service name, amount, status/timestamps and an explicit customer message.
POST `/api/orders/validate-transaction` performs syntax validation only; it
returns no database availability information about somebody else's TrxID.

## Administrator

POST `/api/admin/auth/login` accepts email/password. Provider tokens are never
returned to JavaScript; the response sets an HttpOnly cookie. GET `/session`
checks provider and DB role/session. POST `/logout` revokes the application
session and expires the cookie. No signup or default-password route exists.

GET `/api/admin/orders?q=…&status=all&page=1` returns 25 orders/page and total.
GET `/api/admin/orders/[id]` returns order, internal notes and audit events.
PATCH that route accepts `status`, `expectedVersion`, `note`, optional
`customerMessage`. Verification also requires `checkedPayment:true` and
`verifiedAmountPoisha` matching the actual amount. Delivery requires
`completedDelivery:true`. Rejection requires a customer message. The DB permits
only submitted→verified/rejected and verified→delivered, with version checking.
POST `/notes` adds a private note. GET `/api/admin/overview` returns counts.
GET `/api/admin/audit?page=1` returns 50 events/page and total.

GET `/api/admin/products` returns all products. POST creates a service; PATCH
`/api/admin/products/[id]` accepts the complete editable product representation:
slug/name/category/description, pricePoisha, unit/duration/icon/includes,
deliveryType:"service", deliveryMethod/deliveryNote/terms/active. Disable a
product with active:false. IDs, hashes and audit records cannot be overwritten.
Existing order/quote snapshots remain unchanged by product edits.

## Error statuses

400 malformed JSON; 401 missing/expired/revoked authentication; 403 origin or
role rejection; 404 inaccessible order; 409 duplicate/stale/invalid transition;
413 actual body too large; 415 wrong content type; 422 field/evidence validation;
429 atomic rate limit (Retry-After); 503 closed/unconfigured/unavailable provider.
Unexpected failures return a generic 500 with no raw error or secret.
