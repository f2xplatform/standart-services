export function stringToBuffer(str: string): any {
  let bufView = new Uint8Array(str.length);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function bufferToString(buf: ArrayBuffer | Uint8Array<ArrayBuffer>) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

export async function encrypt(
  kvValue: string,
  kvKey: string,
  iv: any,
  cryptoPass: string
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cryptoPass),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = stringToBuffer(kvKey);
  const plaintext = stringToBuffer(kvValue);
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
  iv: any,
  cryptoPass: string
) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cryptoPass),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = stringToBuffer(kvKey);
  const ciphertext = stringToBuffer(kvValue);
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

export const createShaHmac = async (
  privateKey: ArrayBuffer,
  message: string,
  algorithm: string
) => {
  const key = await crypto.subtle.importKey(
    "raw",
    privateKey,
    {
      name: "HMAC",
      hash: { name: algorithm },
    },
    true,
    ["sign", "verify"]
  );
  return await crypto.subtle.sign("HMAC", key, stringToBuffer(message));
};

export const returnHmacAuth = async (
  nonce: number,
  webApiId: string,
  webApiKey: string,
  webApiSecret: string,
  method: string,
  url: string,
  content?: string
) => {
  // Signature = unix_timestamp_in_ms + webApiId + webApiKey + req.getMethod() + req.getURI() + content;
  let signatureString = nonce + webApiId + webApiKey + method + url;

  if(content) {
    signatureString += content
  }
  // key buffer
  const secretBuffer = stringToBuffer(webApiSecret);

  // Base64HMACSignature = Base64(HmacSHA256(Signature, webApiSecret));
  const hmac = await createShaHmac(secretBuffer, signatureString, "SHA-256");
  const base64HMACSignature = btoa(bufferToString(hmac));

  // HMAC:webApiId:webApiKey:unix_timestamp_in_ms:Base64HMACSignature"

  return `HMAC ${webApiId}:${webApiKey}:${nonce}:${base64HMACSignature}`;
};

export const symbolsToTGShielding = [
  "_",
  "*",
  "[",
  "]",
  "(",
  ")",
  "~",
  "`",
  ">",
  "#",
  "+",
  "-",
  "=",
  "|",
  "{",
  "}",
  ".",
  "!",
  "/",
];

export function shieldingStr(type:string, str: string, ) {
  if(type = "tg") {
    let newStr = str;
    for (let sym of symbolsToTGShielding) {
      newStr = newStr.replaceAll(sym, `\\${sym}`);
    }
    return newStr;
  }
}

export const converToHexString = (arr: Uint8Array) => {
  const hashArray = Array.from(arr);
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
};

export const createShaHash = async (message: string, algorithm: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(hash);
};