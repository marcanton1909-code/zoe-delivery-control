export default function LaBru() {
  const hasAccess =
    sessionStorage.getItem('mackavi_la_bru_access') === '1';

  function closeAccess() {
    sessionStorage.removeItem('mackavi_la_bru_access');
    location.hash = '#/dashboard';
  }

  if (!hasAccess) {
    return (
      <div className="page narrow la-bru-page">
        <section className="la-bru-locked">
          <div className="la-bru-product-mark">
            LB
          </div>

          <div className="page-kicker">
            Acceso restringido
          </div>

          <h2>Mackavi Cerveza La Bru</h2>

          <p>
            Ingresa desde el tablero principal utilizando
            el código de acceso.
          </p>

          <button
            type="button"
            className="btn primary"
            onClick={() =>
              (location.hash = '#/dashboard')
            }
          >
            Volver al tablero
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page la-bru-page">

      <section className="la-bru-main-hero">

        <div className="la-bru-main-copy">

          <div className="page-kicker">
            Mackavi · SaaS privado
          </div>

          <h1>Cerveza La Bru</h1>

          <p>
            Nuevo espacio operativo de Mackavi para
            Cerveza La Bru.
          </p>

        </div>

        <div className="la-bru-product-mark large">
          LB
        </div>

      </section>


      <section className="la-bru-ready-card">

        <span className="la-bru-access-ok">
          Acceso autorizado
        </span>

        <h2>
          Espacio listo para configurar.
        </h2>

        <p>
          En la siguiente etapa se integrarán los módulos,
          procesos, usuarios y lógica operativa específicos
          de Cerveza La Bru.
        </p>

        <div className="la-bru-ready-actions">

          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              (location.hash = '#/dashboard')
            }
          >
            ← Volver a Control de entregas
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={closeAccess}
          >
            Cerrar acceso
          </button>

        </div>

      </section>

    </div>
  );
}
