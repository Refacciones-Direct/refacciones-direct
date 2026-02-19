'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-MX">
      <body>
        <h1>Algo salió mal</h1>
        <p>Ha ocurrido un error inesperado.</p>
        <button onClick={reset}>Intentar de nuevo</button>
      </body>
    </html>
  );
}
