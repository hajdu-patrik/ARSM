const FILE_READER_DATA_URL_PREFIX = 'data:';

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = src;
  });
}

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

export async function fileToImageSource(file: File): Promise<string> {
  return readFileAsDataUrl(file);
}

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
