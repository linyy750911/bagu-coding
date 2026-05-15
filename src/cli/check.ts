/**
 * CheckCommand — 离线合规检查命令 (check.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: inputPath / CodeBaguConfig / CheckOptions
 *   输出: CheckResult（output / exitCode）
 *   数据流向:
 *     inputPath → collectFiles() → 遍历文件 → engine.evaluate() → reporter → CheckResult
 *   修改风险点:
 *     ⚠️ 第23行: IGNORED_DIRS 硬编码，新增构建目录需手动添加
 *     ⚠️ 第39行: extSet 为空时默认回退到 .py
 *   最近修改:
 *     2026-05-15: 支持多语言文件扫描，按配置扩展名收集
 *     2026-05-15: JSON 输出改为 JSONL 逐行格式
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：对指定路径的代码文件执行离线 Code Bagu 合规检查；不做自动修正。
// 承题：依赖 ConstraintEngine、Reporter、fs。前置条件: inputPath 存在且可读。
// [起讲] 批量扫描文件 → 逐条规则校验 → 按格式输出结果 → 返回退出码
// 入手：N/A

// ==== 起股 ====
// 取：inputPath、config、options（format/strict）
// 验：inputPath 有效、config 已校验

// ==== 中股 ====
// 算：collectFiles → 按扩展名过滤收集待检查文件
// 算：遍历文件 → engine.evaluate → reporter 格式化
// 算：strict 模式下 warning 也计入错误

// ==== 后股 ====
// ✓ 正路径：全部通过 → exitCode = 0
// ✗ 降级路径：存在 error → exitCode = 1
// ✗ 降级路径：strict 模式下存在 warning → exitCode = 1

// ==== 束股 ====
// 给出：CheckResult（output, exitCode）
// 留下：无

import { readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { ConstraintEngine } from '../constraint/engine';
import { TopoHeaderRule } from '../constraint/rules/topology';
import { BaguParagraphsRule } from '../constraint/rules/bagu';
import { DualityRule } from '../constraint/rules/duality';
import { FormatRule } from '../constraint/rules/format';
import { EmptyBaguRule } from '../constraint/rules/empty-bagu';
import { Reporter } from '../constraint/reporter';
import { CodeBaguConfig } from '../config/types';
import { detectLanguage, LANGUAGE_PROFILES } from '../config/languages';

// 破题：根据配置创建约束引擎实例；不做重复利用或缓存。
// 承题：依赖各规则类。前置条件: config 已校验。
// [起讲] 工厂函数，统一组装所有规则到引擎中
// 入手：N/A
function createEngine(config: CodeBaguConfig): ConstraintEngine {
  // ==== 起股 ====
  // 取：config
  // 验：config 非空

  // ==== 中股 ====
  // 算：实例化所有规则 → 传入 ConstraintEngine

  // ==== 后股 ====
  // ✓ 正路径：返回初始化好的引擎

  // ==== 束股 ====
  // 给出：ConstraintEngine
  // 留下：N/A

  return new ConstraintEngine(config, [
    new TopoHeaderRule(),
    new BaguParagraphsRule(),
    new DualityRule(),
    new FormatRule(),
    new EmptyBaguRule(),
  ]);
}

const IGNORED_DIRS = new Set(['node_modules', '__pycache__', '.git', 'venv', '.venv', 'dist', 'build']);

// 破题：递归收集待检查的文件列表；不做文件内容读取。
// 承题：依赖 fs、LANGUAGE_PROFILES。前置条件: inputPath 存在。
// [起讲] 按配置语言的扩展名白名单过滤，避免扫描无关文件（如 node_modules）
// 入手：N/A
function collectFiles(inputPath: string, configLanguages: string[]): string[] {
  // ==== 起股 ====
  // 取：inputPath、configLanguages
  // 验：路径存在

  const stat = statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) throw new Error(`路径不存在: ${inputPath}`);

  // ==== 中股 ====
  // 算：根据 configLanguages 构建扩展名白名单
  // 算：递归遍历目录 → 过滤忽略目录 → 匹配扩展名

  const extSet = new Set<string>();
  for (const lang of configLanguages) {
    const profile = LANGUAGE_PROFILES[lang];
    if (profile) {
      for (const ext of profile.extensions) {
        extSet.add(ext);
      }
    }
  }
  if (extSet.size === 0) extSet.add('.py');

  const files: string[] = [];
  const entries = readdirSync(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(inputPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, configLanguages));
    } else {
      const extIndex = entry.name.lastIndexOf('.');
      const ext = extIndex >= 0 ? entry.name.slice(extIndex) : '';
      if (extSet.has(ext)) {
        files.push(full);
      }
    }
  }

  // ==== 后股 ====
  // ✓ 正路径：返回匹配的文件列表
  // ✗ 降级路径：无匹配文件 → 返回 []

  // ==== 束股 ====
  // 给出：string[]（文件路径列表）
  // 留下：N/A

  return files;
}

export interface CheckOptions {
  format: 'text' | 'json';
  strict: boolean;
}

export interface CheckResult {
  output: string;
  exitCode: number;
}

// 破题：执行批量合规检查并返回格式化结果；不做单个文件修正。
// 承题：依赖 createEngine、collectFiles、Reporter。前置条件: inputPath 和 config 有效。
// [起讲] 批量检查的核心编排——收集→校验→汇总→格式化→返回退出码
// 入手：N/A
export function runCheck(inputPath: string, config: CodeBaguConfig, options: CheckOptions): CheckResult {
  // ==== 起股 ====
  // 取：inputPath、config、options
  // 验：config 非空

  const engine = createEngine(config);
  const reporter = new Reporter();
  const files = collectFiles(inputPath, config.languages);
  const results: string[] = [];
  let hasErrors = false;

  // ==== 中股 ====
  // 算：遍历文件 → 读取内容 → 检测语言 → engine.evaluate → 格式化结果

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const language = detectLanguage(file, config.languages);
    const result = engine.evaluate({
      filePath: file,
      source,
      language,
    });

    if (options.format === 'json') {
      results.push(reporter.json(result));
    } else {
      results.push(reporter.text(result));
    }

    if (!result.passed) hasErrors = true;
    if (options.strict) {
      const warnings = result.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) hasErrors = true;
    }
  }

  // ==== 后股 ====
  // ✓ 正路径：全部通过 → exitCode = 0
  // ✗ 降级路径：存在违规 → exitCode = 1

  // ==== 束股 ====
  // 给出：CheckResult（output, exitCode）
  // 留下：N/A

  const exitCode = hasErrors ? 1 : 0;

  if (options.format === 'json') {
    return { output: results.join('\n'), exitCode };
  }

  return { output: results.join('\n\n'), exitCode };
}
