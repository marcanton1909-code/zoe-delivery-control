import { useState } from 'react';
import { api } from '../api';

export default function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  return (
    <div className="page narrow">
      <div className="page-title"><div><h2>Reportes</h2><p>Descarga reportes mensuales para cobranza, operación y bitácoras.</p></div></div>
      <section className="card form-grid">
        <label className="field full"><span>Mes</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
        <button className="btn primary full" onClick={() => window.open(api.reportUrl(month), '_blank')}>Descargar CSV mensual de entregas</button>
        <button className="btn full" onClick={() => window.open(api.vehicleChecklistReportUrl(month), '_blank')}>Descargar CSV de bitácora vehicular</button>
        <button className="btn full" onClick={() => window.open(api.inventoryReportUrl(), '_blank')}>Descargar CSV de inventario</button>
        <p className="muted full">El reporte de entregas incluye folio, cliente, fecha, repartidor, paquetes, estatus y evidencia PDF. La bitácora vehicular incluye kilometraje, nivel de gasolina, llantas, refacción y enlaces a fotos. El inventario incluye productos, SKU, existencias actuales y stock mínimo.</p>
      </section>
    </div>
  );
}
