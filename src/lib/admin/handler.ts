import "server-only";
import { z } from "zod";
import { readJsonRequest } from "../orders/request.ts";
import { errorResponse } from "../orders/responses.ts";
import { getClientIp, hashIp } from "../orders/security.ts";
import { verifyTurnstile } from "../orders/handler.ts";
import { createOrderStore } from "../orders/store.ts";
import { AdminSessionExpired, createAdminStore } from "./store.ts";
import { digest, equal, validPassword, hashPassword } from "./crypto.ts";
import type { AdminEnv } from "./config.ts";
const login=z.object({email:z.string().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(256),turnstileToken:z.string().min(1).max(2048)}).strict();
const query=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),status:z.enum(['','submitted','verified','delivered','rejected','refunded']).default(''),search:z.string().regex(/^(?:|ORD-[A-Z2-9]{8}|[A-Za-z0-9]{4})$/).default(''),from:z.union([z.literal(''),z.iso.date()]).default(''),until:z.union([z.literal(''),z.iso.date()]).default('')}).strict();
export function createAdminHandler(config:AdminEnv,store:ReturnType<typeof createAdminStore>,limiter:ReturnType<typeof createOrderStore>,captcha=verifyTurnstile){
 const handle=async(request:Request,path:string)=>{
  const fail=(status:number,code:string,message:string)=>errorResponse(status,code,message,{'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex','X-Frame-Options':'DENY'});
  const json=(value:unknown,cookie?:string)=>Response.json(value,{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex','X-Frame-Options':'DENY',...(cookie?{'Set-Cookie':cookie}:{})}});
  const sessionCookie=(token:string)=>`__Host-admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
  try{
   if(!['login','second','password','logout','orders','products','audit','action'].includes(path)&&!/^orders\/ORD-[A-Z2-9]{8}$/.test(path))return fail(404,'NOT_FOUND','Not found.');
   const ip=getClientIp(request,config.TRUSTED_PROXY_MODE);
   if(config.ADMIN_IP_ALLOWLIST.length&&!config.ADMIN_IP_ALLOWLIST.includes(ip))return fail(404,'NOT_FOUND','Not found.');
   const ipHash=hashIp(ip,config.IP_HASH_SECRET),ua=digest(request.headers.get('user-agent')??'');
   let body:unknown={};
   if(request.method==='POST'){
    if(!request.headers.get('origin'))return fail(403,'ORIGIN','Request not permitted.');
    const boundary=await readJsonRequest(request,config.ALLOWED_ORIGINS);if(boundary instanceof Response)return boundary;
    try{body=JSON.parse(Buffer.concat(boundary.chunks).toString('utf8'));}catch{return fail(400,'VALIDATION','Invalid JSON.');}
   }
   if(path==='login'&&request.method==='POST'){
    const parsed=login.safeParse(body);if(!parsed.success)return fail(400,'VALIDATION','Check the submitted fields.');
    const data=parsed.data;
    for(const key of [`admin-ip:${ipHash}`,`admin-account:${data.email}`]){const retry=await limiter.rateLimit(hashIp(key,config.IP_HASH_SECRET),{short:10,day:100});if(retry)return errorResponse(429,'RATE_LIMIT','Try again later.',{'Retry-After':String(retry)});}
    if(!await captcha(data.turnstileToken,config,config.SITE_ORIGIN,'admin'))return fail(403,'CAPTCHA','Verification failed.');
    const result=await store.login(data.email,data.password,ipHash,ua);
    return result?json({step:'2fa',csrf:result.csrf},sessionCookie(result.token)):fail(401,'CREDENTIALS','Invalid credentials');
   }
   const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-admin='))?.slice(13)??'';
   if(!/^[A-Za-z0-9_-]{43}$/.test(token))return fail(404,'NOT_FOUND','Not found.');
   const session=await store.session(token,ua,path==='second');
   if(!session)return fail(404,'NOT_FOUND','Not found.');
   const csrf=request.headers.get('x-csrf-token')??'';
   if(request.method==='POST'&&!equal(session.csrf_hash,digest(csrf)))return fail(403,'CSRF','Request not permitted.');
   if(path==='second'&&request.method==='POST'){
    const retry=await limiter.rateLimit(hashIp(`admin-second:${session.admin_id}`,config.IP_HASH_SECRET),{short:10,day:100});if(retry)return errorResponse(429,'RATE_LIMIT','Try again later.',{'Retry-After':String(retry)});
    const parsed=z.object({code:z.string().min(6).max(64)}).strict().safeParse(body);if(!parsed.success)return fail(400,'VALIDATION','Invalid code.');
    const result=await store.second(token,parsed.data.code,csrf,ipHash,ua);
    return result?json({authenticated:true,csrf:result.csrf},sessionCookie(result.token)):fail(401,'CREDENTIALS','Invalid credentials');
   }
   if(!session.authenticated)return fail(404,'NOT_FOUND','Not found.');
   if(path==='password'&&request.method==='POST'){
    const retry=await limiter.rateLimit(hashIp(`admin-password:${session.admin_id}`,config.IP_HASH_SECRET),{short:5,day:20});if(retry)return errorResponse(429,'RATE_LIMIT','Try again later.',{'Retry-After':String(retry)});
    const parsed=z.object({oldPassword:z.string().max(256),newPassword:z.string().refine(validPassword)}).strict().safeParse(body);
    if(!parsed.success)return fail(400,'VALIDATION','Use a strong password of at least 14 characters.');
    return await store.password(token,parsed.data.oldPassword,await hashPassword(parsed.data.newPassword),session.admin_id,ipHash)?json({ok:true},'__Host-admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'):fail(401,'CREDENTIALS','Invalid credentials');
   }
   if(path==='logout'&&request.method==='POST'){await store.logout(token,session.admin_id,ipHash);return json({ok:true},'__Host-admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');}
   if(request.method==='GET'){
    await store.readAudit(session.admin_id,'admin.read',ipHash);
    const parsed=query.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)return fail(400,'VALIDATION','Invalid filters.');
    const q=parsed.data;
    if(path==='orders')return json(await store.orders(q.page,q.status,q.search,q.from,q.until));
    if(/^orders\/ORD-[A-Z2-9]{8}$/.test(path)){const result=await store.detail(path.split('/')[1]!);return result?json(result):fail(404,'NOT_FOUND','Not found.');}
    if(path==='products')return json(await store.products());
    if(path==='audit')return json(await store.audits(q.page));
   }
   if(request.method==='POST'&&path==='action'){
    const parsed=z.object({orderCode:z.string().regex(/^ORD-[A-Z2-9]{8}$/),action:z.enum(['verified','rejected','delivered','refunded']),note:z.string().max(2000).default(''),reason:z.string().max(500).default('')}).strict().refine(v=>(v.action!=='rejected'||v.reason.trim().length>0)&&(v.action!=='refunded'||v.note.trim().length>0)).safeParse(body);
    if(!parsed.success)return fail(400,'VALIDATION','Check action, note and reason.');
    const d=parsed.data;return await store.action(d.orderCode,d.action,d.note,d.reason,session.admin_id,ipHash,token)?json({ok:true}):fail(409,'TRANSITION','Order state does not allow this action.');
   }
   if(request.method==='POST'&&path==='products'){
    const parsed=z.object({id:z.uuid(),name:z.string().trim().min(1).max(160),description:z.string().max(4000),priceBdt:z.number().int().min(1).max(10000000),isActive:z.boolean()}).strict().safeParse(body);
    if(!parsed.success)return fail(400,'VALIDATION','Invalid product.');const d=parsed.data;
    return await store.product(d.id,d.name,d.description,d.priceBdt,d.isActive,session.admin_id,ipHash,token)?json({ok:true}):fail(404,'NOT_FOUND','Not found.');
   }
   return fail(404,'NOT_FOUND','Not found.');
  }catch(error){if(error instanceof AdminSessionExpired)return fail(404,'NOT_FOUND','Not found.');return fail(500,'INTERNAL','Unable to process request.');}
 };
 return async(request:Request,path:string)=>{
  const response=await handle(request,path);
  for(const [name,value] of Object.entries({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Frame-Options':'DENY'}))response.headers.set(name,value);
  return response;
 };
}
