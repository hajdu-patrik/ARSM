import { fileURLToPath } from 'node:url';

/** A real PNG the cropper can decode: the app icon. */
export const APP_ICON_PNG = fileURLToPath(new URL('../../../public/icon.png', import.meta.url));

/** An in-memory file for `setInputFiles`. */
export interface UploadFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The first 33 bytes of a PNG: the signature and an IHDR chunk announcing the given size. */
export function pngHeaderOnly(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from(PNG_SIGNATURE).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

/** A text file wearing an image name and content type. */
export function fakeImage(name: string): UploadFile {
  return { name, mimeType: 'image/png', buffer: Buffer.from('this is plain text, not an image') };
}
