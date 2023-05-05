export function stringToBuffer(str: string) {
  let bufView = new Uint8Array(str.length);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function bufferToString(buf: ArrayBuffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

export async function encrypt(
  kvValue: string,
  kvKey: string,
  iv: Uint8Array,
  cryptoPass: string
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cryptoPass),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = this.stringToBuffer(kvKey);
  const plaintext = this.stringToBuffer(kvValue);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
}

export async function decrypt(
  kvValue: string,
  kvKey: string,
  iv: Uint8Array,
  cryptoPass: string
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cryptoPass),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = this.stringToBuffer(kvKey);
  const ciphertext = this.stringToBuffer(kvValue);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}
