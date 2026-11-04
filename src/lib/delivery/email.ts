import 'server-only';
export type DeliveryEmail={to:string;from:string;orderCode:string;productName:string;deliveryCode:string;instructions:string;supportUrl:string};
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function renderDeliveryEmail(input:DeliveryEmail){
 const e={order:escapeHtml(input.orderCode),product:escapeHtml(input.productName),code:escapeHtml(input.deliveryCode),instructions:escapeHtml(input.instructions),support:escapeHtml(input.supportUrl)};
 const text=`আপনার অর্ডার প্রস্তুত / Your order is ready.\nঅর্ডার / Order: ${input.orderCode}\nপণ্য / Product: ${input.productName}\nডেলিভারি কোড / Delivery code: ${input.deliveryCode}\nনির্দেশনা / Instructions: ${input.instructions}\nসহায়তা / Support: ${input.supportUrl}`;
 const html=`<!doctype html><html><body><h1>আপনার অর্ডার প্রস্তুত / Your order is ready</h1><p>অর্ডার / Order: ${e.order}</p><p>পণ্য / Product: ${e.product}</p><p>ডেলিভারি কোড / Delivery code: <strong>${e.code}</strong></p><p>নির্দেশনা / Instructions:<br>${e.instructions.replace(/\n/g,'<br>')}</p><p><a href="${e.support}">WhatsApp সহায়তা / Support</a></p></body></html>`;
 return {from:input.from,to:[input.to],subject:`Delivery for order ${input.orderCode}`,text,html};
}
export async function sendDeliveryEmail(message:ReturnType<typeof renderDeliveryEmail>,apiKey:string){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(message),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Delivery email failed.');
}
