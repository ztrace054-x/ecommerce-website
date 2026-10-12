# Shared customer interface

Small components serve the Bangla layout, product cards, policy pages, FAQ links,
icons and local checkout preview. ProductCard accepts only the public catalog
projection; database reads stay in server pages/data access. No raw HTML is used.

CheckoutPreview still sends/stores no input. Its fields are for synthetic preview
only. The floating WhatsApp icon opens Contact until an authorized real number is
configured in Phase 6. No component authenticates an admin or verifies a payment.
