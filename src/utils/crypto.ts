/**
 * NoteFlow Cryptographic Module
 * Production-ready Web Crypto API AES-GCM and PBKDF2 local encryption.
 * Supports Zero-Knowledge end-to-end security on-device.
 */

// Helper: Convert string to ArrayBuffer (UTF-8)
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper: Convert ArrayBuffer to string (UTF-8)
function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Helper: Convert ArrayBuffer to Base64
function bufferToBase64(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}

/**
 * Derives an AES-GCM key from a master password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    stringToBuffer(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts clean text using local PBKDF2 + AES-GCM (256-bit).
 * Returns a base64 encoded payload that bundles [salt (32b), iv (12b), ciphertext].
 */
export async function encryptText(text: string, password?: string): Promise<{ ciphertext: string; success: boolean; error?: string }> {
  if (!password) {
    return { ciphertext: text, success: true };
  }
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
    const iv = window.crypto.getRandomValues(new Uint8Array(12));  // 12 bytes IV (recommended for GCM)
    const cryptoKey = await deriveKey(password, salt);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      stringToBuffer(text)
    );

    // Assembly: Salt (16b) + IV (12b) + Ciphertext
    const totalLength = salt.length + iv.length + ciphertextBuffer.byteLength;
    const combined = new Uint8Array(totalLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertextBuffer), salt.length + iv.length);

    return {
      ciphertext: bufferToBase64(combined.buffer),
      success: true,
    };
  } catch (err: any) {
    return {
      ciphertext: '',
      success: false,
      error: err?.message || 'Encryption failed',
    };
  }
}

/**
 * Decrypts a base64 AES-GCM payload using a master password.
 */
export async function decryptText(encryptedBase64: string, password?: string): Promise<{ plaintext: string; success: boolean; error?: string }> {
  if (!password) {
    // If no password provided, return as is (could be unencrypted)
    return { plaintext: encryptedBase64, success: true };
  }
  try {
    const combined = base64ToBuffer(encryptedBase64);
    if (combined.length < 28) {
      throw new Error('Invalid cipher format');
    }

    // Extract salt (16b) and IV (12b)
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const cryptoKey = await deriveKey(password, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      ciphertext
    );

    return {
      plaintext: bufferToString(decryptedBuffer),
      success: true,
    };
  } catch (err: any) {
    return {
      plaintext: '',
      success: false,
      error: 'Incompatible master password or corrupted note payload',
    };
  }
}
