import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  ApiErrorResponse,
  ApiSession,
  ApiResponseDto,
  ValidarRucRequest,
  ValidarRucResponse,
  EnviarOtpRegistroRequest,
  EnviarOtpRegistroResponse,
  VerificarOtpRegistroRequest,
  VerificarOtpRegistroResponse,
} from '../models/api.models';
import { Usuario } from '../models/models';
import { FieldDecryptionForgeService } from './field-decryption-forge.service';

// ── Storage keys ──────────────────────────────────────────
const KEY_API_SESSION = 'sigt_api_session_DU004';

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly http      = inject(HttpClient);
  private readonly decryptor = inject(FieldDecryptionForgeService);
  private readonly baseUrl   = environment.API_BASE_URL;

  // ── Login ───────────────────────────────────────────────
  /**
   * Llama a POST /api/auth/login.
   * @param usuario  Usuario o email ingresado por el usuario
   * @param password Contraseña
   * @param recaptchaToken Token de Google reCAPTCHA v2 (requerido en producción)
   */
  login(usuario: string, password: string, recaptchaToken?: string): Observable<LoginResponse> {
    const body: LoginRequest = { usuario, password, recaptchaToken };
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login`, body)
      .pipe(
        map(res => {
          if (res && res.data) {
            res.data = this.decryptor.decryptLoginData(res.data);
          }
          return res;
        }),
        catchError(this.handleError.bind(this)),
      );
  }

  // ── Registro público con OTP ─────────────────────────────

  /**
   * Paso 1: Valida un RUC contra SUNAT.
   * POST /api_iam/registro/validar-ruc
   */
  validarRuc(ruc: string, recaptchaToken?: string): Observable<ValidarRucResponse> {
    const body: ValidarRucRequest = { ruc, recaptchaToken };
    return this.http
      .post<ApiResponseDto<ValidarRucResponse>>(`${this.baseUrl}/registro/validar-ruc`, body)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  /**
   * Paso 2: Envía OTP al correo del usuario.
   * POST /api_iam/registro/otp/enviar
   */
  enviarOtp(payload: EnviarOtpRegistroRequest): Observable<EnviarOtpRegistroResponse> {
    return this.http
      .post<ApiResponseDto<EnviarOtpRegistroResponse>>(`${this.baseUrl}/registro/otp/enviar`, payload)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  /**
   * Paso 3: Verifica el OTP y crea la cuenta.
   * POST /api_iam/registro/otp/verificar
   */
  verificarOtp(correo: string, otp: string, recaptchaToken?: string): Observable<VerificarOtpRegistroResponse> {
    const body: VerificarOtpRegistroRequest = { correo, otp, recaptchaToken };
    return this.http
      .post<ApiResponseDto<VerificarOtpRegistroResponse>>(`${this.baseUrl}/registro/otp/verificar`, body)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ── Sesión ──────────────────────────────────────────────
  saveSession(response: LoginResponse): void {
    const session: ApiSession = {
      expiresAt:    Date.now() + 15 * 60 * 1000, // 15 minutos de la cookie 
      user:         response.data,
    };
    sessionStorage.setItem(KEY_API_SESSION, JSON.stringify(session));
  }

  getSession(): ApiSession | null {
    try {
      const raw = sessionStorage.getItem(KEY_API_SESSION);
      return raw ? (JSON.parse(raw) as ApiSession) : null;
    } catch {
      return null;
    }
  }

  getUserFromSession(): Usuario | null {
    const session = this.getSession();
    if (!session) return null;

    let usuarioUuid = session.user.usuarioUuid || '';

    return {
      email: session.user.correo || '',
      password: '',
      nombre: session.user.nombrePersona,
      primerApellido: session.user.apellidoPaterno || '',
      segundoApellido: session.user.apellidoMaterno || '',
      entidad: session.user.nombreEntidad,
      tipoEntidad: session.user.tipoEntidad || '',
      numDocumento: session.user.numeroDocumento || '',
      tipoDocumento: session.user.tipoDocumento || 'DNI',
      telefono: session.user.telefono || '',
      cargo: session.user.cargo || '',
      perfilNombre: session.user.perfilNombre || '',
      perfilCodigo: session.user.perfilCodigo || '',
      razonSocial: session.user.razonSocial || '',
      entidadUuid: session.user.entidadUuid || '',
      usuarioUuid: usuarioUuid,
    } as Usuario;
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  isLoggedIn(): boolean {
    const session = this.getSession();
    if (!session) return false;
    // Verifica que el token no haya expirado
    return Date.now() < session.expiresAt;
  }

  clearSession(): void {
    sessionStorage.removeItem(KEY_API_SESSION);
  }

  updateSessionUser(correo: string, telefono: string, cargo: string): void {
    const session = this.getSession();
    if (session) {
      session.user.correo = correo;
      session.user.telefono = telefono;
      session.user.cargo = cargo;
      sessionStorage.setItem(KEY_API_SESSION, JSON.stringify(session));
    }
  }

  /**
   * Refresca la sesión usando el refresh token HttpOnly en cookie.
   */
  refreshAccessToken(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Obtiene la lista de tipos de persona para el catálogo.
   */
  getTiposPersona(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogo/tipo-persona`);
  }

  // ── Manejo de errores HTTP ───────────────────────────────
  private handleError(err: HttpErrorResponse): Observable<never> {
    let apiError: ApiErrorResponse;

    if (err.error && err.error.code) {
      // El backend devolvió un objeto de error estructurado
      apiError = err.error as ApiErrorResponse;
    } else if (err.status === 401) {
      apiError = {
        code: 'AUTH_001',
        message: 'No autorizado',
        descripcion: 'Usuario o contraseña incorrectos.',
      };
    } else if (err.status === 403) {
      apiError = {
        code: 'AUTH_403',
        message: 'Acceso denegado',
        descripcion: 'No tiene permisos para acceder a este recurso.',
      };
    } else if (err.status === 0) {
      apiError = {
        code: 'NETWORK_ERROR',
        message: 'Error de conexión',
        descripcion: 'No se pudo conectar al servidor. Verifique su conexión a internet.',
      };
    } else {
      apiError = {
        code: `HTTP_${err.status}`,
        message: 'Error del servidor',
        descripcion: err.message ?? 'Ocurrió un error inesperado.',
      };
    }

    return throwError(() => apiError);
  }
}
