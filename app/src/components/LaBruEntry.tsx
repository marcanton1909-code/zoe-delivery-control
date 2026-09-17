import { FormEvent, useState } from 'react';

const ACCESS_HASH =
  'fc822428faced94b60e42e5dc9b3c2c066e3181a52dcd0576a896e0f7e1d4418';

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function LaBruEntry() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  function close() {
    if (checking) return;
    setOpen(false);
    setCode('');
    setError('');
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
      const result = await sha256(code);

      if (result !== ACCESS_HASH) {
        setError('Código incorrecto.');
        return;
      }

      sessionStorage.setItem('mackavi_la_bru_access', '1');
      window.location.href = '/la-bru.html';
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className="labru-login-entry">
        <div className="labru-login-copy">
          <span>Otro espacio Mackavi</span>
          <strong>Cerveza La Bru</strong>
        </div>

        <button
          type="button"
          className="labru-login-button"
          onClick={() => {
            setCode('');
            setError('');
            setOpen(true);
          }}
        >
          Acceder
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {open && (
        <div
          className="labru-gate-backdrop"
          onMouseDown={close}
        >
          <div
            className="labru-gate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="labru-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="labru-gate-close"
              onClick={close}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="labru-gate-monogram">
              LB
            </div>

            <span className="labru-gate-eyebrow">
              Mackavi · Acceso privado
            </span>

            <h2 id="labru-title">
              Cerveza La Bru
            </h2>

            <p>
              Ingresa el código de acceso para continuar.
            </p>

            <form onSubmit={submit}>
              <input
                autoFocus
                className="labru-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                value={code}
                placeholder="••••"
                aria-label="Código de acceso"
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 4)
                  )
                }
              />

              {error && (
                <div className="labru-gate-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="labru-gate-submit"
                disabled={checking}
              >
                {checking ? 'Validando…' : 'Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
