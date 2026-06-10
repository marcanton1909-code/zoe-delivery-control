import { useState } from 'react';
import { api } from '../api';
import Field from '../components/Field';

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('marco.cruz@mackavi.com');
  const [password, setPassword] = useState('Admin1234!');
  const [name, setName] = useState('Marco Cruz');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setOk('');
    try {
      await api.login(email, password);
      onLoggedIn();
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally { setLoading(false); }
  }

  async function repairAdmin() {
    setLoading(true); setError(''); setOk('');
    try {
      await api.setup({ name: name || 'Marco Cruz', email: email || 'marco.cruz@mackavi.com', password: password || 'Admin1234!' });
      setOk('Administrador creado/reparado. Entrando al sistema...');
      onLoggedIn();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear administrador');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={login}>
        <div className="login-logo-frame"><img src="/mackavi-logo.png" alt="Mackavi Logistics" /></div>
        <div className="login-kicker">Control interno · Zoé Water</div>
        <h1>Control interno de entregas</h1>
        <p>Entregas, evidencia firmada, vehículos, inventario y reportes en una sola consola interna.</p>
        {error && <div className="notice">{error}</div>}
        {ok && <div className="notice ok">{ok}</div>}
        <div className="stack">
          <Field label="Nombre admin">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Correo">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn primary big" disabled={loading}>{loading ? 'Validando...' : 'Entrar al control'}</button>
          <button className="btn" type="button" disabled={loading} onClick={repairAdmin}>Crear / reparar administrador</button>
        </div>
      </form>
    </div>
  );
}
