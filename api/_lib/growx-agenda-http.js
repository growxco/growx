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
export function safeError(error,response){
 const status=Number(error?.status);
 if([400,401,403,404,409,413,415,429].includes(status))return response.status(status).json({error:error.message});
 // Return only allowlisted categories. Never expose driver messages, connection URLs,
 // usernames, query text, stacks, submitted fields, hashes or environment values.
 const categories={
  SELF_SIGNED_CERT_IN_CHAIN:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  DEPTH_ZERO_SELF_SIGNED_CERT:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  ERR_TLS_CERT_ALTNAME_INVALID:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  CERT_HAS_EXPIRED:['DB_TLS','Não foi possível validar o certificado seguro do banco. A configuração TLS precisa ser conferida.'],
  ENOTFOUND:['DB_NETWORK','O servidor não conseguiu localizar o banco. A conexão técnica precisa ser conferida.'],
  EAI_AGAIN:['DB_NETWORK','O servidor não conseguiu localizar o banco. A conexão técnica precisa ser conferida.'],
  ECONNREFUSED:['DB_NETWORK','O banco recusou a conexão do servidor. A conexão técnica precisa ser conferida.'],
  ETIMEDOUT:['DB_NETWORK','O banco não respondeu a tempo. Tente novamente em alguns instantes.'],
  '28P01':['DB_CREDENTIAL','A credencial técnica do banco não foi aceita. Isso não indica erro na sua senha pessoal.'],
  '28000':['DB_CREDENTIAL','A credencial técnica do banco não foi aceita. Isso não indica erro na sua senha pessoal.'],
  '42501':['DB_PERMISSION','O banco recusou uma permissão necessária para a agenda.'],
  '42P01':['DB_SCHEMA','As tabelas da agenda não foram encontradas na conexão configurada.'],
  ERR_INVALID_URL:['DB_CONFIG','A configuração da conexão técnica está em formato inválido.'],
  AGENDA_DB_CONFIG:['DB_CONFIG','A configuração da conexão técnica está em formato inválido.'],
 };
 const matched=typeof error?.code==='string'&&Object.hasOwn(categories,error.code)?categories[error.code]:null;
 const [incident,message]=matched||['SERVICE_UNAVAILABLE','Não foi possível acessar a agenda agora. Seus dados não foram descartados; tente novamente.'];
 return response.status(503).json({error:message,incident});
}
