import pg from 'pg';
import {parseAccountsConfig} from './growx-agenda-auth.js';
let pool;
export function agendaConfigured(env=process.env){try{parseAccountsConfig(env.AGENDA_ACCOUNTS_JSON);return Boolean(env.AGENDA_DATABASE_URL)}catch{return false}}
export function agendaPool(){
 if(pool)return pool;
 const value=process.env.AGENDA_DATABASE_URL;
 if(!value)throw Object.assign(new Error('Configuração segura pendente.'),{status:503});
 const url=new URL(value);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Invalid database configuration');
 const username=decodeURIComponent(url.username);
 if(username!=='growx_agenda_runtime'&&!username.startsWith('growx_agenda_runtime.'))throw new Error('A dedicated database role is required');
 // Parse fields explicitly so sslmode parameters cannot disable certificate validation.
 pool=new pg.Pool({host:url.hostname,port:Number(url.port||5432),database:url.pathname.slice(1)||'postgres',user:username,password:decodeURIComponent(url.password),ssl:{rejectUnauthorized:true,...(process.env.AGENDA_DATABASE_CA?{ca:process.env.AGENDA_DATABASE_CA}:{})},max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,query_timeout:10000,application_name:'growx-agenda'});
 pool.on('error',()=>{});
 return pool;
}
