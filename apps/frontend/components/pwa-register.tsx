'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Si entra en control un service worker nuevo (versión nueva publicada),
    // recargamos solos: el usuario nunca necesita borrar caché a mano.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Revisa si hay una versión nueva del SW cada vez que la app pasa a
      // primer plano, para no depender de que el navegador lo haga solo.
      const checkForUpdate = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      checkForUpdate();
    }).catch(() => {});
  }, []);

  return null;
}
