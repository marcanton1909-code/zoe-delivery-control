import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, fileUrl } from '../api';
import { Route, User, VehicleChecklist as VehicleChecklistType } from '../types';

const fuelOptions = [
  { value: 'tanque_lleno', label: 'Tanque lleno' },
  { value: 'tres_cuartos', label: '3/4 de tanque' },
  { value: 'medio_tanque', label: 'Medio tanque' },
  { value: 'un_cuarto', label: '1/4 de tanque' },
  { value: 'reserva', label: 'Reserva' },
];

function fuelLabel(value: string) {
  return fuelOptions.find((x) => x.value === value)?.label || value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function VehicleChecklist() {
  const [checklists, setChecklists] = useState<VehicleChecklistType[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formKey, setFormKey] = useState(0);

  async function load() {
    const [list, routeList, driverList] = await Promise.all([
      api.vehicleChecklists(`?dateFrom=${month}-01&dateTo=${month}-31`),
      api.routes(),
      api.users('repartidor'),
    ]);
    setChecklists(list.checklists);
    setRoutes(routeList.routes);
    setDrivers(driverList.users);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [month]);

  const vehicles = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => { if (r.default_vehicle) set.add(r.default_vehicle); });
    checklists.forEach((c) => { if (c.vehicle) set.add(c.vehicle); });
    return [...set].sort();
  }, [routes, checklists]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    const form = new FormData(e.currentTarget);
    try {
      await api.createVehicleChecklist(form);
      setMessage('Bitácora vehicular guardada correctamente.');
      setFormKey((x) => x + 1);
      await load();
    } catch (err: any) {
      setMessage(err.message || 'No se pudo guardar la bitácora.');
    }
  }

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h2>Bitácora vehicular</h2>
          <p>Checklist del vehículo antes de salir a reparto.</p>
        </div>
        <a className="btn" href={api.vehicleChecklistReportUrl(month)} target="_blank" rel="noreferrer">Exportar CSV</a>
      </div>

      {message && <div className={message.includes('guardada') ? 'notice ok' : 'notice'}>{message}</div>}

      <section className="card">
        <h3>Nueva revisión</h3>
        <form key={formKey} className="form-grid" onSubmit={submit}>
          <label className="field">
            Fecha de revisión
            <input name="checklist_date" type="date" defaultValue={today()} required />
          </label>

          <label className="field">
            Unidad / vehículo
            <input name="vehicle" list="vehicles" placeholder="Ej. Camioneta 01 / placas" required />
            <datalist id="vehicles">{vehicles.map((v) => <option key={v} value={v} />)}</datalist>
          </label>

          <label className="field">
            Ruta
            <select name="route_id" defaultValue="">
              <option value="">Sin ruta asignada</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <label className="field">
            Repartidor
            <select name="driver_id" defaultValue="">
              <option value="">Sin repartidor asignado</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>

          <label className="field">
            Nombre de quien revisa
            <input name="reviewer_name" placeholder="Nombre completo" required />
          </label>

          <label className="field">
            Kilometraje actual
            <input name="mileage" type="number" min="0" step="1" inputMode="numeric" placeholder="Ej. 84620" required />
          </label>

          <label className="field">
            Nivel del tanque de gasolina
            <select name="fuel_level" required defaultValue="">
              <option value="" disabled>Selecciona nivel</option>
              {fuelOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>

          <label className="field">
            Revisión de llantas
            <select name="tires_ok" required defaultValue="true">
              <option value="true">Llantas en buen estado</option>
              <option value="false">Llantas con observación</option>
            </select>
          </label>

          <label className="field">
            Llanta de refacción
            <select name="spare_tire_ok" required defaultValue="true">
              <option value="true">Refacción disponible y en buen estado</option>
              <option value="false">Refacción con observación / no disponible</option>
            </select>
          </label>

          <label className="field">
            Foto kilometraje
            <input name="mileage_photo" type="file" accept="image/*" capture="environment" />
          </label>

          <label className="field">
            Foto nivel de gasolina
            <input name="fuel_photo" type="file" accept="image/*" capture="environment" />
          </label>

          <label className="field">
            Foto estado de llantas
            <input name="tires_photo" type="file" accept="image/*" capture="environment" />
          </label>

          <label className="field">
            Foto llanta de refacción
            <input name="spare_tire_photo" type="file" accept="image/*" capture="environment" />
          </label>

          <label className="field full">
            Observaciones
            <textarea name="comments" rows={3} placeholder="Describe daños, baja presión, alertas, falta de refacción, etc." />
          </label>

          <div className="full actions-row">
            <button className="btn primary big" type="submit">Guardar bitácora</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="filters">
          <label className="field compact">Mes
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Unidad</th><th>Ruta</th><th>Repartidor</th><th>Revisó</th><th>Km</th><th>Gasolina</th><th>Llantas</th><th>Refacción</th><th>Fotos</th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((c) => (
                <tr key={c.id}>
                  <td>{c.checklist_date}</td>
                  <td>{c.vehicle}</td>
                  <td>{c.route_name || '-'}</td>
                  <td>{c.driver_name || '-'}</td>
                  <td>{c.reviewer_name}</td>
                  <td>{c.mileage}</td>
                  <td>{fuelLabel(c.fuel_level)}</td>
                  <td>{c.tires_ok ? 'OK' : 'Observación'}</td>
                  <td>{c.spare_tire_ok ? 'OK' : 'Observación'}</td>
                  <td className="row-actions">
                    {c.mileage_photo_key && <a className="btn small" href={fileUrl(c.mileage_photo_key)} target="_blank" rel="noreferrer">Km</a>}
                    {c.fuel_photo_key && <a className="btn small" href={fileUrl(c.fuel_photo_key)} target="_blank" rel="noreferrer">Gas</a>}
                    {c.tires_photo_key && <a className="btn small" href={fileUrl(c.tires_photo_key)} target="_blank" rel="noreferrer">Llantas</a>}
                    {c.spare_tire_photo_key && <a className="btn small" href={fileUrl(c.spare_tire_photo_key)} target="_blank" rel="noreferrer">Ref.</a>}
                  </td>
                </tr>
              ))}
              {checklists.length === 0 && <tr><td colSpan={10}>Sin bitácoras para este mes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
