import * as fs from 'fs';
import * as path from 'path';

const AVATAR_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');

export function ensureCleanAvatarStorage(): void {
  if (fs.existsSync(AVATAR_DIR)) {
    fs.rmSync(AVATAR_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

export function listStoredAvatars(): string[] {
  if (!fs.existsSync(AVATAR_DIR)) {
    return [];
  }

  return fs.readdirSync(AVATAR_DIR);
}
