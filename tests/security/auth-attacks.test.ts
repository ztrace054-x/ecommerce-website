import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { createAdminHandler } from '../../src/lib/admin/handler.ts';
import { createAdminStore } from '../../src/lib/admin/store.ts';
import { createDeliveryStore } from '../../src/lib/delivery/store.ts';
import { createOrderStore } from '../../src/lib/orders/store.ts';
import { digest, opaque, hashPassword, encrypt, newTotpSecret, totp } from '../../src/lib/admin/crypto.ts';
import { generateOrderCode } from '../../src/lib/orders/security.ts';
import type { AdminEnv } from '../../src/lib/admin/config.ts';
const url='postgres://postgres@127.0.0.1:55432/ecommerce_test',origin='https://localhost:3000',agent='synthetic-security-agent';
test('authenticated attack scenarios against real local PostgreSQL',async t=>{
 const db=postgres(url,{max:8}),key=randomBytes(32).toString('base64'),store=createAdminStore(url,key),limiter=createOrderStore(url),delivery=createDeliveryStore(url,key);
 const config:AdminEnv={DATABASE_URL:url,IP_HASH_SECRET:opaque(),TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:origin,ALLOWED_ORIGINS:[origin],TRUSTED_PROXY_MODE:'vercel',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000',ADMIN_SECRET_KEY:key,ADMIN_PATH_PREFIX:'/manage-test',ADMIN_IP_ALLOWLIST:[],DELIVERY_CODE_KEY:key,EMAIL_FROM:'synthetic@example.invalid',EMAIL_MODE:'log-safe',RESEND_API_KEY:''};
 const handler=createAdminHandler(config,store,limiter,async()=>true,delivery);
 const email=opaque().toLowerCase()+'@example.invalid',password=opaque(),secret=newTotpSecret();
 let admin='',product='',token='',csrf='';const admins:string[]=[],orders:string[]=[];
 const api=(path:string,body:unknown={},headers:Record<string,string>={},method='POST')=>handler(new Request(origin+'/manage-test/api/'+path,{method,headers:{origin,'content-type':'application/json','user-agent':agent,'x-forwarded-for':'192.0.2.1',cookie:`__Host-admin=${token}`,'x-csrf-token':csrf,...headers},...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}),path);
 const safe=async(r:Response)=>{assert.doesNotMatch(await r.text(),/password_hash|totp_secret|code_encrypted|SQLSTATE|PostgresError|stack|SELECT\s/i);};
 try{
  const [u]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${email},${await hashPassword(password)},${encrypt(secret,key)}) RETURNING id`;admin=u!.id;admins.push(admin);
  const [p]=await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type,is_active) VALUES (${opaque()},'Synthetic','Synthetic',500,'B',true) RETURNING id`;product=p!.id;
  await t.test('session fixation, half-session access and TOTP replay are rejected',async()=>{
   const fixed=opaque();token=fixed;
   const r=await api('login',{email,password,turnstileToken:'synthetic'});assert.equal(r.status,200);
   token=r.headers.get('set-cookie')!.split(';')[0]!.slice(13);csrf=(await r.json()).csrf;
   assert.ok(token!==fixed);const pending=token;
   for(const path of ['orders','products','stock','codes','audit']){const denied=await api(path,undefined,{},'GET');assert.equal(denied.status,404);await safe(denied);}
   for(const path of ['action','codes/assign','codes/reveal','codes/upload','codes/void','email','password','logout']){const denied=await api(path);assert.equal(denied.status,404);await safe(denied);}
   const code=totp(secret).generate();const second=await api('second',{code});assert.equal(second.status,200);token=second.headers.get('set-cookie')!.split(';')[0]!.slice(13);csrf=(await second.json()).csrf;assert.ok(token!==pending);
   assert.equal(await store.session(pending,digest(agent)),null);assert.equal(await store.session(fixed,digest(agent)),null);
   const another=await store.login(email,password,'synthetic',digest(agent));assert.ok(another);
   assert.equal(await store.second(another.token,code,another.csrf,'synthetic',digest(agent)),null);
  });
  await t.test('every admin mutation rejects absent CSRF and foreign Origin',async()=>{
   for(const path of ['action','products','codes/assign','codes/reveal','codes/upload','codes/void','email','password','logout']){
    const missing=await api(path,{}, {'x-csrf-token':''});assert.equal(missing.status,403);await safe(missing);
    const foreign=await api(path,{}, {origin:'https://evil.example'});assert.equal(foreign.status,403);await safe(foreign);
   }
  });
  await t.test('encoded paths, traversal, method overrides and duplicate keys cannot bypass routing',async()=>{
   for(const path of ['../orders','%2e%2e/orders','orders%2fORD-ABCDEFGH','codes/%72eveal','codes/reveal/../assign','%252e%252e/orders']){const r=await api(path);assert.equal(r.status,404);await safe(r);}
   for(const method of ['PUT','PATCH','DELETE']){const r=await api('products',{}, {'x-http-method-override':'POST'},method);assert.equal(r.status,404);await safe(r);}
   const duplicate=await api('products','{"id":"a","\\u0069d":"b"}');assert.equal(duplicate.status,400);await safe(duplicate);
   const mass=await api('action',{orderCode:'ORD-ABCDEFGH',action:'verified',adminId:admin});assert.equal(mass.status,400);await safe(mass);
  });
  await t.test('SQL and XSS free text is stored literally and cannot change query structure',async()=>{
   const payload="'; DROP TABLE products;-- <svg/onload=alert(1)>";
   const r=await api('products',{id:product,name:payload,description:payload,priceBdt:500,isActive:true,deliveryInstructions:payload});assert.equal(r.status,200);await safe(r);
   const [p]=await db`SELECT name,description,delivery_instructions FROM products WHERE id=${product}`;assert.ok(p!.name===payload&&p!.description===payload&&p!.delivery_instructions===payload);
  });
  await t.test('double verification and assignment across distinct admins have one transactional effect',async()=>{
   const otherToken=opaque();const [other]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${opaque().toLowerCase()+'@example.invalid'},'synthetic','synthetic') RETURNING id`;admins.push(other!.id);
   await db`INSERT INTO admin_sessions(id,admin_id,csrf_hash,authenticated,expires_at,ip_hash,user_agent_hash) VALUES (${digest(otherToken)},${other!.id},${digest(opaque())},true,now()+interval '8 hours','synthetic',${digest(agent)})`;
   for(let i=0;i<2;i++){const code=generateOrderCode();orders.push(code);await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected) VALUES (${code},${product},'Synthetic','a@example.invalid','01700000000',${randomBytes(6).toString('hex').toUpperCase()},500)`;}
   const results=await Promise.all([store.action(orders[0]!,'verified','<svg/onload=alert(1)>','',admin,'synthetic',token,''),store.action(orders[0]!,'verified','','',other!.id,'synthetic',otherToken,'')]);assert.equal(results.filter(Boolean).length,1);
   await store.action(orders[1]!,'verified','','',admin,'synthetic',token,'');
   await delivery.upload(['SYNTHETIC-ATTACK-CODE'],product,admin,'synthetic',token);
   const assigned=await Promise.all([delivery.assign(orders[0]!,admin,'synthetic',token),delivery.assign(orders[1]!,other!.id,'synthetic',otherToken)]);assert.equal(assigned.filter(r=>r?.assigned).length,1);
   const winner=assigned[0]?.assigned?orders[0]!:orders[1]!;
   assert.equal(await store.action(winner,'delivered','','',admin,'synthetic',token,'email'),true);
   const view=await limiter.tracking.lookupOrder(winner,'0000');assert.equal(view?.deliveryDestination,'a•••@example.invalid');assert.ok(!JSON.stringify(view).includes('SYNTHETIC-ATTACK-CODE'));
   assert.equal(await store.action(winner,'refunded','Synthetic','',admin,'synthetic',token,''),false);
  });
  await t.test('account mutation quota survives rotating IPs',async()=>{
   await db`TRUNCATE order_rate_events`;
   for(let n=0;n<61;n++){const r=await api('products',{}, {'x-forwarded-for':`192.0.2.${n+1}`});assert.equal(r.status,n===60?429:400);await safe(r);}
  });
 }finally{
  await db`DELETE FROM audit_logs WHERE admin_id=ANY(${admins}) OR order_id IN (SELECT id FROM orders WHERE product_id=${product||null})`;
  if(product){await db`DELETE FROM delivery_codes WHERE product_id=${product}`;await db`DELETE FROM orders WHERE product_id=${product}`;await db`DELETE FROM products WHERE id=${product}`;}
  await db`DELETE FROM admin_users WHERE id=ANY(${admins})`;await db`TRUNCATE order_rate_events`;
  await store.close();await limiter.close();await delivery.close();await db.end();
 }
});
