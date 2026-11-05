import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

const configuredUploadDir = process.env.UPLOAD_DIR || './uploads';
const BASE_DIR = path.isAbsolute(configuredUploadDir)
  ? configuredUploadDir
  : path.join(/*turbopackIgnore: true*/ process.cwd(), configuredUploadDir);

export async function ensureUploadDir(sub = ''): Promise<void> {
  await fs.mkdir(path.join(BASE_DIR, sub), { recursive: true });
}

export function uploadDir(sub = ''): string {
  return path.join(BASE_DIR, sub);
}

export function safeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path
    .basename(original, ext)
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'file';
  return `${base}-${uuidv4()}${ext || '.bin'}`;
}

export async function savePdf(tempPath: string, originalName: string): Promise<{
  filename: string;
  absolutePath: string;
  size: number;
}> {
  await ensureUploadDir();
  const filename = safeFilename(originalName);
  const absolutePath = path.join(BASE_DIR, filename);
  await fs.rename(tempPath, absolutePath).catch(async () => {
    // Fallback for cross-device rename
    const data = await fs.readFile(tempPath);
    await fs.writeFile(absolutePath, data);
    await fs.unlink(tempPath).catch(() => void 0);
  });
  const stat = await fs.stat(absolutePath);
  return { filename, absolutePath, size: stat.size };
}

export async function removeFile(filename: string): Promise<void> {
  if (!filename) return;
  const abs = path.join(BASE_DIR, path.basename(filename));
  await fs.unlink(abs).catch(() => void 0);
}

export function streamFile(filename: string) {
  const abs = path.join(BASE_DIR, path.basename(filename));
  return createReadStream(abs);
}

export async function statFile(filename: string) {
  const abs = path.join(BASE_DIR, path.basename(filename));
  return fs.stat(abs);
}

export function absolutePathOf(filename: string): string {
  return path.join(BASE_DIR, path.basename(filename));
}
