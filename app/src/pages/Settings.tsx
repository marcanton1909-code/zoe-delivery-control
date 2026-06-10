import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { Field } from '../components/Field';
import { Route, User } from '../types';

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const [u, r] = await Promise.all([api.users(), api.routes()]);
    setUsers(u.users);
    setRoutes(r.routes);
  }
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await api.createUser(data);
      setMessage('Usuario creado.');
      e.currentTarget.reset();
      await load();
    } catch (err: any) { setMessage(err.message); }
  }

  async function createRoute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await api.createRoute(data);
      setMessage('Ruta creada.');
      e.currentTarget.reset();
      await load();
    } catch (err: any) { setMessage(err.message); }
  }

  return (
    <div className="page">
      <div className="page-title"><div><h2>Configuración</h2><p>Usuarios, roles y rutas.</p></div></div>
      {message && <div className={message.includes('cread') ? 'notice ok' : 'notice'}>{message}</div>}
      <div className="two-col">
        <form className="card form-grid" onSubmit={createUser}>
          <h3 className="full">Crear usuario</h3>
          <Field label="Nombre"><input name="name" required /></Field>
          <Field label="Correo"><input name="email" type="email" required /></Field>
          <Field label="Contraseña"><input name="password" type="password" minLength={8} required /></Field>
          <Field label="Rol"><select name="role"><option value="coordinador">Coordinador</option><option value="almacen">Almacén</option><option value="repartidor">Repartidor</option><option value="admin">Admin</option></select></Field>
          <Field label="Teléfono"><input name="phone" /></Field>
          <button className="btn primary full">Crear usuario</button>
        </form>
        <form className="card form-grid" onSubmit={createRoute}>
          <h3 className="full">Crear ruta</h3>
          <Field label="Nombre ruta"><input name="name" required /></Field>
          <Field label="Zona"><input name="zone" /></Field>
          <Field label="Repartidor base"><select name="default_driver_id"><option value="">Sin asignar</option>{users.filter(u => u.role === 'repartidor').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Unidad base"><input name="default_vehicle" /></Field>
          <button className="btn primary full">Crear ruta</button>
        </form>
      </div>

      <div className="two-col">
        <section className="card"><h3>Usuarios</h3><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody></table></div></section>
        <section className="card"><h3>Rutas</h3><div className="table-wrap"><table><thead><tr><th>Ruta</th><th>Zona</th><th>Unidad</th></tr></thead><tbody>{routes.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.zone || '-'}</td><td>{r.default_vehicle || '-'}</td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  );
}
