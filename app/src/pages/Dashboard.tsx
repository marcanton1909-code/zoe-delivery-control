import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="notice">{error}</div>;
  if (!data) return <div className="muted">Cargando dashboard...</div>;

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
      <div className="page-title">
        <div>
          <h2>Dashboard operativo</h2>
          <p>Resumen de entregas y paquetes.</p>
        </div>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label as string}>
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>

      <section className="card">
        <h3>Entregas por repartidor este mes</h3>
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
