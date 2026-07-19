import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AuthService,
  REGIONALES,
  MUNICIPALES,
} from '../../core/services/auth.service';
import { ApiAuthService } from '../../core/services/api-auth.service';
import { SessionService } from '../../core/services/session.service';
import { ApiErrorResponse, EnviarOtpRegistroRequest } from '../../core/models/api.models';
import { ThemeService } from '../../core/services/theme.service';
import Swal from 'sweetalert2';
import { isValidRuc, isValidEmail, isValidPhone } from '../../core/utils/validators';

// Declarar el objeto grecaptcha global (inyectado por el script de Google)
declare const grecaptcha: any;

type FormView = 'login' | 'registro' | 'recuperacion';

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  // ── Theme State ───────────────────────────────────────
  readonly themeService = inject(ThemeService);
  get isDark(): boolean {
    return this.themeService.isDark();
  }
  toggleTheme(): void {
    this.themeService.toggle();
  }
  get themeLabel(): string {
    return this.themeService.isDark() ? 'Modo claro' : 'Modo oscuro';
  }
  get themeIcon(): string {
    return this.themeService.isDark() ? '☀️' : '🌙';
  }

  // ── View state ────────────────────────────────────────
  activeForm: FormView = 'login';
  showPassword = false;
  showPassword2 = false;
  isLoading = false;
  showWelcomeModal = true;

  closeWelcomeModal(): void {
    this.showWelcomeModal = false;
  }

  // ── reCAPTCHA ─────────────────────────────────────────
  recaptchaSiteKey =
    (window as any).__env?.RECAPTCHA_SITE_KEY ||
    '6Ldu6FUrAAAAADnOURKYc9E_uUbGBRC35_ntvznt';

  // ── Slider state ──────────────────────────────────────
  sliderImages = ['images/CARGAPESADA1.jpeg', 'images/CARGAPESADA2.jpeg'];
  currentSlide = 0;
  private sliderInterval: any;

  // ── Alert ─────────────────────────────────────────────
  alert: { message: string; type: 'error' | 'success' | 'info' } | null = null;

  // ── Login form ────────────────────────────────────────
  loginEmail = '';
  loginPassword = '';
  loginDocumentType: 'RUC' | 'DNI' = 'RUC';
  loginDocumentTouched = false;

  get loginDocumentLabel(): string {
    return `Número de ${this.loginDocumentType}`;
  }

  get loginDocumentPlaceholder(): string {
    return this.loginDocumentType === 'RUC'
      ? 'Ingrese su número de RUC'
      : 'Ingrese su número de DNI';
  }

  get loginDocumentMaxLength(): number {
    return this.loginDocumentType === 'RUC' ? 11 : 8;
  }

  get loginDocumentError(): string {
    if (!this.loginDocumentTouched) return '';
    if (!this.loginEmail) return `Ingrese su número de ${this.loginDocumentType}.`;

    if (this.loginDocumentType === 'RUC') {
      return isValidRuc(this.loginEmail)
        ? ''
        : 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.';
    }

    return /^\d{8}$/.test(this.loginEmail)
      ? ''
      : 'El DNI debe tener exactamente 8 dígitos.';
  }

  selectLoginDocumentType(type: 'RUC' | 'DNI'): void {
    if (this.loginDocumentType === type) return;
    this.loginDocumentType = type;
    this.loginEmail = '';
    this.loginDocumentTouched = false;
    this.clearAlert();
  }

  onLoginDocumentInput(): void {
    this.loginEmail = this.loginEmail
      .replace(/\D/g, '')
      .slice(0, this.loginDocumentMaxLength);
    this.loginDocumentTouched = true;
  }

  // ── Registration flow (conectado al backend real) ──
  registrationRuc = '';
  registrationRucTouched = false;
  registrationValidating = false;
  registrationRucValidated = false;
  registrationCompanyName = '';
  registrationRazonSocial = '';
  registrationContactName = '';
  registrationEmail = '';
  registrationPhone = '';
  registrationPassword = '';
  registrationSubmitted = false;
  registrationStage: 'form' | 'confirmation' | 'success' = 'form';
  registrationCode = '';
  registrationCodeError = '';
  registrationCodeResent = false;
  registrationSendingOtp = false;
  registrationVerifying = false;
  registrationResendCooldown = 0;
  private registrationCooldownInterval: ReturnType<typeof setInterval> | null = null;
  private registrationValidationTimeout: ReturnType<typeof setTimeout> | null = null;

  get registrationRucError(): string {
    if (!this.registrationRucTouched) return '';
    if (!this.registrationRuc) return 'Ingrese el RUC del transportista.';
    return isValidRuc(this.registrationRuc)
      ? ''
      : 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.';
  }

  get registrationContactNameError(): string {
    return this.registrationSubmitted && !this.registrationContactName.trim()
      ? 'Ingrese los nombres y apellidos de la persona de contacto.'
      : '';
  }

  get registrationEmailError(): string {
    if (!this.registrationSubmitted) return '';
    if (!this.registrationEmail.trim()) return 'Ingrese el correo electrónico.';
    return isValidEmail(this.registrationEmail) ? '' : 'Ingrese un correo electrónico válido.';
  }

  get registrationPhoneError(): string {
    if (!this.registrationSubmitted) return '';
    if (!this.registrationPhone) return 'Ingrese el teléfono de contacto.';
    return isValidPhone(this.registrationPhone)
      ? ''
      : 'Ingrese un celular peruano de 9 dígitos que comience con 9.';
  }

  private readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

  get registrationPasswordError(): string {
    if (!this.registrationSubmitted) return '';
    if (!this.registrationPassword) return 'Ingrese una clave.';
    return this.PASSWORD_REGEX.test(this.registrationPassword)
      ? ''
      : 'Mínimo 8 caracteres: 1 mayúscula, 1 minúscula, 1 dígito y 1 carácter especial.';
  }

  onRegistrationRucInput(): void {
    this.registrationRuc = this.registrationRuc.replace(/\D/g, '').slice(0, 11);
    this.registrationRucTouched = true;
    this.clearAlert();
  }

  validateRegistrationRuc(): void {
    this.clearAlert();
    this.registrationRucTouched = true;
    if (this.registrationRucError || this.registrationValidating) return;

    this.registrationValidating = true;

    const doValidate = (recaptchaToken?: string) => {
      this.apiAuthService.validarRuc(this.registrationRuc, recaptchaToken).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.registrationValidating = false;
            if (res.elegible) {
              this.registrationRucValidated = true;
              this.registrationCompanyName = res.razonSocial;
              this.registrationRazonSocial = res.razonSocial;
            } else {
              this.showAlert(res.mensaje || 'El RUC no es elegible.', 'error');
            }
          });
        },
        error: (err: ApiErrorResponse) => {
          this.ngZone.run(() => {
            this.registrationValidating = false;
            this.showAlert(err?.descripcion || err?.message || 'Error al validar el RUC.', 'error');
          });
        },
      });
    };

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha.execute(this.recaptchaSiteKey, { action: 'register' })
          .then((token: string) => doValidate(token))
          .catch(() => doValidate());
      });
    } else {
      doValidate();
    }
  }

  changeRegistrationRuc(): void {
    if (this.registrationValidationTimeout) {
      clearTimeout(this.registrationValidationTimeout);
      this.registrationValidationTimeout = null;
    }
    this.stopResendCooldown();
    this.registrationValidating = false;
    this.registrationRucValidated = false;
    this.registrationRucTouched = false;
    this.registrationSubmitted = false;
    this.registrationRuc = '';
    this.registrationCompanyName = '';
    this.registrationRazonSocial = '';
    this.registrationContactName = '';
    this.registrationEmail = '';
    this.registrationPhone = '';
    this.registrationPassword = '';
    this.registrationStage = 'form';
    this.registrationCode = '';
    this.registrationCodeError = '';
    this.registrationCodeResent = false;
    this.registrationSendingOtp = false;
    this.registrationVerifying = false;
    this.clearAlert();
  }

  onRegistrationPhoneInput(): void {
    this.registrationPhone = this.registrationPhone.replace(/\D/g, '').slice(0, 9);
  }

  submitDummyRegistration(): void {
    this.clearAlert();
    this.registrationSubmitted = true;
    if (
      this.registrationContactNameError ||
      this.registrationEmailError ||
      this.registrationPhoneError ||
      this.registrationPasswordError
    ) {
      this.showAlert('Complete correctamente los datos obligatorios.', 'error');
      return;
    }

    this.sendOtpToBackend();
  }

  private sendOtpToBackend(recaptchaToken?: string): void {
    if (this.registrationSendingOtp) return;
    this.registrationSendingOtp = true;

    const doSend = (token?: string) => {
      const payload: EnviarOtpRegistroRequest = {
        ruc: this.registrationRuc,
        personaContacto: this.registrationContactName.trim(),
        correo: this.registrationEmail.trim(),
        telefono: this.registrationPhone,
        clave: this.registrationPassword,
        razonSocial: this.registrationRazonSocial || undefined,
        recaptchaToken: token,
      };

      this.apiAuthService.enviarOtp(payload).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.registrationSendingOtp = false;
            this.registrationStage = 'confirmation';
            this.registrationCode = '';
            this.registrationCodeError = '';
            this.registrationCodeResent = false;
            this.startResendCooldown(60);
          });
        },
        error: (err: ApiErrorResponse) => {
          this.ngZone.run(() => {
            this.registrationSendingOtp = false;
            this.showAlert(err?.descripcion || err?.message || 'Error al enviar el código.', 'error');
          });
        },
      });
    };

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha.execute(this.recaptchaSiteKey, { action: 'register' })
          .then((token: string) => doSend(token))
          .catch(() => doSend());
      });
    } else {
      doSend(recaptchaToken);
    }
  }

  private startResendCooldown(seconds: number): void {
    this.stopResendCooldown();
    this.registrationResendCooldown = seconds;
    this.registrationCooldownInterval = setInterval(() => {
      this.registrationResendCooldown--;
      if (this.registrationResendCooldown <= 0) {
        this.stopResendCooldown();
      }
    }, 1000);
  }

  private stopResendCooldown(): void {
    if (this.registrationCooldownInterval) {
      clearInterval(this.registrationCooldownInterval);
      this.registrationCooldownInterval = null;
    }
    this.registrationResendCooldown = 0;
  }

  onRegistrationCodeInput(): void {
    this.registrationCode = this.registrationCode.replace(/\D/g, '').slice(0, 6);
    this.registrationCodeError = '';
  }

  verifyDummyRegistrationCode(): void {
    if (!this.registrationCode || this.registrationCode.length !== 6) {
      this.registrationCodeError = 'Ingresa el código de 6 dígitos.';
      return;
    }
    if (this.registrationVerifying) return;
    this.registrationVerifying = true;
    this.registrationCodeError = '';

    const doVerify = (token?: string) => {
      this.apiAuthService.verificarOtp(
        this.registrationEmail.trim(),
        this.registrationCode,
        token,
      ).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.registrationVerifying = false;
            this.registrationCodeError = '';
            this.registrationStage = 'success';
            this.stopResendCooldown();
          });
        },
        error: (err: ApiErrorResponse) => {
          this.ngZone.run(() => {
            this.registrationVerifying = false;
            this.registrationCodeError =
              err?.descripcion || err?.message || 'Código incorrecto. Revísalo e intenta de nuevo.';
          });
        },
      });
    };

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha.execute(this.recaptchaSiteKey, { action: 'register' })
          .then((token: string) => doVerify(token))
          .catch(() => doVerify());
      });
    } else {
      doVerify();
    }
  }

  resendDummyRegistrationCode(): void {
    if (this.registrationResendCooldown > 0 || this.registrationSendingOtp) return;
    this.registrationCode = '';
    this.registrationCodeError = '';
    this.registrationCodeResent = false;

    const doResend = (token?: string) => {
      this.registrationSendingOtp = true;
      const payload: EnviarOtpRegistroRequest = {
        ruc: this.registrationRuc,
        personaContacto: this.registrationContactName.trim(),
        correo: this.registrationEmail.trim(),
        telefono: this.registrationPhone,
        clave: this.registrationPassword,
        razonSocial: this.registrationRazonSocial || undefined,
        recaptchaToken: token,
      };

      this.apiAuthService.enviarOtp(payload).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.registrationSendingOtp = false;
            this.registrationCodeResent = true;
            this.startResendCooldown(60);
          });
        },
        error: (err: ApiErrorResponse) => {
          this.ngZone.run(() => {
            this.registrationSendingOtp = false;
            this.registrationCodeError =
              err?.descripcion || err?.message || 'No se pudo reenviar el código.';
          });
        },
      });
    };

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha.execute(this.recaptchaSiteKey, { action: 'register' })
          .then((token: string) => doResend(token))
          .catch(() => doResend());
      });
    } else {
      doResend();
    }
  }

  correctRegistrationData(): void {
    this.registrationStage = 'form';
    this.registrationCode = '';
    this.registrationCodeError = '';
    this.registrationCodeResent = false;
    this.stopResendCooldown();
    this.clearAlert();
  }

  goToLoginAfterRegistration(): void {
    const registeredRuc = this.registrationRuc;
    this.changeRegistrationRuc();
    this.showForm('login');
    this.loginDocumentType = 'RUC';
    this.loginEmail = registeredRuc;
    this.loginDocumentTouched = false;
  }

  // ── Register form ─────────────────────────────────────
  regEmail = '';
  regPassword = '';
  regPassword2 = '';
  regNombre = '';
  regTipoEntidad: 'regional' | 'municipal' = 'regional';
  regEntidad = '';
  regDocumentoCargo = '';
  regTipoUsuario: 'empresa' | 'municipalidad' = 'municipalidad';
  regEmpresaNombre = '';

  // ── Transportista Form Fields ─────────────────────────
  tpTipoPersona: 'Natural' | 'Jurídica' | '' = '';
  tpTipoDocumento: 'DNI' | 'RUC' | 'Pasaporte' | 'Carnet de Extranjería' | '' =
    '';
  tpNumDocumento = '';
  tpNombres = '';
  tpPrimerApellido = '';
  tpSegundoApellido = '';
  tpEmail = '';
  tpEmailVerificado = false;

  tpDepartamento = '';
  tpProvincia = '';
  tpDistrito = '';
  tpVia = '';
  tpDireccion = '';
  tpNumeroMzLt = '';
  tpReferencia = '';

  // ── Ubigeo Data ───────────────────────────────────────
  departamentosList = ['Lima', 'Arequipa', 'La Libertad'];

  onDepartamentoChange(): void {
    this.tpProvincia = '';
    this.tpDistrito = '';
  }

  onProvinciaChange(): void {
    this.tpDistrito = '';
  }

  validarEmail(): void {
    if (!this.tpEmail || this.errEmail) {
      Swal.fire({
        title: 'Formato Inválido',
        text: 'Por favor, ingrese un formato de correo electrónico válido.',
        icon: 'warning',
        confirmButtonColor: '#0059bb',
      });
      return;
    }
    this.tpEmailVerificado = true;
    Swal.fire({
      title: '¡Email Validado!',
      text: 'El correo electrónico ha sido verificado con éxito.',
      icon: 'success',
      timer: 1600,
      showConfirmButton: false,
    });
  }

  onEmailChange(): void {
    this.tpEmailVerificado = false;
  }

  // ── Validation Errors Getters ─────────────────────────
  get errTipoPersona(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpTipoPersona ? 'El tipo de persona es requerido.' : '';
  }

  get errTipoDocumento(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpTipoDocumento ? 'El tipo de documento es requerido.' : '';
  }

  get errNumDocumento(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (!this.tpNumDocumento) return 'El número de documento es requerido.';
    if (this.tpTipoDocumento === 'DNI') {
      return !/^\d{8}$/.test(this.tpNumDocumento)
        ? 'DNI inválido (debe tener 8 dígitos)'
        : '';
    }
    if (this.tpTipoDocumento === 'RUC') {
      return !isValidRuc(this.tpNumDocumento)
        ? 'RUC inválido (11 dígitos, debe iniciar con 10, 15, 17 o 20)'
        : '';
    }
    return '';
  }

  get errNombres(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (!this.tpNombres) return 'Nombres es requerido.';
    return !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(this.tpNombres)
      ? 'Solo debe aceptar letras y espacios.'
      : '';
  }

  get errPrimerApellido(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (!this.tpPrimerApellido) return 'El primer apellido es requerido.';
    return !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(this.tpPrimerApellido)
      ? 'Solo debe aceptar letras y espacios.'
      : '';
  }

  get errSegundoApellido(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (
      this.tpSegundoApellido &&
      !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(this.tpSegundoApellido)
    ) {
      return 'Solo debe aceptar letras y espacios.';
    }
    return '';
  }

  get errEmail(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (!this.tpEmail) return 'El email es requerido.';
    return !isValidEmail(this.tpEmail) ? 'Formato de email inválido.' : '';
  }

  get errDepartamento(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpDepartamento ? 'El departamento es requerido.' : '';
  }

  get errProvincia(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpProvincia ? 'La provincia es requerida.' : '';
  }

  get errDistrito(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpDistrito ? 'El distrito es requerido.' : '';
  }

  get errVia(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpVia ? 'La vía es requerida.' : '';
  }

  get errDireccion(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpDireccion ? 'La dirección es requerida.' : '';
  }

  get errNumeroMzLt(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    if (!this.tpNumeroMzLt) return 'El número/manzana/lote es requerido.';
    return !/^[a-zA-Z0-9\s.,-]+$/.test(this.tpNumeroMzLt)
      ? 'Debe ser alfanumérico.'
      : '';
  }

  get errReferencia(): string {
    if (this.regTipoUsuario !== 'empresa') return '';
    return !this.tpReferencia ? 'La referencia es requerida.' : '';
  }

  get isFormTransportistaValido(): boolean {
    return (
      !this.errTipoPersona &&
      !this.errTipoDocumento &&
      !this.errNumDocumento &&
      !this.errNombres &&
      !this.errPrimerApellido &&
      !this.errSegundoApellido &&
      !this.errEmail &&
      !this.errDepartamento &&
      !this.errProvincia &&
      !this.errDistrito &&
      !this.errVia &&
      !this.errDireccion &&
      !this.errNumeroMzLt &&
      !this.errReferencia &&
      this.tpEmailVerificado &&
      !!this.regPassword &&
      this.regPassword === this.regPassword2
    );
  }

  // ── Recovery form ─────────────────────────────────────
  recRuc = '';
  recRucTouched = false;
  recoveryStage: 'ruc' | 'code' | 'password' | 'success' = 'ruc';
  recoveryCode = '';
  recoveryCodeError = '';
  recoveryCodeResent = false;
  recoveryNewPassword = '';
  recoveryConfirmPassword = '';
  recoveryPasswordSubmitted = false;

  get recoveryRucError(): string {
    if (!this.recRucTouched) return '';
    if (!this.recRuc) return 'Ingrese el RUC del transportista.';
    return isValidRuc(this.recRuc)
      ? ''
      : 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.';
  }

  onRecoveryRucInput(): void {
    this.recRuc = this.recRuc.replace(/\D/g, '').slice(0, 11);
    this.recRucTouched = true;
    this.clearAlert();
  }

  openRecovery(): void {
    this.recoveryStage = 'ruc';
    this.recRuc = '';
    this.recRucTouched = false;
    this.recoveryCode = '';
    this.recoveryCodeError = '';
    this.recoveryCodeResent = false;
    this.recoveryNewPassword = '';
    this.recoveryConfirmPassword = '';
    this.recoveryPasswordSubmitted = false;
    this.showForm('recuperacion');
  }

  // ── Entity lists ──────────────────────────────────────
  entidadesFiltradas: string[] = [];

  private readonly authService = inject(AuthService);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  ngOnInit(): void {
    this.iniciarSlider();
    if (this.apiAuthService.isLoggedIn() || this.authService.isLoggedIn()) {
      this.router.navigate(['/perfil']);
      return;
    }
    this.actualizarEntidades();
    this._loadRecaptchaScript();
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
    if (this.registrationValidationTimeout) {
      clearTimeout(this.registrationValidationTimeout);
    }
    this.stopResendCooldown();
  }

  iniciarSlider(): void {
    this.sliderInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
    }, 5000);
  }

  setSlide(index: number): void {
    this.currentSlide = index;
    clearInterval(this.sliderInterval);
    this.iniciarSlider();
  }

  // ── reCAPTCHA v3 ──────────────────────────────────────

  /**
   * Inyecta el script de Google reCAPTCHA v3 en el <head> si aún no existe.
   */
  private _loadRecaptchaScript(): void {
    if (document.getElementById('recaptcha-script')) return;

    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${this.recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  // ── Helpers ───────────────────────────────────────────
  showForm(form: FormView): void {
    this.activeForm = form;
    this.alert = null;
    if (form === 'registro') {
      this.actualizarEntidades();
    }
  }

  actualizarEntidades(): void {
    this.entidadesFiltradas =
      this.regTipoEntidad === 'regional' ? REGIONALES : MUNICIPALES;
    this.regEntidad = this.entidadesFiltradas[0] ?? '';
  }

  onFileCargoChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.regDocumentoCargo = file.name;
    }
  }

  showAlert(message: string, type: 'error' | 'success' | 'info'): void {
    this.alert = { message, type };
  }

  clearAlert(): void {
    this.alert = null;
  }

  // ── Login ─────────────────────────────────────────────
  onLogin(): void {
    this.clearAlert();
    this.loginDocumentTouched = true;

    // Sanitizar inputs
    const usuario = this.loginEmail.trim();
    const password = this.loginPassword;

    if (this.loginDocumentError) {
      this.showAlert(this.loginDocumentError, 'error');
      return;
    }

    if (!password) {
      this.showAlert('Ingrese su contraseña.', 'error');
      return;
    }

    this.isLoading = true;

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha
          .execute(this.recaptchaSiteKey, { action: 'login' })
          .then((token: string) => {
            this.ngZone.run(() => {
              this.proceedLogin(usuario, password, token);
            });
          })
          .catch((err: any) => {
            console.error('Error al ejecutar reCAPTCHA v3:', err);
            this.ngZone.run(() => {
              this.isLoading = false;
              this.showAlert('Error en la verificación de seguridad.', 'error');
            });
          });
      });
    } else {
      console.warn('reCAPTCHA no está disponible. Procediendo sin token.');
      this.proceedLogin(usuario, password);
    }
  }

  private proceedLogin(
    usuario: string,
    password: string,
    recaptchaToken?: string,
  ): void {
    this.apiAuthService.login(usuario, password, recaptchaToken).subscribe({
      next: (res) => {
        this.apiAuthService.saveSession(res);
        // Iniciar el timer de sesión de 15 minutos
        this.sessionService.startSession();
        // Redirigir al perfil
        this.router.navigate(['/perfil']);
      },
      error: (err: ApiErrorResponse) => {
        this.isLoading = false;
        // Usa el campo 'descripcion' del API si está disponible
        const msg =
          err?.descripcion || err?.message || 'Error al iniciar sesión.';
        this.showAlert(msg, 'error');
      },
    });
  }

  onLoginKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.onLogin();
  }

  // ── Register ──────────────────────────────────────────
  onRegister(): void {
    const isEmpresa = this.regTipoUsuario === 'empresa';

    if (isEmpresa) {
      if (!this.isFormTransportistaValido) {
        this.showAlert(
          'Por favor, complete todos los campos obligatorios del transportista correctamente y verifique el email.',
          'error',
        );
        return;
      }
    }

    const emailVal = isEmpresa ? this.tpEmail.trim() : this.regEmail.trim();
    const nombreVal = isEmpresa
      ? `${this.tpNombres.trim()} ${this.tpPrimerApellido.trim()} ${this.tpSegundoApellido.trim()}`.trim()
      : this.regNombre.trim();
    const tipo = isEmpresa ? 'empresa' : this.regTipoEntidad;
    const entidadVal = isEmpresa
      ? `${this.tpNumDocumento.trim()} - ${this.tpNombres.trim()} ${this.tpPrimerApellido.trim()}`
      : this.regEntidad;
    const docVal = isEmpresa ? '' : this.regDocumentoCargo.trim();

    const res = this.authService.register({
      email: emailVal,
      password: this.regPassword,
      password2: this.regPassword2,
      nombre: nombreVal,
      tipoEntidad: tipo as any,
      entidad: entidadVal,
      documentoCargo: docVal,
      // Extended profile fields
      primerApellido: this.tpPrimerApellido.trim() || undefined,
      segundoApellido: this.tpSegundoApellido.trim() || undefined,
      tipoDocumento: this.tpTipoDocumento || undefined,
      numDocumento: this.tpNumDocumento.trim() || undefined,
      departamento: this.tpDepartamento || undefined,
      provincia: this.tpProvincia || undefined,
      distrito: this.tpDistrito || undefined,
      cargo: this.regDocumentoCargo.trim() || undefined,
    });
    if (res.success) {
      this.showAlert(
        'Registro exitoso. Ahora puedes iniciar sesión.',
        'success',
      );
      setTimeout(() => this.showForm('login'), 1600);
    } else {
      this.showAlert(res.error!, 'error');
    }
  }

  // ── Recovery ──────────────────────────────────────────
  onRecovery(): void {
    this.clearAlert();
    this.recRucTouched = true;
    if (this.recoveryRucError) {
      this.showAlert(this.recoveryRucError, 'error');
      return;
    }

    this.recoveryStage = 'code';
    this.recoveryCode = '';
    this.recoveryCodeError = '';
    this.recoveryCodeResent = false;
  }

  onRecoveryKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.onRecovery();
  }

  onRecoveryCodeInput(): void {
    this.recoveryCode = this.recoveryCode.replace(/\D/g, '').slice(0, 6);
    this.recoveryCodeError = '';
    this.clearAlert();
  }

  verifyDummyRecoveryCode(): void {
    this.clearAlert();
    if (this.recoveryCode !== '123123') {
      this.recoveryCodeError = 'Código incorrecto. Revísalo e intenta de nuevo.';
      return;
    }

    this.recoveryCodeError = '';
    this.recoveryStage = 'password';
    this.recoveryNewPassword = '';
    this.recoveryConfirmPassword = '';
    this.recoveryPasswordSubmitted = false;
  }

  resendDummyRecoveryCode(): void {
    this.recoveryCode = '';
    this.recoveryCodeError = '';
    this.recoveryCodeResent = true;
    this.clearAlert();
  }

  get recoveryNewPasswordError(): string {
    if (!this.recoveryPasswordSubmitted) return '';
    if (!this.recoveryNewPassword) return 'Ingrese la nueva clave.';
    return this.recoveryNewPassword.length >= 8
      ? ''
      : 'La nueva clave debe tener al menos 8 caracteres.';
  }

  get recoveryConfirmPasswordError(): string {
    if (!this.recoveryPasswordSubmitted) return '';
    if (!this.recoveryConfirmPassword) return 'Confirme la nueva clave.';
    return this.recoveryNewPassword === this.recoveryConfirmPassword
      ? ''
      : 'Las claves no coinciden.';
  }

  saveDummyRecoveryPassword(): void {
    this.clearAlert();
    this.recoveryPasswordSubmitted = true;
    if (this.recoveryNewPasswordError || this.recoveryConfirmPasswordError) return;

    this.recoveryStage = 'success';
  }

  goToLoginAfterRecovery(): void {
    const recoveredRuc = this.recRuc;
    this.showForm('login');
    this.loginDocumentType = 'RUC';
    this.loginEmail = recoveredRuc;
    this.loginPassword = '';
    this.loginDocumentTouched = false;
  }

  // ── Alert icon ────────────────────────────────────────
  get alertIcon(): string {
    if (!this.alert) return '';
    return this.alert.type === 'error'
      ? 'error'
      : this.alert.type === 'success'
        ? 'check_circle'
        : 'info';
  }
}
