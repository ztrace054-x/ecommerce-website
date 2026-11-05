import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import postgres from 'postgres';
import { createAdminHandler } from '../src/lib/admin/handler.ts';
import { createAdminStore, AdminSessionExpired } from '../src/lib/admin/store.ts';
import { createOrderStore } from '../src/lib/orders/store.ts';
import { createDeliveryStore } from '../src/lib/delivery/store.ts';
import { digest, encrypt, hashPassword, newTotpSecret, opaque, totp } from '../src/lib/admin/crypto.ts';
import type { AdminEnv } from '../src/lib/admin/config.ts';
import { randomBytes } from 'node:crypto';

const url='postgres://postgres@127.0.0.1:55432/ecommerce_test';
const key=randomBytes(32).toString('base64');
const config:AdminEnv={DATABASE_URL:url,IP_HASH_SECRET:opaque(),TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:'https://localhost:3000',ALLOWED_ORIGINS:['https://localhost:3000'],TRUSTED_PROXY_MODE:'local',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000',ADMIN_SECRET_KEY:key,ADMIN_PATH_PREFIX:'/manage-test',ADMIN_IP_ALLOWLIST:[],DELIVERY_CODE_KEY:randomBytes(32).toString('base64'),EMAIL_FROM:'delivery@example.invalid',EMAIL_MODE:'log-safe' as const,RESEND_API_KEY:''};
const agent='synthetic-review-agent';
const req=(path:string,body?:unknown,token='',csrf='',headers:Record<string,string>={})=>new Request(`${config.SITE_ORIGIN}/manage-test/api/${path}`,{method:body===undefined?'GET':'POST',headers:{origin:config.SITE_ORIGIN,'content-type':'application/json','user-agent':agent,cookie:`__Host-admin=${token}`,'x-csrf-token':csrf,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});

test('admin review regression tests against local PostgreSQL',async t=>{
 const db=postgres(url),store=createAdminStore(url,key),limiter=createOrderStore(url),delivery=createDeliveryStore(url,config.DELIVERY_CODE_KEY);
 const handler=createAdminHandler(config,store,limiter,async()=>true,delivery);
 const email='review@example.invalid',password=opaque(),secret=newTotpSecret();
 let admin='',product='';
 const pending=async()=>{const s=await store.login(email,password,'synthetic-ip',digest(agent));assert.ok(s);return s;};
 const full=async()=>{const s=await pending(),code=opaque();await db`INSERT INTO admin_recovery_codes(admin_id,code_hash) VALUES (${admin},${digest(code)})`;const result=await store.second(s.token,code,s.csrf,'synthetic-ip',digest(agent));assert.ok(result);return result;};
 const clearLimits=async()=>{await db`TRUNCATE order_rate_events`;await db`UPDATE admin_users SET failed_login_count=0,locked_until=NULL WHERE id=${admin}`;};
 try{
  const [u]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${email},${await hashPassword(password)},${encrypt(secret,key)}) RETURNING id`;admin=u!.id;
  const [p]=await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type) VALUES ('admin-review','Review fixture','Synthetic only',500,'B') RETURNING id`;product=p!.id;
  await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected) VALUES ('ORD-REVIEWAB',${product},'Synthetic review','review@example.invalid','01700000000','REVIEW123',500)`;

  await t.test('unknown URLs return 404 before body parsing for every method',async()=>{
   for(const method of ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']){
    const r=await handler(new Request(`${config.SITE_ORIGIN}/manage-test/api/unknown`,{method,...(method==='POST'?{body:'malformed'}:{})}),'unknown');
    assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.match(r.headers.get('x-robots-tag')??'',/noindex/);
   }
  });
  await t.test('POST requires Origin even with a same-origin Referer; error headers persist',async()=>{
   for(const path of ['login','second','password','logout','action','products']){
    const r=req(path,{});r.headers.delete('origin');r.headers.set('referer',config.SITE_ORIGIN);
    const response=await handler(r,path);assert.equal(response.status,403);assert.equal(response.headers.get('referrer-policy'),'no-referrer');
   }
   const response=await handler(req('login',{},'','',{'content-type':'text/plain'}),'login');assert.equal(response.status,415);assert.equal(response.headers.get('x-frame-options'),'DENY');
  });
  await t.test('Turnstile failure and IP allowlist fail closed',async()=>{
   const blocked=createAdminHandler({...config,ADMIN_IP_ALLOWLIST:['192.0.2.10']},store,limiter,async()=>true,delivery);
   assert.equal((await blocked(req('login',{email,password,turnstileToken:'synthetic'}),'login')).status,404);
   const captcha=createAdminHandler(config,store,limiter,async()=>false,delivery);
   assert.equal((await captcha(req('login',{email,password,turnstileToken:'synthetic'}),'login')).status,403);
   await clearLimits();
  });
  await t.test('per-account limits survive IP changes; per-IP limits survive account changes',async()=>{
   const h=createAdminHandler({...config,TRUSTED_PROXY_MODE:'vercel'},store,limiter,async()=>false,delivery);
   for(const sameAccount of [true,false]){
    await clearLimits();
    for(let i=0;i<11;i++){
     const r=await h(req('login',{email:sameAccount?'rate@example.invalid':`rate${i}@example.invalid`,password:'synthetic',turnstileToken:'synthetic'},'','',{'x-forwarded-for':sameAccount?`192.0.2.${i+1}`:'192.0.2.20'}),'login');
     assert.equal(r.status,i===10?429:403);
    }
   }
   await clearLimits();
  });
  await t.test('half sessions deny all data and mutation APIs; cookie flags are strict',async()=>{
   const r=await handler(req('login',{email,password,turnstileToken:'synthetic'}),'login');assert.equal(r.status,200);
   const cookie=r.headers.get('set-cookie')??'';for(const flag of ['__Host-admin=','HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=28800'])assert.ok(cookie.includes(flag));
   const s=await pending();
   for(const path of ['orders','products','audit','orders/ORD-REVIEWAB'])assert.equal((await handler(req(path,undefined,s.token,s.csrf),path)).status,404);
   for(const path of ['action','products','password','logout'])assert.equal((await handler(req(path,{},s.token,s.csrf),path)).status,404);
   await clearLimits();
  });
  await t.test('five second-factor failures lock the account',async()=>{
   const s=await pending();
   for(let i=0;i<5;i++)assert.equal((await handler(req('second',{code:'invalid-recovery-code'},s.token,s.csrf),'second')).status,401);
   const [row]=await db`SELECT locked_until>now() AS locked FROM admin_users WHERE id=${admin}`;assert.equal(row!.locked,true);
   assert.equal(await store.login(email,password,'synthetic-ip',digest(agent)),null);
   await clearLimits();
  });
  await t.test('concurrent recovery redemption succeeds exactly once',async()=>{
   const a=await pending(),b=await pending(),code=opaque();
   await db`INSERT INTO admin_recovery_codes(admin_id,code_hash) VALUES (${admin},${digest(code)})`;
   const results=await Promise.all([a,b].map(s=>store.second(s.token,code,s.csrf,'synthetic-ip',digest(agent))));assert.equal(results.filter(Boolean).length,1);
   await clearLimits();
  });
  await t.test('TOTP uses one timestamp at a step boundary',async()=>{
   const s=await pending(),timestamp=Math.floor(Date.now()/30000)*30000+29999;
   const code=totp(secret).generate({timestamp});
   await db`UPDATE admin_users SET last_totp_step=-1 WHERE id=${admin}`;
   let calls=0;const clock=t.mock.method(Date,'now',()=>calls++===0?timestamp:timestamp+2);
   try{assert.ok(await store.second(s.token,code,s.csrf,'synthetic-ip',digest(agent)));}finally{clock.mock.restore();}
   const [row]=await db`SELECT last_totp_step FROM admin_users WHERE id=${admin}`;assert.equal(Number(row!.last_totp_step),Math.floor(timestamp/30000));
  });
  for(const revocation of ['logout','password'] as const){
   await t.test(`${revocation} between request authentication and mutation prevents writes`,async()=>{
    await clearLimits();
    for(const path of ['action','products']){
     const s=await full();
     const raced=createAdminHandler(config,{...store,session:async(...args:Parameters<typeof store.session>)=>{
      const result=await store.session(...args);
      if(revocation==='logout')await store.logout(s.token,admin,'synthetic-ip');
      else assert.ok(await store.password(s.token,password,await hashPassword(password),admin,'synthetic-ip'));
      return result;
     }},limiter,async()=>true,delivery);
     const body=path==='action'?{orderCode:'ORD-REVIEWAB',action:'verified'}:{id:product,name:'Must not save',description:'Synthetic',priceBdt:900,isActive:true};
     assert.equal((await raced(req(path,body,s.token,s.csrf),path)).status,404);
    }
    const [o]=await db`SELECT status FROM orders WHERE order_code='ORD-REVIEWAB'`;assert.equal(o!.status,'submitted');
    const [p]=await db`SELECT price_bdt FROM products WHERE id=${product}`;assert.equal(p!.price_bdt,500);
    const [a]=await db`SELECT count(*)::int AS n FROM audit_logs WHERE admin_id=${admin} AND action IN ('admin.order.verified','admin.product.updated')`;assert.equal(a!.n,0);
   });
  }
  await t.test('expired or disabled identities cannot mutate through a stale authorization',async()=>{
   const s=await full();await db`UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE id=${digest(s.token)}`;
   await assert.rejects(store.action('ORD-REVIEWAB','verified','','',admin,'synthetic-ip',s.token,''),AdminSessionExpired);
   const active=await full();await db`UPDATE admin_users SET totp_enabled=false WHERE id=${admin}`;
   assert.equal(await store.session(active.token,digest(agent)),null);
   await assert.rejects(store.action('ORD-REVIEWAB','verified','','',admin,'synthetic-ip',active.token,''),AdminSessionExpired);
   await db`UPDATE admin_users SET totp_enabled=true WHERE id=${admin}`;
  });
 }finally{
  await db`DELETE FROM audit_logs WHERE admin_id=${admin||null}`;
  await db`DELETE FROM orders WHERE product_id=${product||null}`;
  await db`DELETE FROM products WHERE id=${product||null}`;
  await db`DELETE FROM admin_users WHERE id=${admin||null}`;
  await db`TRUNCATE order_rate_events`;
  await store.close();await limiter.close();await delivery.close();await db.end();
 }
});

test('production startup fails closed without admin configuration',()=>{
 const env={...process.env,...config,ALLOWED_ORIGINS:config.SITE_ORIGIN,ADMIN_IP_ALLOWLIST:'',NODE_ENV:'production' as const,LOCAL_ORDER_SMOKE:'1',NEXT_RUNTIME:'nodejs',NEXT_PHASE:''};
 for(const name of ['ADMIN_SECRET_KEY','ADMIN_PATH_PREFIX'] as const){
  const result=spawnSync(process.execPath,['--conditions=react-server','--input-type=module','-e',`import {register} from './src/instrumentation.ts';try{await register();process.exitCode=1;}catch{process.stdout.write('configuration rejected');}`],{env:{...env,[name]:''},encoding:'utf8'});
  assert.equal(result.status,0);assert.equal(result.stdout,'configuration rejected');
 }
});
