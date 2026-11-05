import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { parseRequestJson } from '../../src/lib/orders/json.ts';
import { readJsonRequest } from '../../src/lib/orders/request.ts';
import { createOrderHandler } from '../../src/lib/orders/handler.ts';
import { createTrackingHandler } from '../../src/lib/orders/tracking-handler.ts';
import { createOrderStore } from '../../src/lib/orders/store.ts';
import { orderSchema } from '../../src/lib/orders/validation.ts';
import { orderCodeSchema } from '../../src/lib/orders/tracking-validation.ts';
import { getClientIp } from '../../src/lib/orders/security.ts';
import { renderDeliveryEmail } from '../../src/lib/delivery/email.ts';
import type { OrderEnv } from '../../src/lib/env/orders.ts';
const origin='https://localhost:3000';
const config:OrderEnv={DATABASE_URL:'postgres://postgres@127.0.0.1:55432/ecommerce_test',IP_HASH_SECRET:'synthetic-security-test-key-over-32-characters',TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:origin,ALLOWED_ORIGINS:[origin],TRUSTED_PROXY_MODE:'local',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000'};
const request=(body:string,headers:Record<string,string>={})=>new Request(origin+'/api/orders',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body});
const parse=(s:string)=>parseRequestJson([Buffer.from(s)]);
const base={productId:'00000000-0000-4000-8000-000000000001',customerName:'Synthetic Person',customerEmail:'synthetic@example.invalid',senderBkashNumber:'01700000000',trxId:'ABCD2345',turnstileToken:'synthetic'};
const leaks=/password_hash|totp_secret|code_encrypted|postgres|SQLSTATE|stack|SELECT\s|INSERT\s/i;

test('duplicate and prototype keys, malformed UTF-8 and excessive nesting are rejected',()=>{
 for(const value of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"nested":{"x":1,"x":2}}','{"__proto__":{"polluted":true}}','{"constructor":{"prototype":{"polluted":true}}}','[1,]','{"x":NaN}', '['.repeat(33)+'0'+']'.repeat(33)])assert.throws(()=>parse(value));
 assert.throws(()=>parseRequestJson([new Uint8Array([123,34,120,34,58,34,255,34,125])]));
 assert.deepEqual(parse('{"x":[{"name":"one"},{"name":"two"}],"text":"{ not a key: }"}'),{x:[{name:'one'},{name:'two'}],text:'{ not a key: }'});
 assert.equal(Object.hasOwn(Object.prototype,'polluted'),false);
});

test('public handlers reject ambiguous JSON, prototype pollution and malformed bodies without leaks',async()=>{
 const store=createOrderStore(config.DATABASE_URL);
 // Isolate parsing from quota exhaustion; persistence and validation remain real.
 const unlimited={...store,rateLimit:async()=>0};
 try{
  for(const handler of [createOrderHandler(config,unlimited,async()=>true),createTrackingHandler(config,unlimited,async()=>true)]){
   for(const payload of ['{"turnstileToken":"synthetic","turnstileToken":"other"}','{"__proto__":{"polluted":true}}','{"constructor":{}}','{"x":','null','[]']){
    const r=await handler(request(payload));assert.ok([400,403].includes(r.status));assert.doesNotMatch(await r.text(),leaks);
   }
  }
 }finally{await store.close();}
});

test('size, origin and CRLF boundaries reject unsafe requests',async()=>{
 for(const [body,headers,status] of [['x'.repeat(10241),{},413],['{}',{'content-length':'999999'},413],['{}',{origin:'https://evil.example'},403],['{}',{'content-type':'text/plain'},415]] as const){
  const r=await readJsonRequest(request(body,headers),[origin]);assert.ok(r instanceof Response);assert.equal(r.status,status);assert.doesNotMatch(await r.text(),leaks);
 }
 assert.throws(()=>request('{}',{'x-inject':'ok\r\nX-Evil: true'}));
 assert.equal(orderSchema.safeParse({...base,customerEmail:'user@example.invalid\r\nBcc: evil@example.invalid'}).success,false);
});

test('SQLi, mass assignment and Unicode tricks cannot alter validated identifiers',()=>{
 for(const sql of ["' OR 1=1--", "'; DROP TABLE orders;--", '1 UNION SELECT password_hash FROM admin_users', '" OR ""="', '1;SELECT pg_sleep(10)']){
  for(const field of ['productId','customerEmail','senderBkashNumber','trxId'])assert.equal(orderSchema.safeParse({...base,[field]:sql}).success,false);
  assert.equal(orderCodeSchema.safeParse(sql).success,false);
 }
 for(const trxId of ['ＡＢＣＤ2345','ABCD\u200b2345','АBCD2345','ABCD\0'+'2345'])assert.equal(orderSchema.safeParse({...base,trxId}).success,false);
 for(const code of ['ＯＲＤ-ABCDEFGH','ORD-ABCD\u200bEFGH','ORD-АBCDEFGH'])assert.equal(orderCodeSchema.safeParse(code).success,false);
 for(const email of ['user＠example.invalid','user@example.invalid\u200b','user\0@example.invalid'])assert.equal(orderSchema.safeParse({...base,customerEmail:email}).success,false);
 for(const extra of ['status','amountExpected','adminId','deliveryCode','_method'])assert.equal(orderSchema.safeParse({...base,[extra]:'delivered'}).success,false);
});

test('XSS polyglots stay inert in admin fields and email instructions',()=>{
 const payloads=['<svg/onload=alert(1)>','"><img src=x onerror=alert(1)>',"</textarea><script>alert('x')</script>",'<a href="javascript:alert(1)">click</a>'];
 for(const payload of payloads){
  assert.equal(orderSchema.safeParse({...base,customerName:payload}).success,false);
  const html=execFileSync(process.execPath,['--input-type=module','-e',`import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {AdminFields} from './src/components/admin-fields.ts';process.stdout.write(renderToStaticMarkup(createElement(AdminFields,{fields:JSON.parse(process.argv[1])})));`,JSON.stringify({customer_name:payload,admin_note:payload,description:payload,delivery_instructions:payload})],{encoding:'utf8'});
  assert.ok(!html.includes(payload));assert.doesNotMatch(html,/<script|<svg|<img|<textarea|<a /);
  const email=renderDeliveryEmail({to:'synthetic@example.invalid',from:'synthetic@example.invalid',orderCode:'ORD-ABCDEFGH',productName:payload,instructions:payload,deliveryCode:'SYNTHETIC-ONLY',supportUrl:'https://wa.me/8801000000000'});
  assert.ok(!email.html.includes(payload));assert.doesNotMatch(email.html,/<script|<svg|<img/);
 }
});

test('Vercel IP parsing rejects chains and ignores alternative spoofable headers',()=>{
 for(const value of ['', '192.0.2.1, 192.0.2.2','not-an-ip','127.0.0.1:1234'])assert.throws(()=>getClientIp(new Request(origin,{headers:{'x-forwarded-for':value}}),'vercel'));
 const r=new Request(origin,{headers:{'x-forwarded-for':'192.0.2.1','x-real-ip':'192.0.2.99',forwarded:'for=192.0.2.99','cf-connecting-ip':'192.0.2.99'}});
 assert.equal(getClientIp(r,'vercel'),'192.0.2.1');assert.equal(getClientIp(r,'local'),'127.0.0.1');
 // Valid forged selected headers can only be distinguished at trusted ingress.
});
