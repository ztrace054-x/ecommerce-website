import "server-only";
export function supportDetails() {
  const raw =
    process.env.SUPPORT_WHATSAPP_NUMBER?.trim().replace(/^\+/, "") ?? "";
  const email = process.env.SUPPORT_EMAIL?.trim() ?? "";
  return {
    whatsapp: /^[1-9][0-9]{7,14}$/.test(raw) ? raw : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
  };
}
