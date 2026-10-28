import { createElement } from 'react';
/** Customer-controlled fields are React text children, never HTML. */
export function AdminFields({fields}:{fields:Record<string,string|number|boolean|null>}) {
 return createElement('dl',null,...Object.entries(fields).map(([name,value])=>
  createElement('div',{key:name},createElement('dt',null,name),createElement('dd',null,String(value??'—')))));
}
