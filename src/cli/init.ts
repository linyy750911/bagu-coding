/**
 * InitCommand — 项目初始化命令 (init.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: targetDir / projectName
 *   输出: 操作结果字符串
 *   数据流向:
 *     targetDir + projectName → 检查 .codebagu.yml 存在性 → 写入默认配置 → 返回结果
 *   修改风险点:
 *     ⚠️ 第24行: 会覆盖同名文件（但已做存在性检查）
 *   最近修改:
 *     2026-05-15: 默认 languages 改为 python（保持向后兼容）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：在项目目录创建默认的 .codebagu.yml 配置文件；不做现有配置合并。
// 承题：依赖 fs、path。前置条件: targetDir 可写。
// [起讲] 降低使用门槛——一行命令 codebagu init 即可生成标准化配置模板
// 入手：N/A

// ==== 起股 ====
// 取：targetDir、projectName
// 验：targetDir 为有效路径

// ==== 中股 ====
// 算：检查 .codebagu.yml 是否已存在
// 算：替换模板中的项目名
// 算：写入配置文件

// ==== 后股 ====
// ✓ 正路径：文件不存在 → 创建成功 → 返回确认
// ✗ 降级路径：文件已存在 → 跳过创建 → 返回提示
// ✗ 降级路径：目录不可写 → 抛出异常（上游处理）

// ==== 束股 ====
// 给出：string（操作结果提示）
// 留下：.codebagu.yml 文件（如创建成功）

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
  // ==== 起股 ====
  // 取：targetDir、projectName
  // 验：targetDir 为字符串

  const configPath = join(targetDir, '.codebagu.yml');
  if (existsSync(configPath)) return '.codebagu.yml 已存在，跳过创建。';

  // ==== 中股 ====
  // 算：替换模板项目名 → 写入文件

  const content = DEFAULT_CONFIG.replace('<项目名>', projectName);
  writeFileSync(configPath, content, 'utf-8');

  // ==== 后股 ====
  // ✓ 正路径：创建成功

  // ==== 束股 ====
  // 给出：string（操作结果）
  // 留下：.codebagu.yml

  return `✅ 已创建 .codebagu.yml (项目: ${projectName})`;
}
