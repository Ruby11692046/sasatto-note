import brotliPromise from 'brotli-wasm';
import { encodeBinaryDict, decodeBinaryDict } from './dict';

let brotliInstance: any = null;

async function getBrotli() {
  if (!brotliInstance) {
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
 * Evaluates Brotli Only (C) and Hybrid (H) compression strategies and returns the shorter result.
 */
export async function compressText(text: string): Promise<string> {
  const brotli = await getBrotli();
  const encoder = new TextEncoder();

  const results: { prefix: string; text: string }[] = [];

  // 1. C (Brotli Only)
  try {
    const rawBytes = encoder.encode(text);
    const brotliBytes = brotli.compress(rawBytes, { quality: 11 });
    const base64 = uint8ArrayToBase64Url(brotliBytes);
    results.push({ prefix: 'C', text: 'C' + base64 });
  } catch (e) {
    console.error('Brotli standard compression failed:', e);
  }

  // 2. H (Hybrid: Dictionary + Brotli)
  try {
    const dictBytes = encodeBinaryDict(text);
    const hybridBytes = brotli.compress(dictBytes, { quality: 11 });
    const base64 = uint8ArrayToBase64Url(hybridBytes);
    results.push({ prefix: 'H', text: 'H' + base64 });
  } catch (e) {
    console.error('Hybrid compression failed:', e);
  }

  // Fallback if both failed (extremely unlikely)
  if (results.length === 0) {
    const rawBytes = encoder.encode(text);
    return 'C' + uint8ArrayToBase64Url(rawBytes);
  }

  // Find the absolute shortest result
  // If lengths are equal, we default to C (Brotli standard) since we only replace if strictly shorter (<).
  let best = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i].text.length < best.text.length) {
      best = results[i];
    }
  }

  return best.text;
}

/**
 * Decodes a Base64URL string using the prefix (C or H).
 */
export async function decompressText(prefixAndBase64: string): Promise<string> {
  if (prefixAndBase64.length === 0) return '';
  
  const prefix = prefixAndBase64[0];
  const base64Url = prefixAndBase64.substring(1);
  
  const brotli = await getBrotli();
  const decoder = new TextDecoder();

  switch (prefix) {
    case 'C': {
      // Brotli Only
      const compressedBytes = base64UrlToUint8Array(base64Url);
      const decompressedBytes = brotli.decompress(compressedBytes);
      return decoder.decode(decompressedBytes);
    }
    case 'H': {
      // Hybrid (Dictionary + Brotli decoded)
      const compressedBytes = base64UrlToUint8Array(base64Url);
      const decompressedBytes = brotli.decompress(compressedBytes);
      return decodeBinaryDict(decompressedBytes);
    }
    default:
      // Fallback for older links without prefix (standard Brotli compressed)
      try {
        const compressedBytes = base64UrlToUint8Array(prefixAndBase64);
        const decompressedBytes = brotli.decompress(compressedBytes);
        return decoder.decode(decompressedBytes);
      } catch (e) {
        throw new Error('Unknown encoding prefix: ' + prefix);
      }
  }
}
