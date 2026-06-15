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

function money(value?: number | null) {
  const n = Number(value || 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function safeItems(order: Order): OrderItem[] {
  if (order.items && order.items.length) return order.items;
  return [{ quantity: order.packages_expected || 0, description: 'Paquetes de producto Zoé Water', unit_price: 0, amount: 0 }];
}

function formatDate(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}-${m}-${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-MX');
}

export default function ZoeProofDocument({ order, evidence, receiverNameNode, signatureNode, dateNode, compact }: Props) {
  const items = safeItems(order);
  const total = typeof order.order_total === 'number'
    ? Number(order.order_total)
    : items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const displayName = order.customer_contact_name || order.customer_name || '';
  const displayCompany = order.customer_company || order.customer_name || '';
  const deliveryDate = evidence?.delivered_at || new Date().toISOString();

  return (
    <section className={compact ? 'zoe-proof zoe-proof-compact' : 'zoe-proof'}>
      <header className="zoe-proof-header">
        <div className="zoe-logo-text">
          <strong>zoé</strong>
          <span>WATER</span>
        </div>
        <div className="zoe-order-title">
          <h2>CC - Pedido #{order.zoe_folio}</h2>
          <p>Principal: {order.customer_phone || '8184657691'}</p>
          <p>Correo: {order.customer_email || 'rociomurilloo@gmail.com'}</p>
        </div>
      </header>

      <div className="zoe-proof-grid">
        <div className="zoe-box delivery-box">
          <div className="zoe-box-title">DIRECCIÓN DE ENTREGA</div>
          <p>{order.customer_address}</p>
        </div>
        <div className="zoe-client-block">
          <p><span>Empresa:</span> {displayCompany || '-'}</p>
          <p><span>Nombre:</span> {displayName || '-'}</p>
        </div>
        <div className="zoe-box reference-box">
          <div className="zoe-box-title">REFERENCIAS</div>
          <p>{order.delivery_reference || order.notes || 'Sin referencias registradas.'}</p>
        </div>
      </div>

      <div className="zoe-proof-table-wrap">
        <table className="zoe-proof-table">
          <thead>
            <tr>
              <th>Cantidad</th>
              <th>Descripción</th>
              <th>Precio x unidad</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.quantity}</td>
                <td>{item.description}</td>
                <td>{item.unit_price ? money(item.unit_price) : '$0.00'}</td>
                <td>{item.amount ? money(item.amount) : '$0.00'}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td></td>
              <td></td>
              <td>Total</td>
              <td>{money(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="zoe-proof-bottom">
        <div className="zoe-side-text">
          <span>Recibí a mi entera satisfacción.</span>
          <span>Si tienes cualquier duda o aclaración comunícate al (55) 1107.8421</span>
        </div>
        <div className="zoe-payment-block">
          <h3>{order.payment_note || 'Contamos con tu pronto pago'}</h3>
          <div className="zoe-signature-row">
            <div className="zoe-date-line">
              {dateNode || <strong>{formatDate(deliveryDate)}</strong>}
              <span>Fecha</span>
            </div>
            <div className="zoe-signature-line">
              <div className="zoe-signature-field">
                {signatureNode || (evidence?.signature_key ? <img src={fileUrl(evidence.signature_key)} alt="Firma" /> : null)}
              </div>
              {receiverNameNode || <strong>{evidence?.receiver_name || ''}</strong>}
              <span>Nombre y firma</span>
            </div>
          </div>
        </div>
        <div className="zoe-qr-placeholder">
          <div className="qr-grid" aria-hidden="true"></div>
        </div>
      </div>

      {evidence?.photo_key && (
        <div className="zoe-photo-proof no-print">
          <span>Foto de evidencia</span>
          <a href={fileUrl(evidence.photo_key)} target="_blank" rel="noreferrer">Abrir imagen</a>
        </div>
      )}
    </section>
  );
}
