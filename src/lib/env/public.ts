/** This site key is public by design. Never add server secrets here. */
export const publicEnv = Object.freeze({
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
