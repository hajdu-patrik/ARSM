/** Pre-decode inspection of a picked profile picture: type, magic bytes and the pixel size read from the
 * file header, so a mislabelled or oversized image is refused before any image or canvas decode. */

import { isAllowedPictureExtension } from './validation';

/** Longest accepted picture side, in pixels. */
export const MAX_PICTURE_SIDE_PX = 8192;

/** Largest accepted picture area, in megapixels (one megapixel is 1,000,000 pixels). */
export const MAX_PICTURE_MEGAPIXELS = 20;

/** Why a picked picture is refused before it is decoded. */
export type PictureRejection = 'invalid-type' | 'dimensions-too-large';

type PictureFormat = 'png' | 'jpeg' | 'webp';

/** Pixel size read from a picture header. */
interface PictureSize {
  readonly width: number;
  readonly height: number;
}

const ALLOWED_PICTURE_MIME_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PIXELS_PER_MEGAPIXEL = 1_000_000;

/** Bytes read from the file start: every signature plus the PNG and WebP size fields (the longest ends at byte 30). */
const HEAD_BYTE_COUNT = 32;

/** Most JPEG segments walked looking for the frame header; a real file has a handful, so more means a crafted one. */
const MAX_JPEG_SEGMENTS = 128;

const PNG_SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE: readonly number[] = [0xff, 0xd8, 0xff];

/** Bytes of a RIFF container header ('RIFF', the size, 'WEBP'); the first chunk follows. */
const RIFF_HEADER_LENGTH = 12;

/** Checks the file name extension and the MIME type the browser reported; no file content is read. */
export function hasAllowedPictureType(file: File): boolean {
  return isAllowedPictureExtension(file.name) && ALLOWED_PICTURE_MIME_TYPES.has(file.type);
}

/** Reads a slice of the file; a slice that starts past the end of the file is empty. */
async function readView(file: Blob, offset: number, length: number): Promise<DataView> {
  return new DataView(await file.slice(offset, offset + length).arrayBuffer());
}

/** Reads `length` bytes at `offset` as ASCII text. */
function readAscii(view: DataView, offset: number, length: number): string {
  let text = '';

  for (let index = 0; index < length; index += 1) {
    text += String.fromCodePoint(view.getUint8(offset + index));
  }

  return text;
}

/** Reads a 24-bit little-endian unsigned integer. */
function readUint24LittleEndian(view: DataView, offset: number): number {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
}

/** True when the view starts with the given bytes. */
function startsWith(view: DataView, signature: readonly number[]): boolean {
  return view.byteLength >= signature.length && signature.every((byte, index) => view.getUint8(index) === byte);
}

/** Names the format by its magic bytes, or null when they match none of the three accepted formats. */
function detectPictureFormat(head: DataView): PictureFormat | null {
  if (startsWith(head, PNG_SIGNATURE)) {
    return 'png';
  }

  if (startsWith(head, JPEG_SIGNATURE)) {
    return 'jpeg';
  }

  const isWebp = head.byteLength >= RIFF_HEADER_LENGTH
    && readAscii(head, 0, 4) === 'RIFF'
    && readAscii(head, 8, 4) === 'WEBP';
  return isWebp ? 'webp' : null;
}

/** PNG: the IHDR chunk comes first, with width and height as big-endian 32-bit integers at bytes 16 and 20. */
function readPngSize(head: DataView): PictureSize | null {
  if (head.byteLength < 24 || readAscii(head, 12, 4) !== 'IHDR') {
    return null;
  }

  return { width: head.getUint32(16), height: head.getUint32(20) };
}

/** WebP: the size sits in the first chunk, whose layout depends on the variant (lossy, lossless, extended). */
function readWebpSize(head: DataView): PictureSize | null {
  const chunkTag = head.byteLength >= 30 ? readAscii(head, RIFF_HEADER_LENGTH, 4) : '';

  if (chunkTag === 'VP8 ') {
    // Frame tag (3 bytes) and the 9D 01 2A start code, then 14-bit little-endian width and height.
    const hasStartCode = head.getUint8(23) === 0x9d && head.getUint8(24) === 0x01 && head.getUint8(25) === 0x2a;
    return hasStartCode
      ? { width: head.getUint16(26, true) & 0x3fff, height: head.getUint16(28, true) & 0x3fff }
      : null;
  }

  if (chunkTag === 'VP8L') {
    // Signature byte 0x2F, then 14 bits of width - 1 and 14 bits of height - 1 packed little-endian.
    if (head.getUint8(20) !== 0x2f) {
      return null;
    }

    const packedSize = head.getUint32(21, true);
    return { width: (packedSize & 0x3fff) + 1, height: ((packedSize >>> 14) & 0x3fff) + 1 };
  }

  if (chunkTag === 'VP8X') {
    // Canvas width - 1 and height - 1 as 24-bit little-endian integers after the flags and 3 reserved bytes.
    return { width: readUint24LittleEndian(head, 24) + 1, height: readUint24LittleEndian(head, 27) + 1 };
  }

  return null;
}

/** Size of a PNG or WebP, whose size field lies inside the head bytes. */
function readHeaderSize(format: Exclude<PictureFormat, 'jpeg'>, head: DataView): PictureSize | null {
  return format === 'png' ? readPngSize(head) : readWebpSize(head);
}

/** JPEG markers that start a frame header: SOF0-SOF15 without DHT (C4), JPG (C8) and DAC (CC). */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/** Markers that carry no length: TEM, RST0-RST7 and SOI. */
function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8);
}

/** JPEG: walks the segment headers, hopping over each payload, until the frame header gives height and width. */
async function readJpegSize(file: Blob): Promise<PictureSize | null> {
  let offset = 2;

  for (let segmentCount = 0; segmentCount < MAX_JPEG_SEGMENTS; segmentCount += 1) {
    const header = await readView(file, offset, 4);
    if (header.byteLength < 4 || header.getUint8(0) !== 0xff) {
      return null;
    }

    const marker = header.getUint8(1);
    if (marker === 0xff) {
      offset += 1;
    } else if (isStandaloneMarker(marker)) {
      offset += 2;
    } else if (marker === 0x00 || marker === 0xd9 || marker === 0xda) {
      return null;
    } else if (isStartOfFrame(marker)) {
      // The frame header follows the 4 bytes read above: precision (1), height (2), width (2).
      const frame = await readView(file, offset + 4, 5);
      return frame.byteLength < 5 ? null : { width: frame.getUint16(3), height: frame.getUint16(1) };
    } else {
      offset += 2 + header.getUint16(2);
    }
  }

  return null;
}

/** True when a side or the area is over the accepted limits. */
function exceedsPictureLimits({ width, height }: PictureSize): boolean {
  return width > MAX_PICTURE_SIDE_PX
    || height > MAX_PICTURE_SIDE_PX
    || width * height > MAX_PICTURE_MEGAPIXELS * PIXELS_PER_MEGAPIXEL;
}

/** Reads the file head and returns why the picture must not be decoded, or null when it may be.
 * A header that cannot be read as PNG, JPEG or WebP counts as an invalid type. */
export async function findPictureRejection(file: Blob): Promise<PictureRejection | null> {
  const head = await readView(file, 0, HEAD_BYTE_COUNT);
  const format = detectPictureFormat(head);
  if (format === null) {
    return 'invalid-type';
  }

  const size = format === 'jpeg' ? await readJpegSize(file) : readHeaderSize(format, head);
  if (size === null || size.width < 1 || size.height < 1) {
    return 'invalid-type';
  }

  return exceedsPictureLimits(size) ? 'dimensions-too-large' : null;
}
