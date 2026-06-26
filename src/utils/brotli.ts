import brotliPromise from 'brotli-wasm';
import { encodeDictionary, decodeDictionary } from './dict';

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
 * Evaluates multiple compression strategies (C, D, H, N) and returns the shortest result.
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

  // 2. D (Dictionary Only)
  try {
    const dictEncodedText = encodeDictionary(text);
    const dictBytes = encoder.encode(dictEncodedText);
    const base64 = uint8ArrayToBase64Url(dictBytes);
    results.push({ prefix: 'D', text: 'D' + base64 });
  } catch (e) {
    console.error('Dictionary encoding failed:', e);
  }

  // 3. H (Hybrid: Dictionary + Brotli)
  try {
    const dictEncodedText = encodeDictionary(text);
    const dictBytes = encoder.encode(dictEncodedText);
    const hybridBytes = brotli.compress(dictBytes, { quality: 11 });
    const base64 = uint8ArrayToBase64Url(hybridBytes);
    results.push({ prefix: 'H', text: 'H' + base64 });
  } catch (e) {
    console.error('Hybrid compression failed:', e);
  }

  // 4. N (Raw UTF-8 / No compression)
  try {
    const rawBytes = encoder.encode(text);
    const base64 = uint8ArrayToBase64Url(rawBytes);
    results.push({ prefix: 'N', text: 'N' + base64 });
  } catch (e) {
    console.error('Raw encoding failed:', e);
  }

  // Find the absolute shortest result
  // If lengths are equal, we favor the order (C, D, H, N) since we only replace if strictly shorter (<).
  let best = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i].text.length < best.text.length) {
      best = results[i];
    }
  }

  return best.text;
}

/**
 * Automatically decodes a Base64URL string using the prefix (C, D, H, N).
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
    case 'D': {
      // Dictionary Only
      const bytes = base64UrlToUint8Array(base64Url);
      const dictText = decoder.decode(bytes);
      return decodeDictionary(dictText);
    }
    case 'H': {
      // Hybrid (Dictionary + Brotli)
      const compressedBytes = base64UrlToUint8Array(base64Url);
      const decompressedBytes = brotli.decompress(compressedBytes);
      const dictText = decoder.decode(decompressedBytes);
      return decodeDictionary(dictText);
    }
    case 'N': {
      // Raw UTF-8 / No compression
      const bytes = base64UrlToUint8Array(base64Url);
      return decoder.decode(bytes);
    }
    default:
      // Fallback for older links (which had no prefix and were standard Brotli compressed)
      try {
        const compressedBytes = base64UrlToUint8Array(prefixAndBase64);
        const decompressedBytes = brotli.decompress(compressedBytes);
        return decoder.decode(decompressedBytes);
      } catch (e) {
        throw new Error('Unknown encoding prefix: ' + prefix);
      }
  }
}
