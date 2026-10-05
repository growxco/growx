export function privateHeaders(response){response.setHeader('Cache-Control','no-store, private');response.setHeader('Pragma','no-cache');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');}
export function allowedOrigins(env=process.env){return new Set(['https://www.growx.com.br','https://growx.com.br',...[env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>'https://'+h)]);}
export function requireSameOrigin(request,origins=allowedOrigins()){
 const origin=request.headers?.origin;
 if(typeof origin!=='string'||!origins.has(origin))throw Object.assign(new Error('Origem não autorizada.'),{status:403});
 const ct=request.headers?.['content-type'];
 if(typeof ct!=='string'||ct.split(';')[0].trim().toLowerCase()!=='application/json')throw Object.assign(new Error('Use uma solicitação JSON.'),{status:415});
}
export function requestBody(request){
 if(Number(request.headers?.['content-length']||0)>1200000)throw Object.assign(new Error('Solicitação muito grande.'),{status:413});
 let body=request.body;
 if(typeof body==='string'){if(Buffer.byteLength(body)>1200000)throw Object.assign(new Error('Solicitação muito grande.'),{status:413});try{body=JSON.parse(body)}catch{throw Object.assign(new Error('Solicitação inválida.'),{status:400})}}
 if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>1200000)throw Object.assign(new Error('Solicitação inválida ou muito grande.'),{status:400});
 return body;
}
export function safeError(error,response){const status=Number(error?.status);if([400,401,403,404,409,413,415,429].includes(status))return response.status(status).json({error:error.message});return response.status(503).json({error:'Não foi possível acessar a agenda agora. Seus dados não foram descartados; tente novamente.'});}
