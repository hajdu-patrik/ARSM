/**
 * Image loading and canvas crop-to-blob utilities.
 *
 * Used by the profile picture crop workflow to load an image file,
 * crop it to a square region, and produce a {@code Blob} for upload.
 * @module utils/imageCrop
 */

/** Expected prefix for data URL strings from {@code FileReader}. */
const FILE_READER_DATA_URL_PREFIX = 'data:';

/**
 * Loads an image from a source URL and resolves when fully loaded.
 * @param src - The image source URL or data URL.
 * @returns A loaded {@code HTMLImageElement}.
 */
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = src;
  });
}

/**
 * Reads a {@code File} as a data URL string using {@code FileReader}.
 * @param file - The file to read.
 * @returns A data URL representation of the file contents.
 */
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith(FILE_READER_DATA_URL_PREFIX)) {
        reject(new Error('Invalid image file.'));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a {@code File} to a data URL suitable for use as an image source.
 * @param file - The image file to convert.
 * @returns A data URL string.
 */
export async function fileToImageSource(file: File): Promise<string> {
  return readFileAsDataUrl(file);
}

/**
 * Crops an image to a square region and returns the result as a {@code Blob}.
 * Draws the cropped area onto an off-screen canvas.
 * @param imageSrc - Source URL or data URL of the image to crop.
 * @param cropPixels - Pixel-based crop region (x, y, width, height).
 * @param outputType - Output MIME type (defaults to {@code 'image/png'}).
 * @returns A {@code Blob} of the cropped image in the specified format.
 */
export async function cropImageToBlob(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number },
  outputType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create image canvas context.');
  }

  const size = Math.min(cropPixels.width, cropPixels.height);

  canvas.width = size;
  canvas.height = size;

  // Draw as a square and rely on the circular avatar mask in UI.
  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create cropped image blob.'));
          return;
        }

        resolve(blob);
      },
      outputType,
      0.92,
    );
  });
}
