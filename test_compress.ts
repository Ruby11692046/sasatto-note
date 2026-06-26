import * as fs from 'fs';
import * as zlib from 'zlib';
import { encodeBinaryDict, decodeBinaryDict } from './src/utils/dict';

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

function compressBrotliNode(bytes: Uint8Array): Uint8Array {
  const buffer = Buffer.from(bytes);
  const compressed = zlib.brotliCompressSync(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    }
  });
  return new Uint8Array(compressed);
}

function decompressBrotliNode(bytes: Uint8Array): Uint8Array {
  const buffer = Buffer.from(bytes);
  const decompressed = zlib.brotliDecompressSync(buffer);
  return new Uint8Array(decompressed);
}

async function test() {
  const encoder = new TextEncoder();
  
  // Load dummy.txt
  const text = fs.readFileSync('/Users/ruby/workspace/gijikiji/dummy.txt', 'utf-8');
  const payload = JSON.stringify({ t: '', c: text });

  // 1. C (Brotli Only)
  const rawBytes = encoder.encode(payload);
  const cBytes = compressBrotliNode(rawBytes);
  const cBase64 = uint8ArrayToBase64Url(cBytes);
  const cUrl = 'C' + cBase64;

  // 2. H (Hybrid: Dictionary + Brotli)
  const dictBytes = encodeBinaryDict(payload);
  const hBytes = compressBrotliNode(dictBytes);
  const hBase64 = uint8ArrayToBase64Url(hBytes);
  const hUrl = 'H' + hBase64;

  console.log(`--- dummy.txt (本文文字数: ${text.length}) ---`);
  console.log(`C (Brotli Only):    ${cUrl.length} 文字`);
  console.log(`H (Hybrid):         ${hUrl.length} 文字`);
  
  const minUrl = [cUrl, hUrl].reduce((a, b) => a.length < b.length ? a : b);
  console.log(`=> 最小の方式: ${minUrl[0]} (${minUrl.length} 文字)`);

  // Verify H roundtrip
  const decodedHBytes = decompressBrotliNode(base64UrlToUint8Array(hBase64));
  const decodedHPayload = decodeBinaryDict(decodedHBytes);
  console.log(`H方式の復元結果: ${decodedHPayload === payload ? '✅ 完全一致' : '❌ 不一致'}`);
}

test();
