import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import ProofOfDelivery from './pages/ProofOfDelivery';
import Warehouse from './pages/Warehouse';
import Driver from './pages/Driver';
import DriverOrder from './pages/DriverOrder';
import Reports from './pages/Reports';
import VehicleChecklist from './pages/VehicleChecklist';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Settings from './pages/Settings';

function getHash() {
  return location.hash.replace('#', '') || '/dashboard';
}

const iconMap: Record<string, string> = {
  Dashboard: '⌁',
  Órdenes: '◫',
  Almacén: '▣',
  'Bitácora vehículo': '◉',
  Inventarios: '▤',
  Clientes: '◎',
  Repartidor: '↗',
  Reportes: '◌',
  'Config.': '⚙',
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(getHash());

  async function loadMe() {
    setLoading(true);
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    const onHash = () => setRoute(getHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const nav = useMemo(() => {
    if (!user) return [];
    const base = [{ href: '#/dashboard', label: 'Dashboard', roles: ['admin','coordinador','almacen','repartidor'] }];
    const ops = [
      { href: '#/orders', label: 'Órdenes', roles: ['admin','coordinador'] },
      { href: '#/warehouse', label: 'Almacén', roles: ['admin','coordinador','almacen'] },
      { href: '#/vehicle-checklist', label: 'Bitácora vehículo', roles: ['admin','coordinador','almacen','repartidor'] },
      { href: '#/inventory', label: 'Inventarios', roles: ['admin','coordinador','almacen'] },
      { href: '#/customers', label: 'Clientes', roles: ['admin','coordinador','almacen'] },
      { href: '#/driver', label: 'Repartidor', roles: ['admin','coordinador','repartidor'] },
      { href: '#/reports', label: 'Reportes', roles: ['admin','coordinador'] },
      { href: '#/settings', label: 'Config.', roles: ['admin'] },
    ];
    return [...base, ...ops].filter((n) => n.roles.includes(user.role));
  }, [user]);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    location.hash = '';
  }

  if (loading) return <div className="splash">Preparando control interno de entregas...</div>;
  if (!user) return <Login onLoggedIn={loadMe} />;

  let page = <Dashboard />;
  if (route === '/orders') page = <Orders onOpen={(id) => (location.hash = `#/orders/${id}`)} />;
  if (route === '/orders/new') page = <NewOrder />;
  if (route.startsWith('/orders/') && route.endsWith('/proof')) page = <ProofOfDelivery id={route.split('/')[2]} />;
  else if (route.startsWith('/orders/') && route !== '/orders/new') page = <OrderDetail id={route.split('/')[2]} />;
  if (route === '/warehouse') page = <Warehouse />;
  if (route === '/driver') page = <Driver />;
  if (route === '/vehicle-checklist') page = <VehicleChecklist />;
  if (route === '/inventory') page = <Inventory />;
  if (route === '/customers') page = <Customers />;
  if (route.startsWith('/driver/orders/')) page = <DriverOrder id={route.split('/')[3]} />;
  if (route === '/reports') page = <Reports />;
  if (route === '/settings') page = <Settings />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/mackavi-logo.png" alt="Mackavi Logistics" />
          <div><strong>Control interno</strong><span>Zoé Water · evidencias · inventario</span></div>
        </div>
        <nav>{nav.map((n) => <a key={n.href} className={route === n.href.replace('#','') ? 'active' : ''} href={n.href}><span className="nav-icon">{iconMap[n.label] || '•'}</span>{n.label}</a>)}</nav>
        <div className="user-box">
          <strong>{user.name}</strong>
          <span>{user.role} · sesión activa</span>
          <button className="btn ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="content">{page}</main>
      <nav className="bottom-nav">{nav.slice(0,5).map((n) => <a key={n.href} className={route === n.href.replace('#','') ? 'active' : ''} href={n.href}>{n.label}</a>)}</nav>
    </div>
  );
}
