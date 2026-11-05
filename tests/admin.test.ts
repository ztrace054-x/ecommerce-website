import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import postgres from 'postgres';
import { createAdminStore } from '../src/lib/admin/store.ts';
import { createAdminHandler } from '../src/lib/admin/handler.ts';
import { createOrderStore } from '../src/lib/orders/store.ts';
import { createDeliveryStore } from '../src/lib/delivery/store.ts';
import { digest,encrypt,hashPassword,newTotpSecret,opaque,totp } from '../src/lib/admin/crypto.ts';
import { randomBytes } from 'node:crypto';
import type { AdminEnv } from '../src/lib/admin/config.ts';
const url='postgres://postgres@127.0.0.1:55432/ecommerce_test';
const key=randomBytes(32).toString('base64');
const config:AdminEnv={DATABASE_URL:url,IP_HASH_SECRET:opaque(),TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:'https://localhost:3000',ALLOWED_ORIGINS:['https://localhost:3000'],TRUSTED_PROXY_MODE:'local',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000',ADMIN_SECRET_KEY:key,ADMIN_PATH_PREFIX:'/manage-test',ADMIN_IP_ALLOWLIST:[],DELIVERY_CODE_KEY:randomBytes(32).toString('base64'),EMAIL_FROM:'delivery@example.invalid',EMAIL_MODE:'log-safe' as const,RESEND_API_KEY:''};
test('admin authentication and transaction security with local PostgreSQL',async t=>{
 const db=postgres(url),store=createAdminStore(url,key),limiter=createOrderStore(url),delivery=createDeliveryStore(url,config.DELIVERY_CODE_KEY);
 const handler=createAdminHandler(config,store,limiter,async()=>true,delivery);
 const secret=newTotpSecret(),password=opaque(),email='admin-test@example.invalid';
 const recovery=opaque();
 let admin='';
 const request=(path:string,body:unknown,token='',csrf='')=>handler(new Request(`https://localhost:3000/manage-test/api/${path}`,{method:'POST',headers:{origin:config.SITE_ORIGIN,'content-type':'application/json','user-agent':'synthetic-agent',cookie:`__Host-admin=${token}`,'x-csrf-token':csrf},body:JSON.stringify(body)}),path);
 const login=()=>request('login',{email,password,turnstileToken:'synthetic-token'});
 const tokenOf=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0]!.split('=')[1]!;
 try{
  const [row]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${email},${await hashPassword(password)},${encrypt(secret,key)}) RETURNING id`;admin=row!.id;
  await db`INSERT INTO admin_recovery_codes(admin_id,code_hash) VALUES (${admin},${digest(recovery)})`;
  await t.test('unknown email and incorrect password return identical errors',async()=>{
   const wrong=await request('login',{email,password:'incorrect synthetic password',turnstileToken:'synthetic-token'});
   const unknown=await request('login',{email:'missing@example.invalid',password:'incorrect synthetic password',turnstileToken:'synthetic-token'});
   assert.equal(wrong.status,401);assert.equal(unknown.status,401);assert.deepEqual(await wrong.json(),await unknown.json());
  });
  await t.test('five failed logins lock the account',async()=>{
   await db`UPDATE admin_users SET failed_login_count=0,locked_until=NULL WHERE id=${admin}`;
   await db`TRUNCATE order_rate_events`;
   for(let i=0;i<5;i++)assert.equal((await request('login',{email,password:'incorrect synthetic password',turnstileToken:'synthetic-token'})).status,401);
   assert.equal((await login()).status,401);
   const [u]=await db`SELECT locked_until FROM admin_users WHERE id=${admin}`;assert.ok(new Date(u!.locked_until).getTime()>Date.now());
  });
  await t.test('half sessions denied; CSRF enforced; TOTP rotates token and replay fails',async()=>{
   await db`UPDATE admin_users SET failed_login_count=0,locked_until=NULL WHERE id=${admin}`;await db`TRUNCATE order_rate_events`;
   const first=await login();assert.equal(first.status,200);const pending=tokenOf(first),csrf=(await first.json()).csrf;
   for(const path of ['orders','products','audit']){
    const result=await handler(new Request(`https://localhost:3000/manage-test/api/${path}`,{headers:{cookie:`__Host-admin=${pending}`,'user-agent':'synthetic-agent'}}),path);assert.equal(result.status,404);
   }
   assert.equal((await request('second',{code:totp(secret).generate()},pending)).status,403);
   const code=totp(secret).generate();const second=await request('second',{code},pending,csrf);assert.equal(second.status,200);
   const full=tokenOf(second);assert.notEqual(full,pending);
   assert.equal(await store.session(pending,digest('synthetic-agent'),true),null);
   const again=await login();const againCsrf=(await again.json()).csrf;
   assert.equal((await request('second',{code},tokenOf(again),againCsrf)).status,401);
   const recovered=await request('second',{code:recovery},tokenOf(again),againCsrf);assert.equal(recovered.status,200);
   const third=await login();assert.equal((await request('second',{code:recovery},tokenOf(third),(await third.json()).csrf)).status,401);
   const fullCsrf=(await second.json()).csrf;
   assert.equal((await request('logout',{},full,fullCsrf)).status,200);assert.equal(await store.session(full,digest('synthetic-agent')),null);
  });
  await t.test('protected API boundaries, actions, concurrency, price snapshots and audit',async()=>{
   await db`TRUNCATE order_rate_events`;
   await db`UPDATE admin_users SET failed_login_count=0,locked_until=NULL WHERE id=${admin}`;
   const issued=await store.login(email,password,'synthetic-ip',digest('synthetic-agent'));assert.ok(issued);
   await db`UPDATE admin_sessions SET authenticated=true WHERE id=${digest(issued.token)}`;
   for(const path of ['orders','products','audit','orders/ORD-ABCDEFGH']){
    const result=await handler(new Request(`https://localhost:3000/manage-test/api/${path}`),path);assert.equal(result.status,404);
   }
   for(const path of ['action','products','password','logout'])assert.equal((await request(path,{})).status,404);
   assert.equal((await request('action',{},issued.token)).status,403);
   assert.equal((await request('action',{},issued.token,'incorrect')).status,403);
   const origin=await handler(new Request('https://localhost:3000/manage-test/api/logout',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:'{}'}),'logout');assert.equal(origin.status,403);
   const headers={cookie:`__Host-admin=${issued.token}`,'user-agent':'synthetic-agent'};
   for(const parameter of ['search','status']){
    const result=await handler(new Request(`https://localhost:3000/manage-test/api/orders?${parameter}=${encodeURIComponent("' OR 1=1 --")}`,{headers}),'orders');assert.equal(result.status,400);
   }
   const [p]=await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type) VALUES ('admin-test','Synthetic product','Synthetic description',500,'B') RETURNING id`;
   const code='ORD-ADMINABC',attack='<img src=x onerror=alert(1)>';
   try{
    await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected) VALUES (${code},${p!.id},${attack},'synthetic@example.invalid','01700000000','ADMIN123',500)`;
    await assert.rejects(db`UPDATE orders SET status='delivered' WHERE order_code=${code}`, {code:'23514'});
    const act=(action:string)=>request('action',{orderCode:code,action,deliveryChannel:'whatsapp',note:attack,reason:'Synthetic reason'},issued.token,issued.csrf);
    assert.equal((await act('delivered')).status,409);
    const concurrent=await Promise.all([act('verified'),act('verified')]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    await delivery.upload(['ADMIN-DELIVERY-CODE-XYZ'],p!.id,admin,'synthetic-ip',issued.token);
    assert.equal((await delivery.assign(code,admin,'synthetic-ip',issued.token))?.assigned,true);
    const [count]=await db`SELECT count(*)::int AS n FROM audit_logs WHERE admin_id=${admin} AND action='admin.order.verified'`;assert.equal(count!.n,1);
    assert.equal((await request('products',{id:p!.id,name:'New name',description:'New description',priceBdt:900,isActive:true},issued.token,issued.csrf)).status,200);
    const detail=await store.detail(code);assert.equal(detail!.amount_expected,500);assert.equal(detail!.customer_name,attack);
    assert.equal((await act('delivered')).status,200);assert.equal((await act('refunded')).status,409);
    const response=await handler(new Request(`https://localhost:3000/manage-test/api/orders/${code}`,{headers}),`orders/${code}`);
    assert.equal(response.status,200);assert.match(response.headers.get('cache-control')??'',/no-store/);
    const serialized=await response.text();for(const value of [secret,key,password,recovery])assert.ok(!serialized.includes(value));
    const passwordResult=await request('password',{oldPassword:password,newPassword:opaque()},issued.token,issued.csrf);assert.equal(passwordResult.status,200);
    assert.equal(await store.session(issued.token,digest('synthetic-agent')),null);
    await db`UPDATE admin_users SET password_hash=${await hashPassword(password)} WHERE id=${admin}`;
   }finally{await db`DELETE FROM audit_logs WHERE order_id IN (SELECT id FROM orders WHERE order_code=${code})`;await db`DELETE FROM delivery_codes WHERE product_id=${p!.id}`;await db`DELETE FROM orders WHERE order_code=${code}`;await db`DELETE FROM products WHERE id=${p!.id}`;}
  });
  await t.test('absolute and idle expiry deny access',async()=>{
   await db`TRUNCATE order_rate_events`;
   const s=await store.login(email,password,'synthetic-ip',digest('synthetic-agent'));assert.ok(s);
   await db`UPDATE admin_sessions SET authenticated=true,last_seen_at=now()-interval '31 minutes' WHERE id=${digest(s.token)}`;
   assert.equal(await store.session(s.token,digest('synthetic-agent')),null);
   await db`UPDATE admin_sessions SET last_seen_at=now(),expires_at=now()-interval '1 second' WHERE id=${digest(s.token)}`;
   assert.equal(await store.session(s.token,digest('synthetic-agent')),null);
  });
 }finally{
  await db`DELETE FROM audit_logs WHERE admin_id=${admin || null}`;
  await db`DELETE FROM delivery_codes WHERE order_id IN (SELECT id FROM orders WHERE verified_by=${admin || null})`;
  await db`DELETE FROM orders WHERE verified_by=${admin || null}`;
  await db`DELETE FROM admin_users WHERE email=${email}`;
  await db`TRUNCATE order_rate_events`;
  await store.close();await limiter.close();await delivery.close();await db.end();
 }
});

test('customer name and note HTML render as inert text in the actual detail component',()=>{
 const output=execFileSync(process.execPath,['--input-type=module','-e',`
  import {createElement} from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {AdminFields} from './src/components/admin-fields.ts';
  process.stdout.write(renderToStaticMarkup(createElement(AdminFields,{fields:{customer_name:'<img src=x onerror=alert(1)>',admin_note:'<script>alert(1)</script>'}})));
 `],{encoding:'utf8'});
 assert.ok(output.includes('&lt;img'));assert.ok(output.includes('&lt;script&gt;'));assert.ok(!output.includes('<img'));assert.ok(!output.includes('<script>'));
});
