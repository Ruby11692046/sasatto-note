import brotliPromise from 'brotli-wasm';

let brotliInstance: any = null;

async function getBrotli() {
  if (!brotliInstance) {
    // Dynamically import or load to avoid top-level await issues in some environments
    brotliInstance = await brotliPromise;
  }
  return brotliInstance;
}

/**
 * Converts a Uint8Array to a Base64URL string.
 */
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts a Base64URL string to a Uint8Array.
 */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  
  const binary = atob(base64);
  const len = binary.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  return uint8Array;
}

/**
 * Compresses a text string using Brotli and returns it as a Base64URL string.
 */
export async function compressText(text: string): Promise<string> {
  const brotli = await getBrotli();
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const compressed = brotli.compress(data);
  return uint8ArrayToBase64Url(compressed);
}

/**
 * Decodes a Base64URL string and decompresses it using Brotli to retrieve the original text.
 */
export async function decompressText(base64Url: string): Promise<string> {
  const brotli = await getBrotli();
  const compressed = base64UrlToUint8Array(base64Url);
  const decompressed = brotli.decompress(compressed);
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}
