import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { createAdminStore } from '../../src/lib/admin/store.ts';
import { createDeliveryStore } from '../../src/lib/delivery/store.ts';
import { digest, opaque } from '../../src/lib/admin/crypto.ts';
import { generateOrderCode } from '../../src/lib/orders/security.ts';

const url='postgres://postgres@127.0.0.1:55432/ecommerce_test';
test('email holds its order lock across provider I/O and logs no free text',async()=>{
 const db=postgres(url,{max:6}),key=randomBytes(32).toString('base64');
 const store=createAdminStore(url,key),delivery=createDeliveryStore(url,key);
 const admins:string[]=[],tokens=[opaque(),opaque()];let product='';
 const settings={from:'synthetic@example.invalid',apiKey:'synthetic',mode:'resend' as const,supportNumber:'8801000000000'};
 try{
  for(const token of tokens){
   const [u]=await db`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${opaque().toLowerCase()+'@example.invalid'},'synthetic','synthetic') RETURNING id`;admins.push(u!.id);
   await db`INSERT INTO admin_sessions(id,admin_id,csrf_hash,authenticated,expires_at,ip_hash,user_agent_hash) VALUES (${digest(token)},${u!.id},${digest(opaque())},true,now()+interval '8 hours','synthetic','synthetic')`;
  }
  const [p]=await db`INSERT INTO products(slug,name,description,price_bdt,delivery_type,delivery_instructions) VALUES (${opaque()},'PRIVATE-SYNTHETIC-NAME','Synthetic',500,'B','PRIVATE-SYNTHETIC-INSTRUCTIONS') RETURNING id`;product=p!.id;
  const order=generateOrderCode();await db`INSERT INTO orders(order_code,product_id,customer_name,customer_email,sender_bkash_number,trx_id,amount_expected,status) VALUES (${order},${product},'Synthetic','synthetic@example.invalid','01700000000',${randomBytes(6).toString('hex').toUpperCase()},500,'verified')`;
  await delivery.upload(['SYNTHETIC-RACE-123456'],product,admins[0]!,'synthetic',tokens[0]!);
  await delivery.assign(order,admins[0]!,'synthetic',tokens[0]!);
  const [code]=await db`SELECT id FROM delivery_codes WHERE product_id=${product}`;
  let release!:()=>void,started!:()=>void;
  const entered=new Promise<void>(r=>{started=r;}),gate=new Promise<void>(r=>{release=r;});
  const sending=delivery.send(order,admins[0]!,'synthetic',tokens[0]!,settings,async()=>{started();await gate;});
  await entered;
  let finished=false;
  const voiding=delivery.voidCode(code!.id,'Synthetic void',admins[1]!,'synthetic',tokens[1]!).then(v=>{finished=true;return v;});
  try{
   // Inspect PostgreSQL lock waits rather than depending on a short sleep.
   let blocked=false;
   for(let n=0;n<100;n++){
    const waits=await db`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;
    if(waits.length){blocked=true;break;}
    await new Promise(r=>setTimeout(r,10));
   }
   assert.ok(blocked,'competing admin must wait for the email transaction');assert.equal(finished,false);
  }finally{release();await sending;await voiding;}
  assert.equal((await sending).sent,true);assert.equal(await voiding,true);
  const logs:string[]=[];const original=console.info;
  await delivery.upload(['SYNTHETIC-RACE-654321'],product,admins[0]!,'synthetic',tokens[0]!);
  await delivery.assign(order,admins[0]!,'synthetic',tokens[0]!);
  console.info=(...args:unknown[])=>{logs.push(args.join(' '));};
  try{await delivery.send(order,admins[0]!,'synthetic',tokens[0]!,{...settings,mode:'log-safe'});}finally{console.info=original;}
  assert.equal(logs.length,1);assert.ok(!logs[0]!.includes('PRIVATE-SYNTHETIC'));assert.ok(!logs[0]!.includes(order));assert.ok(!logs[0]!.includes('SYNTHETIC-RACE'));
  assert.equal(await store.action(order,'refunded','Synthetic refund','',admins[0]!,'synthetic',tokens[0]!,''),true);
  const remaining=await db`SELECT status,order_id FROM delivery_codes WHERE product_id=${product}`;
  assert.ok(remaining.every(r=>r.status==='void'&&r.order_id===null),'refund must retire its reserved code');
 }finally{
  await db`DELETE FROM audit_logs WHERE admin_id=ANY(${admins})`;
  await db`DELETE FROM delivery_email_attempts WHERE attempted_by=ANY(${admins})`;
  if(product){await db`DELETE FROM delivery_codes WHERE product_id=${product}`;await db`DELETE FROM orders WHERE product_id=${product}`;await db`DELETE FROM products WHERE id=${product}`;}
  await db`DELETE FROM admin_users WHERE id=ANY(${admins})`;
  await store.close();await delivery.close();await db.end();
 }
});
