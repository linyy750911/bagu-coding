/**
 * ===================================================================
 * 模块名:        config/schema.ts
 * 输入输出:      原始未知对象 → 类型安全的 CodeBaguConfig
 * 数据流向:      YAML/JSON 解析结果 → validateConfig() → 标准化配置对象
 * 修改风险点:    新增规则字段时需同步更新 VALID_SEVERITIES 和 requiredRules
 * 最近修改:      2026-05-15 — 补充缺失规则校验，新增 ci 字段验证
 * ===================================================================
 */

import { CodeBaguConfig, RuleSeverity } from './types';

// 破题：本模块不做业务逻辑，只做配置对象的形状校验与默认值填充。
// 承题：将外部输入（CLI 读取的 YAML/JSON）转译为内部强类型结构，
//       确保 version / project / languages / rules 四字段齐全，
//       否则在启动阶段尽早失败，避免将错误配置传递到引擎。
// [起讲] 任何新增配置字段必须在此添加校验规则，并同步更新 types.ts 接口。
// 入手：校验遵循"先必填后选填"原则，先断言对象类型，再逐字段验证。

const VALID_SEVERITIES: RuleSeverity[] = ['required', 'optional', 'warn', 'off'];

// ==== 起股 ====
// 取：接收一个运行时未知对象（来自 yaml.parse() 的结果）。
// 验：逐字段校验类型与取值范围，不通过则直接抛出 Error。
// ==== 中股 ====
// 算：遍历 requiredRules 列表，检查每条规则 severity 是否合法；
//     检查 ci.strict / ci.format 的类型与枚举值；
//     过滤未知规则键，防止拼写错误静默通过。
// 转：将校验通过的原始值组装为标准化的 CodeBaguConfig 对象返回。
// ==== 后股 ====
// ✓ 正路径：所有字段合法 → 返回完整的 CodeBaguConfig
// ✗ 降级路径：version 缺失 → 抛出异常，阻止启动
// ✗ 降级路径：未知规则键 → 抛出异常，提示拼写错误
// ==== 束股 ====
// 给出：返回类型安全的配置对象，供引擎和 CLI 使用。
// 留下：ci 字段提供默认值（strict=false, format='text'），保证向下兼容。
export function validateConfig(raw: unknown): CodeBaguConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('配置必须是一个对象');
  }
  const config = raw as Record<string, unknown>;

  if (!config.version || typeof config.version !== 'string') {
    throw new Error('缺少 version 字段');
  }
  if (!config.project || typeof config.project !== 'string') {
    throw new Error('缺少 project 字段');
  }
  if (!Array.isArray(config.languages) || config.languages.length === 0) {
    throw new Error('languages 必须是非空数组');
  }
  if (!config.rules || typeof config.rules !== 'object') {
    throw new Error('缺少 rules 字段');
  }

  const rules = config.rules as Record<string, unknown>;
  const requiredRules = ['tuopu_header', 'bagu_paragraphs', 'anti_duality', 'empty_bagu', 'format_consistency'];
  for (const key of requiredRules) {
    const val = rules[key];
    if (typeof val !== 'string' || !VALID_SEVERITIES.includes(val as RuleSeverity)) {
      throw new Error(`rules.${key} 必须是 ${VALID_SEVERITIES.join('|')} 之一，当前值: ${val}`);
    }
  }

  const knownRules = new Set(requiredRules);
  for (const key of Object.keys(rules)) {
    if (!knownRules.has(key)) {
      throw new Error(`未知的规则: rules.${key}`);
    }
  }

  const ci = config.ci as Record<string, unknown> | undefined;
  if (ci?.strict !== undefined && typeof ci.strict !== 'boolean') {
    throw new Error('ci.strict 必须是布尔值');
  }
  const ciFormat = ci?.format;
  if (ciFormat !== undefined && ciFormat !== 'text' && ciFormat !== 'json') {
    throw new Error('ci.format 必须是 text 或 json');
  }

  return {
    version: config.version as string,
    project: config.project as string,
    languages: config.languages as string[],
    rules: rules as unknown as CodeBaguConfig['rules'],
    ci: {
      strict: ci?.strict === true,
      format: (ci?.format as 'text' | 'json') || 'text',
    },
  };
}
