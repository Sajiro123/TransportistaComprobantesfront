import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import { ApiUsuarioService } from '@core/services/api-usuario.service';
import { ApiComprobanteService } from '@core/services/api-comprobante.service';
import {
  CuentaAbono,
  Usuario,
  PerfilTransportista,
  BancoItemResponse,
  CuentaBancariaTransportistaResponseData,
} from '@core/models/models';


@Component({
  selector: 'app-perfil-info',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-atu-border dark:border-[#30363D] pb-4"
      >
        <div>
          <h1
            class="text-xl sm:text-2xl font-extrabold text-atu-text dark:text-[#E6EDF3] tracking-tight"
          >
            Mi Perfil
          </h1>
          <p class="text-sm text-atu-text-3 dark:text-[#6E7681] mt-1">
            Administre su información institucional y credenciales de acceso.
          </p>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- ── User Info Card (2/3) ── -->
        <div
          class="md:col-span-2 bg-white dark:bg-[#161B22] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-6"
        >
          <!-- Avatar Row -->
          <div class="flex items-center gap-4 justify-between">
            <div class="flex items-center gap-4 min-w-0">
              <div
                class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-atu-primary-soft dark:bg-[rgba(0,163,224,0.12)] text-atu-primary dark:text-[#00A3E0] border border-atu-border dark:border-[#30363D] flex items-center justify-center text-xl sm:text-2xl shrink-0"
              >
                <i class="fa-solid fa-user"></i>
              </div>
              <div class="min-w-0">
                <h2
                  class="text-base sm:text-lg font-bold text-atu-text dark:text-[#E6EDF3] truncate"
                >
                  {{ usuario?.nombre }}
                </h2>
                <p
                  class="text-xs text-atu-primary dark:text-[#00A3E0] font-semibold uppercase tracking-wider"
                >
                  {{ tipoLabel }}
                </p>
              </div>
            </div>
            <!-- Botones Editar / Guardar / Cancelar -->
            <div class="flex items-center gap-2 shrink-0">
              @if (!editMode) {
                <button
                  (click)="iniciarEdicion()"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold bg-atu-primary text-white hover:bg-atu-primary-strong active:scale-[0.97] transition-all shadow-sm"
                >
                  <i class="fa-solid fa-pen-to-square text-xs"></i>
                  <span class="hidden sm:inline">Editar perfil</span>
                </button>
              } @else {
                <button
                  (click)="guardarEdicion()"
                  [disabled]="isSaving"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold bg-atu-primary text-white hover:bg-atu-primary-strong active:scale-[0.97] transition-all shadow-sm"
                >
                  @if (isSaving) {
                    <i class="fa-solid fa-spinner fa-spin text-xs"></i>
                    <span class="hidden sm:inline">Guardando...</span>
                  } @else {
                    <i class="fa-solid fa-floppy-disk text-xs"></i>
                    <span class="hidden sm:inline">Guardar</span>
                  }
                </button>
                <button
                  (click)="cancelarEdicion()"
                  [disabled]="isSaving"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold bg-atu-surface-2 dark:bg-[#21262D] text-atu-text-2 dark:text-[#8B949E] border border-atu-border dark:border-[#30363D] hover:border-atu-text-3 dark:hover:border-[#8B949E] active:scale-[0.97] transition-all"
                >
                  <i class="fa-solid fa-xmark text-xs"></i>
                  <span class="hidden sm:inline">Cancelar</span>
                </button>
              }
            </div>
          </div>

          <!-- Info Grid -->
          <!-- Tarjetas de Información -->
          <div class="mt-4 flex flex-col gap-5">
            <!-- Datos de la Empresa -->
            <div
              class="group bg-white dark:bg-[#0D1117] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-atu-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div
                class="flex items-center justify-between px-5 py-4 border-b border-atu-border/50 dark:border-[#30363D]/50 bg-gray-50/50 dark:bg-white/[0.02]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <i class="fa-solid fa-building text-sm"></i>
                  </div>
                  <span
                    class="text-base font-extrabold text-atu-text dark:text-[#E6EDF3]"
                    >Datos de la empresa</span
                  >
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-gray-100 dark:bg-[#21262D] text-gray-500 dark:text-[#8B949E] border border-gray-200 dark:border-[#30363D]"
                >
                  <i class="fa-solid fa-lock text-[9px]"></i> No editable
                </span>
              </div>
              <div
                class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 gap-x-8 text-xs leading-normal"
              >
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Razón Social</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors"
                    >{{ perfilTrans?.datosEmpresa?.razonSocial || '—' }}</strong
                  >
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >RUC</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors font-mono"
                    >{{ perfilTrans?.datosEmpresa?.ruc || '—' }}</strong
                  >
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Estado y Condición</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors"
                  >
                    {{ perfilTrans?.datosEmpresa?.estadoCondicion || '—' }}
                  </strong>
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Tipo de Entidad</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors"
                  >
                    {{ perfilTrans?.datosEmpresa?.tipoEntidad || '—' }}
                  </strong>
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Autoridad que Autorizó</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors"
                  >
                    {{ perfilTrans?.datosEmpresa?.autoridad || '—' }}
                  </strong>
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Autorización Vigente</span
                  >
                  <div class="pt-0.5">
                    @if (perfilTrans?.datosEmpresa?.autorizacionVigente) {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-50 dark:bg-[#102A1C] text-green-700 dark:text-[#3FC078] border border-green-200 dark:border-green-900/30">
                        <i class="fa-solid fa-circle-check text-[10px]"></i> Vigente
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-[#2C1816] text-red-700 dark:text-[#E27062] border border-red-200 dark:border-red-900/30">
                        <i class="fa-solid fa-circle-xmark text-[10px]"></i> No Vigente
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Representante Legal -->
            <div
              class="group bg-white dark:bg-[#0D1117] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-atu-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div
                class="flex items-center justify-between px-5 py-4 border-b border-atu-border/50 dark:border-[#30363D]/50 bg-gray-50/50 dark:bg-white/[0.02]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <i class="fa-solid fa-id-card text-sm"></i>
                  </div>
                  <span
                    class="text-base font-extrabold text-atu-text dark:text-[#E6EDF3]"
                    >Representante legal</span
                  >
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-gray-100 dark:bg-[#21262D] text-gray-500 dark:text-[#8B949E] border border-gray-200 dark:border-[#30363D]"
                >
                  <i class="fa-solid fa-lock text-[9px]"></i> No editable
                </span>
              </div>
              <div
                class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 gap-x-8 text-xs leading-normal"
              >
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Nombres y apellidos</span
                  >
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block group-hover/field:text-atu-primary transition-colors"
                  >
                    {{ perfilTrans?.representanteLegal?.nombresApellidos || '—' }}
                  </strong>
                </div>
                <div class="space-y-1.5 group/field">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >Documento</span
                  >
                  <strong
                    class="inline-flex items-center gap-2 text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold bg-gray-50 dark:bg-white/[0.03] px-2 py-0.5 rounded-md border border-gray-100 dark:border-white/10 font-mono group-hover/field:border-atu-primary/30 transition-colors"
                  >
                    <span class="text-atu-text-3 dark:text-[#8B949E] text-[11px]">{{ perfilTrans?.representanteLegal?.tipoDocumento || 'DNI' }}</span>
                    {{ perfilTrans?.representanteLegal?.numeroDocumento || '—' }}
                  </strong>
                </div>
              </div>
            </div>

            <!-- Contacto -->
            <div
              class="group bg-white dark:bg-[#0D1117] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative"
              [class.ring-2]="editMode"
              [class.ring-atu-primary]="editMode"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-atu-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div
                class="flex items-center justify-between gap-3 px-5 py-4 border-b border-atu-border/50 dark:border-[#30363D]/50 bg-gray-50/50 dark:bg-white/[0.02]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <i class="fa-solid fa-address-book text-sm"></i>
                  </div>
                  <div>
                    <div
                      class="text-base font-extrabold text-atu-text dark:text-[#E6EDF3]"
                    >
                      Datos de contacto
                    </div>
                    <div
                      class="text-[12px] text-atu-text-3 dark:text-[#6E7681] mt-0.5"
                    >
                      Mantén tus datos actualizados
                    </div>
                  </div>
                </div>
                @if (editMode) {
                  <span class="animate-pulse inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                    <i class="fa-solid fa-pen text-[9px]"></i> Editando
                  </span>
                }
              </div>
              <div
                class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 gap-x-8 text-xs leading-normal"
              >
                <!-- Nombre del Contacto -->
                <div class="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Nombre del Contacto
                    @if (editMode) {
                      <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    }
                  </span>
                  @if (editMode) {
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fa-solid fa-user text-gray-400 text-xs"></i>
                      </div>
                      <input
                        type="text"
                        [(ngModel)]="editContactoNombre"
                        placeholder="Nombres y Apellidos"
                        class="w-full pl-9 border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all shadow-sm"
                      />
                    </div>
                  } @else {
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold flex items-center gap-2"
                    >
                      <i class="fa-solid fa-user text-atu-text-3 dark:text-[#8B949E] text-xs"></i>
                      {{ perfilTrans?.contacto?.nombresApellidos || '—' }}
                    </strong>
                  }
                </div>

                <!-- Teléfono -->
                <div class="space-y-1.5">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Teléfono
                    @if (editMode) {
                      <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    }
                  </span>
                  @if (editMode) {
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fa-solid fa-phone text-gray-400 text-xs"></i>
                      </div>
                      <input
                        type="tel"
                        [(ngModel)]="editContactoTelefono"
                        placeholder="Teléfono"
                        class="w-full pl-9 border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all font-mono tracking-wide shadow-sm"
                      />
                    </div>
                  } @else {
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold flex items-center gap-2 font-mono tracking-wide"
                    >
                      <i class="fa-solid fa-phone text-atu-text-3 dark:text-[#8B949E] text-[11px]"></i>
                      {{ perfilTrans?.contacto?.telefono || '—' }}
                    </strong>
                  }
                </div>

                <!-- Tipo de Documento -->
                <div class="space-y-1.5">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Tipo de Documento (Contacto)
                    @if (editMode) {
                      <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    }
                  </span>
                  @if (editMode) {
                    <div class="relative">
                      <select
                        [(ngModel)]="editContactoTipoDoc"
                        class="w-full border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all cursor-pointer shadow-sm"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">Carné de Extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                  } @else {
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block"
                    >
                      {{ perfilTrans?.contacto?.tipoDocumento || '—' }}
                    </strong>
                  }
                </div>

                <!-- Número de Documento -->
                <div class="space-y-1.5">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Número de Documento (Contacto)
                    @if (editMode) {
                      <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    }
                  </span>
                  @if (editMode) {
                    <div class="relative">
                      <input
                        type="text"
                        [(ngModel)]="editContactoNumDoc"
                        placeholder="Número de documento"
                        class="w-full border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all font-mono shadow-sm"
                      />
                    </div>
                  } @else {
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold block font-mono"
                    >
                      {{ perfilTrans?.contacto?.numeroDocumento || '—' }}
                    </strong>
                  }
                </div>

                <!-- Correo (NO EDITABLE) -->
                <div class="space-y-1.5">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Correo Electrónico
                  </span>
                  <strong
                    class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold flex items-center gap-2 break-all"
                  >
                    <i class="fa-regular fa-envelope text-atu-text-3 dark:text-[#8B949E]"></i>
                    {{ perfilTrans?.contacto?.correoElectronico || '—' }}
                  </strong>
                </div>

                <!-- Documento de Cargo (del usuario actual si existe) -->
                @if (usuario?.documentoCargo; as docCargo) {
                  <div class="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <span
                      class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                      >Documento de Sustentación de Cargo (Usuario)</span
                    >
                    <span
                      class="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-[13.5px] font-semibold text-atu-text-2 dark:text-[#C9D1D9] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-default"
                    >
                      <i
                        class="fa-solid fa-file-pdf text-red-500 dark:text-red-400 text-base"
                      ></i>
                      {{ docCargo }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Cuenta de Abono -->
            <div
              class="group bg-white dark:bg-[#0D1117] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative"
              [class.ring-2]="cuentaEditMode"
              [class.ring-atu-primary]="cuentaEditMode"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-atu-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div
                class="flex items-center justify-between gap-3 px-5 py-4 border-b border-atu-border/50 dark:border-[#30363D]/50 bg-gray-50/50 dark:bg-white/[0.02]"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <i class="fa-solid fa-piggy-bank text-sm"></i>
                  </div>
                  <div
                    class="text-base font-extrabold text-atu-text dark:text-[#E6EDF3]"
                  >
                    Cuenta de abono
                  </div>
                </div>
                <div class="flex items-center justify-end gap-2 flex-wrap">
                  @if (isLoadingCuentaAbono) {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
                      <i class="fa-solid fa-spinner fa-spin text-[11px]"></i> Consultando
                    </span>
                  } @else if (cuentaAbono) {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-green-100 dark:bg-[#102A1C] text-green-700 dark:text-[#3FC078] border border-green-200 dark:border-green-900/30">
                      <i class="fa-solid fa-check-circle text-[11px]"></i> Registrada
                    </span>
                  } @else if (cuentaAbonoLoaded) {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                      <i class="fa-solid fa-circle-exclamation text-[11px]"></i> No registrada
                    </span>
                  }

                  @if (!cuentaEditMode) {
                    <button
                      type="button"
                      (click)="iniciarEdicionCuenta()"
                      [disabled]="isLoadingCuentaAbono"
                      class="ml-auto inline-flex items-center gap-2 bg-atu-surface-2 dark:bg-[#21262D] text-atu-text dark:text-[#E6EDF3] border border-atu-border dark:border-[#484F58] rounded-[9px] px-[15px] py-2.5 text-[13px] font-bold cursor-pointer hover:border-atu-primary dark:hover:border-[#00A3E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <i class="fa-solid fa-building-columns text-xs"></i>
                      Cambiar cuenta
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="guardarEdicionCuenta()"
                      [disabled]="isSavingCuenta"
                      class="inline-flex items-center gap-2 bg-atu-primary text-white border border-atu-primary rounded-[9px] px-3 py-2 text-[12.5px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      <i class="fa-solid" [ngClass]="isSavingCuenta ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
                      {{ isSavingCuenta ? 'Guardando...' : 'Guardar cuenta' }}
                    </button>
                    <button
                      type="button"
                      (click)="cancelarEdicionCuenta()"
                      [disabled]="isSavingCuenta"
                      class="inline-flex items-center gap-2 bg-white dark:bg-[#161B22] text-atu-text-2 dark:text-[#8B949E] border border-atu-border dark:border-[#484F58] rounded-[9px] px-3 py-2 text-[12.5px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  }
                </div>
              </div>

              <div
                class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 gap-x-8 text-xs leading-normal"
              >
                <!-- Tipo de Abono -->
                @if (cuentaEditMode) {
                  <div class="space-y-1.5 sm:col-span-2 lg:col-span-3 pb-2 border-b border-gray-100 dark:border-[#30363D]">
                    <span class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]">
                      Tipo de Abono <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    </span>
                    <div class="flex items-center gap-6 mt-1">
                      <label class="inline-flex items-center gap-2 text-sm text-atu-text dark:text-[#E6EDF3] font-semibold cursor-pointer">
                        <input type="radio" name="tipoAbono" [value]="1" [(ngModel)]="editTipoAbonoId" class="text-atu-primary focus:ring-atu-primary" />
                        <span>CCI (Depósito Bancario)</span>
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-atu-text dark:text-[#E6EDF3] font-semibold cursor-pointer">
                        <input type="radio" name="tipoAbono" [value]="2" [(ngModel)]="editTipoAbonoId" class="text-atu-primary focus:ring-atu-primary" />
                        <span>OPE (Orden de Pago en Ventanilla)</span>
                      </label>
                    </div>
                  </div>
                }

                <!-- Banco -->
                <div class="space-y-1.5">
                  <span
                    class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                  >
                    Banco
                    @if (cuentaEditMode) {
                      <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                    }
                  </span>
                  @if (cuentaEditMode) {
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fa-solid fa-building-columns text-gray-400 text-xs"></i>
                      </div>
                      <select
                        [(ngModel)]="editBanco"
                        class="w-full pl-9 border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all cursor-pointer shadow-sm appearance-none"
                      >
                        <option value="">Selecciona un banco…</option>
                        @if (bancosList.length > 0) {
                          @for (banco of bancosList; track banco.uuidBanco) {
                            <option [value]="banco.nombre">{{ banco.nombre }} ({{ banco.abreviatura }})</option>
                          }
                        } @else {
                          <option value="Banco de Crédito del Perú">Banco de Crédito del Perú</option>
                          <option value="BBVA Perú">BBVA Perú</option>
                          <option value="Interbank">Interbank</option>
                          <option value="Scotiabank Perú">Scotiabank Perú</option>
                          <option value="Banco de la Nación">Banco de la Nación</option>
                        }
                      </select>
                      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                      </div>
                    </div>
                  } @else {
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold flex items-center gap-2"
                    >
                      <div class="w-6 h-6 rounded-md bg-gray-100 dark:bg-[#21262D] flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-building-columns text-gray-500 dark:text-[#8B949E] text-[10px]"></i>
                      </div>
                      {{ cuentaAbono?.banco || '—' }}
                    </strong>
                  }
                </div>

                <!-- Datos de Abono: CCI vs OPE -->
                @if (cuentaEditMode) {
                  @if (editTipoAbonoId === 1) {
                    <!-- CCI -->
                    <div class="space-y-1.5 sm:col-span-1 lg:col-span-2">
                      <span
                        class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                      >
                        Código de Cuenta Interbancario (CCI) <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                      </span>
                      <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i class="fa-solid fa-money-check text-gray-400 text-xs"></i>
                        </div>
                        <input
                          type="text"
                          inputmode="numeric"
                          maxlength="20"
                          [(ngModel)]="editCci"
                          (input)="onCciInput($event)"
                          placeholder="20 dígitos"
                          class="w-full pl-9 border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary dark:focus:border-[#00A3E0] focus:ring-4 focus:ring-atu-primary/10 transition-all font-mono tracking-widest shadow-sm"
                        />
                      </div>
                      @if (editCci && editCci.length !== 20) {
                        <p class="mt-1.5 text-[11.5px] font-semibold text-red-600 dark:text-red-400">
                          El CCI debe contener exactamente 20 dígitos.
                        </p>
                      }
                    </div>
                  } @else {
                    <!-- OPE -->
                    <div class="space-y-1.5">
                      <span class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]">
                        DNI Beneficiario <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                      </span>
                      <input
                        type="text"
                        maxlength="8"
                        [(ngModel)]="editDniBeneficiario"
                        placeholder="8 dígitos"
                        class="w-full border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary font-mono shadow-sm"
                      />
                    </div>
                    <div class="space-y-1.5">
                      <span class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]">
                        Nombre Completo Beneficiario <span class="text-red-600 dark:text-red-500 ml-0.5">*</span>
                      </span>
                      <input
                        type="text"
                        [(ngModel)]="editNombreBeneficiario"
                        placeholder="Nombres y Apellidos completado"
                        class="w-full border-2 border-atu-border dark:border-[#30363D] rounded-xl bg-white dark:bg-[#0D1117] px-3 py-2.5 text-[14px] text-atu-text dark:text-[#E6EDF3] focus:outline-none focus:border-atu-primary shadow-sm"
                      />
                    </div>
                  }
                } @else {
                  <div class="space-y-1.5 sm:col-span-1 lg:col-span-2">
                    <span
                      class="text-atu-text-3 dark:text-[#6E7681] font-semibold uppercase tracking-wider block text-[10.5px]"
                    >
                      {{ cuentaBancariaReal?.tipoAbono === 'OPE' ? 'Beneficiario OPE' : 'Código de Cuenta Interbancario (CCI)' }}
                    </span>
                    <strong
                      class="text-[15px] text-atu-text dark:text-[#E6EDF3] font-semibold flex items-center gap-3 font-mono tracking-[0.1em]"
                    >
                      <i class="fa-solid" [ngClass]="cuentaBancariaReal?.tipoAbono === 'OPE' ? 'fa-user-check' : 'fa-money-check'" class="text-gray-400 dark:text-[#8B949E]"></i>
                      @if (cuentaBancariaReal?.tipoAbono === 'OPE') {
                        {{ cuentaBancariaReal?.nombreBeneficiario }} (DNI: {{ cuentaBancariaReal?.dniBeneficiario }})
                      } @else {
                        {{ cuentaAbono?.codigoCuentaInterbancario || '—' }}
                      }
                    </strong>
                  </div>
                }

              </div>

              <!-- Mensajes Informativos (Dependiendo del banco seleccionado) -->
              @if (
                bancoCuentaVisible === 'Banco de la Nación'
              ) {
                <div
                  class="mx-5 mb-5 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-xl p-4 transition-all"
                >
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      class="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <i class="fa-solid fa-triangle-exclamation text-xs"></i>
                    </div>
                    <span
                      class="text-[15px] font-extrabold text-red-700 dark:text-red-400"
                      >Atención: cuenta del Banco de la Nación</span
                    >
                  </div>
                  <p
                    class="m-0 pl-10 text-[14px] text-red-900/80 dark:text-red-300/80 leading-relaxed"
                  >
                    Si eliges una cuenta del <b>Banco de la Nación</b>, tu
                    subsidio <b class="text-red-700 dark:text-red-400">pierde la protección de intangibilidad</b> y
                    podría ser objeto de <b>retención o embargo</b>. En
                    cualquier otro banco el monto está protegido. Te
                    recomendamos usar una cuenta de otro banco.
                  </p>
                </div>
              } @else if (
                bancoCuentaVisible && bancoCuentaVisible !== 'Banco de la Nación'
              ) {
                <div
                  class="mx-5 mb-5 bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 rounded-r-xl p-4 transition-all"
                >
                  <div class="flex items-center gap-3 mb-1.5">
                    <div
                      class="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <i class="fa-solid fa-shield-check text-xs"></i>
                    </div>
                    <span
                      class="text-[15px] font-extrabold text-green-700 dark:text-green-400"
                      >Cuenta protegida por intangibilidad</span
                    >
                  </div>
                  <p
                    class="m-0 pl-10 text-[13.5px] text-green-900/80 dark:text-green-300/80 leading-relaxed"
                  >
                    Al no ser del Banco de la Nación, tu subsidio no puede ser
                    retenido ni embargado.
                  </p>
                </div>
              }

              @if (cuentaAlert) {
                <div
                  class="mx-5 mb-5 flex items-center gap-2.5 p-3 rounded-[10px] text-[13px] font-semibold border"
                  [ngClass]="cuentaAlert.type === 'error'
                    ? 'bg-red-50 text-red-600 dark:bg-[rgba(239,68,68,0.1)] dark:text-red-400 border-red-100 dark:border-red-900/50'
                    : 'bg-green-50 text-green-600 dark:bg-[rgba(34,197,94,0.1)] dark:text-green-400 border-green-100 dark:border-green-900/50'"
                >
                  <i class="fa-solid" [ngClass]="cuentaAlert.type === 'error' ? 'fa-triangle-exclamation' : 'fa-check'"></i>
                  {{ cuentaAlert.message }}
                </div>
              }
            </div>
          </div>

          <!-- Edit Alert -->
          @if (editAlert) {
            <div
              class="flex items-center gap-2.5 p-3 rounded-[10px] text-[13px] font-[600]"
              [ngClass]="
                editAlert.type === 'error'
                  ? 'bg-red-50 text-red-600 dark:bg-[rgba(239,68,68,0.1)] dark:text-red-400 border border-red-100 dark:border-red-900/50'
                  : 'bg-green-50 text-green-600 dark:bg-[rgba(34,197,94,0.1)] dark:text-green-400 border border-green-100 dark:border-green-900/50'
              "
            >
              <i
                class="fa-solid"
                [ngClass]="
                  editAlert.type === 'error'
                    ? 'fa-circle-exclamation'
                    : 'fa-circle-check'
                "
              ></i>
              {{ editAlert.message }}
            </div>
          }
        </div>

        <!-- ── Right Column (1/3) ── -->
        <div class="space-y-6">
          <!-- Change Password Card -->
          <div
            class="bg-white dark:bg-[#161B22] border border-atu-border dark:border-[#30363D] rounded-2xl shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] p-4 sm:p-5 space-y-4"
          >
            <h3
              class="font-bold text-base text-atu-primary dark:text-[#00A3E0] flex items-center gap-2"
            >
              <i class="fa-solid fa-lock-open text-lg"></i>
              Cambiar Contraseña
            </h3>
            <p class="text-xs text-atu-text-3 dark:text-[#6E7681]">
              Actualice sus credenciales regularmente para mantener segura su
              cuenta.
            </p>

            @if (perfilAlert) {
              <div
                class="p-3 rounded-[10px] text-[13px] font-[600] flex items-center gap-2"
                [ngClass]="
                  perfilAlert.type === 'error'
                    ? 'bg-red-50 text-red-600 dark:bg-[rgba(239,68,68,0.1)] dark:text-red-400 border border-red-100 dark:border-red-900/50'
                    : 'bg-green-50 text-green-600 dark:bg-[rgba(34,197,94,0.1)] dark:text-green-400 border border-green-100 dark:border-green-900/50'
                "
              >
                <i
                  class="fa-solid"
                  [ngClass]="
                    perfilAlert.type === 'error'
                      ? 'fa-circle-exclamation'
                      : 'fa-circle-check'
                  "
                ></i>
                {{ perfilAlert.message }}
              </div>
            }

            <div class="space-y-3">
              <div class="flex flex-col gap-1">
                <label
                  class="text-xs font-semibold text-atu-text-2 dark:text-[#8B949E]"
                  >Contraseña actual *</label
                >
                <input
                  type="password"
                  [(ngModel)]="passActual"
                  placeholder="••••••••"
                  class="w-full border border-atu-border dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117] px-3 py-2.5 text-sm text-atu-text dark:text-[#E6EDF3] focus:border-atu-primary dark:focus:border-atu-primary-mid focus:ring-1 focus:ring-atu-primary dark:focus:ring-atu-primary-mid outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="text-xs font-semibold text-atu-text-2 dark:text-[#8B949E]"
                  >Nueva contraseña *</label
                >
                <input
                  type="password"
                  [(ngModel)]="passNueva"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full border border-atu-border dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117] px-3 py-2.5 text-sm text-atu-text dark:text-[#E6EDF3] focus:border-atu-primary dark:focus:border-atu-primary-mid focus:ring-1 focus:ring-atu-primary dark:focus:ring-atu-primary-mid outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label
                  class="text-xs font-semibold text-atu-text-2 dark:text-[#8B949E]"
                  >Confirmar nueva contraseña *</label
                >
                <input
                  type="password"
                  [(ngModel)]="passConfirmar"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full border border-atu-border dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117] px-3 py-2.5 text-sm text-atu-text dark:text-[#E6EDF3] focus:border-atu-primary dark:focus:border-atu-primary-mid focus:ring-1 focus:ring-atu-primary dark:focus:ring-atu-primary-mid outline-none transition-colors"
                />
              </div>
              <button
                (click)="onSavePassword()"
                [disabled]="isSavingPassword"
                class="atu-btn-primary w-full justify-center mt-2"
              >
                @if (isSavingPassword) {
                  <i class="fa-solid fa-spinner fa-spin text-sm"></i>
                  <span>Guardando...</span>
                } @else {
                  <i class="fa-solid fa-floppy-disk text-sm"></i>
                  <span>Guardar cambios</span>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class PerfilInfoComponent implements OnInit {
  usuario: Usuario | null = null;
  perfilTrans: PerfilTransportista | null = null;
  cuentaAbono: CuentaAbono | null = null;
  isLoadingCuentaAbono = false;
  cuentaAbonoLoaded = false;
  cuentaEditMode = false;
  isSavingCuenta = false;
  cuentaAlert: { message: string; type: 'error' | 'success' } | null = null;

  // Password change
  passActual = '';
  passNueva = '';
  passConfirmar = '';
  perfilAlert: { message: string; type: 'error' | 'success' } | null = null;

  // Edit profile
  editMode = false;
  isSaving = false;
  isSavingPassword = false;
  editEmail = '';
  editTelefono = '';
  editCargo = '';
  editBanco = '';
  editCci = '';
  editAlert: { message: string; type: 'error' | 'success' } | null = null;

  // Edit profile contact (New API)
  editContactoNombre = '';
  editContactoTipoDoc = '';
  editContactoNumDoc = '';
  editContactoTelefono = '';

  bancosList: BancoItemResponse[] = [];
  cuentaBancariaReal: CuentaBancariaTransportistaResponseData | null = null;
  editTipoAbonoId = 1; // 1 = CCI, 2 = OPE
  editDniBeneficiario = '';
  editNombreBeneficiario = '';

  private readonly authService = inject(AuthService);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly apiUsuarioService = inject(ApiUsuarioService);
  private readonly apiComprobanteService = inject(ApiComprobanteService);

  ngOnInit(): void {
    this.usuario = this.resolveSession();
    this.cargarPerfilComprobante();
    this.cargarBancos();
    this.cargarCuentaAbono();
  }

  cargarBancos(): void {
    this.apiComprobanteService.obtenerBancos().subscribe({
      next: (res) => {
        if (res.data?.lista) {
          this.bancosList = res.data.lista;
        }
      },
      error: (err) => console.error('Error al cargar lista de bancos:', err),
    });
  }

  private resolveSession(): Usuario | null {
    const local = this.authService.getSession();
    if (local) return local;
    return this.apiAuthService.getUserFromSession();
  }

  cargarPerfilComprobante(): void {
    const ruc = this.usuario?.numDocumento || '20512345678';
    this.apiComprobanteService.obtenerPerfil(ruc).subscribe({
      next: (res) => {
        if (res.data?.lista) {
          this.perfilTrans = res.data.lista;
        }
      },
      error: (err) => {
        console.error('Error al cargar perfil del transportista:', err);
      }
    });
  }

  cargarCuentaAbono(): void {
    const ruc = this.usuario?.numDocumento || '20512345678';
    this.isLoadingCuentaAbono = true;

    // 1. Intentar cargar con la API real de transportista si hay ID numérico o fallback
    const transportistaId = 1; // ID técnico por defecto o asignado al usuario
    this.apiComprobanteService.obtenerCuentaBancariaTransportista(transportistaId).subscribe({
      next: (res) => {
        if (res.data?.lista) {
          this.cuentaBancariaReal = res.data.lista;
          const bancoMatch = this.bancosList.find(b => b.uuidBanco === res.data.lista?.uuidBanco);
          this.cuentaAbono = {
            banco: bancoMatch?.nombre || res.data.lista.uuidBanco || 'Banco de Crédito del Perú',
            codigoCuentaInterbancario: res.data.lista.cci || '',
          };
        } else {
          this.cuentaAbono = null;
        }
        this.isLoadingCuentaAbono = false;
        this.cuentaAbonoLoaded = true;
      },
      error: () => {
        // Fallback al endpoint legado si falla
        this.apiComprobanteService.obtenerCuentaAbono(ruc).subscribe({
          next: (res) => {
            this.cuentaAbono = res.data.lista;
            this.isLoadingCuentaAbono = false;
            this.cuentaAbonoLoaded = true;

            if (this.usuario) {
              this.usuario.banco = this.cuentaAbono?.banco ?? '';
              this.usuario.cci = this.cuentaAbono?.codigoCuentaInterbancario ?? '';
            }
          },
          error: (err) => {
            this.isLoadingCuentaAbono = false;
            this.cuentaAbonoLoaded = true;
            this.cuentaAbono = null;
            console.error('Error al cargar la cuenta de abono:', err);
          },
        });
      }
    });
  }

  get avatarLetter(): string {
    return this.usuario?.nombre?.charAt(0).toUpperCase() ?? 'U';
  }

  get tipoLabel(): string {
    if (!this.usuario?.tipoEntidad) return '—';
    if (this.usuario.tipoEntidad === 'regional') return 'GR';
    if (this.usuario.tipoEntidad === 'municipal') return 'MP';
    return this.usuario.tipoEntidad;
  }

  iniciarEdicion(): void {
    this.editEmail = this.usuario?.email ?? '';
    this.editTelefono = this.usuario?.telefono ?? '';
    this.editCargo = this.usuario?.cargo ?? '';

    // Bind contact edit fields
    this.editContactoNombre = this.perfilTrans?.contacto?.nombresApellidos ?? '';
    this.editContactoTipoDoc = this.perfilTrans?.contacto?.tipoDocumento ?? 'DNI';
    this.editContactoNumDoc = this.perfilTrans?.contacto?.numeroDocumento ?? '';
    this.editContactoTelefono = this.perfilTrans?.contacto?.telefono ?? '';

    this.editAlert = null;
    this.editMode = true;
  }

  cancelarEdicion(): void {
    this.editMode = false;
    this.editAlert = null;
  }

  onCciInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = input.value.replace(/\D/g, '').slice(0, 20);
    input.value = numericValue;
    this.editCci = numericValue;
  }

  get bancoCuentaVisible(): string {
    return this.cuentaEditMode ? this.editBanco : (this.cuentaAbono?.banco ?? '');
  }

  iniciarEdicionCuenta(): void {
    this.editBanco = this.cuentaAbono?.banco ?? '';
    this.editCci = this.cuentaAbono?.codigoCuentaInterbancario ?? '';
    this.editTipoAbonoId = this.cuentaBancariaReal?.tipoAbono === 'OPE' ? 2 : 1;
    this.editDniBeneficiario = this.cuentaBancariaReal?.dniBeneficiario ?? '';
    this.editNombreBeneficiario = this.cuentaBancariaReal?.nombreBeneficiario ?? '';
    this.cuentaAlert = null;
    this.cuentaEditMode = true;
  }

  cancelarEdicionCuenta(): void {
    if (this.isSavingCuenta) return;
    this.cuentaEditMode = false;
    this.editBanco = '';
    this.editCci = '';
    this.editDniBeneficiario = '';
    this.editNombreBeneficiario = '';
    this.cuentaAlert = null;
  }

  guardarEdicionCuenta(): void {
    this.editBanco = String(this.editBanco ?? '').trim();
    this.editCci = String(this.editCci ?? '').trim();
    this.editDniBeneficiario = String(this.editDniBeneficiario ?? '').trim();
    this.editNombreBeneficiario = String(this.editNombreBeneficiario ?? '').trim();
    this.cuentaAlert = null;

    if (!this.editBanco) {
      this.cuentaAlert = {
        message: 'Seleccione el banco de la cuenta de abono.',
        type: 'error',
      };
      return;
    }

    if (this.editTipoAbonoId === 1) {
      if (!/^\d{20}$/.test(this.editCci)) {
        this.cuentaAlert = {
          message: 'El CCI debe contener exactamente 20 dígitos.',
          type: 'error',
        };
        return;
      }
    } else {
      if (!/^\d{8}$/.test(this.editDniBeneficiario)) {
        this.cuentaAlert = {
          message: 'El DNI del beneficiario debe contener 8 dígitos.',
          type: 'error',
        };
        return;
      }
      if (!this.editNombreBeneficiario) {
        this.cuentaAlert = {
          message: 'Ingrese el nombre completo del beneficiario.',
          type: 'error',
        };
        return;
      }
    }

    const transportistaId = 1;
    const bancoSeleccionado = this.bancosList.find(b => b.nombre === this.editBanco || b.uuidBanco === this.editBanco);
    const bancoIdTecnico = bancoSeleccionado ? 1 : 1; // Default técnico 1

    this.isSavingCuenta = true;
    const payload = {
      bancoId: bancoIdTecnico,
      tipoAbonoId: this.editTipoAbonoId,
      cci: this.editTipoAbonoId === 1 ? this.editCci : null,
      dniBeneficiario: this.editTipoAbonoId === 2 ? this.editDniBeneficiario : null,
      nombreBeneficiario: this.editTipoAbonoId === 2 ? this.editNombreBeneficiario : null,
    };

    const action$ = this.cuentaBancariaReal
      ? this.apiComprobanteService.actualizarCuentaBancariaTransportista(transportistaId, payload)
      : this.apiComprobanteService.registrarCuentaBancariaTransportista(transportistaId, payload);

    action$.subscribe({
      next: (response) => {
        this.isSavingCuenta = false;
        this.cuentaBancariaReal = response.data.lista;
        this.cuentaAbono = {
          banco: this.editBanco,
          codigoCuentaInterbancario: this.editTipoAbonoId === 1 ? this.editCci : 'OPE - Orden de Pago',
        };
        this.cuentaAbonoLoaded = true;
        this.cuentaEditMode = false;

        this.cuentaAlert = {
          message: response.data.mensaje || 'Cuenta bancaria guardada correctamente.',
          type: 'success',
        };
        setTimeout(() => (this.cuentaAlert = null), 4000);
      },
      error: (error) => {
        this.isSavingCuenta = false;
        this.cuentaAlert = {
          message:
            error?.error?.data?.mensaje ||
            error?.error?.mensaje ||
            error?.message ||
            'No fue posible guardar la cuenta de abono.',
          type: 'error',
        };
      },
    });
  }


  guardarEdicion(): void {
    this.editAlert = null;
    if (!this.usuario) return;

    // Clean inputs
    this.editEmail = String(this.editEmail ?? '').trim();
    this.editTelefono = String(this.editTelefono ?? '').trim();
    this.editCargo = String(this.editCargo ?? '').trim();
    this.editContactoNombre = String(this.editContactoNombre ?? '').trim();
    this.editContactoTipoDoc = String(this.editContactoTipoDoc ?? '').trim();
    this.editContactoNumDoc = String(this.editContactoNumDoc ?? '').trim();
    this.editContactoTelefono = String(this.editContactoTelefono ?? '').trim();

    // Validation for new contact edit fields
    if (this.editMode) {
      if (!this.editContactoNombre) {
        this.editAlert = { message: 'El nombre del contacto es obligatorio.', type: 'error' };
        return;
      }
      if (!this.editContactoNumDoc) {
        this.editAlert = { message: 'El número de documento del contacto es obligatorio.', type: 'error' };
        return;
      }
      if (!this.editContactoTelefono) {
        this.editAlert = { message: 'El teléfono del contacto es obligatorio.', type: 'error' };
        return;
      }
    }

    if (this.perfilTrans) {
      this.isSaving = true;
      const ruc = this.perfilTrans.datosEmpresa.ruc;

      this.apiComprobanteService.actualizarContacto(ruc, {
          nombresApellidos: this.editContactoNombre,
          tipoDocumento: this.editContactoTipoDoc,
          numeroDocumento: this.editContactoNumDoc,
          telefono: this.editContactoTelefono,
        }).subscribe({
        next: (contacto) => {
          this.isSaving = false;
          if (this.perfilTrans) {
            this.perfilTrans.contacto = contacto.data.lista;
          }

          this.editMode = false;
          this.editAlert = {
            message: contacto.data.mensaje || 'Datos de contacto actualizados correctamente.',
            type: 'success',
          };
          setTimeout(() => (this.editAlert = null), 4000);
        },
        error: (err) => {
          this.isSaving = false;
          this.editAlert = {
            message:
              err?.error?.data?.mensaje ||
              err?.error?.mensaje ||
              err?.message ||
              'Error al guardar los datos de contacto.',
            type: 'error',
          };
        }
      });
      return;
    }

    // Fallback old flow... (if perfilTrans is not loaded, just save using user service)
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.editEmail || !emailRegex.test(this.editEmail)) {
      this.editAlert = {
        message: 'Por favor, ingrese un correo electrónico válido.',
        type: 'error',
      };
      return;
    }

    // Validate phone format (exactly 9 digits)
    const phoneRegex = /^\d{9}$/;
    if (!this.editTelefono || !phoneRegex.test(this.editTelefono)) {
      this.editAlert = {
        message: 'Por favor, ingrese un número de teléfono válido (9 dígitos).',
        type: 'error',
      };
      return;
    }

    const apiSession = this.apiAuthService.getSession();
    if (apiSession) {
      this.isSaving = true;
      this.apiUsuarioService
        .actualizarCorreoTelefono({
          usuarioUuid: this.usuario.usuarioUuid || '00000000-0000-0000-0000-000000000000',
          correo: this.editEmail,
          telefono: this.editTelefono,
          cargo: this.editCargo,
        })
        .subscribe({
          next: (res) => {
            this.isSaving = false;
            if (this.usuario) {
              this.usuario.email = this.editEmail;
              this.usuario.telefono = this.editTelefono;
              this.usuario.cargo = this.editCargo;
            }
            this.apiAuthService.updateSessionUser(this.editEmail, this.editTelefono, this.editCargo);
            this.editMode = false;
            this.editAlert = { message: res.mensaje || 'Perfil actualizado correctamente.', type: 'success' };
            setTimeout(() => (this.editAlert = null), 4000);
          },
          error: (err) => {
            this.isSaving = false;
            this.editAlert = { message: err?.error?.descripcion || 'Error al guardar.', type: 'error' };
          },
        });
    } else {
      const res = this.authService.updateProfile(this.usuario.email, {
        email: this.editEmail,
        telefono: this.editTelefono,
      });
      if (res.success) {
        this.usuario = this.resolveSession();
        this.editMode = false;
        this.editAlert = { message: 'Perfil actualizado correctamente.', type: 'success' };
        setTimeout(() => (this.editAlert = null), 4000);
      } else {
        this.editAlert = { message: res.error ?? 'Error al guardar.', type: 'error' };
      }
    }
  }

  onSavePassword(): void {
    this.perfilAlert = null;
    if (!this.usuario) return;

    if (!this.passActual || !this.passNueva || !this.passConfirmar) {
      this.perfilAlert = {
        message: 'Todos los campos son obligatorios.',
        type: 'error',
      };
      return;
    }
    if (this.passNueva !== this.passConfirmar) {
      this.perfilAlert = {
        message: 'Las nuevas contraseñas no coinciden.',
        type: 'error',
      };
      return;
    }

    const apiSession = this.apiAuthService.getSession();
    if (apiSession) {
      this.isSavingPassword = true;
      this.apiUsuarioService
        .actualizarContrasena({
          passwordActual: this.passActual,
          passwordNueva: this.passNueva,
        })
        .subscribe({
          next: (res) => {
            this.isSavingPassword = false;
            const msg =
              res.mensaje ||
              res.message ||
              res.data?.mensaje ||
              'Contraseña actualizada correctamente';
            this.perfilAlert = {
              message: msg,
              type: 'success',
            };
            this.passActual = '';
            this.passNueva = '';
            this.passConfirmar = '';
          },
          error: (err) => {
            this.isSavingPassword = false;
            this.perfilAlert = {
              message:
                err?.error?.descripcion ||
                err?.error?.data?.mensaje ||
                err?.error?.message ||
                err?.message ||
                'Error al actualizar la contraseña.',
              type: 'error',
            };
          },
        });
    } else {
      const res = this.authService.changePassword(
        this.usuario.email,
        this.passActual,
        this.passNueva,
      );
      if (res.success) {
        this.perfilAlert = {
          message: 'Contraseña actualizada con éxito.',
          type: 'success',
        };
        this.usuario = this.resolveSession();
        this.passActual = '';
        this.passNueva = '';
        this.passConfirmar = '';
      } else {
        this.perfilAlert = {
          message: res.error || 'Error al cambiar la contraseña.',
          type: 'error',
        };
      }
    }
  }
}
