import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { Field } from '../components/Field';
import { Route, User } from '../types';

export default function NewOrder() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.routes().then((r) => setRoutes(r.routes));
    api.users('repartidor').then((r) => setDrivers(r.users)).catch(() => {});
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const form = new FormData(e.currentTarget);
      await api.createOrder(form);
      setMessage('Orden creada correctamente.');
      e.currentTarget.reset();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page narrow">
      <div className="page-title"><div><h2>Nueva orden Zoé</h2><p>Sube el PDF original y captura los datos clave.</p></div></div>
      <form className="card form-grid" onSubmit={submit}>
        <Field label="Folio Zoé"><input name="zoe_folio" required /></Field>
        <Field label="Fecha orden"><input name="order_date" type="date" /></Field>
        <Field label="Fecha programada"><input name="scheduled_delivery_date" type="date" required /></Field>
        <Field label="Cliente"><input name="customer_name" required /></Field>
        <Field label="Teléfono"><input name="customer_phone" /></Field>
        <Field label="Paquetes solicitados"><input name="packages_expected" type="number" min="1" required /></Field>
        <label className="field full"><span>Dirección</span><textarea name="customer_address" required rows={3} /></label>
        <Field label="Ruta"><select name="route_id"><option value="">Sin ruta</option>{routes.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Repartidor"><select name="driver_id"><option value="">Sin repartidor</option>{drivers.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Unidad"><input name="vehicle" /></Field>
        <label className="field full"><span>PDF original de Zoé</span><input name="original_pdf" type="file" accept="application/pdf" /></label>
        <label className="field full"><span>Observaciones</span><textarea name="notes" rows={3} /></label>
        {message && <div className={message.includes('correctamente') ? 'notice ok full' : 'notice full'}>{message}</div>}
        <button className="btn primary full" disabled={loading}>{loading ? 'Guardando...' : 'Guardar orden'}</button>
      </form>
    </div>
  );
}
