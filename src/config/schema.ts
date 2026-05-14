import { CodeBaguConfig, RuleSeverity } from './types';

const VALID_SEVERITIES: RuleSeverity[] = ['required', 'optional', 'warn', 'off'];

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
