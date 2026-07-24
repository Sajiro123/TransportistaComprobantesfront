import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-sidebar-nav',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar-nav.component.html',
    styleUrl: './sidebar-nav.component.scss'
})
export class SidebarNavComponent {
  @Input() collapsed = false;
  @Output() navigate = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();
  validacionOpen = true;
  cargaOpen = true;
  envioOpen = true;

  toggleValidacion() {
    if (this.collapsed) { this.expand.emit(); return; }
    this.validacionOpen = !this.validacionOpen;
  }

  toggleCarga() {
    if (this.collapsed) { this.expand.emit(); return; }
    this.cargaOpen = !this.cargaOpen;
  }

  toggleEnvio() {
    if (this.collapsed) { this.expand.emit(); return; }
    this.envioOpen = !this.envioOpen;
  }

  onNavigate() {
    this.navigate.emit();
  }
}
