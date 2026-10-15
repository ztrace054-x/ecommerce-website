import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin-console";
export const metadata: Metadata = {
  title: "অ্যাডমিন ড্যাশবোর্ড",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return (
    <div className="container page-space admin-page">
      <AdminConsole />
    </div>
  );
}
