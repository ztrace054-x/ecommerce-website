import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";
import { supportDetails } from "@/lib/support";

export function WhatsAppLink() {
  const { whatsapp } = supportDetails();
  if (whatsapp)
    return (
      <a
        href={`https://wa.me/${whatsapp}`}
        className="whatsapp-float"
        aria-label="WhatsApp-এ যোগাযোগ করুন"
        title="WhatsApp যোগাযোগ"
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon />
        <span>যোগাযোগ</span>
      </a>
    );
  return (
    <Link
      href="/contact#whatsapp"
      className="whatsapp-float"
      aria-label="WhatsApp যোগাযোগের তথ্য দেখুন"
      title="WhatsApp যোগাযোগ"
    >
      <WhatsAppIcon />
      <span>যোগাযোগ</span>
    </Link>
  );
}
