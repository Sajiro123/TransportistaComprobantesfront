import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiAuthService } from '../services/api-auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  const apiAuth = inject(ApiAuthService);
  const router  = inject(Router);

  // Solo una sesión emitida por IAM permite acceder a rutas protegidas.
  if (apiAuth.isLoggedIn()) return true;

  return router.createUrlTree(['/login']);
};
