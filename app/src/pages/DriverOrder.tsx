import { FormEvent, useEffect, useState } from 'react';
import { api, fileUrl } from '../api';
import SignatureBox from '../components/SignatureBox';
import StatusBadge from '../components/StatusBadge';
import { Field } from '../components/Field';
import ZoeProofDocument from '../components/ZoeProofDocument';
import { Order } from '../types';

export default function DriverOrder({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    api.order(id).then((res) => setOrder(res.order)).catch((e) => setMessage(e.message));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [id]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order) return;
    const form = new FormData(e.currentTarget);
    const result = String(form.get('delivery_result'));
    if ((result === 'completa' || result === 'parcial') && !signature) {
      setMessage('La firma es obligatoria para entregar.');
      return;
    }
    if (signature) form.append('signature', signature, 'firma.png');
    if (coords.lat) form.append('gps_lat', String(coords.lat));
    if (coords.lng) form.append('gps_lng', String(coords.lng));

    setLoading(true);
    setMessage('');
    try {
      await api.deliver(order.id, form);
      setMessage('Entrega guardada correctamente. Se generó la prueba de entrega.');
      setTimeout(() => location.hash = `#/orders/${order.id}/proof`, 900);
    } catch (err: any) {
      setMessage(err.message);
    } finally { setLoading(false); }
  }

  if (!order) return <div className="page"><div className="muted">Cargando orden...</div>{message && <div className="notice">{message}</div>}</div>;

  return (
    <div className="page proof-capture-page">
      <div className="proof-actions no-print">
        <button className="link-button" onClick={() => location.hash = '#/driver'}>← Mis entregas</button>
        <div className="actions-row">
          <StatusBadge status={order.status} />
          {order.original_pdf_key && <a className="btn" href={fileUrl(order.original_pdf_key)} target="_blank">PDF original</a>}
        </div>
      </div>

      <form onSubmit={submit}>
        <section className="card delivery-control-panel no-print">
          <h3>Captura de entrega</h3>
          <div className="form-grid compact-grid">
            <Field label="Resultado">
              <select name="delivery_result" defaultValue="completa">
                <option value="completa">Entregada completa</option>
                <option value="parcial">Entrega parcial</option>
                <option value="no_entregada">No entregada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </Field>
            <Field label="Paquetes entregados"><input name="packages_delivered" type="number" min="0" defaultValue={order.packages_expected} required /></Field>
            <label className="field full"><span>Foto evidencia</span><input name="photo" type="file" accept="image/*" capture="environment" /></label>
            <label className="field full"><span>Comentarios / motivo</span><textarea name="comments" rows={2} placeholder="Obligatorio si es parcial, no entregada o rechazada" /></label>
          </div>
        </section>

        <ZoeProofDocument
          order={order}
          receiverNameNode={<input className="zoe-inline-input" name="receiver_name" placeholder="Nombre de quien recibe" />}
          dateNode={<strong>{new Date().toLocaleDateString('es-MX')}</strong>}
          signatureNode={<SignatureBox onChange={setSignature} />}
        />

        {message && <div className={message.includes('correctamente') ? 'notice ok' : 'notice'}>{message}</div>}
        <div className="sticky-save-bar no-print">
          <button className="btn primary big" disabled={loading}>{loading ? 'Guardando...' : 'Guardar entrega firmada'}</button>
        </div>
      </form>
    </div>
  );
}
