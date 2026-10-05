import {agendaConfigured,agendaPool} from '../_lib/growx-agenda-db.js';
import {createAgendaAuthService} from '../_lib/growx-agenda-auth.js';
import {createAgendaDataService} from '../_lib/growx-agenda-data.js';
import {privateHeaders,requireAgendaHost,requireSameOrigin,requestBody,safeError} from '../_lib/growx-agenda-http.js';
export default async function handler(request,response){
 privateHeaders(response);
 try{requireAgendaHost(request);if(request.method==='POST')requireSameOrigin(request);}catch(error){return safeError(error,response);}
 if(!agendaConfigured())return response.status(503).json({error:'Agenda indisponível até a configuração segura do serviço.'});
 try{
  const pool=agendaPool();const auth=createAgendaAuthService({pool,accountsJson:process.env.AGENDA_ACCOUNTS_JSON});const user=await auth.authenticate(request);
  if(!user)return response.status(401).json({error:'Sua sessão expirou. Entre novamente para continuar.'});
  const data=createAgendaDataService({pool});
  if(request.method==='GET')return response.status(200).json(await data.read(user));
  if(request.method==='POST'){return response.status(200).json(await data.mutate(requestBody(request),user));}
  response.setHeader('Allow','GET, POST');return response.status(405).json({error:'Método não permitido.'});
 }catch(error){return safeError(error,response);}
}
