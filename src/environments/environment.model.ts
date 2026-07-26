export interface AppEnvironment {
  production: boolean;
  API_BASE_URL: string;
  API_PADRON_URL: string;
  API_ORG_URL: string;
  API_VALIDACION_URL: string;
  API_COMPROBANTE_URL: string;
  API_COMPROBANTE_MOCK: boolean;
  RECAPTCHA_SITE_KEY: string;
  ENCRYPTION_PRIVATE_KEY: string;
  ENCRYPTION_PUBLIC_KEY: string;
  appId?: string;
}
