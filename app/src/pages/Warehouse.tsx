import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

export default function Warehouse() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const res = await api.orders('?status=programada');
    const pending = await api.orders('?status=pendiente_validacion');
    setOrders([...pending.orders, ...res.orders]);
  }
  useEffect(() => { load(); }, []);

  async function validate(id: string, expected: number, complete: boolean) {
    const value = prompt('Paquetes cargados:', String(expected));
    if (value === null) return;
    try {
      await api.validateLoad(id, {
        packages_loaded: Number(value),
        validation_result: complete ? 'completa' : 'incompleta',
        comments: complete ? '' : 'Carga incompleta reportada desde almacén',
      });
      setMessage('Validación guardada.');
      await load();
    } catch (e: any) { setMessage(e.message); }
  }

  return (
    <div className="page">
      <div className="page-title"><div><h2>Almacén</h2><p>Validación de paquetes antes de salir a ruta.</p></div><a className="btn primary" href="#/vehicle-checklist">Nueva bitácora vehicular</a></div>
      {message && <div className={message.includes('guardada') ? 'notice ok' : 'notice'}>{message}</div>}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Paquetes</th><th>Ruta</th><th>Repartidor</th><th>Estatus</th><th>Acción</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.zoe_folio}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.packages_expected}</td>
                  <td>{o.route_name || '-'}</td>
                  <td>{o.driver_name || '-'}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="row-actions">
                    <button className="btn small primary" onClick={() => validate(o.id, o.packages_expected, true)}>Completa</button>
                    <button className="btn small" onClick={() => validate(o.id, o.packages_expected, false)}>Incompleta</button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7}>Sin órdenes pendientes de carga.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
