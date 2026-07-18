// =========================================================
// Environment – PRODUCCIÓN
// =========================================================
export const environment = {
  production: true,

  /** URL base del API REST (IAM). Cambia según el entorno. */
  API_BASE_URL:
    (window as any).__env?.API_BASE_URL || 'https://apidev.atu.gob.pe/api_iam',

  /** URL base del API de Padrón (carga masiva). */
  API_PADRON_URL:
    (window as any).__env?.API_PADRON_URL ||
    'https://apidev.atu.gob.pe/api_padron',

  /** URL base del API de Organización (entidades y ámbitos). */
  API_ORG_URL:
    (window as any).__env?.API_ORG_URL || 'https://apidev.atu.gob.pe/api_org',

  /** URL base del API de Validación. */
  API_VALIDACION_URL:
    (window as any).__env?.API_VALIDACION_URL ||
    'https://apidev.atu.gob.pe/api_validacion',

  /** URL base del API de Comprobantes. */
  API_COMPROBANTE_URL:
    (window as any).__env?.API_COMPROBANTE_URL ||
    'https://apidev.atu.gob.pe/api_comprobante',

  /** Clave privada para descifrado de campos sensibles (IAM) */
  ENCRYPTION_PRIVATE_KEY:
    (window as any).__env?.ENCRYPTION_PRIVATE_KEY ||
    'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCdSs51Oi/d0vFh+dedGLf7wdZ3YUqXX77o+qc2qq7xqlvnJ4qEwJFtpAYJghUaHVFHasryfxmSav17UL7Y/dNyb+RhlytaDF2g9wYxEDvZsFtfl3m+/p3epdKgHVDKae8YEzby7ej7aC0+NgsSw45NHU0apN9pvsFbZ7eVHnrgEijaz936Kqf9KwwNV6Bw6lZ26eU//1vx6594xIUaX8yaHwqbFeMrxMHm1O3Ls+VLtfd5/DNhIem4kB5hZXMR43ePGklmnFhAXwM6kcxUP/q9UwLZJN8HZSOj3r1SQ4HJFTV5D3v1KvZbjF4R8758y2MadMd6u/Y7GI1JhY5kKZIfAgMBAAECggEAJGj1GrDB9MzIIIBnl09qA2aO4SqNzDWXKTIgc+iVv45KYNtH1swGvgUKerf4b4ea0XfYi8K9JiYLEDkUPIGhKSvah3apS9px7/lOnxvdZtpKhHm5bmtdGvVyqKqwkXJtLLsB7MECvfOTCYQUEx9eeN5QA1tn9f/4nVKIbgXUtrpQboFWboLSTTZ15bKVJp9Y2P6oflzWmJkKZ3oNBMOSIIGHanHHYkCVcs8eFsaWLnv/Gc3LemhF+yUhFHe7mMl8cX8qf/K2Bx0K1nmfvBBEn2WF5hoYI8TFACzqFZGoALTD4Vma9X0dJiFbuqs/o92BJi5NX01gpkMCpMqw0dXNrQKBgQDA7XaFlXABbvEy5PXSx51GeftatxEDC6oOH/mLeDI6U4aBgyNoqIzNpbtjcHBSwHj4U13fGk5I8PoNeZ4HHfzH1CyBOCGMnNnDJEdRLFamw3k9nchX76NP3Ru22iq3U5Gt1WRQ/57U0KQFh5sv2E9BMgZwntTUi3hpNRWgcIQUuwKBgQDQtvCe+aDpQuRmjKtuUJ+qVihSI4ZBYqnnq30l+9dPGH25ApjiaRjKk0D+3ukBfIdhLiV7zXeG50Z6/M7nk91rEzutJWfni1ZwuFlpatH4V71qavCxfBi4Q0y4PvrWNvZt5RE/PbyeXJ6n3l/oz7dA1h9jrp+XaT8La6qIs8GT7QKBgQChD506uB7hk3TZQDvY07yA8aTdfqc9G6fEUv1JafbEqqZHyOrunIevxwRBZ8Td0MEszqw3bQad7k9SoI1E88vsJz1gQzP+55METm0bXyCX5+h3gBmZD/4O1lAkvs2abrHXpaYx2LUIhYXo9+SedL71doXZzz9ukWDcs+xyHHynsQKBgQCRpFbcWI10uHzxIpAt9oy0LFMOnkN9NQAi7YPzEX35b7mrdKiCtZvbIE5mi95Eb0V5Bt6ZOZOCy7he8jLfXktQAKfP9x4+cPjsx3d9HFFQ3skKjX1QHKyTSEMs/qXC/a+QmBwk6UvJphAATCjZKLlTwRc+VAiBe6vGqGbj5avbMQKBgAuRE7PHqM2t1oPQr9dnb2Djt8YZcY6x+VGILcXvMf2Jllid2gHPsHuGb2ss+5E3/YML/Meo9N44P3CnWQ2SurbrA6OmQoFuGbB9BZJ3/PiPmkHGAjWLOHNNVHX+RsQjXdOqqLHsqkAjTvfVhiF/PFXFYiAschUNmS0xX7jBCpNk',
};
