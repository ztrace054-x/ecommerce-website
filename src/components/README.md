# Reusable interface components

Phase 1 uses small shared components for the header, footer, product cards,
icons, policy layout, floating WhatsApp link, and checkout preview.

Only `checkout-preview.tsx` is a Client Component. It uses native input validity
for local demo feedback. There is no HTML form, submit button, input name,
network request, logging, or persistent storage. A different product remounts
the preview so sample input does not carry across plans.

Keep browser interaction separate from database access, administrator
authorization, secret configuration, and real payment decisions.
