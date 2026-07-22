import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  ApiResponseDto,
  EnviarOtpRecuperacionRequest,
  EnviarOtpRecuperacionResponse,
  VerificarOtpRecuperacionRequest,
  VerificarOtpRecuperacionResponse,
  ActualizarClaveRecuperacionRequest,
  ActualizarClaveRecuperacionResponse,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ApiRecuperacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_BASE_URL + '/recuperacion';

  enviarOtp(request: EnviarOtpRecuperacionRequest): Observable<ApiResponseDto<EnviarOtpRecuperacionResponse>> {
    return this.http.post<ApiResponseDto<EnviarOtpRecuperacionResponse>>(
      `${this.apiUrl}/enviar-otp`,
      request,
      { withCredentials: true }
    );
  }

  verificarOtp(request: VerificarOtpRecuperacionRequest): Observable<ApiResponseDto<VerificarOtpRecuperacionResponse>> {
    return this.http.post<ApiResponseDto<VerificarOtpRecuperacionResponse>>(
      `${this.apiUrl}/verificar-otp`,
      request,
      { withCredentials: true }
    );
  }

  actualizarClave(request: ActualizarClaveRecuperacionRequest): Observable<ApiResponseDto<ActualizarClaveRecuperacionResponse>> {
    return this.http.post<ApiResponseDto<ActualizarClaveRecuperacionResponse>>(
      `${this.apiUrl}/actualizar-clave`,
      request,
      { withCredentials: true }
    );
  }
}
