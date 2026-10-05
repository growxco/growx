import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Agenda from './Agenda';
import PasswordSetup from './PasswordSetup';
import DatabaseSetup from './DatabaseSetup';
import logo from '@/assets/logo-growx-oficial.png';
import './agenda.css';
import {sessionIsExpired,sessionExpiryDelay} from './session-policy.js';

export function AgendaEntry() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [logoutIncomplete,setLogoutIncomplete] = useState(false);
  const lockSession=useCallback(()=>{setSession(null);setError('Sua sessão expirou. Os dados desta aba foram ocultados. Entre novamente; alterações não salvas precisam ser refeitas.');},[]);
  useEffect(()=>{
    if(!session)return;
    const expiresAt=session.user?.expiresAt;
    const check=()=>{if(sessionIsExpired(expiresAt))lockSession()};
    const timer=setTimeout(lockSession,sessionExpiryDelay(expiresAt));
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{clearTimeout(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)};
  },[session,lockSession]);
  useEffect(() => {
    let live = true;
    fetch('/api/socios/session', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!live) return;
      setConfigured(data.configured === true);
      if (response.ok && data.authenticated) setSession(data);
      else if (response.status !== 401) setError(data.error || 'Não foi possível verificar o acesso.');
    }).catch(() => live && setError('Não foi possível conectar à agenda. Tente novamente.')).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/socios/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password: fields.get('password'), email: fields.get('email') }),
      });
      const data = await response.json();
      if (!response.ok || !data.authenticated) throw new Error(data.error || 'Não foi possível entrar.');
      form.reset();
      setSession(data);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    setSession(null); setError(''); setLogoutIncomplete(true);
    try {
      const response = await fetch('/api/socios/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
      setLogoutIncomplete(false);
    } catch (failure) { setError((failure.message || 'Não foi possível encerrar a sessão no servidor.')+' Os dados estão ocultos nesta aba, mas tente sair novamente ao reconectar.'); }
  }

  if (session) return <Agenda onLogout={logout} onSessionExpired={lockSession}/>;
  return <main className="agenda-gate"><section className="agenda-login"><img src={logo} alt="Grow-X"/><h1>Agenda dos Sócios</h1><p>Compromissos, prioridades e entregas em um só lugar.</p>{loading ? <p role="status">Verificando acesso…</p> : configured && !logoutIncomplete ? <form onSubmit={login}><label>Seu e-mail<input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>Sua senha<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button className="button primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar na agenda'}</button></form> : null}{error && <div className="agenda-gate-error" role="alert">{error}</div>}{logoutIncomplete&&<button className="button" onClick={logout}>Tentar sair novamente</button>}{!configured && !loading && <div className="agenda-reload"><button className="button" onClick={() => window.location.reload()}>Verificar novamente</button></div>}<div className="agenda-gate-note">Uma agenda compartilhada, com acesso individual para cada sócio. Use a senha criada para o seu e-mail.</div></section></main>;
}
const setupMode = new URLSearchParams(window.location.search).get('configurar');
createRoot(document.getElementById('root')).render(<StrictMode>{setupMode === 'senha' ? <PasswordSetup/> : setupMode === 'banco' ? <DatabaseSetup/> : <AgendaEntry/>}</StrictMode>);
