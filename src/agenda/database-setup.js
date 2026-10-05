export function makeDatabaseSetup(host,projectRef,random=globalThis.crypto){
 if(!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host)||! /^[a-z]{20}$/.test(projectRef))throw new Error('Confirme o endereço do pooler e a referência do projeto no painel oficial.');
 const password=Array.from(random.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
 return {sql:`ALTER ROLE growx_agenda_runtime LOGIN PASSWORD '${password}';`,url:`postgresql://growx_agenda_runtime.${projectRef}:${password}@${host}:6543/postgres`};
}
