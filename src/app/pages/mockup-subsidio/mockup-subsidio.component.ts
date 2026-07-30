import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-mockup-subsidio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mockup-subsidio.component.html',
  styleUrls: ['./mockup-subsidio.component.scss']
})
export class MockupSubsidioComponent implements OnInit {
  sanitizer = inject(DomSanitizer);
  safeUrl!: SafeResourceUrl;

  ngOnInit() {
    // La ruta public/mockup se expone desde la raíz en Angular 17+
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/mockup/Subsidio%20Combustible%20ATU.dc.html');
  }
}

