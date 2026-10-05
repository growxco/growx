import {agendaConfigured,agendaPool} from '../_lib/growx-agenda-db.js';
import {createAgendaAuthService} from '../_lib/growx-agenda-auth.js';
import {privateHeaders,requireAgendaHost,requireSameOrigin,requestBody,safeError} from '../_lib/growx-agenda-http.js';
export default async function handler(request,response){
 privateHeaders(response);
 try{requireAgendaHost(request);if(request.method==='POST')requireSameOrigin(request);}catch(error){return safeError(error,response);}
 if(!agendaConfigured())return response.status(503).json({configured:false,authenticated:false,error:'A agenda está aguardando a configuração segura de acesso e armazenamento.'});
 try{
  const auth=createAgendaAuthService({pool:agendaPool(),accountsJson:process.env.AGENDA_ACCOUNTS_JSON});
  if(request.method==='GET'){const user=await auth.authenticate(request);return response.status(user?200:401).json({configured:true,authenticated:!!user,...(user?{user}:{})});}
  if(request.method!=='POST'){response.setHeader('Allow','GET, POST');return response.status(405).json({error:'Método não permitido.'});}
  const body=requestBody(request);
  if(body.action==='login'){const result=await auth.login(request,body);response.setHeader('Set-Cookie',result.cookie);return response.status(200).json({configured:true,authenticated:true,user:result.user});}
  if(body.action==='logout'){response.setHeader('Set-Cookie',await auth.logout(request));return response.status(200).json({configured:true,authenticated:false});}
  return response.status(400).json({error:'Solicitação inválida.'});
 }catch(error){return safeError(error,response);}
}
