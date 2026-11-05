import "server-only";
import postgres from "postgres";
import { decrypt, digest, equal, hashPassword, opaque, totp, verifyPassword } from "./crypto.ts";
import { lockAdminSession } from "./session-guard.ts";
export { AdminSessionExpired } from "./session-guard.ts";
export function createAdminStore(url: string, key: string) {
  const db = postgres(url, { max: 5, prepare: false });
  const dummy = hashPassword(opaque());
  const audit = async (tx: postgres.TransactionSql, admin: string | null, action: string, ip: string, order: string | null = null) => {
    await tx`INSERT INTO audit_logs(admin_id,action,ip_hash,order_id) VALUES (${admin},${action},${ip},${order})`;
  };
  async function issue(tx: postgres.TransactionSql, admin: string, ip: string, ua: string, full: boolean) {
    const token = opaque(), csrf = opaque();
    await tx`INSERT INTO admin_sessions(id,admin_id,csrf_hash,authenticated,expires_at,ip_hash,user_agent_hash) VALUES (${digest(token)},${admin},${digest(csrf)},${full},now()+${full ? '8 hours' : '5 minutes'}::interval,${ip},${ua})`;
    return { token, csrf };
  }
  return {
    close: () => db.end(),
    async login(email: string, password: string, ip: string, ua: string) {
      return db.begin(async tx => {
        const [user] = await tx`SELECT * FROM admin_users WHERE email=${email} FOR UPDATE`;
        const valid = await verifyPassword(user?.password_hash ?? await dummy, password);
        if (!user || !valid || !user.totp_enabled || (user.locked_until && new Date(user.locked_until).getTime() > Date.now())) {
          if (user) await tx`UPDATE admin_users SET failed_login_count=failed_login_count+1, locked_until=CASE WHEN failed_login_count+1>=5 THEN now()+make_interval(secs=>LEAST(3600,30*power(2,LEAST(failed_login_count-3,7)))::int) ELSE locked_until END WHERE id=${user.id}`;
          await audit(tx,user?.id ?? null,"admin.login.failed",ip);return null;
        }
        await audit(tx,user.id,"admin.login.password",ip);
        return issue(tx,user.id,ip,ua,false);
      });
    },
    async session(token: string, ua: string, pending = false) {
      const [s] = await db`UPDATE admin_sessions SET last_seen_at=now() WHERE id=${digest(token)} AND user_agent_hash=${ua} AND expires_at>now() AND last_seen_at>now()-interval '30 minutes' AND (authenticated OR ${pending}) AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id=admin_sessions.admin_id AND totp_enabled) RETURNING admin_id,csrf_hash,authenticated`;
      return s ?? null;
    },
    async second(token: string, code: string, csrf: string, ip: string, ua: string) {
      return db.begin(async tx => {
        const [candidate] = await tx`SELECT admin_id FROM admin_sessions WHERE id=${digest(token)}`;
        if (!candidate) return null;
        const [u] = await tx`SELECT * FROM admin_users WHERE id=${candidate.admin_id} FOR UPDATE`;
        const [s] = await tx`SELECT * FROM admin_sessions WHERE id=${digest(token)} AND user_agent_hash=${ua} AND NOT authenticated AND expires_at>clock_timestamp() AND last_seen_at>clock_timestamp()-interval '30 minutes' FOR UPDATE`;
        if (!s || !equal(s.csrf_hash,digest(csrf))) return null;
        if (!u || !u.totp_enabled || (u.locked_until && new Date(u.locked_until).getTime()>Date.now())) return null;
        let valid:boolean;
        if (/^\d{6}$/.test(code)) {
          const timestamp=Date.now();
          const delta=totp(decrypt(u.totp_secret_encrypted,key)).validate({token:code,window:1,timestamp});
          const step=Math.floor(timestamp/30000)+(delta??0);
          valid=delta!==null && step>Number(u.last_totp_step);
          if(valid)await tx`UPDATE admin_users SET last_totp_step=${step} WHERE id=${u.id}`;
        } else {
          const rows=await tx`UPDATE admin_recovery_codes SET used_at=now() WHERE admin_id=${u.id} AND code_hash=${digest(code)} AND used_at IS NULL RETURNING admin_id`;
          valid=rows.length===1;
        }
        if(!valid){await tx`UPDATE admin_users SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN failed_login_count+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=${u.id}`;await audit(tx,u.id,"admin.2fa.failed",ip);return null;}
        await tx`DELETE FROM admin_sessions WHERE id=${s.id}`;
        await tx`UPDATE admin_users SET failed_login_count=0,locked_until=NULL,last_login_at=now() WHERE id=${u.id}`;
        await audit(tx,u.id,"admin.login.complete",ip);
        return issue(tx,u.id,ip,ua,true);
      });
    },
    async password(token:string,oldPassword:string,newHash:string,admin:string,ip:string) {
      return db.begin(async tx=>{
        await lockAdminSession(tx,token,admin);
        const [u]=await tx`SELECT password_hash FROM admin_users WHERE id=${admin}`;
        if(!u || !await verifyPassword(u.password_hash,oldPassword)){await audit(tx,admin,"admin.password.failed",ip);return false;}
        await tx`UPDATE admin_users SET password_hash=${newHash} WHERE id=${admin}`;
        await tx`DELETE FROM admin_sessions WHERE admin_id=${admin}`;
        await audit(tx,admin,"admin.password.changed",ip);return true;
      });
    },
    async logout(token: string, admin: string, ip: string) { await db.begin(async tx=>{await lockAdminSession(tx,token,admin);await tx`DELETE FROM admin_sessions WHERE id=${digest(token)}`;await audit(tx,admin,"admin.logout",ip);}); },
    async readAudit(admin:string,action:string,ip:string){await db.begin(tx=>audit(tx,admin,action,ip));},
    async orders(page: number, status: string, search: string, from: string, until: string) {
      return db`SELECT order_code,status,amount_expected,created_at FROM orders WHERE (${status}='' OR status=${status}) AND (${search}='' OR order_code=${search.toUpperCase()} OR right(trx_id,4)=${search.toUpperCase()} OR right(sender_bkash_number,4)=${search}) AND (${from}='' OR created_at>=NULLIF(${from},'')::date) AND (${until}='' OR created_at<NULLIF(${until},'')::date+interval '1 day') ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ${(page-1)*25}`;
    },
    async detail(code: string) { const [row]=await db`SELECT o.order_code,o.status,p.name AS product_name,o.amount_expected,o.customer_name,o.customer_email,o.whatsapp,o.sender_bkash_number,o.trx_id,o.created_at,o.verified_at,o.delivered_at,o.admin_note,o.rejected_reason,o.delivery_channel,o.delivery_sent_to,(SELECT status FROM delivery_codes dc WHERE dc.order_id=o.id) AS delivery_code_status FROM orders o JOIN products p ON p.id=o.product_id WHERE order_code=${code}`;return row??null; },
    async action(code: string, action: string, note: string, reason: string, admin: string, ip: string, token: string, channel: "email"|"whatsapp"|"") {
      return db.begin(async tx=>{
        await lockAdminSession(tx,token,admin);
        const [o]=await tx`SELECT id,status FROM orders WHERE order_code=${code} FOR UPDATE`;
        const allowed:Record<string,string[]>={verified:["submitted"],rejected:["submitted"],delivered:["verified"],refunded:["rejected","verified"]};
        if(!o || !allowed[action]?.includes(o.status))return false;
        if(action==='delivered'){
          const codes=await tx`SELECT id FROM delivery_codes WHERE order_id=${o.id} AND status='reserved' FOR UPDATE`;
          if(codes.length!==1||!channel)return false;
          await tx`UPDATE delivery_codes SET status='delivered',delivered_at=now() WHERE id=${codes[0]!.id}`;
          const destinations=await tx`SELECT customer_email,COALESCE(whatsapp,sender_bkash_number) AS phone FROM orders WHERE id=${o.id}`;
          const sentTo=channel==='email'?destinations[0]!.customer_email:destinations[0]!.phone;
          await tx`UPDATE orders SET status=${action},admin_note=${note},delivery_channel=${channel},delivery_sent_to=${sentTo},rejected_reason=CASE WHEN ${action}='rejected' THEN ${reason} ELSE rejected_reason END,verified_by=CASE WHEN ${action}='verified' THEN ${admin}::uuid ELSE verified_by END,verified_at=CASE WHEN ${action}='verified' THEN now() ELSE verified_at END,delivered_at=now() WHERE id=${o.id}`;
        }else await tx`UPDATE orders SET status=${action},admin_note=${note},rejected_reason=CASE WHEN ${action}='rejected' THEN ${reason} ELSE rejected_reason END,verified_by=CASE WHEN ${action}='verified' THEN ${admin}::uuid ELSE verified_by END,verified_at=CASE WHEN ${action}='verified' THEN now() ELSE verified_at END WHERE id=${o.id}`;
        await audit(tx,admin,`admin.order.${action}`,ip,o.id);return true;
      });
    },
    async products(){return db`SELECT id,name,description,price_bdt,is_active,delivery_type,delivery_instructions FROM products ORDER BY created_at DESC`;},
    async product(id:string,name:string,description:string,price:number,active:boolean,admin:string,ip:string,token:string,instructions:string){return db.begin(async tx=>{await lockAdminSession(tx,token,admin);const rows=await tx`UPDATE products SET name=${name},description=${description},price_bdt=${price},is_active=${active},delivery_instructions=${instructions} WHERE id=${id} RETURNING id`;if(!rows.length)return false;await audit(tx,admin,"admin.product.updated",ip);return true;});},
    async audits(page:number){return db`SELECT admin_id,action,order_id,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ${(page-1)*25}`;},
  };
}
