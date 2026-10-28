import { loadAdminEnv } from '../../../../lib/admin/config';
import { createAdminStore } from '../../../../lib/admin/store';
import { createAdminHandler } from '../../../../lib/admin/handler';
import { createOrderStore } from '../../../../lib/orders/store';
let handler:ReturnType<typeof createAdminHandler>|undefined;
async function dispatch(request:Request,context:{params:Promise<{adminPrefix:string;path:string[]}>}){
 const {adminPrefix,path}=await context.params;
 if(`/${adminPrefix}`!==(process.env.ADMIN_PATH_PREFIX??'/manage-x7'))return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
 try{
  if(!handler){const config=loadAdminEnv();handler=createAdminHandler(config,createAdminStore(config.DATABASE_URL,config.ADMIN_SECRET_KEY),createOrderStore(config.DATABASE_URL));}
  return await handler(request,path.join('/'));
 }catch{return Response.json({error:{code:'UNAVAILABLE',message:'Service unavailable.'}},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const GET=dispatch,POST=dispatch,PUT=dispatch,PATCH=dispatch,DELETE=dispatch,HEAD=dispatch,OPTIONS=dispatch;
