import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '@env/environment';
import {
  UpdateEmailPhoneRequest,
  UpdateEmailPhoneResponse,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ApiUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.API_BASE_URL;

  /**
   * Actualiza el correo y el teléfono del usuario.
   * El Token es inyectado automáticamente por el AuthInterceptor en las cabeceras.
   */
  actualizarCorreoTelefono(payload: UpdateEmailPhoneRequest): Observable<UpdateEmailPhoneResponse> {
    return of({
      data: {
        respuesta: "OK",
        mensaje: "Contacto actualizado correctamente (offline mock)"
      },
      mensaje: "Contacto actualizado correctamente (offline mock)"
    });
  }

  /**
   * Actualiza la contraseña del usuario.
   */
  actualizarContrasena(payload: any): Observable<any> {
    return of({
      respuesta: "OK",
      mensaje: "Contraseña actualizada correctamente (offline mock)"
    });
  }
}
