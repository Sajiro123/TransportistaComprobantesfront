import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-sidebar-footer',
    templateUrl: './sidebar-footer.component.html',
    styleUrl: './sidebar-footer.component.scss',
    imports: [RouterLink, RouterLinkActive]
})
export class SidebarFooterComponent {
  @Input() collapsed = false;
  @Output() abrirPerfil = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  onAbrirPerfil() {
    this.abrirPerfil.emit();
  }

  onLogout() {
    this.logout.emit();
  }
}
