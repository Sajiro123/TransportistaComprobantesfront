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
  validacionOpen = true;
  cargaOpen = true;
  envioOpen = true;

  toggleValidacion() {
    this.validacionOpen = !this.validacionOpen;
  }

  toggleCarga() {
    this.cargaOpen = !this.cargaOpen;
  }

  toggleEnvio() {
    this.envioOpen = !this.envioOpen;
  }

  onNavigate() {
    this.navigate.emit();
  }
}
