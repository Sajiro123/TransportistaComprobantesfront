import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Login ──────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },

  // ── Shell (layout con sidebar) ─────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      // Perfil
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/perfil/perfil-info.component').then(m => m.PerfilInfoComponent),
      },
      // Validación
      {
        path: 'validacion/verificacion',
        loadComponent: () =>
          import('./pages/registro/verificacion/verificacion.component').then(m => m.VerificacionComponent),
      },
      {
        path: 'validacion/vehiculos',
        loadComponent: () =>
          import('./pages/registro/verificacion/vehiculo-carga/vehiculo-carga.component').then(m => m.VehiculoCargaComponent),
      },
      { path: 'registro/verificacion', redirectTo: 'validacion/verificacion', pathMatch: 'full' },
      // Carga y cálculo
      {
        path: 'carga-calculo/comprobantes',
        loadComponent: () =>
          import('./pages/carga-calculo/comprobantes/comprobantes.component').then(m => m.ComprobantesComponent),
      },
      {
        path: 'carga-calculo/notas-credito',
        loadComponent: () =>
          import('./pages/carga-calculo/notas-credito/notas-credito.component').then(m => m.NotasCreditoComponent),
      },
      {
        path: 'carga-calculo/resumen',
        loadComponent: () =>
          import('./pages/carga-calculo/resumen/resumen.component').then(m => m.ResumenComponent),
      },
      // Envío
      {
        path: 'envio/declaracion-jurada',
        loadComponent: () =>
          import('./pages/envio/declaracion-jurada/declaracion-jurada.component').then(m => m.DeclaracionJuradaComponent),
      },
      // Redirect vacío → perfil
      { path: '', redirectTo: 'perfil', pathMatch: 'full' },
    ],
  },

  // ── Wildcard ───────────────────────────────────────────
  { path: '**', redirectTo: 'login' },
];
