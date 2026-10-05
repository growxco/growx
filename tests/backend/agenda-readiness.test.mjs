import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sessionHandler from '../../api/socios/session.js';
import agendaHandler from '../../api/socios/agenda.js';
function response() { const out = {headers:{}}; return {out,setHeader(k,v){out.headers[k]=v;},status(s){out.status=s;return this;},json(value){out.body=value;return this;}}; }
test('agenda and session endpoints fail closed before secure configuration',()=>{for(const handler of [sessionHandler,agendaHandler])for(const method of ['GET','POST','PUT','DELETE']){const res=response();handler({method,body:{action:'login',password:'test-input-not-a-real-credential'}},res);assert.equal(res.out.status,503);assert.match(res.out.headers['Cache-Control'],/no-store/);assert.equal(res.out.body.authenticated===true,false);assert.equal(res.out.body.items,undefined);}});
test('isolated entry does not import marketing shell or tracking providers',()=>{const html=fs.readFileSync('socios-agenda.html','utf8');const entry=fs.readFileSync('src/agenda/main.jsx','utf8');assert.match(html,/noindex,nofollow,noarchive/);assert.doesNotMatch(html+entry,/installAnalytics|clarity|googletagmanager|facebook|linkedin|src\/main\.jsx|from ['"]\.\.\/App/);});
test('agenda routes precede general SPA fallback and keep financial routes',()=>{const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));const index=v.rewrites.findIndex(x=>x.source==='/socios/agenda');const fallback=v.rewrites.findIndex(x=>x.destination==='/'&&x.source.includes('?!api'));assert(index>=0&&index<fallback);assert(v.rewrites.some(x=>x.source==='/prevenda'&&x.destination==='/prevenda.html'));assert(v.rewrites.some(x=>x.source==='/api/(.*)'));});
