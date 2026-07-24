import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiExternaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_COMPROBANTE_URL;

  // --- 🗺️ Ubigeo ---
  
  obtenerDepartamentos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ubigeo/departamentos`);
  }

  obtenerProvincias(departamentoId: string): Observable<any> {
    let params = new HttpParams().set('departamentoId', departamentoId);
    return this.http.get<any>(`${this.apiUrl}/ubigeo/provincias`, { params });
  }

  obtenerDistritos(provinciaId: string): Observable<any> {
    let params = new HttpParams().set('provinciaId', provinciaId);
    return this.http.get<any>(`${this.apiUrl}/ubigeo/distritos`, { params });
  }

  // --- 🔍 Validaciones Externas (SUNAT / RENIEC) ---
  
  validarRucSunat(ruc: string): Observable<any> {
    let params = new HttpParams().set('ruc', ruc);
    return this.http.get<any>(`${this.apiUrl}/validacion/sunat`, { params });
  }

  validarDniReniec(dni: string): Observable<any> {
    let params = new HttpParams().set('dni', dni);
    return this.http.get<any>(`${this.apiUrl}/validacion/reniec`, { params });
  }
}
