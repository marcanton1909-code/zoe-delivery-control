import { useEffect, useState } from 'react';
import ZoeProofDocument from '../components/ZoeProofDocument';
import { api, fileUrl } from '../api';
import { DeliveryEvidence, Order } from '../types';

export default function ProofOfDelivery({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [evidence, setEvidence] = useState<DeliveryEvidence | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.order(id)
      .then((res: any) => {
        setOrder(res.order);
        setEvidence((res.evidence || [])[0] || null);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="notice">{error}</div>;
  if (!order) return <div className="muted">Cargando prueba de entrega...</div>;

  return (
    <div className="page proof-page">
      <div className="proof-actions no-print">
        <button className="link-button" onClick={() => location.hash = `#/orders/${id}`}>← Volver a orden</button>
        <div className="actions-row">
          {order.original_pdf_key && <a className="btn" href={fileUrl(order.original_pdf_key)} target="_blank">PDF original</a>}
          {order.signed_pdf_key && <a className="btn" href={fileUrl(order.signed_pdf_key)} target="_blank">PDF evidencia</a>}
          <button className="btn primary" onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>
      </div>
      <ZoeProofDocument order={order} evidence={evidence} />
    </div>
  );
}
