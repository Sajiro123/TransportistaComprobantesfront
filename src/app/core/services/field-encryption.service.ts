import { Injectable, inject } from '@angular/core';
import * as forge from 'node-forge';
import { environment } from '@env/environment';
import { FieldDecryptionForgeService } from './field-decryption-forge.service';

const VERSION = 1;
const IV_LENGTH_BYTES = 12;
const AES_KEY_LENGTH_BYTES = 32;
const GCM_TAG_LENGTH_BITS = 128;
const GCM_TAG_LENGTH_BYTES = GCM_TAG_LENGTH_BITS / 8;

type NullableString = string | null | undefined;

@Injectable({ providedIn: 'root' })
export class FieldEncryptionService {
  private readonly decryptionService = inject(FieldDecryptionForgeService);

  /**
   * Cifra un campo para PUT /perfil/contacto usando la pública B.
   * null, undefined y strings en blanco se conservan para la actualización parcial.
   */
  encryptForRequest(value: NullableString): NullableString {
    if (value == null || value.trim().length === 0) {
      return value;
    }

    const publicKeyMaterial = environment.ENCRYPTION_PUBLIC_KEY;
    if (!publicKeyMaterial || publicKeyMaterial.trim() === '') {
      console.warn('Cifrado solicitado pero no hay ENCRYPTION_PUBLIC_KEY configurada.');
      return value;
    }

    try {
      const requestPublicKey = this.parsePublicKey(publicKeyMaterial);

      const iv = forge.random.getBytesSync(IV_LENGTH_BYTES);
      const aesKey = forge.random.getBytesSync(AES_KEY_LENGTH_BYTES);

      const aesCipher = forge.cipher.createCipher('AES-GCM', aesKey);
      aesCipher.start({
        iv,
        tagLength: GCM_TAG_LENGTH_BITS,
      });
      aesCipher.update(
        forge.util.createBuffer(forge.util.encodeUtf8(value), 'raw'),
      );

      if (!aesCipher.finish()) {
        throw new Error('No se pudo cifrar el campo sensible');
      }

      // Java AES/GCM/NoPadding espera ciphertext seguido por el tag.
      const encryptedPayload =
        aesCipher.output.getBytes() + aesCipher.mode.tag.getBytes();

      const wrappedKey = requestPublicKey.encrypt(aesKey, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: {
          md: forge.md.sha1.create(),
        },
      });

      if (wrappedKey.length > 0xffff) {
        throw new Error('Longitud de clave cifrada inválida');
      }

      const payload = forge.util.createBuffer();
      payload.putByte(VERSION);
      payload.putBytes(iv);
      payload.putInt16(wrappedKey.length); // uint16 big-endian
      payload.putBytes(wrappedKey);
      payload.putBytes(encryptedPayload);

      return forge.util.encode64(payload.getBytes());
    } catch (err) {
      console.error('Error al cifrar campo:', err);
      throw err;
    }
  }

  /**
   * Descifra un campo recibido desde GET /perfil usando la privada A.
   */
  decryptFromResponse(value: NullableString): NullableString {
    if (value == null || value.trim().length === 0) {
      return value;
    }
    return this.decryptionService.decrypt(value);
  }

  private parsePublicKey(base64Spki: string): forge.pki.rsa.PublicKey {
    const der = forge.util.decode64(this.normalizeKey(base64Spki));
    const asn1 = forge.asn1.fromDer(der);
    return forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;
  }

  private normalizeKey(material: string): string {
    return material
      .replace(/-----BEGIN (?:PUBLIC|PRIVATE) KEY-----/g, '')
      .replace(/-----END (?:PUBLIC|PRIVATE) KEY-----/g, '')
      .replace(/\s+/g, '');
  }
}
