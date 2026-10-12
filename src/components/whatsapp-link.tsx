import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";

/** Real WhatsApp configuration and wa.me order links are deferred to Phase 6. */
export function WhatsAppLink() {
  return (
    <Link href="/contact#whatsapp" className="whatsapp-float"
      aria-label="WhatsApp যোগাযোগের তথ্য দেখুন" title="WhatsApp যোগাযোগ">
      <WhatsAppIcon />
      <span>যোগাযোগ</span>
    </Link>
  );
}
