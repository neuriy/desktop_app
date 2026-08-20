import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.env.NEURIY_AGI_DATA || path.resolve(process.cwd(), '..', 'data', 'agi');

export function dataPath(...parts: string[]): string {
  return path.join(ROOT, ...parts);
}

export function ensureDataDirs(): void {
  for (const dir of ['memory', 'knowledge', 'tasks', 'events', 'approvals', 'workspace']) {
    fs.mkdirSync(dataPath(dir), { recursive: true });
  }
}

export function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

export function appendJsonl(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, 'utf8');
}

export { ROOT as AGI_DATA_ROOT };
