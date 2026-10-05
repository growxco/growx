import {createHash,randomBytes,pbkdf2 as pbkdf2Callback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {isIP} from 'node:net';
const pbkdf2=promisify(pbkdf2Callback);
export const COOKIE='__Host-growx_agenda';
const names={fernando:'Fernando',jefferson:'Jefferson',julio:'Júlio'};
const hashPattern=/^pbkdf2-sha256\$600000\$([0-9a-f]{32})\$([0-9a-f]{64})$/;
const failure=(message,status)=>Object.assign(new Error(message),{status});
const sha=(value)=>createHash('sha256').update(value).digest('hex');
export async function createPasswordHash(password,salt=randomBytes(16).toString('hex')){
 if(typeof password!=='string'||password.length<14||password.length>256||!/^([0-9a-f]{32})$/.test(salt))throw failure('Use uma senha nova de 14 a 256 caracteres.',400);
 const key=await pbkdf2(password,Buffer.from(salt,'hex'),600000,32,'sha256');
 return `pbkdf2-sha256$600000$${salt}$${key.toString('hex')}`;
}
export function parseAccountsConfig(value){
 let input;try{input=JSON.parse(value||'')}catch{throw failure('Configuração segura pendente.',503)}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==3)throw failure('Configuração segura pendente.',503);
 const accounts={};const emails=new Set();const hashes=new Set();
 for(const person of Object.keys(names)){
  const entry=input[person];const email=typeof entry?.email==='string'?entry.email.trim().toLowerCase():'';
  const parts=hashPattern.exec(entry?.hash||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||emails.has(email)||!parts||hashes.has(entry.hash))throw failure('Configuração segura pendente.',503);
  emails.add(email);hashes.add(entry.hash);
  accounts[person]={person,email,actor:`${names[person]} <${email}>`,salt:Buffer.from(parts[1],'hex'),digest:Buffer.from(parts[2],'hex'),version:sha(email+':'+entry.hash)};
 }
 return accounts;
}
function cookieToken(request){const raw=request.headers?.cookie;if(typeof raw!=='string'||raw.length>8192)return null;const matches=raw.split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));if(matches.length!==1)return null;const token=matches[0].slice(COOKIE.length+1);return /^[A-Za-z0-9_-]{43}$/.test(token)?token:null;}
export function sessionCookie(token,maxAge=28800){return `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;}
function clientIp(request){const raw=request.headers?.['x-vercel-forwarded-for']||request.headers?.['x-forwarded-for'];if(typeof raw!=='string')throw failure('Não foi possível validar a origem do acesso.',403);const value=raw.split(',')[0].trim();if(!isIP(value))throw failure('Não foi possível validar a origem do acesso.',403);return value;}
export function createAgendaAuthService({pool,accountsJson}){
 const accounts=parseAccountsConfig(accountsJson);
 const publicUser=(account,expiresAt)=>({person:account.person,actor:account.actor,email:account.email,expiresAt:new Date(expiresAt).toISOString()});
 async function authenticate(request){
  const token=cookieToken(request);if(!token)return null;
  const result=await pool.query('SELECT person,password_version,expires_at FROM growx_agenda.sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',[sha(token)]);
  const row=result.rows[0];const account=accounts[row?.person];
  if(!row||!account||row.password_version!==account.version)return null;
  return publicUser(account,row.expires_at);
 }
 async function login(request,data){
  if(typeof data?.email!=='string'||data.email.length>254||typeof data?.password!=='string'||data.password.length>256)throw failure('Informe o e-mail e a senha da agenda.',400);
  const email=data.email.trim().toLowerCase();const account=Object.values(accounts).find(a=>a.email===email);
  const key=sha('growx-agenda:'+clientIp(request));
  const reserve=await pool.query("INSERT INTO growx_agenda.login_attempts (key_hash,attempts,resets_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT (key_hash) DO UPDATE SET attempts=CASE WHEN growx_agenda.login_attempts.resets_at<=now() THEN 1 ELSE growx_agenda.login_attempts.attempts+1 END,resets_at=CASE WHEN growx_agenda.login_attempts.resets_at<=now() THEN now()+interval '15 minutes' ELSE growx_agenda.login_attempts.resets_at END RETURNING attempts",[key]);
  if(reserve.rows[0].attempts>10)throw failure('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',429);
  // Unknown accounts still perform the same expensive derivation and use a generic error.
  const candidate=account||accounts.fernando;
  const input=await pbkdf2(data.password,candidate.salt,600000,32,'sha256');
  if(!timingSafeEqual(input,candidate.digest)||!account)throw failure('E-mail ou senha da agenda incorretos.',401);
  const token=randomBytes(32).toString('base64url');
  const result=await pool.query("INSERT INTO growx_agenda.sessions (token_hash,person,password_version,expires_at) VALUES ($1,$2,$3,now()+interval '8 hours') RETURNING expires_at",[sha(token),account.person,account.version]);
  await pool.query('DELETE FROM growx_agenda.login_attempts WHERE key_hash=$1',[key]);
  return {cookie:sessionCookie(token),user:publicUser(account,result.rows[0].expires_at)};
 }
 async function logout(request){const token=cookieToken(request);if(token)await pool.query('UPDATE growx_agenda.sessions SET revoked_at=now() WHERE token_hash=$1',[sha(token)]);return sessionCookie('',0);}
 return {authenticate,login,logout};
}
