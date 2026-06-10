import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="notice">{error}</div>;
  if (!data) return <div className="muted">Cargando tablero operativo...</div>;

  const statusMap = Object.fromEntries((data.byStatus || []).map((x: any) => [x.status, x.total]));
  const cards = [
    ['Órdenes hoy', data.todayStats?.orders_today || 0],
    ['Paquetes hoy', data.todayStats?.packages_today || 0],
    ['Pendientes', statusMap.pendiente_validacion || 0],
    ['En ruta', statusMap.en_ruta || 0],
    ['Entregadas', statusMap.entregada || 0],
    ['Parciales', statusMap.parcial || 0],
    ['No entregadas', statusMap.no_entregada || 0],
    ['Paquetes mes', data.monthStats?.packages_month || 0],
  ];

  return (
    <div className="page">
      <section className="ops-hero">
        <div>
          <div className="page-kicker">Centro de control</div>
          <h2>Operación de entregas Zoé</h2>
          <p>Rutas, evidencia firmada, bitácora vehicular e inventario en un mismo tablero interno.</p>
          <div className="ops-badges">
            <span className="ops-pill">Mackavi Logistics</span>
            <span className="ops-pill">Evidencia digital</span>
            <span className="ops-pill">Cloudflare</span>
          </div>
        </div>
        <div className="ops-panel">
          <div className="route-tile"><span>Paquetes entregados hoy</span><strong>{data.todayStats?.packages_today || 0}</strong></div>
          <div className="route-tile"><span>Órdenes en ruta</span><strong>{statusMap.en_ruta || 0}</strong></div>
        </div>
      </section>

      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label as string}>
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>

      <section className="card">
        <h3>Rendimiento por repartidor este mes</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Repartidor</th><th>Entregas</th><th>Paquetes</th></tr></thead>
            <tbody>
              {(data.byDriver || []).map((row: any, i: number) => (
                <tr key={i}><td>{row.driver_name || 'Sin asignar'}</td><td>{row.total}</td><td>{row.packages}</td></tr>
              ))}
              {(!data.byDriver || data.byDriver.length === 0) && <tr><td colSpan={3}>Sin entregas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
