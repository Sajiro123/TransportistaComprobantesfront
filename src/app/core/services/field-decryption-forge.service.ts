import { Injectable } from '@angular/core';
import * as forge from 'node-forge';
import { environment } from '@env/environment';
import { ENCRYPTED_LOGIN_FIELDS, LoginData } from '../models/api.models';

const VERSION = 1;
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

@Injectable({ providedIn: 'root' })
export class FieldDecryptionForgeService {

  decrypt(cipherTextBase64: string | null | undefined): string | null {
    if (cipherTextBase64 == null || cipherTextBase64.trim() === '') {
      return cipherTextBase64 ?? null;
    }

    if (!this.looksEncrypted(cipherTextBase64)) {
      return cipherTextBase64;
    }

    const privateKeyMaterial = environment.ENCRYPTION_PRIVATE_KEY;
    if (!privateKeyMaterial || privateKeyMaterial.trim() === '') {
      console.warn('Cifrado detectado pero no hay ENCRYPTION_PRIVATE_KEY configurada.');
      return cipherTextBase64;
    }

    try {
      const bytes = forge.util.decode64(cipherTextBase64);
      const buffer = forge.util.createBuffer(bytes, 'raw');

      const version = buffer.getByte();
      if (version !== VERSION) {
        throw new Error(`Versión de cifrado no soportada: ${version}`);
      }

      const iv = buffer.getBytes(GCM_IV_LENGTH);
      const wrappedKeyLength = buffer.getInt16();
      const wrappedKey = buffer.getBytes(wrappedKeyLength);
      const cipherAndTag = buffer.getBytes(buffer.length());

      if (cipherAndTag.length < GCM_TAG_LENGTH) {
        throw new Error('Payload cifrado incompleto');
      }

      const cipherText = cipherAndTag.slice(0, cipherAndTag.length - GCM_TAG_LENGTH);
      const tag = cipherAndTag.slice(cipherAndTag.length - GCM_TAG_LENGTH);

      const privateKey = forge.pki.privateKeyFromPem(
        this.toPem(privateKeyMaterial)
      );

      // Coincide con backend (Java): OAEP SHA-256 + MGF1 SHA-1
      const aesKeyBytes = privateKey.decrypt(wrappedKey, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        mgf1: { md: forge.md.sha1.create() },
      });

      const decipher = forge.cipher.createDecipher('AES-GCM', aesKeyBytes);
      decipher.start({
        iv,
        tagLength: GCM_TAG_LENGTH * 8,
        tag: forge.util.createBuffer(tag),
      });
      decipher.update(forge.util.createBuffer(cipherText));
      const ok = decipher.finish();
      if (!ok) {
        throw new Error('Fallo al descifrar AES-GCM (tag inválido)');
      }

      return decipher.output.toString();
    } catch (err) {
      console.error('Error al descifrar campo:', err);
      throw err;
    }
  }

  decryptLoginData(data: LoginData): LoginData {
    if (!data) return data;
    const result: any = { ...data };
    for (const field of ENCRYPTED_LOGIN_FIELDS) {
      const value = data[field];
      if (typeof value === 'string' || value == null) {
        result[field] = this.decrypt(value);
      }
    }
    return result as LoginData;
  }

  private looksEncrypted(value: string): boolean {
    try {
      const bytes = forge.util.decode64(value);
      return bytes.length > 1 + GCM_IV_LENGTH + 2 && bytes.charCodeAt(0) === VERSION;
    } catch {
      return false;
    }
  }

  private toPem(material: string): string {
    if (material.includes('BEGIN PRIVATE KEY')) {
      return material;
    }
    const body =
      material.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? material;
    return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  }
}
