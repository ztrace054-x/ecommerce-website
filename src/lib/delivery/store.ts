import 'server-only';
import postgres from 'postgres';
import { decryptDeliveryCode, encryptDeliveryCode, fingerprintDeliveryCode, normalizeDeliveryCode } from './crypto.ts';
import { lockAdminSession } from '../admin/session-guard.ts';
import { renderDeliveryEmail, sendDeliveryEmail } from './email.ts';
export function createDeliveryStore(url:string,key:string){
 const db=postgres(url,{max:5,prepare:false});
 const audit=async(tx:postgres.TransactionSql,admin:string,action:string,ip:string,order:string|null=null)=>{await tx`INSERT INTO audit_logs(admin_id,action,ip_hash,order_id) VALUES (${admin},${action},${ip},${order})`;};
 return {
  close:()=>db.end(),
  async upload(codes:string[],product:string,admin:string,ip:string,token:string){
   return db.begin(async tx=>{
    await lockAdminSession(tx,token,admin);
    const [p]=await tx`SELECT id FROM products WHERE id=${product} AND delivery_type='B' FOR SHARE`;if(!p)return null;
    let added=0,duplicates=0,invalid=0;const batch=new Set<string>();
    for(const raw of codes){let normalized:string;try{normalized=normalizeDeliveryCode(raw);}catch{invalid++;continue;}
     const fingerprint=fingerprintDeliveryCode(normalized,key);if(batch.has(fingerprint)){duplicates++;continue;}batch.add(fingerprint);
     const encrypted=encryptDeliveryCode(normalized,key);
     const rows=await tx`INSERT INTO delivery_codes(product_id,code_encrypted,encryption_iv,code_fingerprint,added_by) VALUES (${product},${encrypted.ciphertext},${encrypted.iv},${fingerprint},${admin}) ON CONFLICT DO NOTHING RETURNING id`;
     if(rows.length)added++;else duplicates++;
    }
    await audit(tx,admin,'admin.delivery.codes.uploaded',ip);
    return {added,duplicates,invalid};
   });
  },
  async stock(admin:string,ip:string){
   await db.begin(tx=>audit(tx,admin,'admin.delivery.stock.read',ip));
   return db`SELECT p.id,p.name,COUNT(dc.id) FILTER(WHERE dc.status='available')::int AS available,COUNT(dc.id) FILTER(WHERE dc.status='reserved')::int AS reserved,COUNT(dc.id) FILTER(WHERE dc.status='delivered')::int AS delivered,COUNT(dc.id) FILTER(WHERE dc.status='void')::int AS void FROM products p LEFT JOIN delivery_codes dc ON dc.product_id=p.id GROUP BY p.id ORDER BY p.name`;
  },
  async codeInventory(admin:string,ip:string){
   await db.begin(tx=>audit(tx,admin,'admin.delivery.codes.read',ip));
   return db`SELECT dc.id,p.name AS product_name,dc.status,dc.order_id,dc.created_at,dc.reserved_at,dc.delivered_at,dc.void_reason FROM delivery_codes dc JOIN products p ON p.id=dc.product_id ORDER BY dc.created_at DESC LIMIT 500`;
  },
  async assign(orderCode:string,admin:string,ip:string,token:string){
   return db.begin(async tx=>{
    await lockAdminSession(tx,token,admin);
    const [o]=await tx`SELECT id,status,product_id FROM orders WHERE order_code=${orderCode} FOR UPDATE`;if(!o||o.status!=='verified')return null;
    const [prior]=await tx`SELECT id,status FROM delivery_codes WHERE order_id=${o.id} FOR UPDATE`;
    if(prior)return prior.status==='reserved'?{assigned:true,existing:true}:null;
    const [candidate]=await tx`SELECT id FROM delivery_codes WHERE product_id=${o.product_id} AND status='available' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1`;if(!candidate)return {assigned:false,existing:false};
    await tx`UPDATE delivery_codes SET status='reserved',order_id=${o.id},reserved_at=now() WHERE id=${candidate.id}`;
    await audit(tx,admin,'admin.delivery.code.assigned',ip,o.id);return {assigned:true,existing:false};
   });
  },
  async reveal(orderCode:string,admin:string,ip:string,token:string){
   return db.begin(async tx=>{
    await lockAdminSession(tx,token,admin);
    const [row]=await tx`SELECT o.id,o.status,dc.code_encrypted FROM orders o JOIN delivery_codes dc ON dc.order_id=o.id WHERE o.order_code=${orderCode} AND o.status='verified' AND dc.status='reserved' FOR UPDATE OF o,dc`;
    if(!row)return null;
    await audit(tx,admin,'admin.delivery.code.revealed',ip,row.id);
    return decryptDeliveryCode(row.code_encrypted,key);
   });
  },
  async voidCode(id:string,reason:string,admin:string,ip:string,token:string){
   return db.begin(async tx=>{
    await lockAdminSession(tx,token,admin);
    const [observed]=await tx`SELECT order_id FROM delivery_codes WHERE id=${id}`;if(!observed)return false;
    const order:string|null=observed.order_id;
    if(order){const [o]=await tx`SELECT id,status FROM orders WHERE id=${order} FOR UPDATE`;if(!o||o.status!=='verified')return false;}
    const [code]=await tx`SELECT id,order_id,status FROM delivery_codes WHERE id=${id} FOR UPDATE`;
    if(!code||!['available','reserved'].includes(code.status)||code.order_id!==order)return false;
    if(order){
     await tx`UPDATE orders SET admin_note=${reason} WHERE id=${order}`;}
    await tx`UPDATE delivery_codes SET status='void',order_id=NULL,void_reason=${reason} WHERE id=${id}`;
    await audit(tx,admin,'admin.delivery.code.voided',ip,order);return true;
   });
  },
  async send(orderCode:string,admin:string,ip:string,token:string,settings:{from:string;apiKey:string;mode:'resend'|'log-safe';supportNumber:string},sender=sendDeliveryEmail){
   // Keep the order/code locks until the bounded provider request finishes, so
   // void/refund/deliver cannot invalidate the code between selection and send.
   return db.begin(async tx=>{
    await lockAdminSession(tx,token,admin);
    const [o]=await tx`SELECT o.id,o.order_code,o.status,o.customer_email,o.delivery_email_attempts,p.name,p.delivery_instructions,dc.code_encrypted,dc.status AS code_status FROM orders o JOIN products p ON p.id=o.product_id JOIN delivery_codes dc ON dc.order_id=o.id WHERE o.order_code=${orderCode} FOR UPDATE OF o,dc`;
    if(!o||o.status!=='verified'||o.code_status!=='reserved')return {sent:false,limited:false};
    if(Number(o.delivery_email_attempts)>=3)return {sent:false,limited:true};
    const [attempt]=await tx`INSERT INTO delivery_email_attempts(order_id,attempted_by) VALUES (${o.id},${admin}) RETURNING id`;
    await tx`UPDATE orders SET delivery_email_attempts=delivery_email_attempts+1 WHERE id=${o.id}`;
    await audit(tx,admin,'admin.delivery.email.requested',ip,o.id);
    try{
     if(!settings.apiKey||settings.mode==='log-safe')console.info(JSON.stringify({event:'admin.delivery.email.preview',content:'[REDACTED]'}));
     else await sender(renderDeliveryEmail({to:o.customer_email,from:settings.from,orderCode:o.order_code,productName:o.name,deliveryCode:decryptDeliveryCode(o.code_encrypted,key),instructions:o.delivery_instructions,supportUrl:`https://wa.me/${settings.supportNumber}`}),settings.apiKey);
    }catch{
     await audit(tx,admin,'admin.delivery.email.failed',ip,o.id);
     return {sent:false,limited:false};
    }
    await tx`UPDATE delivery_email_attempts SET succeeded=true WHERE id=${attempt!.id}`;
    await tx`UPDATE orders SET delivery_email_sent_at=now() WHERE id=${o.id}`;
    await audit(tx,admin,'admin.delivery.email.sent',ip,o.id);
    return {sent:true,limited:false};
   });
  },
 };
}
