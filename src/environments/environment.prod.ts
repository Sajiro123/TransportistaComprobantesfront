import type { AppEnvironment } from './environment.model';

const runtime = (window as any).__env ?? {};
const asBoolean = (value: unknown, fallback: boolean = false): boolean =>
  value === undefined ? fallback : String(value).toLowerCase() === 'true';

export const environment = {
  production: true,
  API_BASE_URL: runtime.API_BASE_URL,
  API_PADRON_URL: runtime.API_PADRON_URL,
  API_ORG_URL: runtime.API_ORG_URL,
  API_VALIDACION_URL: runtime.API_VALIDACION_URL,
  API_COMPROBANTE_URL: runtime.API_COMPROBANTE_URL,
  API_COMPROBANTE_MOCK: asBoolean(runtime.API_COMPROBANTE_MOCK, true),
  RECAPTCHA_SITE_KEY: runtime.RECAPTCHA_SITE_KEY,
  ENCRYPTION_PRIVATE_KEY: runtime.ENCRYPTION_PRIVATE_KEY || '',
  ENCRYPTION_PUBLIC_KEY: runtime.ENCRYPTION_PUBLIC_KEY || '',
  appId: runtime.appId || 'APP_COMPROBANTE',
} satisfies AppEnvironment;
