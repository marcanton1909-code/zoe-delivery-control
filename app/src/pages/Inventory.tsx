import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { InventoryMovement, InventoryProduct } from '../types';

const emptyProduct = {
  sku: '',
  name: '',
  category: '',
  unit: 'pieza',
  presentation: '',
  min_stock: 0,
  current_stock: 0,
  notes: '',
};

function movementLabel(value: string) {
  const labels: Record<string, string> = {
    alta_inicial: 'Alta inicial',
    conteo_fisico: 'Conteo físico',
    entrada: 'Entrada',
    salida: 'Salida',
    ajuste: 'Ajuste',
  };
  return labels[value] || value;
}

export default function Inventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [message, setMessage] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [productForm, setProductForm] = useState<any>(emptyProduct);
  const [stockProductId, setStockProductId] = useState('');
  const [stockForm, setStockForm] = useState({ movement_type: 'conteo_fisico', quantity: 0, reference: '', notes: '' });

  async function load() {
    const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const [productList, movementList] = await Promise.all([
      api.inventoryProducts(query),
      api.inventoryMovements(''),
    ]);
    setProducts(productList.products);
    setMovements(movementList.movements);
    if (!stockProductId && productList.products[0]) setStockProductId(productList.products[0].id);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  const selectedProduct = useMemo(() => products.find((p) => p.id === stockProductId), [products, stockProductId]);
  const lowStockCount = products.filter((p) => p.active && Number(p.current_stock) <= Number(p.min_stock)).length;
  const totalStock = products.reduce((sum, p) => sum + Number(p.current_stock || 0), 0);

  function startEdit(product: InventoryProduct) {
    setEditing(product);
    setProductForm({
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || '',
      unit: product.unit || 'pieza',
      presentation: product.presentation || '',
      min_stock: product.min_stock || 0,
      current_stock: product.current_stock || 0,
      notes: product.notes || '',
      active: product.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetProductForm() {
    setEditing(null);
    setProductForm(emptyProduct);
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      const body = {
        ...productForm,
        min_stock: Number(productForm.min_stock || 0),
        current_stock: Number(productForm.current_stock || 0),
        active: productForm.active === false || productForm.active === 0 ? 0 : 1,
      };
      if (editing) {
        const { current_stock, ...editable } = body;
        await api.updateInventoryProduct(editing.id, editable);
        setMessage('Producto actualizado correctamente. Para cambiar existencias usa el bloque de carga de inventario.');
      } else {
        await api.createInventoryProduct(body);
        setMessage('Producto guardado correctamente. Ya puedes cargar o ajustar su inventario.');
      }
      resetProductForm();
      await load();
    } catch (err: any) {
      setMessage(err.message || 'No se pudo guardar el producto.');
    }
  }

  async function submitStock(e: FormEvent) {
    e.preventDefault();
    if (!stockProductId) return setMessage('Selecciona un producto para cargar inventario.');
    setMessage('');
    try {
      await api.updateInventoryStock(stockProductId, { ...stockForm, quantity: Number(stockForm.quantity || 0) });
      setMessage('Inventario actualizado correctamente.');
      setStockForm({ movement_type: 'conteo_fisico', quantity: 0, reference: '', notes: '' });
      await load();
    } catch (err: any) {
      setMessage(err.message || 'No se pudo actualizar el inventario.');
    }
  }

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h2>Inventarios</h2>
          <p>Alta manual de productos y carga de inventario por producto registrado.</p>
        </div>
        <a className="btn" href={api.inventoryReportUrl()} target="_blank" rel="noreferrer">Exportar CSV</a>
      </div>

      {message && <div className={message.includes('correctamente') ? 'notice ok' : 'notice'}>{message}</div>}

      <div className="stats-grid">
        <div className="stat"><span>Productos activos</span><strong>{products.filter((p) => p.active).length}</strong></div>
        <div className="stat"><span>Unidades en inventario</span><strong>{totalStock}</strong></div>
        <div className="stat"><span>Bajo mínimo</span><strong>{lowStockCount}</strong></div>
      </div>

      <section className="card">
        <h3>{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
        <form className="form-grid" onSubmit={submitProduct}>
          <label className="field">
            SKU / código interno
            <input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="Ej. ZOE-AGUA-1L" />
          </label>
          <label className="field">
            Producto
            <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ej. Zoé Water 1L" required />
          </label>
          <label className="field">
            Categoría
            <input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Agua / Electrolitos / Twist" />
          </label>
          <label className="field">
            Unidad de medida
            <input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} placeholder="pieza, caja, paquete" required />
          </label>
          <label className="field">
            Presentación
            <input value={productForm.presentation} onChange={(e) => setProductForm({ ...productForm, presentation: e.target.value })} placeholder="Ej. Caja 24 piezas / 600 ml" />
          </label>
          <label className="field">
            Stock mínimo
            <input type="number" min="0" step="1" value={productForm.min_stock} onChange={(e) => setProductForm({ ...productForm, min_stock: Number(e.target.value) })} />
          </label>
          {!editing && (
            <label className="field">
              Inventario inicial
              <input type="number" min="0" step="1" value={productForm.current_stock} onChange={(e) => setProductForm({ ...productForm, current_stock: Number(e.target.value) })} />
            </label>
          )}
          {editing && (
            <label className="field">
              Estatus
              <select value={productForm.active} onChange={(e) => setProductForm({ ...productForm, active: Number(e.target.value) })}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </label>
          )}
          <label className="field full">
            Observaciones
            <textarea rows={2} value={productForm.notes} onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })} placeholder="Notas del producto, empaque, condiciones, etc." />
          </label>
          <div className="full actions-row">
            <button className="btn primary big" type="submit">{editing ? 'Guardar cambios' : 'Guardar producto'}</button>
            {editing && <button className="btn ghost" type="button" onClick={resetProductForm}>Cancelar edición</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Cargar inventario</h3>
        <form className="form-grid" onSubmit={submitStock}>
          <label className="field">
            Producto registrado
            <select value={stockProductId} onChange={(e) => setStockProductId(e.target.value)} required>
              <option value="">Selecciona producto</option>
              {products.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
            </select>
          </label>
          <label className="field">
            Tipo de carga
            <select value={stockForm.movement_type} onChange={(e) => setStockForm({ ...stockForm, movement_type: e.target.value })}>
              <option value="conteo_fisico">Conteo físico / fijar existencia actual</option>
              <option value="entrada">Entrada / sumar al inventario</option>
              <option value="salida">Salida / restar del inventario</option>
              <option value="ajuste">Ajuste / fijar existencia actual</option>
            </select>
          </label>
          <label className="field">
            Cantidad
            <input type="number" min="0" step="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} required />
          </label>
          <label className="field">
            Referencia
            <input value={stockForm.reference} onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })} placeholder="Compra, conteo, ajuste, devolución" />
          </label>
          <label className="field full">
            Comentarios
            <textarea rows={2} value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} />
          </label>
          <div className="full">
            <p className="muted">Existencia actual: <strong>{selectedProduct ? selectedProduct.current_stock : '-'}</strong>. En conteo físico/ajuste, la cantidad capturada se guarda como existencia final. En entrada/salida, se suma o resta.</p>
            <button className="btn primary big" type="submit">Actualizar inventario</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="filters">
          <label className="field compact">Buscar producto
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SKU, nombre o categoría" />
          </label>
          <button className="btn" onClick={() => load().catch((e) => setMessage(e.message))}>Buscar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Presentación</th><th>Stock</th><th>Mínimo</th><th>Estatus</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku || '-'}</td>
                  <td>{p.name}</td>
                  <td>{p.category || '-'}</td>
                  <td>{p.presentation || p.unit}</td>
                  <td><strong>{p.current_stock}</strong></td>
                  <td>{p.min_stock}</td>
                  <td>{p.active ? (p.current_stock <= p.min_stock ? 'Bajo mínimo' : 'Activo') : 'Inactivo'}</td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => startEdit(p)}>Editar</button>
                    <button className="btn small" onClick={() => { setStockProductId(p.id); window.scrollTo({ top: 420, behavior: 'smooth' }); }}>Cargar inventario</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={8}>Sin productos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Últimos movimientos</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad mov.</th><th>Anterior</th><th>Nuevo</th><th>Referencia</th><th>Usuario</th></tr></thead>
            <tbody>
              {movements.slice(0, 20).map((m) => (
                <tr key={m.id}>
                  <td>{m.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  <td>{m.product_name}</td>
                  <td>{movementLabel(m.movement_type)}</td>
                  <td>{m.quantity}</td>
                  <td>{m.previous_stock}</td>
                  <td>{m.new_stock}</td>
                  <td>{m.reference || '-'}</td>
                  <td>{m.created_by_name || '-'}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={8}>Sin movimientos de inventario.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
