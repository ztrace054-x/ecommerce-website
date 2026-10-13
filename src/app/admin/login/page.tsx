import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin-login";
import { databaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "অ্যাডমিন লগইন",
  robots: { index: false, follow: false },
};
export default function LoginPage() {
  let available: boolean;
  try {
    available = Boolean(databaseConfig()) && Boolean(process.env.APP_URL);
  } catch {
    available = false;
  }
  return (
    <div className="container page-space">
      <AdminLogin available={available} />
    </div>
  );
}
