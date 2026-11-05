// Local production scan only. Never accepts a remote target or credentials.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';
import { encrypt, hashPassword, newTotpSecret, opaque, totp } from '../src/lib/admin/crypto.ts';
import { generateOrderCode } from '../src/lib/orders/security.ts';
const cwd=new URL('../',import.meta.url).pathname;
const url='postgres://postgres@127.0.0.1:55432/ecommerce_test',origin='http://127.0.0.1:3108',prefix='/manage-security';
const key=randomBytes(32).toString('base64'),password=opaque(),secret=newTotpSecret(),email=opaque().toLowerCase()+'@example.invalid';
const env={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:url,IP_HASH_SECRET:opaque(),ADMIN_SECRET_KEY:key,DELIVERY_CODE_KEY:randomBytes(32).toString('base64'),EMAIL_FROM:'synthetic@example.invalid',EMAIL_MODE:'log-safe',RESEND_API_KEY:'',ADMIN_PATH_PREFIX:prefix,ADMIN_IP_ALLOWLIST:'',TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA',SITE_ORIGIN:origin,ALLOWED_ORIGINS:origin,TRUSTED_PROXY_MODE:'local',LOCAL_ORDER_SMOKE:'1',ADMIN_WHATSAPP_NUMBER:'8801000000000',BKASH_RECIPIENT_NUMBER:'01000000000'};
const db=postgres(url,{max:2});let admin,product,server,logs='',cookie='',csrf='',count=0;
const check=(condition,label)=>{if(!condition)throw new Error(label);};
async function curl(path,body,options={}){
 const lines=['silent','show-error','include','path-as-is','max-time = 20','noproxy = "*"',`url = ${JSON.stringify(origin+path)}`,'header = "User-Agent: synthetic-security-scan"'];
 if(options.method)lines.push(`request = ${JSON.stringify(options.method)}`);
 if(body!==undefined){if(!options.method)lines.push('request = "POST"');lines.push('header = "Content-Type: application/json"',`data = ${JSON.stringify(typeof body==='string'?body:JSON.stringify(body))}`);if(!options.noOrigin)lines.push(`header = ${JSON.stringify('Origin: '+(options.origin??origin))}`);}
 if(cookie&&!options.noCookie)lines.push(`header = ${JSON.stringify('Cookie: '+cookie)}`);
 if(csrf&&!options.noCsrf)lines.push(`header = ${JSON.stringify('x-csrf-token: '+csrf)}`);
 const output=await new Promise((resolve,reject)=>{const p=spawn('curl',['--config','-']);let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',()=>{});p.on('error',()=>reject(new Error('curl unavailable')));p.on('exit',code=>code===0?resolve(out):reject(new Error('curl transport failure')));p.stdin.end(lines.join('\n')+'\n');});
 const split=output.indexOf('\r\n\r\n'),head=output.slice(0,split),text=output.slice(split+4);
 const headers=new Map(head.split('\r\n').slice(1).map(line=>{const i=line.indexOf(':');return[line.slice(0,i).toLowerCase(),line.slice(i+1).trim()];}));
 return {status:Number(head.match(/^HTTP\/\S+ (\d+)/)?.[1]),headers,text};
}
function status(r,n,label){check(r.status===n,`${label}: expected ${n}, got ${r.status}`);count++;console.log(`${label}: ${r.status}`);check(!/PostgresError|SQLSTATE|password_hash|totp_secret_encrypted|code_encrypted|at ErrorResponse/.test(r.text),'response error leakage');}
function security(r,adminRoute=false){
 for(const [name,pattern]of [['cache-control',/no-store/],['x-content-type-options',/^nosniff$/],['x-frame-options',/^DENY$/],['permissions-policy',/camera=\(\)/],['strict-transport-security',/max-age=/],['content-security-policy',/nonce-/]])check(pattern.test(r.headers.get(name)??''),`missing ${name}`);
 const csp=r.headers.get('content-security-policy');check(!/unsafe-inline|unsafe-eval/.test(csp),'unsafe production CSP');check(csp.includes("frame-ancestors 'none'"),'frame ancestors');check(!r.headers.has('access-control-allow-origin'),'unexpected CORS');
 if(adminRoute){check(r.headers.get('referrer-policy')==='no-referrer','admin referrer');check(/noindex/.test(r.headers.get('x-robots-tag')??''),'admin noindex');}
 const nonce=csp.match(/'nonce-([^']+)'/)?.[1];for(const tag of r.text.match(/<script\b[^>]*>/g)??[])check(tag.includes(`nonce="${nonce}"`),'script nonce coverage');
}
async function stop(){if(server){const p=server;server=undefined;if(p.exitCode===null){p.kill('SIGTERM');await new Promise(r=>p.once('exit',r));}}}
try{
 const [a]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${email},${await hashPassword(password)},${encrypt(secret,key)}) RETURNING id`;admin=a.id;
 const [p]=await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type,is_active) VALUES (${opaque()},'Synthetic scan product','Local only',500,'B',true) RETURNING id`;product=p.id;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3108'],{cwd,env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 let ready=false;for(let i=0;i<80;i++){await delay(250);try{if((await curl('/')).status===200){ready=true;break;}}catch{/* Retry only while the local server is starting. */}if(server.exitCode!==null)break;}check(ready,'production readiness');
 for(const path of ['/','/products','/products/ai-setup','/products/prompt-training','/products/chatbot-building','/products/website-building','/checkout','/checkout?product=ai-setup','/track','/contact','/faq','/privacy','/refund','/terms',prefix]){const r=await curl(path);status(r,200,`GET ${path}`);security(r,path===prefix);}
 for(const path of ['/unknown','/products/unknown',prefix+'/unknown',prefix+'/api/unknown',prefix+'/api/%2e%2e/orders',prefix+'/api/codes%2freveal']){const r=await curl(path);status(r,404,`GET ${path}`);security(r,path.startsWith(prefix));}
 for(const path of ['/api/orders','/api/orders/track']){
  for(const method of ['GET','PUT','PATCH','DELETE','OPTIONS']){const r=await curl(path,undefined,{method});status(r,405,`${method} ${path}`);check(r.headers.get('allow')==='POST','Allow header');security(r);}
  for(const [body,options,n,label]of [['{}',{noOrigin:true},403,'missing Origin'],['{}',{origin:'http://evil.invalid'},403,'foreign Origin'],['{',{},400,'malformed'],['x'.repeat(10241),{},413,'oversized']]){const r=await curl(path,body,options);status(r,n,`${path} ${label}`);security(r);}
 }
 const paths=['login','second','password','logout','orders','products','audit','action','stock','codes','codes/upload','codes/assign','codes/reveal','codes/void','email','orders/ORD-ABCDEFGH'];
 for(const path of paths){const r=await curl(prefix+'/api/'+path);status(r,404,`unauthenticated GET ${path}`);security(r,true);}
 let r=await curl(prefix+'/api/login',{email,password,turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'});status(r,200,'login with Cloudflare TEST Siteverify');security(r,true);
 const set=r.headers.get('set-cookie')??'';for(const flag of ['__Host-admin=','HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=28800'])check(set.includes(flag),'cookie flag');cookie=set.split(';')[0];csrf=JSON.parse(r.text).csrf;const pending=cookie;
 status(await curl(prefix+'/api/orders'),404,'half-session denied');
 r=await curl(prefix+'/api/second',{code:totp(secret).generate()});status(r,200,'TOTP');cookie=r.headers.get('set-cookie').split(';')[0];csrf=JSON.parse(r.text).csrf;check(cookie!==pending,'session rotation');
 // Create an actual public order using synthetic input and the TEST verifier.
 await db`TRUNCATE order_rate_events`;
 r=await curl('/api/orders',{productId:product,customerName:'Synthetic scan',customerEmail:'a@example.invalid',senderBkashNumber:'01700000000',trxId:randomBytes(6).toString('hex').toUpperCase(),turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'});status(r,201,'public order');const order=JSON.parse(r.text).orderCode;
 status(await curl(prefix+'/api/action',{orderCode:order,action:'verified'},{noCsrf:true}),403,'missing CSRF');
 status(await curl(prefix+'/api/action',{orderCode:order,action:'delivered',deliveryChannel:'email'}),409,'illegal delivery');
 status(await curl(prefix+'/api/action',{orderCode:order,action:'verified'}),200,'verify');
 status(await curl(prefix+'/api/codes/upload',{productId:product,codes:['SYNTHETIC-LOCAL-SCAN-CODE']}),200,'upload synthetic code');
 status(await curl(prefix+'/api/codes/assign',{orderCode:order}),200,'assign');
 r=await curl(prefix+'/api/codes/reveal',{orderCode:order});status(r,200,'audited reveal');security(r,true);check(JSON.parse(r.text).code==='SYNTHETIC-LOCAL-SCAN-CODE','revealed fixture');
 status(await curl(prefix+'/api/email',{orderCode:order}),200,'log-safe email');
 status(await curl(prefix+'/api/action',{orderCode:order,action:'delivered',deliveryChannel:'email'}),200,'deliver');
 r=await curl('/api/orders/track',{orderCode:order,last4:'0000',turnstileToken:'XXXX.DUMMY.TOKEN.XXXX'});status(r,200,'tracking');check(!r.text.includes('SYNTHETIC-LOCAL-SCAN-CODE')&&JSON.parse(r.text).deliveryDestination==='a•••@example.invalid','tracking secrecy');
 const rejected=generateOrderCode();await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected) VALUES (${rejected},${product},'Synthetic','synthetic@example.invalid','01700000000',${randomBytes(6).toString('hex').toUpperCase()},500)`;
 status(await curl(prefix+'/api/action',{orderCode:rejected,action:'rejected',reason:'Synthetic mismatch'}),200,'reject');
 status(await curl(prefix+'/api/action',{orderCode:rejected,action:'refunded',note:'Synthetic refund'}),200,'refund');
 status(await curl(prefix+'/api/logout',{}),200,'logout');status(await curl(prefix+'/api/orders'),404,'revoked session');
 check(![password,secret,key,env.DELIVERY_CODE_KEY,'SYNTHETIC-LOCAL-SCAN-CODE'].some(v=>logs.includes(v)),'server log secret exclusion');
 console.log(`Production curl scan: PASS (${count} HTTP assertions; nonce/header checks; synthetic auth/order/delivery flow).`);
 await stop();
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3108'],{cwd,env:{...env,NODE_ENV:'development'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 ready=false;for(let i=0;i<80;i++){await delay(250);try{if((await curl('/')).status===200){ready=true;break;}}catch{/* Retry only while the local server is starting. */}if(server.exitCode!==null)break;}check(ready,'development readiness');console.log('Development home: HTTP 200');
}catch(error){console.error(`SECURITY SCAN FAILED: ${error.message}`);process.exitCode=1;}
finally{
 await stop();
 if(product){await db`DELETE FROM audit_logs WHERE admin_id=${admin} OR order_id IN (SELECT id FROM orders WHERE product_id=${product})`;await db`DELETE FROM delivery_email_attempts WHERE order_id IN (SELECT id FROM orders WHERE product_id=${product})`;await db`DELETE FROM delivery_codes WHERE product_id=${product}`;await db`DELETE FROM orders WHERE product_id=${product}`;await db`DELETE FROM products WHERE id=${product}`;}
 if(admin)await db`DELETE FROM admin_users WHERE id=${admin}`;await db.end();
}
