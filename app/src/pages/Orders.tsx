import { useEffect, useState } from 'react';
import { api, fileUrl } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

export default function Orders({ onOpen }: { onOpen: (id: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const query = status ? `?status=${status}` : '';
      const res = await api.orders(query);
      setOrders(res.orders);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [status]);

  return (
    <div className="page">
      <div className="page-title">
        <div><h2>Órdenes</h2><p>Control de órdenes descargadas del portal Zoé.</p></div>
        <button className="btn primary" onClick={() => location.hash = '#/orders/new'}>Nueva orden</button>
      </div>
      {error && <div className="notice">{error}</div>}
      <section className="card">
        <div className="filters">
          <label className="field compact"><span>Estatus</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente_validacion">Pendiente</option>
              <option value="programada">Programada</option>
              <option value="cargada">Cargada</option>
              <option value="en_ruta">En ruta</option>
              <option value="entregada">Entregada</option>
              <option value="parcial">Parcial</option>
              <option value="no_entregada">No entregada</option>
            </select>
          </label>
          <button className="btn" onClick={load}>Actualizar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Ruta</th><th>Repartidor</th><th>Paquetes</th><th>Estatus</th><th>PDF</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => onOpen(o.id)} className="click-row">
                  <td>{o.zoe_folio}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.scheduled_delivery_date || '-'}</td>
                  <td>{o.route_name || '-'}</td>
                  <td>{o.driver_name || '-'}</td>
                  <td>{o.packages_delivered || 0}/{o.packages_expected}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.original_pdf_key ? <a href={fileUrl(o.original_pdf_key)} onClick={(e) => e.stopPropagation()} target="_blank">Ver</a> : '-'}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8}>Sin órdenes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
