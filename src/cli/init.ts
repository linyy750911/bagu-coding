import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_CONFIG = `version: "1.0"
project: "<项目名>"

languages:
  - python

rules:
  tuopu_header: required
  bagu_paragraphs: required
  anti_duality: required
  empty_bagu: warn
  format_consistency: required

ci:
  strict: true
  format: text
`;

export function runInit(targetDir: string, projectName: string): string {
  const configPath = join(targetDir, '.codebagu.yml');
  if (existsSync(configPath)) return '.codebagu.yml 已存在，跳过创建。';
  const content = DEFAULT_CONFIG.replace('<项目名>', projectName);
  writeFileSync(configPath, content, 'utf-8');
  return `✅ 已创建 .codebagu.yml (项目: ${projectName})`;
}
