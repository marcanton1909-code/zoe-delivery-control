import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Field } from '../components/Field';
import { Role, Route, User } from '../types';

const roles: { value: Role; label: string }[] = [
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'almacen', label: 'Almacén' },
  { value: 'repartidor', label: 'Repartidor' },
  { value: 'admin', label: 'Admin' },
];

function displayEmail(email?: string) {
  return email?.includes('@local.mackavi') ? '' : email || '';
}

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    const [u, r, me] = await Promise.all([api.users(), api.routes(), api.me()]);
    setUsers(u.users);
    setRoutes(r.routes);
    setCurrentUser(me.user);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  const canAssignAdmin = currentUser?.role === 'admin';
  const editableUsers = useMemo(() => users, [users]);

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      if (currentUser?.role === 'coordinador' && data.role === 'admin') {
        setMessage('Solo un admin puede crear usuarios admin.');
        return;
      }
      await api.createUser(data);
      setMessage('Usuario creado.');
      e.currentTarget.reset();
      await load();
    } catch (err: any) { setMessage(err.message); }
  }

  async function updateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      if (!String(data.password || '').trim()) delete (data as any).password;
      if (!('active' in data)) (data as any).active = 0;
      await api.updateUser(editingUser.id, data);
      setMessage('Usuario actualizado.');
      setEditingUser(null);
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
      <div className="page-title">
        <div>
          <h2>Configuración</h2>
          <p>Usuarios, perfiles, contraseñas y rutas. La edición de usuarios solo está disponible para admin y coordinador.</p>
        </div>
      </div>

      {message && <div className={message.includes('cread') || message.includes('actualizad') ? 'notice ok' : 'notice'}>{message}</div>}

      <div className="two-col">
        <form className="card form-grid" onSubmit={createUser}>
          <h3 className="full">Crear usuario</h3>
          <Field label="Nombre"><input name="name" required /></Field>
          <Field label="Usuario"><input name="username" required placeholder="alfredo.cruz" autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Correo opcional"><input name="email" type="email" placeholder="opcional" autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Contraseña"><input name="password" type="password" minLength={8} required /></Field>
          <Field label="Perfil"><select name="role"><option value="coordinador">Coordinador</option><option value="almacen">Almacén</option><option value="repartidor">Repartidor</option>{canAssignAdmin && <option value="admin">Admin</option>}</select></Field>
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

      {editingUser && (
        <form className="card form-grid" onSubmit={updateUser}>
          <h3 className="full">Editar usuario</h3>
          <Field label="Nombre"><input name="name" required defaultValue={editingUser.name} /></Field>
          <Field label="Usuario"><input name="username" required defaultValue={editingUser.username || ''} autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Correo opcional"><input name="email" type="email" defaultValue={displayEmail(editingUser.email)} placeholder="opcional" autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Nueva contraseña"><input name="password" type="password" minLength={8} placeholder="Dejar vacío para no cambiar" /></Field>
          <Field label="Perfil">
            <select name="role" defaultValue={editingUser.role}>
              {roles.filter(r => canAssignAdmin || r.value !== 'admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Teléfono"><input name="phone" defaultValue={editingUser.phone || ''} /></Field>
          <Field label="Activo"><select name="active" defaultValue={String(editingUser.active ?? 1)}><option value="1">Activo</option><option value="0">Inactivo</option></select></Field>
          <div className="full actions-row">
            <button className="btn primary">Guardar cambios</button>
            <button type="button" className="btn ghost" onClick={() => setEditingUser(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="two-col">
        <section className="card">
          <h3>Usuarios</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Perfil</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {editableUsers.map(u => {
                  const canEdit = currentUser?.role === 'admin' || (currentUser?.role === 'coordinador' && u.role !== 'admin');
                  return (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.username || '-'}</td>
                      <td>{displayEmail(u.email) || '-'}</td>
                      <td>{u.role}</td>
                      <td>{Number(u.active) === 1 ? 'Activo' : 'Inactivo'}</td>
                      <td>{canEdit ? <button type="button" className="btn tiny" onClick={() => setEditingUser(u)}>Editar</button> : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card"><h3>Rutas</h3><div className="table-wrap"><table><thead><tr><th>Ruta</th><th>Zona</th><th>Unidad</th></tr></thead><tbody>{routes.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.zone || '-'}</td><td>{r.default_vehicle || '-'}</td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  );
}
