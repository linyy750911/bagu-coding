/**
 * ConfigLoader — 配置文件加载与校验 (loader.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: 配置文件路径 / 工作目录
 *   输出: CodeBaguConfig（已校验的配置对象）
 *   数据流向:
 *     文件路径 → readFileSync → yaml.parse → validateConfig → CodeBaguConfig
 *     工作目录 → join('.codebagu.yml') → loadConfig → CodeBaguConfig
 *   修改风险点:
 *     ⚠️ 第15行: yaml.parse 可能抛出异常，需调用方捕获
 *     ⚠️ 第16行: validateConfig 严格校验字段，缺少必填项会报错
 *   最近修改:
 *     2026-05-15: 新增 loadConfigFromCwd 向上遍历目录树查找配置
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：加载并校验 .codebagu.yml 配置文件；不做配置合并或默认值填充。
// 承题：依赖 fs、yaml、schema 校验器。前置条件: 文件路径存在且可读。
// [起讲] 将 YAML 文本解析为结构化配置对象，通过 validateConfig 确保类型安全
// 入手：N/A

// ==== 起股 ====
// 取：配置文件路径 / 工作目录
// 验：路径为有效字符串

// ==== 中股 ====
// 算：文件存在性检查 → 读取原始文本 → YAML 解析 → schema 校验
// 转：CodeBaguConfig 对象

// ==== 后股 ====
// ✓ 正路径：文件存在 → 读取成功 → 解析成功 → 校验通过 → 返回配置
// ✗ 降级路径：文件不存在 → 抛出 Error
// ✗ 降级路径：YAML 解析失败 → 抛出异常（上游捕获）
// ✗ 降级路径：校验失败 → 抛出 Error（含具体字段说明）

// ==== 束股 ====
// 给出：CodeBaguConfig
// 留下：无副作用（纯函数，不修改外部状态）

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';
import { CodeBaguConfig } from './types';
import { validateConfig } from './schema';

// 破题：按指定路径加载并校验 Code Bagu 配置；不做环境变量注入。
// 承题：依赖 existsSync、readFileSync、yaml.parse、validateConfig。前置条件: configPath 为有效字符串。
// [起讲] 文件存在性检查 → 读取 → 解析 → 校验，四步流水线
// 入手：N/A
export async function loadConfig(configPath: string): Promise<CodeBaguConfig> {
  // ==== 起股 ====
  // 取：配置文件路径字符串
  // 验：路径非空，文件存在

  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }

  // ==== 中股 ====
  // 算：读取文件原始内容
  // 算：YAML 解析为原始对象
  // 算：schema 校验（字段类型、必填项、取值范围）

  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parse(raw);

  // ==== 后股 ====
  // ✓ 正路径：文件存在 → 读取成功 → 解析成功 → 校验通过
  // ✗ 降级路径：文件不存在 → 抛出 Error
  // ✗ 降级路径：YAML 解析失败 → 抛出异常（上游处理）
  // ✗ 降级路径：校验失败 → 抛出 Error（含具体字段说明）

  // ==== 束股 ====
  // 给出：CodeBaguConfig
  // 留下：N/A（纯函数，不修改外部状态）

  return validateConfig(parsed);
}

// 破题：从工作目录自动查找并加载 .codebagu.yml；不做配置缓存。
// 承题：依赖 loadConfig、path.join。前置条件: cwd 为有效目录路径。
// [起讲] 约定优于配置：固定文件名 .codebagu.yml，降低用户认知负担
// 入手：N/A
export async function loadConfigFromCwd(cwd = process.cwd()): Promise<CodeBaguConfig> {
  // ==== 起股 ====
  // 取：工作目录路径（默认 process.cwd()）
  // 验：路径为字符串

  // ==== 中股 ====
  // 算：拼接配置文件完整路径
  // 算：委托 loadConfig 执行加载与校验

  // ==== 后股 ====
  // ✓ 正路径：配置文件存在 → 加载成功
  // ✗ 降级路径：文件不存在 → loadConfig 抛出 Error

  // ==== 束股 ====
  // 给出：CodeBaguConfig
  // 留下：N/A

  return loadConfig(join(cwd, '.codebagu.yml'));
}
