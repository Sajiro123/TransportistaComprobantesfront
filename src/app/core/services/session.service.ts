import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiAuthService } from './api-auth.service';

/**
 * SessionService
 * ─────────────
 * Gestiona el ciclo de vida de la sesión JWT:
 *  - Inicia un contador de 15 minutos al hacer login.
 *  - Dispara un aviso de SweetAlert2 cuando faltan 20 segundos (minuto 14:40).
 *  - Cierra la sesión automáticamente al llegar a 0.
 *  - Permite renovar el timer (actividad del usuario).
 */

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 min
const WARN_BEFORE_MS = 20 * 1000; //
const TICK_INTERVAL_MS = 1000; // cada segundo

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  // ── Estado público ────────────────────────────────────
  /** Segundos restantes (reactivo). -1 = sesión inactiva */
  readonly remainingSeconds$ = new BehaviorSubject<number>(-1);

  // ── Internals ─────────────────────────────────────────
  private sessionEnd = 0; // timestamp (epoch ms) de expiración
  private warnShown = false; // para no mostrar el aviso más de una vez
  private tickSub: Subscription | null = null;

  private readonly apiAuth = inject(ApiAuthService);
  private readonly router = inject(Router);

  // ── Public API ────────────────────────────────────────

  /** Llama a este método justo después de un login exitoso. */
  startSession(): void {
    this.stopSession();
    const session = this.apiAuth.getSession();
    const duration = session?.user?.expiresIn ?? SESSION_DURATION_MS;
    this.sessionEnd = Date.now() + duration;
    this.warnShown = false;
    this._startTick();
  }

  /** Reinicia el timer (tras actividad del usuario, si se desea). */
  renewSession(): void {
    if (this.tickSub) {
      const session = this.apiAuth.getSession();
      const duration = session?.user?.expiresIn ?? SESSION_DURATION_MS;
      this.sessionEnd = Date.now() + duration;
      this.warnShown = false;
    }
  }

  /** Detiene el timer y limpia el estado. */
  stopSession(): void {
    this.tickSub?.unsubscribe();
    this.tickSub = null;
    this.remainingSeconds$.next(-1);
  }

  /** Recupera los segundos restantes en formato MM:SS */
  get remainingFormatted(): string {
    const secs = this.remainingSeconds$.value;
    if (secs < 0) return '--:--';
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Lifecycle ─────────────────────────────────────────
  ngOnDestroy(): void {
    this.stopSession();
  }

  // ── Private ───────────────────────────────────────────
  private _startTick(): void {
    this.tickSub = interval(TICK_INTERVAL_MS).subscribe(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((this.sessionEnd - now) / 1000));
      this.remainingSeconds$.next(remaining);

      // Aviso 20s antes
      if (!this.warnShown && remaining <= WARN_BEFORE_MS / 1000) {
        this.warnShown = true;
        this._showExpiryWarning(remaining);
      }

      // Sesión expirada
      if (remaining === 0) {
        this.stopSession();
        this.apiAuth.clearSession();
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada',
          text: 'Su sesión ha finalizado por inactividad. Por favor, inicie sesión nuevamente.',
          confirmButtonColor: '#0059bb',
          allowOutsideClick: false,
        }).then(() => {
          this.router.navigate(['/login']);
        });
      }
    });
  }

  private _showExpiryWarning(secondsLeft: number): void {
    Swal.fire({
      icon: 'warning',
      title: '⏰ Su sesión está por expirar',
      html: `Su sesión cerrará en <strong>${secondsLeft} segundos</strong>.<br>¿Desea extender su sesión?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, extender',
      cancelButtonText: 'Cerrar sesión',
      confirmButtonColor: '#0059bb',
      cancelButtonColor: '#e53e3e',
      timer: secondsLeft * 1000,
      timerProgressBar: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Extiende la sesión llamando al refresh API
        this.apiAuth.refreshAccessToken().subscribe({
          next: () => {
            this.renewSession();
            const session = this.apiAuth.getSession();
            const duration = session?.user?.expiresIn ?? SESSION_DURATION_MS;
            const minutes = Math.round(duration / 60000);
            Swal.fire({
              icon: 'success',
              title: 'Sesión extendida',
              text: `Su sesión se ha renovado por ${minutes} minutos más.`,
              timer: 1800,
              showConfirmButton: false,
            });
          },
          error: () => {
            this.stopSession();
            this.apiAuth.clearSession();
            this.router.navigate(['/login']);
          },
        });
      } else {
        // Cierra sesión inmediatamente
        this.apiAuth.logout().subscribe({
          next: () => {
            this.stopSession();
            this.apiAuth.clearSession();
            this.router.navigate(['/login']);
          },
          error: () => {
            this.stopSession();
            this.apiAuth.clearSession();
            this.router.navigate(['/login']);
          },
        });
      }
    });
  }
}
