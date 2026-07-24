import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarNavComponent } from '../sidebar-nav/sidebar-nav.component';
import { SidebarFooterComponent } from '../sidebar-footer/sidebar-footer.component';
import { ApiAuthService } from '@core/services/api-auth.service';
import { AuthService } from '@core/services/auth.service';
import { SessionService } from '@core/services/session.service';
import { ThemeService } from '@core/services/theme.service';
import { CommonModule } from '@angular/common';
import { Usuario } from '@core/models/models';

@Component({
    selector: 'app-shell',
    imports: [
        CommonModule,
        RouterOutlet,
        SidebarNavComponent,
        SidebarFooterComponent
    ],
    templateUrl: './shell.component.html',
    styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  sidebarOpen = true;
  showUserMenu = false;
  usuario: Usuario | null = null;

  readonly themeService = inject(ThemeService);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  get themeIcon(): string {
    return this.isDark ? '☀️' : '🌙';
  }

  get themeLabel(): string {
    return this.isDark ? 'Modo claro' : 'Modo oscuro';
  }

  get nombreUsuario(): string {
    return this.usuario?.nombre?.split(' ')[0] ?? 'Usuario';
  }

  get avatarLetter(): string {
    return this.nombreUsuario.charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    this.sidebarOpen = window.innerWidth > 900;
    this.usuario = this.apiAuthService.getUserFromSession()
      ?? this.authService.getSession();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    if (window.innerWidth <= 900) {
      this.sidebarOpen = false;
    }
  }

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  abrirPerfil(): void {
    this.router.navigate(['/perfil']);
    this.closeSidebar();
  }

  onLogout(): void {
    this.sessionService.stopSession();
    this.apiAuthService.logout().subscribe({
      next: () => {
        this.apiAuthService.clearSession();
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.apiAuthService.clearSession();
        this.authService.logout();
        this.router.navigate(['/login']);
      },
    });
  }

  logout(): void {
    this.onLogout();
  }
}
