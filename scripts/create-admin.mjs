import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import postgres from 'postgres';
import { encrypt, hashPassword, newTotpSecret, opaque, digest, totp, validPassword } from '../src/lib/admin/crypto.ts';
if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 2) throw new Error('Run interactively in a private terminal, without arguments.');
const key=process.env.ADMIN_SECRET_KEY??'';
if(!/^[A-Za-z0-9+/]{43}=$/.test(key)||!process.env.DATABASE_URL)throw new Error('Database and encryption configuration required.');
let hidden=false;
const output=new Writable({write(chunk,encoding,callback){if(!hidden)process.stdout.write(chunk);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
let db;
try{
 const email=(await rl.question('Admin email: ')).trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Invalid email.');
 process.stdout.write('Password (hidden): ');hidden=true;const password=await rl.question('');hidden=false;process.stdout.write('\n');
 if(!validPassword(password))throw new Error('Use 14–256 characters, at least eight distinct characters, and avoid common password phrases.');
 process.stdout.write('Confirm password (hidden): ');hidden=true;const confirmation=await rl.question('');hidden=false;process.stdout.write('\n');
 if(password!==confirmation)throw new Error('Passwords do not match.');
 const secret=newTotpSecret(),codes=Array.from({length:8},opaque);
 db=postgres(process.env.DATABASE_URL,{max:1});
 const hash=await hashPassword(password);
 await db.begin(async tx=>{
  const [admin]=await tx`INSERT INTO admin_users(email,password_hash,totp_secret_encrypted) VALUES (${email},${hash},${encrypt(secret,key)}) RETURNING id`;
  for(const code of codes)await tx`INSERT INTO admin_recovery_codes(admin_id,code_hash) VALUES (${admin.id},${digest(code)})`;
  await tx`INSERT INTO audit_logs(admin_id,action,ip_hash) VALUES (${admin.id},'admin.bootstrap','local-cli')`;
 });
 // Explicit operator-only one-time enrollment output; never application logs.
 process.stdout.write(`Save in your authenticator and offline recovery storage now. These values are shown once.\n${totp(secret,email).toString()}\n${codes.join('\n')}\n`);
}catch{process.stderr.write('Admin creation failed. Check input/configuration privately; no credentials were logged.\n');process.exitCode=1;}
finally{hidden=false;rl.close();if(db)await db.end();}
