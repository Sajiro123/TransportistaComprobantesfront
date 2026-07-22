import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, BehaviorSubject, filter, take, switchMap, EMPTY } from 'rxjs';
import { ApiAuthService } from '../services/api-auth.service';
import { SessionService } from '../services/session.service';

import Swal from 'sweetalert2';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

/**
 * Interceptor funcional JWT (Angular 17+).
 *
 * Responsabilidades:
 *  1. Inyecta el header `Authorization: Bearer <token>` en cada request
 *     autenticado (si hay token en sesión).
 *  2. Si el servidor responde 401 (token expirado / inválido):
 *     - Intenta renovar el token automáticamente usando el `refreshToken`
 *       almacenado en la sesión local.
 *     - Si tiene éxito, actualiza la sesión y reintenta la petición.
 *     - Si falla, limpia la sesión local, detiene el timer y redirige al login.
 *  3. Si el servidor responde 403 (sin permisos):
 *     - Deja el token intacto (no hace logout).
 *     - Solo propaga el error para que el componente lo maneje.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const apiAuthService = inject(ApiAuthService);
  const sessionService = inject(SessionService);
  const router         = inject(Router);

  const isLoginRequest = req.url.includes('/auth/login');
  const isRefreshRequest = req.url.includes('/auth/refresh');

  // Envía credenciales (cookies HttpOnly) en cada petición
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const errMessage = err?.error?.message || err?.error?.descripcion || err?.message || '';
      const isTokenExpired =
        err.status === 401 ||
        errMessage.toLowerCase().includes('token inválido o expirado') ||
        errMessage.toLowerCase().includes('token expirado');

      if (isTokenExpired && !isLoginRequest && !isRefreshRequest) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return apiAuthService.refreshAccessToken().pipe(
            switchMap(() => {
              isRefreshing = false;

              sessionService.renewSession();

              refreshTokenSubject.next('refreshed');

              return next(req.clone({ withCredentials: true }));
            }),
            catchError((refreshErr) => {
                isRefreshing = false;

                sessionService.stopSession();
                apiAuthService.clearSession();

                Swal.fire({
                  icon: 'warning',
                  title: 'Sesión finalizada',
                  text: 'Su sesión ha expirado y no se pudo renovar de forma automática. Inicie sesión nuevamente.',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#0059bb'
                }).then(() => {
                  router.navigate(['/login']);
                });

                return EMPTY;
              })
            );
        } else {
          // Esperar a que termine la renovación en curso
          return refreshTokenSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap(() => {
              return next(req.clone({ withCredentials: true }));
            })
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
