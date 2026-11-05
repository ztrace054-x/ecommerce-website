import assert from 'node:assert/strict';
import test from 'node:test';
import postgres from 'postgres';
import { randomBytes } from 'node:crypto';
import { createAdminHandler } from '../../src/lib/admin/handler.ts';
import { createAdminStore } from '../../src/lib/admin/store.ts';
import { createOrderStore } from '../../src/lib/orders/store.ts';
import { createDeliveryStore } from '../../src/lib/delivery/store.ts';
import { digest, opaque, hashPassword, encrypt, newTotpSecret } from '../../src/lib/admin/crypto.ts';
import type { AdminEnv } from '../../src/lib/admin/config.ts';
const url='postgres://postgres@127.0.0.1:55432/ecommerce_test';
test('every admin POST consumes shared quotas and active lockouts cannot be extended',async()=>{
 const key=randomBytes(32).toString('base64'),db=postgres(url),store=createAdminStore(url,key),limiter=createOrderStore(url),delivery=createDeliveryStore(url,key);
 const config:AdminEnv={DATABASE_URL:url,IP_HASH_SECRET:opaque(),TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:'https://localhost:3000',ALLOWED_ORIGINS:['https://localhost:3000'],TRUSTED_PROXY_MODE:'local',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000',ADMIN_SECRET_KEY:key,ADMIN_PATH_PREFIX:'/manage-test',ADMIN_IP_ALLOWLIST:[],DELIVERY_CODE_KEY:key,EMAIL_FROM:'synthetic@example.invalid',EMAIL_MODE:'log-safe',RESEND_API_KEY:''};
 const paths=['login','second','password','logout','action','products','codes/upload','codes/assign','codes/reveal','codes/void','email'];
 const seen:string[]=[];
 const h=createAdminHandler(config,store,{...limiter,rateLimit:async(k)=>{seen.push(k);return 60;}},async()=>true,delivery);
 for(const path of paths){const r=await h(new Request(`${config.SITE_ORIGIN}/manage-test/api/${path}`,{method:'POST',headers:{origin:config.SITE_ORIGIN,'content-type':'application/json'},body:'{}'}),path);assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');assert.doesNotMatch(await r.text(),/password_hash|totp|postgres|SELECT/);}
 assert.equal(new Set(seen).size,1,'all routes share one IP budget');
 let admin='';const email=opaque().toLowerCase()+'@example.invalid';
 try{
  const [u]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted,failed_login_count,locked_until) VALUES (${email},${await hashPassword(opaque())},${encrypt(newTotpSecret(),key)},5,now()+interval '15 minutes') RETURNING id,locked_until`;admin=u!.id;
  assert.equal(await store.login(email,'synthetic-wrong', 'synthetic',digest('synthetic')),null);
  const [after]=await db`SELECT locked_until,failed_login_count FROM admin_users WHERE id=${admin}`;
  assert.equal(after!.locked_until.getTime(),u!.locked_until.getTime());assert.equal(after!.failed_login_count,5);
 }finally{if(admin){await db`DELETE FROM audit_logs WHERE admin_id=${admin}`;await db`DELETE FROM admin_users WHERE id=${admin}`;}await db.end();await store.close();await limiter.close();await delivery.close();}
});
