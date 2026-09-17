import { FormEvent, useState } from 'react';

const LA_BRU_PIN_HASH =
  'fc822428faced94b60e42e5dc9b3c2c066e3181a52dcd0576a896e0f7e1d4418';

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function LaBruLauncher() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  function openAccess() {
    setCode('');
    setError('');
    setOpen(true);
  }

  function closeAccess() {
    if (checking) return;

    setCode('');
    setError('');
    setOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (code.length !== 4) {
      setError('Ingresa el código de 4 dígitos.');
      return;
    }

    setChecking(true);

    try {
      const hash = await sha256(code);

      if (hash !== LA_BRU_PIN_HASH) {
        setError('Código incorrecto.');
        return;
      }

      sessionStorage.setItem('mackavi_la_bru_access', '1');

      setOpen(false);
      setCode('');

      location.hash = '#/la-bru';
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <section className="la-bru-launcher">
        <div className="la-bru-launcher-mark">LB</div>

        <div className="la-bru-launcher-copy">
          <span>Mackavi · Aplicaciones</span>
          <h3>Mackavi Cerveza La Bru</h3>
          <p>Acceso privado al nuevo espacio operativo de Cerveza La Bru.</p>
        </div>

        <button
          type="button"
          className="la-bru-launcher-button"
          onClick={openAccess}
        >
          <span>Abrir espacio</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      {open && (
        <div
          className="la-bru-modal-backdrop"
          onMouseDown={closeAccess}
        >
          <section
            className="la-bru-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="la-bru-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="la-bru-modal-close"
              onClick={closeAccess}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="la-bru-modal-mark">LB</div>

            <div className="la-bru-modal-kicker">
              Acceso privado
            </div>

            <h2 id="la-bru-modal-title">
              Mackavi Cerveza La Bru
            </h2>

            <p>
              Ingresa tu código de acceso para continuar.
            </p>

            <form onSubmit={submit}>
              <label className="la-bru-code-field">
                <span>Código de acceso</span>

                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={code}
                  placeholder="••••"
                  onChange={(event) =>
                    setCode(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 4)
                    )
                  }
                />
              </label>

              {error && (
                <div className="la-bru-modal-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="la-bru-modal-submit"
                disabled={checking}
              >
                {checking ? 'Validando…' : 'Continuar'}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
