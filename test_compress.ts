import * as fs from 'fs';
import * as zlib from 'zlib';
import { encodeBinaryDict } from './src/utils/dict';

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

function compressBrotliNode(bytes: Uint8Array): Uint8Array {
  const buffer = Buffer.from(bytes);
  const compressed = zlib.brotliCompressSync(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    }
  });
  return new Uint8Array(compressed);
}

async function test() {
  const encoder = new TextEncoder();
  
  // Load dummy.txt
  const text = fs.readFileSync('/Users/ruby/workspace/gijikiji/dummy.txt', 'utf-8');

  // We simulate a payload with an empty or short title as typically used in the editor
  const payload = JSON.stringify({ t: '', c: text });
  
  // N
  const rawBytes = encoder.encode(payload);
  const nSize = uint8ArrayToBase64Url(rawBytes).length + 1;

  // C
  const cBytes = compressBrotliNode(rawBytes);
  const cSize = uint8ArrayToBase64Url(cBytes).length + 1;

  // D
  const dictBytes = encodeBinaryDict(payload);
  const dSize = uint8ArrayToBase64Url(dictBytes).length + 1;

  // H
  const hBytes = compressBrotliNode(dictBytes);
  const hSize = uint8ArrayToBase64Url(hBytes).length + 1;

  console.log(`--- dummy.txt (本文文字数: ${text.length}) ---`);
  console.log(`C (Brotli Only):    ${cSize} 文字`);
  console.log(`D (Dict Only):      ${dSize} 文字`);
  console.log(`H (Hybrid):         ${hSize} 文字`);
  console.log(`N (Raw Base64):     ${nSize} 文字`);
  
  const sizes = { C: cSize, D: dSize, H: hSize, N: nSize };
  const min = Object.entries(sizes).reduce((a, b) => a[1] < b[1] ? a : b);
  console.log(`=> 最小の方式: ${min[0]} (${min[1]} 文字)`);
}

test();
