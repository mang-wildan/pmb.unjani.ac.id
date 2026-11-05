import sharp from 'sharp';

const DEFAULT_MAX_BYTES = 300 * 1024;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const QUALITY_STEPS = [82, 72, 62, 52, 42, 32];
const SCALE_STEPS = [1, 0.85, 0.7, 0.55, 0.4];

export type PublicImageOptions = {
  maxBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
};

export type ProcessedPublicImage = {
  buffer: Buffer;
  extension: 'webp';
  mimeType: 'image/webp';
  width: number;
  height: number;
};

export async function processPublicImage(
  input: Buffer,
  options: PublicImageOptions = {},
): Promise<ProcessedPublicImage> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;

  if (maxBytes <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    throw new RangeError('Batas pemrosesan gambar harus lebih besar dari nol');
  }

  const source = sharp(input, {
    failOn: 'error',
    limitInputPixels: 40_000_000,
  }).rotate();

  for (const scale of SCALE_STEPS) {
    const width = Math.max(1, Math.round(maxWidth * scale));
    const height = Math.max(1, Math.round(maxHeight * scale));

    for (const quality of QUALITY_STEPS) {
      const result = await source
        .clone()
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      if (result.data.length <= maxBytes) {
        return {
          buffer: result.data,
          extension: 'webp',
          mimeType: 'image/webp',
          width: result.info.width,
          height: result.info.height,
        };
      }
    }
  }

  throw new Error(`Gambar tidak dapat dipadatkan hingga ${maxBytes} byte`);
}
