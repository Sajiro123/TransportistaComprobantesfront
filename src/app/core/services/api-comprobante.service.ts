import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PerfilTransportistaResponse } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiComprobanteService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.API_COMPROBANTE_URL;

  /**
   * Obtiene el perfil completo del transportista (empresa, representante, contacto).
   * @param ruc RUC del transportista
   */
  obtenerPerfil(ruc: string): Observable<PerfilTransportistaResponse> {
    // Cuando el backend esté integrado, la llamada real será:
    // return this.http.get<PerfilTransportistaResponse>(`${this.API_URL}/perfil`, { params: { ruc } });
    
    // Por el momento, retornamos datos mockup:
    const mockResponse: PerfilTransportistaResponse = {
      data: {
        lista: {
          datosEmpresa: {
            razonSocial: "Transportes Lima Sur S.A.C.",
            ruc: ruc || "20512345678",
            estadoCondicion: "ACTIVO · HABIDO",
            tipoEntidad: "Persona jurídica",
            autoridad: "ATU – Autoridad de Transporte Urbano",
            autorizacionVigente: true
          },
          representanteLegal: {
            nombresApellidos: "Rosa María Vílchez Salazar",
            tipoDocumento: "DNI",
            numeroDocumento: "40218765"
          },
          contacto: {
            nombresApellidos: "Rosa María Vílchez Salazar",
            tipoDocumento: "DNI",
            numeroDocumento: "40218765",
            correoElectronico: "contacto@translimasur.pe",
            telefono: "+51 987 654 321"
          }
        },
        respuesta: "OK",
        mensaje: "Detalle de perfil del transportista obtenido correctamente (mockup)"
      }
    };
    
    return of(mockResponse);
  }

  /**
   * Actualiza los datos de contacto parcialmente editables.
   * @param payload Nuevos datos de contacto
   */
  actualizarContacto(payload: {
    ruc: string;
    nombresApellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono: string;
  }): Observable<any> {
    // Llamada HTTP real futura:
    // return this.http.put(`${this.API_URL}/perfil/contacto`, payload);
    
    return of({
      respuesta: "OK",
      mensaje: "Contacto del transportista actualizado correctamente (mockup)"
    });
  }
}
