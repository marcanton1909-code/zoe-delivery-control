import type { ReactNode } from 'react';
import { fileUrl } from '../api';
import { DeliveryEvidence, Order, OrderItem } from '../types';

type Props = {
  order: Order;
  evidence?: DeliveryEvidence | null;
  receiverNameNode?: ReactNode;
  signatureNode?: ReactNode;
  dateNode?: ReactNode;
  compact?: boolean;
};

function safeItems(order: Order): OrderItem[] {
  if (order.items && order.items.length) return order.items;
  return [{ quantity: order.packages_expected || 0, description: 'Producto Zoé Water', unit_price: 0, amount: 0 }];
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return withTime
    ? date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })
    : date.toLocaleDateString('es-MX');
}

function cleanFolio(value?: string | null) {
  return String(value || '').replace(/_/g, '/').trim();
}

function shortOrderNumber(value?: string | null) {
  const text = String(value || '').trim();
  const match = text.match(/S\d{3,}/i);
  return match?.[0] || '';
}

export default function ZoeProofDocument({ order, evidence, receiverNameNode, signatureNode, dateNode, compact }: Props) {
  const items = safeItems(order);
  const receiptFolio = cleanFolio(order.zoe_folio);
  const internalOrder = shortOrderNumber(order.notes) || shortOrderNumber(order.payment_note) || shortOrderNumber(receiptFolio) || '';
  const deliveryDate = evidence?.delivered_at || new Date().toISOString();
  const customerName = order.customer_contact_name || order.customer_name || '';
  const issuer = order.customer_company === 'AGUA, VIDA Y NUTRICION' ? order.customer_company : 'AGUA, VIDA Y NUTRICION';

  return (
    <section className={compact ? 'zoe-proof zoe-proof-compact zoe-proof-shipping' : 'zoe-proof zoe-proof-shipping'}>
      <div className="zoe-bg-corner" aria-hidden="true" />
      <header className="shipping-header">
        <div className="shipping-logo-block">
          <div className="zoe-logo-text shipping-logo"><strong>zoé</strong><span>WATER</span></div>
        </div>
        <div className="issuer-block">
          <strong>{issuer}</strong>
          <span>AMORES 707 - 1</span>
          <span>DEL VALLE CENTRO</span>
          <span>03100 BENITO JUAREZ, CMX</span>
          <span>México</span>
          <span>RFC: AVN120208JG1</span>
        </div>
      </header>

      <section className="shipping-address-row">
        <div />
        <div className="shipping-address">
          <strong>Dirección de envío:</strong>
          <span>{customerName || order.customer_name || '-'}</span>
          <span>{order.customer_address || '-'}</span>
          {order.customer_phone && <span className="phone-line">☎ {order.customer_phone}</span>}
        </div>
      </section>

      <h1 className="shipping-folio">{receiptFolio || `Pedido ${order.zoe_folio}`}</h1>

      <section className="shipping-meta">
        <div><span>Orden</span><strong>{internalOrder || order.zoe_folio}</strong></div>
        <div><span>Fecha de envío</span><strong>{formatDate(order.order_date || order.scheduled_delivery_date || order.created_at, true)}</strong></div>
        <div><span>Transportista</span><strong>Mackavi</strong></div>
      </section>

      <div className="shipping-table-wrap">
        <table className="shipping-table">
          <thead>
            <tr>
              <th>PRODUCTO</th>
              <th>ORDENADO</th>
              <th>ENTREGADO</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td>
                  <strong>{item.description.split('\n')[0]}</strong>
                  {item.description.split('\n').slice(1).map((line, i) => <span key={i}>{line}</span>)}
                </td>
                <td>{Number(item.quantity || 0).toFixed(4)} Pieza</td>
                <td>{Number((item.unit_price && item.unit_price > 0) ? item.quantity : (item.amount || item.quantity || 0)).toFixed(4)} Pieza</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="shipping-signature-area">
        <p>Recibí a mi entera satisfacción</p>
        <div className="shipping-signature-grid">
          <div className="shipping-signature-line">
            <div className="zoe-signature-field">
              {signatureNode || (evidence?.signature_key ? <img src={fileUrl(evidence.signature_key)} alt="Firma" /> : null)}
            </div>
            {receiverNameNode || <strong>{evidence?.receiver_name || ''}</strong>}
            <span>Nombre y firma de recibido</span>
          </div>
          <div className="shipping-signature-line">
            {dateNode || <strong>{formatDate(deliveryDate)}</strong>}
            <span>Fecha</span>
          </div>
        </div>
      </section>

      <footer className="shipping-footer">
        <span>http://zoewater.com.mx AVN120208JG1</span>
        <span>Página 1 / 1</span>
      </footer>

      {evidence?.photo_key && (
        <div className="zoe-photo-proof no-print">
          <span>Foto de evidencia</span>
          <a href={fileUrl(evidence.photo_key)} target="_blank" rel="noreferrer">Abrir imagen</a>
        </div>
      )}
    </section>
  );
}
