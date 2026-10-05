import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Agenda from './Agenda';
import PasswordSetup from './PasswordSetup';
import logo from '@/assets/logo-growx-oficial.png';
import './agenda.css';

export function AgendaEntry() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
    try {
      const response = await fetch('/api/socios/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
      setSession(null);
    } catch (failure) { throw new Error(failure.message || 'Não foi possível encerrar a sessão. Tente novamente.'); }
  }

  if (session) return <Agenda onLogout={logout}/>;
  return <main className="agenda-gate"><section className="agenda-login"><img src={logo} alt="Grow-X"/><h1>Agenda dos Sócios</h1><p>Compromissos, prioridades e entregas em um só lugar.</p>{loading ? <p role="status">Verificando acesso…</p> : configured ? <form onSubmit={login}><label>Seu e-mail<input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label>Sua senha<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button className="button primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar na agenda'}</button></form> : null}{error && <div className="agenda-gate-error" role="alert">{error}</div>}{!configured && !loading && <div className="agenda-reload"><button className="button" onClick={() => window.location.reload()}>Verificar novamente</button></div>}<div className="agenda-gate-note">Uma agenda compartilhada, com acesso individual para cada sócio. Use a senha criada para o seu e-mail.</div></section></main>;
}
const preparingPassword = new URLSearchParams(window.location.search).get('configurar') === 'senha';
createRoot(document.getElementById('root')).render(<StrictMode>{preparingPassword ? <PasswordSetup/> : <AgendaEntry/>}</StrictMode>);
