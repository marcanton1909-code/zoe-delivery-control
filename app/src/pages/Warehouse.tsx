import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

const ACTIVE_WAREHOUSE_STATUSES = ['pendiente_validacion', 'programada', 'carga_incompleta', 'cargada', 'en_ruta'];
const FINAL_STATUSES = ['entregada', 'parcial', 'no_entregada', 'rechazada', 'cancelada'];

function uniqueOrders(lists: Order[][]) {
  const map = new Map<string, Order>();
  lists.flat().forEach((order) => map.set(order.id, order));
  return Array.from(map.values()).filter((order) => !FINAL_STATUSES.includes(order.status));
}

export default function Warehouse() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const responses = await Promise.all(
        ACTIVE_WAREHOUSE_STATUSES.map((status) => api.orders(`?status=${status}`))
      );
      setOrders(uniqueOrders(responses.map((res) => res.orders)));
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
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

  async function startRoute(id: string) {
    try {
      await api.startRoute(id);
      setMessage('Orden enviada a ruta.');
      await load();
    } catch (e: any) { setMessage(e.message); }
  }

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = a.scheduled_delivery_date || a.created_at || '';
      const bDate = b.scheduled_delivery_date || b.created_at || '';
      return aDate.localeCompare(bDate);
    });
  }, [orders]);

  return (
    <div className="page">
      <div className="page-title"><div><h2>Almacén</h2><p>Validación de paquetes y salida a ruta sin limitar por fecha. Aquí aparecen órdenes vencidas, de hoy y futuras mientras no estén finalizadas.</p></div><a className="btn primary" href="#/vehicle-checklist">Nueva bitácora vehicular</a></div>
      {message && <div className={message.includes('guardada') || message.includes('enviada') ? 'notice ok' : 'notice'}>{message}</div>}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Paquetes</th><th>Ruta</th><th>Repartidor</th><th>Estatus</th><th>Acción</th></tr></thead>
            <tbody>
              {sortedOrders.map((o) => {
                const canValidate = ['pendiente_validacion', 'programada', 'carga_incompleta'].includes(o.status);
                const canStart = ['programada', 'cargada'].includes(o.status);
                return (
                  <tr key={o.id}>
                    <td>{o.zoe_folio}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.scheduled_delivery_date || '-'}</td>
                    <td>{o.packages_loaded || 0}/{o.packages_expected}</td>
                    <td>{o.route_name || '-'}</td>
                    <td>{o.driver_name || '-'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="row-actions">
                      {canValidate && <button className="btn small primary" onClick={() => validate(o.id, o.packages_expected, true)}>Carga completa</button>}
                      {canValidate && <button className="btn small" onClick={() => validate(o.id, o.packages_expected, false)}>Incompleta</button>}
                      {canStart && <button className="btn small primary" onClick={() => startRoute(o.id)}>Enviar a ruta</button>}
                      {o.status === 'en_ruta' && <span className="muted">Ya está en ruta</span>}
                    </td>
                  </tr>
                );
              })}
              {loading && <tr><td colSpan={8}>Cargando órdenes...</td></tr>}
              {!loading && sortedOrders.length === 0 && <tr><td colSpan={8}>Sin órdenes pendientes de almacén o ruta.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
