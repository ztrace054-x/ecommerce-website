Supabase Auth verifies admin passwords; every admin operation checks provider token plus active, unexpired/unrevoked database session. See docs/security.md. No shared secret/default-password bypass.
