import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';
import { CodeBaguConfig } from './types';
import { validateConfig } from './schema';

export async function loadConfig(configPath: string): Promise<CodeBaguConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parse(raw);
  return validateConfig(parsed);
}

export async function loadConfigFromCwd(cwd = process.cwd()): Promise<CodeBaguConfig> {
  return loadConfig(join(cwd, '.codebagu.yml'));
}
