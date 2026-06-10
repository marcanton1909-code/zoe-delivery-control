import { FormEvent, useState } from 'react';
import { api } from '../api';

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'setup') {
        await api.setup({ name, email, password });
        setMode('login');
        setError('Primer admin creado. Ahora inicia sesión.');
      } else {
        await api.login(email, password);
        onLoggedIn();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">ZW</div>
        <h1>Zoé Delivery Control</h1>
        <p>Control interno de entregas, firmas, evidencias y reportes.</p>

        <form onSubmit={submit} className="stack">
          {mode === 'setup' && (
            <label className="field"><span>Nombre admin</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          )}
          <label className="field"><span>Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="field"><span>Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
          {error && <div className={error.includes('creado') ? 'notice ok' : 'notice'}>{error}</div>}
          <button className="btn primary" disabled={loading}>{loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear primer admin'}</button>
        </form>

        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'setup' : 'login')}>
          {mode === 'login' ? 'Crear primer administrador' : 'Volver a login'}
        </button>
      </section>
    </main>
  );
}
