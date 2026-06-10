import { useEffect, useState } from 'react';
import { api, fileUrl } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Order } from '../types';

export default function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('Corrección de evidencia');

  async function load() {
    try {
      const res = await api.order(id);
      setOrder(res.order);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, [id]);

  async function startRoute() {
    try { await api.startRoute(id); await load(); } catch (e: any) { setError(e.message); }
  }

  async function reopen() {
    try { await api.reopen(id, reason); await load(); } catch (e: any) { setError(e.message); }
  }

  if (error) return <div className="notice">{error}</div>;
  if (!order) return <div className="muted">Cargando orden...</div>;

  return (
    <div className="page narrow">
      <button className="link-button" onClick={() => location.hash = '#/orders'}>← Volver</button>
      <section className="card detail-card">
        <div className="detail-head">
          <div><h2>{order.zoe_folio}</h2><p>{order.customer_name}</p></div>
          <StatusBadge status={order.status} />
        </div>
        <div className="detail-grid">
          <div><span>Dirección</span><strong>{order.customer_address}</strong></div>
          <div><span>Fecha programada</span><strong>{order.scheduled_delivery_date || '-'}</strong></div>
          <div><span>Ruta</span><strong>{order.route_name || '-'}</strong></div>
          <div><span>Repartidor</span><strong>{order.driver_name || '-'}</strong></div>
          <div><span>Unidad</span><strong>{order.vehicle || '-'}</strong></div>
          <div><span>Paquetes</span><strong>{order.packages_delivered || 0}/{order.packages_expected}</strong></div>
        </div>
        <div className="actions-row">
          {order.original_pdf_key && <a className="btn" href={fileUrl(order.original_pdf_key)} target="_blank">Ver PDF original</a>}
          {order.signed_pdf_key && <a className="btn" href={fileUrl(order.signed_pdf_key)} target="_blank">Ver evidencia PDF</a>}
          {(order.status === 'programada' || order.status === 'cargada') && <button className="btn primary" onClick={startRoute}>Mandar a ruta</button>}
        </div>
      </section>

      <section className="card">
        <h3>Reabrir orden</h3>
        <p className="muted">Solo usar cuando hay error de captura o corrección autorizada.</p>
        <div className="filters">
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn danger" onClick={reopen}>Reabrir a en ruta</button>
        </div>
      </section>
    </div>
  );
}
