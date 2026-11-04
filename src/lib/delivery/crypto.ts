import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
const AAD=Buffer.from('delivery-code-v1');
export function normalizeDeliveryCode(input:string){
 const value=input.trim().toUpperCase().replace(/\s+/g,'');
 if(value.length<6||value.length>128||!/^[A-Z0-9-]+$/.test(value))throw new Error('Invalid delivery code.');
 return value;
}
export function fingerprintDeliveryCode(value:string,key:string){return createHmac('sha256',Buffer.from(key,'base64')).update(AAD).update(value).digest('hex');}
export function encryptDeliveryCode(value:string,key:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'base64'),iv);cipher.setAAD(AAD);
 const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return {iv,ciphertext:[iv,cipher.getAuthTag(),ciphertext].map(v=>v.toString('base64')).join('.')};
}
export function decryptDeliveryCode(value:string,key:string){
 const parts=value.split('.');if(parts.length!==3)throw new Error('Invalid encrypted delivery data.');
 const [iv,tag,ciphertext]=parts.map(v=>Buffer.from(v,'base64'));
 if(iv!.length!==12||tag!.length!==16)throw new Error('Invalid encrypted delivery data.');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),iv!);decipher.setAAD(AAD);decipher.setAuthTag(tag!);
 return Buffer.concat([decipher.update(ciphertext!),decipher.final()]).toString('utf8');
}
