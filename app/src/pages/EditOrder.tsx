import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Field } from '../components/Field';
import { Order, OrderItem, Route, User } from '../types';

type ItemDraft = { quantity: number; description: string; unit_price: number; amount: number };
type Draft = {
  zoe_folio: string;
  order_date: string;
  scheduled_delivery_date: string;
  customer_company: string;
  customer_name: string;
  customer_contact_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  delivery_reference: string;
  payment_note: string;
  route_id: string;
  driver_id: string;
  vehicle: string;
  notes: string;
};

const finalStatuses = ['entregada','parcial','no_entregada','rechazada','cancelada'];

function toDateInput(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function itemFromApi(item: OrderItem): ItemDraft {
  return {
    quantity: Number(item.quantity || 0),
    description: item.description || '',
    unit_price: Number(item.unit_price || 0),
    amount: Number(item.amount || 0),
  };
}

export default function EditOrder({ id }: { id: string }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setMessage('');
    try {
      const [orderRes, routesRes, driversRes] = await Promise.all([
        api.order(id),
        api.routes(),
        api.users('repartidor').catch(() => ({ users: [] })),
      ]);
      const o = orderRes.order as Order;
      setOrder(o);
      setDraft({
        zoe_folio: o.zoe_folio || '',
        order_date: toDateInput(o.order_date),
        scheduled_delivery_date: toDateInput(o.scheduled_delivery_date),
        customer_company: o.customer_company || '',
        customer_name: o.customer_name || '',
        customer_contact_name: o.customer_contact_name || o.customer_name || '',
        customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '',
        customer_address: o.customer_address || '',
        delivery_reference: o.delivery_reference || '',
        payment_note: o.payment_note || 'Contamos con tu pronto pago',
        route_id: o.route_id || '',
        driver_id: o.driver_id || '',
        vehicle: o.vehicle || '',
        notes: o.notes || '',
      });
      setItems((o.items && o.items.length ? o.items.map(itemFromApi) : [{ quantity: Number(o.packages_expected || 1), description: 'Producto Zoé Water', unit_price: 0, amount: Number(o.packages_expected || 1) }]));
      setRoutes(routesRes.routes || []);
      setDrivers(driversRes.users || []);
    } catch (err: any) {
      setMessage(err.message || 'No se pudo cargar la orden.');
    }
  }

  useEffect(() => { load(); }, [id]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => current ? ({ ...current, ...patch }) : current);
  }

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      if ('quantity' in patch || 'unit_price' in patch) {
        next.amount = Number(next.quantity || 0) * Number(next.unit_price || 0);
      }
      return next;
    }));
  }

  function addItem() {
    setItems((current) => [...current, { quantity: 1, description: '', unit_price: 0, amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));
  }

  const totalOrdered = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);
  const totalDelivered = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    setLoading(true);
    setMessage('');
    try {
      await api.updateOrder(id, {
        ...draft,
        packages_expected: totalOrdered || 1,
        order_total: totalDelivered,
        items: items.map((item, index) => ({
          quantity: Number(item.quantity || 0),
          description: item.description || 'Producto Zoé Water',
          unit_price: Number(item.unit_price || 0),
          amount: Number(item.amount || 0),
          sort_order: index,
        })),
      });
      setMessage('Orden actualizada correctamente. La prueba de entrega usará estos datos corregidos.');
      await load();
    } catch (err: any) {
      setMessage(err.message || 'No se pudo actualizar la orden.');
    } finally {
      setLoading(false);
    }
  }

  if (!draft || !order) return <div className="page narrow"><div className="notice">{message || 'Cargando orden...'}</div></div>;

  const isFinal = finalStatuses.includes(order.status);

  return (
    <div className="page narrow">
      <button className="link-button" onClick={() => location.hash = `#/orders/${id}`}>← Volver al detalle</button>
      <div className="page-title"><div><h2>Editar orden</h2><p>Corrige datos de cliente, dirección, ruta, productos o cantidades antes de entregar.</p></div></div>

      {isFinal && <div className="notice">Esta orden está finalizada. Reábrela desde el detalle antes de editar.</div>}

      <form className="card form-grid" onSubmit={submit}>
        <Field label="Folio / Recibo Zoé"><input value={draft.zoe_folio} onChange={(e) => patchDraft({ zoe_folio: e.target.value })} required disabled={isFinal} /></Field>
        <Field label="Fecha de envío"><input value={draft.order_date} onChange={(e) => patchDraft({ order_date: e.target.value })} type="date" disabled={isFinal} /></Field>
        <Field label="Fecha programada"><input value={draft.scheduled_delivery_date} onChange={(e) => patchDraft({ scheduled_delivery_date: e.target.value })} type="date" required disabled={isFinal} /></Field>
        <Field label="Empresa emisora / cliente"><input value={draft.customer_company} onChange={(e) => patchDraft({ customer_company: e.target.value })} disabled={isFinal} /></Field>
        <Field label="Destinatario / contacto"><input value={draft.customer_name} onChange={(e) => patchDraft({ customer_name: e.target.value, customer_contact_name: e.target.value })} required disabled={isFinal} /></Field>
        <Field label="Teléfono"><input value={draft.customer_phone} onChange={(e) => patchDraft({ customer_phone: e.target.value })} disabled={isFinal} /></Field>
        <Field label="Correo"><input value={draft.customer_email} onChange={(e) => patchDraft({ customer_email: e.target.value })} type="email" disabled={isFinal} /></Field>
        <label className="field full"><span>Dirección de entrega</span><textarea value={draft.customer_address} onChange={(e) => patchDraft({ customer_address: e.target.value })} required rows={3} disabled={isFinal} /></label>
        <label className="field full"><span>Notas / referencia</span><textarea value={draft.delivery_reference} onChange={(e) => patchDraft({ delivery_reference: e.target.value })} rows={2} disabled={isFinal} /></label>

        <div className="full order-items-editor">
          <div className="section-head-inline">
            <div><h3>Productos del recibo</h3><p>Corrige la tabla PRODUCTO / ORDENADO / ENTREGADO.</p></div>
            <button className="btn" type="button" onClick={addItem} disabled={isFinal}>Agregar producto</button>
          </div>
          {items.map((item, index) => (
            <div className="item-row-editor" key={index}>
              <label><span>Ordenado</span><input type="number" min="0" step="0.0001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} disabled={isFinal} /></label>
              <label className="item-description"><span>Producto</span><input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} disabled={isFinal} /></label>
              <label><span>Entregado</span><input type="number" min="0" step="0.0001" value={item.amount} onChange={(e) => updateItem(index, { amount: Number(e.target.value) })} disabled={isFinal} /></label>
              <button className="btn ghost" type="button" onClick={() => removeItem(index)} disabled={isFinal}>Quitar</button>
            </div>
          ))}
          <div className="order-total-preview"><span>Ordenado:</span><strong>{totalOrdered}</strong><span>Entregado:</span><strong>{totalDelivered}</strong></div>
        </div>

        <Field label="Ruta"><select value={draft.route_id} onChange={(e) => patchDraft({ route_id: e.target.value })} disabled={isFinal}><option value="">Sin ruta</option>{routes.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Repartidor"><select value={draft.driver_id} onChange={(e) => patchDraft({ driver_id: e.target.value })} disabled={isFinal}><option value="">Sin repartidor</option>{drivers.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Unidad"><input value={draft.vehicle} onChange={(e) => patchDraft({ vehicle: e.target.value })} disabled={isFinal} /></Field>
        <label className="field full"><span>Nota de pago</span><input value={draft.payment_note} onChange={(e) => patchDraft({ payment_note: e.target.value })} disabled={isFinal} /></label>
        <label className="field full"><span>Observaciones internas</span><textarea value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} rows={3} disabled={isFinal} /></label>
        {message && <div className={message.includes('correctamente') ? 'notice ok full' : 'notice full'}>{message}</div>}
        <button className="btn primary full" disabled={loading || isFinal}>{loading ? 'Guardando...' : 'Guardar cambios'}</button>
      </form>
    </div>
  );
}
