import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import process from 'node:process';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {createPasswordHash} from '../../api/_lib/growx-agenda-auth.js';
import {blank} from '../../src/agenda/model.js';
import sessionHandler from '../../api/socios/session.js';
import agendaHandler from '../../api/socios/agenda.js';
const password='synthetic-test-password-only';
const origin='https://www.growx.com.br';
const headers={origin,'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.30'};
async function call(handler,method,body,extra={}){const out={headers:{}};const response={setHeader(k,v){out.headers[k]=v},status(s){out.status=s;return this},json(v){out.body=v;return this}};await handler({method,body,headers:{...headers,...extra}},response);return out}

test('HTTP route chain enforces authentication, origin, role, revision and logout over restricted database role',async()=>{
 const db=new PGlite();
 const OriginalPool=pg.Pool;
 try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(await fs.readFile('supabase/migrations/20261005201446_growx_agenda_private_schema.sql','utf8'));
  await db.exec('SET ROLE growx_agenda_runtime;');
  const pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}}),on(){}};
  pg.Pool=class{constructor(){return pool}};
  process.env.AGENDA_DATABASE_URL='postgresql://growx_agenda_runtime:synthetic-invalid-local-test@localhost/postgres';
  process.env.AGENDA_ACCOUNTS_JSON=JSON.stringify({fernando:{email:'fernando@example.invalid',hash:await createPasswordHash(password,'33333333333333333333333333333333')},jefferson:{email:'jefferson@example.invalid',hash:await createPasswordHash(password+'-jeff','22222222222222222222222222222222')},julio:{email:'julio@example.invalid',hash:await createPasswordHash(password+'-julio','11111111111111111111111111111111')}});
  let r=await call(agendaHandler,'GET');assert.equal(r.status,401);assert.equal(r.body.items,undefined);assert.match(r.headers['Cache-Control'],/no-store/);
  r=await call(sessionHandler,'GET');assert.equal(r.status,401);assert.equal(r.body.authenticated,false);
  r=await call(sessionHandler,'POST',{action:'login',email:'fernando@example.invalid',password},{origin:'https://attacker.invalid'});assert.equal(r.status,403);assert.equal(r.headers['Set-Cookie'],undefined);
  r=await call(sessionHandler,'POST',{action:'login',email:'fernando@example.invalid',password},{'content-type':'text/plain'});assert.equal(r.status,415);
  r=await call(sessionHandler,'POST',{action:'login',email:'unknown@example.invalid',password});assert.equal(r.status,401);
  r=await call(sessionHandler,'POST',{action:'login',email:'fernando@example.invalid',password});assert.equal(r.status,200);assert.equal(r.body.user.person,'fernando');
  const cookie=r.headers['Set-Cookie'].split(';')[0];assert.match(r.headers['Set-Cookie'],/Secure; HttpOnly; SameSite=Strict/);
  r=await call(agendaHandler,'POST',{action:'initialize'},{cookie});assert.equal(r.status,200);
  const item={...blank('2026-10-05'),title:'Synthetic route test',owners:['fernando','jefferson','julio']};
  const create={action:'save',item,requestId:randomUUID(),user:{person:'julio',actor:'Forged actor'}};
  r=await call(agendaHandler,'POST',create,{cookie,origin:undefined});assert.equal(r.status,403);
  r=await call(agendaHandler,'POST',create,{cookie});assert.equal(r.status,200);const id=r.body.id;
  r=await call(agendaHandler,'GET',undefined,{cookie});assert.equal(r.status,200);assert.equal(r.body.items.length,1);assert.equal(r.body.items[0].updatedBy,'Fernando <fernando@example.invalid>');assert.equal(r.body.history[0].actor,'Fernando <fernando@example.invalid>');assert.equal(r.body.user.person,'fernando');
  const current=r.body.items[0];
  r=await call(sessionHandler,'POST',{action:'login',email:'julio@example.invalid',password:password+'-julio'});assert.equal(r.status,200);const julio=r.headers['Set-Cookie'].split(';')[0];
  r=await call(agendaHandler,'GET',undefined,{cookie:julio});assert.equal(r.body.items[0].id,id);
  r=await call(agendaHandler,'POST',{action:'save',id,revision:current.revision,item:{...item,title:'Synthetic edited by partner'}},{cookie:julio});assert.equal(r.status,200);
  r=await call(agendaHandler,'POST',{action:'save',id,revision:current.revision,item},{cookie});assert.equal(r.status,409);
  r=await call(agendaHandler,'GET',undefined,{cookie});assert.equal(r.body.items[0].title,'Synthetic edited by partner');assert.equal(r.body.items[0].updatedBy,'Júlio <julio@example.invalid>');
  r=await call(agendaHandler,'DELETE',undefined,{cookie});assert.equal(r.status,405);
  r=await call(sessionHandler,'POST',{action:'logout'},{cookie});assert.equal(r.status,200);assert.match(r.headers['Set-Cookie'],/Max-Age=0/);
  r=await call(agendaHandler,'GET',undefined,{cookie});assert.equal(r.status,401);
  r=await call(agendaHandler,'GET',undefined,{cookie:julio});assert.equal(r.status,200);
 }finally{pg.Pool=OriginalPool;delete process.env.AGENDA_DATABASE_URL;delete process.env.AGENDA_ACCOUNTS_JSON;await db.close()}
});
