/**
 * Minimal PNG RGBA pixel codec for on-device image processing.
 *
 * React Native doesn't expose raw pixel access natively, and upng-js has
 * module format issues with Metro. This module provides two helpers:
 *
 *   decodePngPixels(uri)  → { rgba, width, height }
 *   encodePngFromPixels(rgba, w, h) → file URI
 *
 * Both go through base64 ↔ binary conversion using expo-file-system. The
 * actual PNG inflate/deflate uses the pako library (pure JS, Metro-safe).
 */

import * as FileSystem from 'expo-file-system/legacy';
import pako from 'pako';

// ─── Base64 helpers ──────────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

// ─── PNG constants ───────────────────────────────────────────────────────────

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function readU32(d: DataView, o: number): number {
    return d.getUint32(o, false);
}

// ─── CRC-32 (needed for PNG chunk writing) ───────────────────────────────────

let _crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
    if (_crcTable) return _crcTable;
    _crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        _crcTable[n] = c >>> 0;
    }
    return _crcTable;
}

function crc32(buf: Uint8Array, start: number, len: number): number {
    const table = getCrcTable();
    let c = 0xFFFFFFFF;
    for (let i = start; i < start + len; i++) {
        c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── Zlib inflate (for PNG IDAT decompression) ───────────────────────────────

function zlibInflate(data: Uint8Array): Uint8Array {
    return pako.inflate(data);
}

// ─── PNG Decode ──────────────────────────────────────────────────────────────

function paethPredictor(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

export async function decodePngPixels(
    uri: string,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const buf = base64ToBytes(b64);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    // Verify signature
    for (let i = 0; i < 8; i++) {
        if (buf[i] !== PNG_SIGNATURE[i]) throw new Error('Not a PNG file');
    }

    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks: Uint8Array[] = [];
    let offset = 8;

    while (offset < buf.length) {
        const chunkLen = readU32(dv, offset);
        const typeCode =
            String.fromCharCode(buf[offset + 4]) +
            String.fromCharCode(buf[offset + 5]) +
            String.fromCharCode(buf[offset + 6]) +
            String.fromCharCode(buf[offset + 7]);
        const chunkData = buf.subarray(offset + 8, offset + 8 + chunkLen);

        if (typeCode === 'IHDR') {
            const cdv = new DataView(chunkData.buffer, chunkData.byteOffset, chunkData.byteLength);
            width = cdv.getUint32(0, false);
            height = cdv.getUint32(4, false);
            bitDepth = chunkData[8];
            colorType = chunkData[9];
        } else if (typeCode === 'IDAT') {
            idatChunks.push(chunkData);
        } else if (typeCode === 'IEND') {
            break;
        }

        offset += 12 + chunkLen;
    }

    if (bitDepth !== 8) {
        throw new Error(`Unsupported PNG bit depth: ${bitDepth} (only 8-bit supported)`);
    }

    // Concatenate IDAT chunks and decompress
    const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
    const compressed = new Uint8Array(totalLen);
    let coff = 0;
    for (const chunk of idatChunks) {
        compressed.set(chunk, coff);
        coff += chunk.length;
    }

    const raw = zlibInflate(compressed);

    // Determine bytes per pixel and reconstruct scanlines
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
    const bpp = channels; // for 8-bit
    const stride = width * bpp;
    const rgba = new Uint8Array(width * height * 4);

    let roff = 0;
    const prev = new Uint8Array(stride); // previous scanline (starts as zeros)
    const curr = new Uint8Array(stride);

    for (let y = 0; y < height; y++) {
        const filterType = raw[roff++];

        // Read raw scanline
        for (let i = 0; i < stride; i++) curr[i] = raw[roff++];

        // Apply filter
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? curr[i - bpp] : 0;
            const b = prev[i];
            const c = i >= bpp ? prev[i - bpp] : 0;
            switch (filterType) {
                case 0: break; // None
                case 1: curr[i] = (curr[i] + a) & 0xFF; break; // Sub
                case 2: curr[i] = (curr[i] + b) & 0xFF; break; // Up
                case 3: curr[i] = (curr[i] + ((a + b) >> 1)) & 0xFF; break; // Average
                case 4: curr[i] = (curr[i] + paethPredictor(a, b, c)) & 0xFF; break; // Paeth
            }
        }

        // Write to RGBA output
        for (let x = 0; x < width; x++) {
            const dstIdx = (y * width + x) * 4;
            if (channels === 4) {
                rgba[dstIdx] = curr[x * 4];
                rgba[dstIdx + 1] = curr[x * 4 + 1];
                rgba[dstIdx + 2] = curr[x * 4 + 2];
                rgba[dstIdx + 3] = curr[x * 4 + 3];
            } else if (channels === 3) {
                rgba[dstIdx] = curr[x * 3];
                rgba[dstIdx + 1] = curr[x * 3 + 1];
                rgba[dstIdx + 2] = curr[x * 3 + 2];
                rgba[dstIdx + 3] = 255;
            } else if (channels === 2) {
                rgba[dstIdx] = rgba[dstIdx + 1] = rgba[dstIdx + 2] = curr[x * 2];
                rgba[dstIdx + 3] = curr[x * 2 + 1];
            } else {
                rgba[dstIdx] = rgba[dstIdx + 1] = rgba[dstIdx + 2] = curr[x];
                rgba[dstIdx + 3] = 255;
            }
        }

        prev.set(curr);
    }

    return { rgba, width, height };
}

// ─── PNG Encode ──────────────────────────────────────────────────────────────
// Uses uncompressed (stored) deflate blocks. Produces larger files but is
// simple and fast — fine for transient cache images that get uploaded.

function writeU32BE(arr: Uint8Array, offset: number, val: number): void {
    arr[offset] = (val >> 24) & 0xFF;
    arr[offset + 1] = (val >> 16) & 0xFF;
    arr[offset + 2] = (val >> 8) & 0xFF;
    arr[offset + 3] = val & 0xFF;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(12 + data.length);
    writeU32BE(chunk, 0, data.length);
    chunk[4] = type.charCodeAt(0);
    chunk[5] = type.charCodeAt(1);
    chunk[6] = type.charCodeAt(2);
    chunk[7] = type.charCodeAt(3);
    chunk.set(data, 8);
    const c = crc32(chunk, 4, 4 + data.length);
    writeU32BE(chunk, 8 + data.length, c);
    return chunk;
}

function storeDeflate(data: Uint8Array): Uint8Array {
    // Zlib header (no compression) + stored blocks
    const MAX_BLOCK = 65535;
    const numBlocks = Math.ceil(data.length / MAX_BLOCK) || 1;
    const out = new Uint8Array(2 + data.length + numBlocks * 5 + 4);
    out[0] = 0x78; out[1] = 0x01; // zlib header (deflate, no compression)
    let opos = 2;

    for (let i = 0; i < data.length; i += MAX_BLOCK) {
        const remaining = data.length - i;
        const blockLen = Math.min(MAX_BLOCK, remaining);
        const isLast = (i + blockLen >= data.length) ? 1 : 0;
        out[opos++] = isLast;
        out[opos++] = blockLen & 0xFF;
        out[opos++] = (blockLen >> 8) & 0xFF;
        out[opos++] = (~blockLen) & 0xFF;
        out[opos++] = ((~blockLen) >> 8) & 0xFF;
        out.set(data.subarray(i, i + blockLen), opos);
        opos += blockLen;
    }

    // Adler-32 checksum
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
        a = (a + data[i]) % 65521;
        b = (b + a) % 65521;
    }
    writeU32BE(out, opos, (b << 16) | a);
    opos += 4;

    return out.subarray(0, opos);
}

export async function encodePngToFile(
    rgba: Uint8Array,
    width: number,
    height: number,
): Promise<string> {
    // IHDR
    const ihdr = new Uint8Array(13);
    writeU32BE(ihdr, 0, width);
    writeU32BE(ihdr, 4, height);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // Raw scanlines with filter byte (None = 0)
    const rawLen = height * (1 + width * 4);
    const rawData = new Uint8Array(rawLen);
    let rpos = 0;
    for (let y = 0; y < height; y++) {
        rawData[rpos++] = 0; // filter: None
        const srcOff = y * width * 4;
        rawData.set(rgba.subarray(srcOff, srcOff + width * 4), rpos);
        rpos += width * 4;
    }

    const compressed = storeDeflate(rawData);

    // Assemble PNG
    const sig = new Uint8Array(PNG_SIGNATURE);
    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', new Uint8Array(0));

    const png = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
    let p = 0;
    png.set(sig, p); p += sig.length;
    png.set(ihdrChunk, p); p += ihdrChunk.length;
    png.set(idatChunk, p); p += idatChunk.length;
    png.set(iendChunk, p);

    const uri = `${FileSystem.cacheDirectory}bg_removed_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(uri, bytesToBase64(png), {
        encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
}
