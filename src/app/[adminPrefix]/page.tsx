import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminPanel } from '../../components/admin-panel';
import { loadAdminEnv } from '../../lib/admin/config';
import { getClientIp } from '../../lib/orders/security';
export const metadata={robots:{index:false,follow:false}};
export default async function AdminPage({params}:{params:Promise<{adminPrefix:string}>}){
 const {adminPrefix}=await params;
 if(`/${adminPrefix}`!==(process.env.ADMIN_PATH_PREFIX??'/manage-x7'))notFound();
 const config=loadAdminEnv(),h=await headers();
 if(config.ADMIN_IP_ALLOWLIST.length&&!config.ADMIN_IP_ALLOWLIST.includes(getClientIp(new Request(config.SITE_ORIGIN,{headers:h}),config.TRUSTED_PROXY_MODE)))notFound();
 return <AdminPanel prefix={config.ADMIN_PATH_PREFIX} siteKey={config.NEXT_PUBLIC_TURNSTILE_SITE_KEY} nonce={h.get('x-nonce')??''}/>;
}
