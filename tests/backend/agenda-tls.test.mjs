import test from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate} from 'node:crypto';
import fs from 'node:fs';
import {SUPABASE_ROOT_CA} from '../../api/_lib/growx-agenda-ca.js';
test('database trust anchor is the pinned public Supabase root certificate',()=>{const cert=new X509Certificate(SUPABASE_ROOT_CA);assert.equal(cert.ca,true);assert.equal(cert.fingerprint256.replaceAll(':','').toLowerCase(),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');assert.match(cert.subject,/Supabase Root 2021 CA/);assert(new Date(cert.validTo)>new Date('2030-01-01'));assert(!SUPABASE_ROOT_CA.includes('PRIVATE KEY'));});
test('database connection retains chain and hostname validation',()=>{const code=fs.readFileSync('api/_lib/growx-agenda-db.js','utf8');assert.match(code,/rejectUnauthorized:true/);assert.match(code,/servername:url.hostname/);assert.match(code,/ca:process.env.AGENDA_DATABASE_CA\|\|SUPABASE_ROOT_CA/);assert.doesNotMatch(code,/rejectUnauthorized:false|NODE_TLS_REJECT_UNAUTHORIZED/);});
