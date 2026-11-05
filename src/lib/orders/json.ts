/** Bounded callers only. Reject ambiguous keys before schema validation. */
export function parseRequestJson(chunks: Uint8Array[]): unknown {
 const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 const parsed:unknown=JSON.parse(text);
 const stack:(Set<string>|null)[]=[];
 const tokens=/"(?:[^"\\]|\\.)*"|[{}[\]]/g;
 for(const match of text.matchAll(tokens)){
  const token=match[0];
  if(token==='{'||token==='['){stack.push(token==='{'?new Set():null);if(stack.length>32)throw new Error('Invalid JSON.');}
  else if(token==='}'||token===']')stack.pop();
  else if(text.slice(match.index+token.length).trimStart().startsWith(':')){
   const keys=stack.at(-1),key=JSON.parse(token) as string;
   if(!keys||keys.has(key)||['__proto__','prototype','constructor'].includes(key))throw new Error('Invalid JSON.');
   keys.add(key);
  }
 }
 return parsed;
}
