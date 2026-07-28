import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiVerificacionService } from '@core/services/api-verificacion.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.scss'
})
export class SidebarNavComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() navigate = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();
  validacionOpen = true;
  cargaOpen = true;
  envioOpen = true;

  semaforoAprobado = true;
  private sub?: Subscription;
  private apiVerificacion = inject(ApiVerificacionService);
  private apiAuth = inject(ApiAuthService);

  ngOnInit() {
    this.sub = this.apiVerificacion.isSemaforoAprobado$.subscribe(aprobado => {
      this.semaforoAprobado = aprobado;
      if (!aprobado) {
        this.cargaOpen = false;
        this.envioOpen = false;
      }
    });

    const user = this.apiAuth.getUserFromSession();
    if (user?.ruc) {
      this.apiVerificacion.obtenerSemaforo(user.ruc).subscribe();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  toggleValidacion() {
    if (this.collapsed) { this.expand.emit(); return; }
    this.validacionOpen = !this.validacionOpen;
  }

  toggleCarga() {
    if (!this.semaforoAprobado) return;
    if (this.collapsed) { this.expand.emit(); return; }
    this.cargaOpen = !this.cargaOpen;
  }

  toggleEnvio() {
    if (!this.semaforoAprobado) return;
    if (this.collapsed) { this.expand.emit(); return; }
    this.envioOpen = !this.envioOpen;
  }

  onNavigate() {
    this.navigate.emit();
  }
}

