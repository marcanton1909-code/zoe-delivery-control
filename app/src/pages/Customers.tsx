import { useEffect, useState } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Customer, Order } from '../types';

function displayCustomer(c: Customer) {
  return c.company_name || c.contact_name || c.email || c.phone || 'Cliente sin nombre';
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.customers(q ? `?q=${encodeURIComponent(q)}` : '');
      setCustomers(res.customers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCustomer(id: string) {
    setError('');
    try {
      const res = await api.customer(id);
      setSelected(res.customer);
      setOrders(res.orders);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h2>Clientes</h2>
          <p>Base de clientes creada automáticamente al cargar órdenes Zoé.</p>
        </div>
      </div>

      {error && <div className="notice">{error}</div>}

      <section className="card">
        <div className="filters">
          <label className="field compact customer-search"><span>Buscar cliente</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Empresa, nombre, correo, teléfono o dirección" onKeyDown={(e) => e.key === 'Enter' && load()} />
          </label>
          <button className="btn" onClick={load}>{loading ? 'Buscando...' : 'Buscar'}</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th>Pedidos</th><th>Última orden</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="click-row" onClick={() => openCustomer(c.id)}>
                  <td>{displayCustomer(c)}</td>
                  <td>{c.contact_name || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.total_orders || 0}</td>
                  <td>{c.last_order_at ? c.last_order_at.slice(0, 10) : '-'}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={6}>Sin clientes todavía. Al cargar órdenes se irán creando automáticamente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="card customer-detail-card">
          <div className="detail-head">
            <div>
              <h3>{displayCustomer(selected)}</h3>
              <p>{selected.delivery_address || 'Sin dirección registrada'}</p>
            </div>
            <button className="btn ghost" onClick={() => setSelected(null)}>Cerrar</button>
          </div>
          <div className="detail-grid">
            <div><span>Contacto</span><strong>{selected.contact_name || '-'}</strong></div>
            <div><span>Teléfono</span><strong>{selected.phone || '-'}</strong></div>
            <div><span>Correo</span><strong>{selected.email || '-'}</strong></div>
            <div><span>Referencias</span><strong>{selected.delivery_references || '-'}</strong></div>
            <div><span>Total pedidos</span><strong>{selected.total_orders || 0}</strong></div>
            <div><span>Paquetes entregados</span><strong>{selected.packages_delivered || 0}</strong></div>
          </div>

          <h4>Historial de órdenes</h4>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Folio</th><th>Fecha</th><th>Ruta</th><th>Repartidor</th><th>Paquetes</th><th>Estatus</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="click-row" onClick={() => (location.hash = `#/orders/${o.id}`)}>
                    <td>{o.zoe_folio}</td>
                    <td>{o.scheduled_delivery_date || '-'}</td>
                    <td>{o.route_name || '-'}</td>
                    <td>{o.driver_name || '-'}</td>
                    <td>{o.packages_delivered || 0}/{o.packages_expected}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={6}>Sin órdenes asociadas.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
