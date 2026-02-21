import { homedir, platform } from 'os';
import { join, isAbsolute, normalize, dirname, extname } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { getConfig } from '../config.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function getDefaultScreenshotsDir(): string {
  const home = homedir();
  const sys = platform();

  const candidates: string[] = [];

  if (sys === 'darwin') {
    candidates.push(
      join(home, 'Pictures', 'Screenshots'),
      join(home, 'Downloads', 'Screenshots'),
      join(home, 'Screenshots')
    );
  } else if (sys === 'win32') {
    const userProfile = process.env.USERPROFILE || home;
    candidates.push(
      join(userProfile, 'Pictures', 'Screenshots'),
      join(userProfile, 'Downloads', 'Screenshots'),
      join(userProfile, 'Screenshots')
    );
  } else {
    const xdgPictures = process.env.XDG_PICTURES_DIR;
    if (xdgPictures) {
      candidates.push(join(xdgPictures, 'Screenshots'));
    }
    candidates.push(
      join(home, 'Pictures', 'Screenshots'),
      join(home, 'Downloads', 'Screenshots'),
      join(home, 'Screenshots')
    );
  }

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0] || join(home, 'Pictures', 'Screenshots');
}

export async function ensureScreenshotsDir(): Promise<string> {
  const config = getConfig();
  const dir = config.screenshotsDir || getDefaultScreenshotsDir();

  if (config.screenshotsAutoCreateDir) {
    await mkdir(dir, { recursive: true });
  }

  return dir;
}

export function resolveScreenshotPath(userPath: string): string {
  if (isAbsolute(userPath)) {
    return normalize(userPath);
  }

  const config = getConfig();
  const baseDir = config.screenshotsDir || getDefaultScreenshotsDir();

  return normalize(join(baseDir, userPath));
}

export function validateScreenshotPath(resolvedPath: string): boolean {
  const config = getConfig();
  const baseDir = config.screenshotsDir || getDefaultScreenshotsDir();
  const normalizedBase = normalize(baseDir);
  const normalizedPath = normalize(resolvedPath);

  return normalizedPath.startsWith(normalizedBase);
}

export function validateFileExtension(filePath: string): void {
  const ext = extname(filePath).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }
}

export function generateScreenshotFilename(tabId?: string): string {
  const config = getConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = tabId || 'unknown';
  const date = new Date().toISOString().split('T')[0];

  const pattern = config.screenshotsNamingPattern || '{timestamp}-{tabId}.jpg';

  return pattern
    .replace('{timestamp}', timestamp)
    .replace('{tabId}', id)
    .replace('{date}', date);
}

export async function saveScreenshotToFile(
  imageBuffer: Buffer,
  userPath?: string,
  tabId?: string
): Promise<{ path: string }> {
  const fs = await import('fs/promises');

  const baseDir = await ensureScreenshotsDir();

  let filePath: string;
  if (userPath) {
    filePath = resolveScreenshotPath(userPath);
  } else {
    filePath = join(baseDir, generateScreenshotFilename(tabId));
  }

  validateFileExtension(filePath);

  if (!validateScreenshotPath(filePath)) {
    throw new Error(
      `Invalid path: ${userPath || filePath}. Path must be within screenshots directory: ${baseDir}`
    );
  }

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  await fs.writeFile(filePath, imageBuffer);

  return { path: filePath };
}
