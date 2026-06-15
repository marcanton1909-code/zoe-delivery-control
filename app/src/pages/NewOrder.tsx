import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, fileUrl } from '../api';
import { Field } from '../components/Field';
import { Customer, ExtractedOrderDraft, OrderItem, Route, User } from '../types';

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
  original_pdf_key: string;
};

const defaultDraft: Draft = {
  zoe_folio: '',
  order_date: '',
  scheduled_delivery_date: '',
  customer_company: '',
  customer_name: '',
  customer_contact_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  delivery_reference: '',
  payment_note: 'Contamos con tu pronto pago',
  route_id: '',
  driver_id: '',
  vehicle: '',
  notes: '',
  original_pdf_key: '',
};

const defaultItems: ItemDraft[] = [
  { quantity: 1, description: 'Paquete(s) de 12 botellas Zoé Sport de 900ml', unit_price: 0, amount: 0 },
];

function money(value: number) {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function itemFromApi(item: OrderItem): ItemDraft {
  return {
    quantity: Number(item.quantity || 0),
    description: item.description || '',
    unit_price: Number(item.unit_price || 0),
    amount: Number(item.amount || 0),
  };
}

export default function NewOrder() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>(defaultItems);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsePreview, setParsePreview] = useState('');
  const [parseNote, setParseNote] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [customerMatch, setCustomerMatch] = useState<Customer | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api.routes().then((r) => setRoutes(r.routes));
    api.users('repartidor').then((r) => setDrivers(r.users)).catch(() => {});
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
  const totalPackages = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
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

  function applyExtractedDraft(extracted: ExtractedOrderDraft, pdfKey: string) {
    setDraft((current) => ({
      ...current,
      zoe_folio: extracted.zoe_folio || current.zoe_folio,
      customer_company: extracted.customer_company || current.customer_company,
      customer_name: extracted.customer_name || extracted.customer_contact_name || current.customer_name,
      customer_contact_name: extracted.customer_contact_name || extracted.customer_name || current.customer_contact_name,
      customer_phone: extracted.customer_phone || current.customer_phone,
      customer_email: extracted.customer_email || current.customer_email,
      customer_address: extracted.customer_address || current.customer_address,
      delivery_reference: extracted.delivery_reference || current.delivery_reference,
      payment_note: extracted.payment_note || current.payment_note,
      original_pdf_key: pdfKey || current.original_pdf_key,
    }));

    if (extracted.items && extracted.items.length) {
      setItems(extracted.items.map(itemFromApi));
    } else if (extracted.packages_expected) {
      setItems([{ quantity: Number(extracted.packages_expected), description: 'Paquetes de producto Zoé Water', unit_price: 0, amount: 0 }]);
    }
  }

  async function parsePdf() {
    if (!pdfFile) {
      setMessage('Selecciona primero el PDF descargado de Zoé.');
      return;
    }
    setParsing(true);
    setMessage('');
    setParseNote('');
    setCustomerMatch(null);
    try {
      const form = new FormData();
      form.append('original_pdf', pdfFile);
      const res = await api.extractOrderPdf(form);
      applyExtractedDraft(res.draft || {}, res.pdf_key);
      setCustomerMatch(res.customer_match || null);
      setConfidence(typeof res.confidence === 'number' ? res.confidence : null);
      setParsePreview(res.raw_text_preview || '');
      setParseNote(res.notes || 'Datos extraídos. Revisa antes de guardar.');
      setMessage('PDF procesado. Revisa los campos antes de guardar la orden.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setParsing(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const form = new FormData();
      Object.entries(draft).forEach(([key, value]) => form.set(key, value || ''));
      form.set('order_total', String(total));
      form.set('packages_expected', String(totalPackages || 1));
      items.forEach((item) => {
        form.append('item_quantity', String(item.quantity || 0));
        form.append('item_description', item.description || 'Producto Zoé Water');
        form.append('item_unit_price', String(item.unit_price || 0));
        form.append('item_amount', String(item.amount || 0));
      });
      if (!draft.original_pdf_key && pdfInputRef.current?.files?.[0]) {
        form.set('original_pdf', pdfInputRef.current.files[0]);
      }
      await api.createOrder(form);
      setMessage('Orden creada correctamente. El cliente fue creado o actualizado en la base de clientes.');
      setDraft(defaultDraft);
      setItems(defaultItems);
      setPdfFile(null);
      setParsePreview('');
      setParseNote('');
      setConfidence(null);
      setCustomerMatch(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page narrow">
      <div className="page-title"><div><h2>Nueva orden Zoé</h2><p>Sube el PDF para intentar extraer cliente, dirección y productos. Revisa antes de guardar.</p></div></div>

      <section className="card pdf-import-card">
        <div className="section-head-inline">
          <div>
            <h3>Importar desde PDF Zoé</h3>
            <p>Funciona mejor si el PDF tiene texto seleccionable. Si viene escaneado como imagen, corrige manualmente.</p>
          </div>
        </div>
        <div className="filters pdf-import-row">
          <label className="field compact"><span>PDF de orden Zoé</span>
            <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          </label>
          <button className="btn primary" type="button" onClick={parsePdf} disabled={parsing}>{parsing ? 'Leyendo PDF...' : 'Extraer datos'}</button>
          {draft.original_pdf_key && <a className="btn" href={fileUrl(draft.original_pdf_key)} target="_blank">PDF cargado</a>}
        </div>
        {(parseNote || confidence !== null || customerMatch) && (
          <div className="pdf-import-result">
            {confidence !== null && <div><span>Confianza de lectura</span><strong>{confidence}%</strong></div>}
            {customerMatch && <div><span>Coincidencia cliente</span><strong>{customerMatch.company_name || customerMatch.contact_name}</strong></div>}
            {parseNote && <p>{parseNote}</p>}
          </div>
        )}
        {parsePreview && <details className="raw-preview"><summary>Ver texto detectado</summary><pre>{parsePreview}</pre></details>}
      </section>

      <form className="card form-grid" onSubmit={submit}>
        <Field label="Folio / Pedido Zoé"><input value={draft.zoe_folio} onChange={(e) => patchDraft({ zoe_folio: e.target.value })} placeholder="Ej. 458650" required /></Field>
        <Field label="Fecha orden"><input value={draft.order_date} onChange={(e) => patchDraft({ order_date: e.target.value })} type="date" /></Field>
        <Field label="Fecha programada"><input value={draft.scheduled_delivery_date} onChange={(e) => patchDraft({ scheduled_delivery_date: e.target.value })} type="date" required /></Field>
        <Field label="Empresa"><input value={draft.customer_company} onChange={(e) => patchDraft({ customer_company: e.target.value })} placeholder="Ej. SPACE STUDIO" /></Field>
        <Field label="Nombre / contacto"><input value={draft.customer_name} onChange={(e) => patchDraft({ customer_name: e.target.value, customer_contact_name: e.target.value })} placeholder="Ej. Rocio Murillo" required /></Field>
        <Field label="Principal / teléfono"><input value={draft.customer_phone} onChange={(e) => patchDraft({ customer_phone: e.target.value })} placeholder="Ej. 8184657691" /></Field>
        <Field label="Correo"><input value={draft.customer_email} onChange={(e) => patchDraft({ customer_email: e.target.value })} type="email" placeholder="correo@cliente.com" /></Field>
        <label className="field full"><span>Dirección de entrega</span><textarea value={draft.customer_address} onChange={(e) => patchDraft({ customer_address: e.target.value })} required rows={3} placeholder="Pega aquí la dirección tal como aparece en la orden" /></label>
        <label className="field full"><span>Referencias</span><textarea value={draft.delivery_reference} onChange={(e) => patchDraft({ delivery_reference: e.target.value })} rows={2} placeholder="Ej. Lugar está en la esquina, es de color negro" /></label>

        <div className="full order-items-editor">
          <div className="section-head-inline">
            <div><h3>Productos del pedido</h3><p>Estos renglones se usarán para reconstruir la tabla de la prueba de entrega.</p></div>
            <button className="btn" type="button" onClick={addItem}>Agregar producto</button>
          </div>
          {items.map((item, index) => (
            <div className="item-row-editor" key={index}>
              <label><span>Cantidad</span><input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} /></label>
              <label className="item-description"><span>Descripción</span><input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} /></label>
              <label><span>Precio x unidad</span><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })} /></label>
              <label><span>Importe</span><input type="number" min="0" step="0.01" value={item.amount} onChange={(e) => updateItem(index, { amount: Number(e.target.value) })} /></label>
              <button className="btn ghost" type="button" onClick={() => removeItem(index)}>Quitar</button>
            </div>
          ))}
          <div className="order-total-preview"><span>Paquetes:</span><strong>{totalPackages}</strong><span>Total:</span><strong>{money(total)}</strong></div>
        </div>

        <Field label="Ruta"><select value={draft.route_id} onChange={(e) => patchDraft({ route_id: e.target.value })}><option value="">Sin ruta</option>{routes.map((r) => <option value={r.id} key={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Repartidor"><select value={draft.driver_id} onChange={(e) => patchDraft({ driver_id: e.target.value })}><option value="">Sin repartidor</option>{drivers.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Unidad"><input value={draft.vehicle} onChange={(e) => patchDraft({ vehicle: e.target.value })} /></Field>
        <label className="field full"><span>Nota de pago</span><input value={draft.payment_note} onChange={(e) => patchDraft({ payment_note: e.target.value })} placeholder="Contamos con tu pronto pago" /></label>
        <label className="field full"><span>Observaciones internas</span><textarea value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} rows={3} /></label>
        {message && <div className={message.includes('correctamente') || message.includes('procesado') ? 'notice ok full' : 'notice full'}>{message}</div>}
        <button className="btn primary full" disabled={loading}>{loading ? 'Guardando...' : 'Guardar orden y actualizar cliente'}</button>
      </form>
    </div>
  );
}
