/**
 * LanguageRegistry — 语言配置注册表 (languages.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: filePath, configLanguages
 *   输出: LanguageProfile → 约束规则引擎
 *   数据流向:
 *     filePath → detectLanguage → language id
 *     language id → getProfile → LanguageProfile
 *     LanguageProfile → topology/bagu/format/duality/empty-bagu 规则
 * 修改风险点:
 *   ⚠️ 第1行: 新增语言时必须同步更新所有规则测试
 * 最近修改:
 *   2026-05-15: 支持 TypeScript / Go / Rust / Java / C / C++ / Ruby / SQL / Shell
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：提供多语言配置注册表；不做语法解析。
// 承题：依赖 LanguageProfile 接口。前置条件: 语言 ID 唯一。
// [起讲] 将注释语法、文档头策略、函数检测正则统一抽象为语言配置
// 入手：N/A

// 设计决策:
// ✓ 正路径：支持 docstring / docblock / prefixLines 三种文档头策略
// ✗ 降级路径：不支持 Lisp / Haskell 等小众语言（社区需求低）

export type TopologyStrategy =
  | { type: 'docstring'; start: string; end: string }
  | { type: 'docblock'; start: string; end: string }
  | { type: 'prefixLines'; prefix: string };

export interface LanguageProfile {
  id: string;
  name: string;
  extensions: string[];
  lineComment: string;
  blockComment?: { start: string; end: string };
  topologyStrategy: TopologyStrategy;
  functionPattern: RegExp;
}

export const LANGUAGE_PROFILES: Record<string, LanguageProfile> = {
  python: {
    id: 'python',
    name: 'Python',
    extensions: ['.py'],
    lineComment: '#',
    topologyStrategy: { type: 'docstring', start: '"""', end: '"""' },
    functionPattern: /def\s+\w+\s*\(/,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:function|const|let|var)\s+\w+\s*[=:]\s*(?:\([^)]*\)\s*=>|function\s*\()/,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:function|const|let|var)\s+\w+\s*[=:]\s*(?:\([^)]*\)\s*=>|function\s*\()/,
  },
  java: {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:public|private|protected|static|\s)+\s*\w+\s+\w+\s*\(/,
  },
  go: {
    id: 'go',
    name: 'Go',
    extensions: ['.go'],
    lineComment: '//',
    topologyStrategy: { type: 'prefixLines', prefix: '//' },
    functionPattern: /func\s+(?:\([^)]+\)\s+)?\w+\s*\(/,
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    extensions: ['.rs'],
    lineComment: '//',
    topologyStrategy: { type: 'prefixLines', prefix: '///' },
    functionPattern: /fn\s+\w+\s*\(/,
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    extensions: ['.rb'],
    lineComment: '#',
    topologyStrategy: { type: 'prefixLines', prefix: '#' },
    functionPattern: /def\s+\w+/,
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    extensions: ['.sql'],
    lineComment: '--',
    topologyStrategy: { type: 'prefixLines', prefix: '--' },
    functionPattern: /(?:CREATE|ALTER|DROP)\s+(?:FUNCTION|PROCEDURE|TRIGGER|VIEW|TABLE)\s+/i,
  },
  shell: {
    id: 'shell',
    name: 'Shell/Bash',
    extensions: ['.sh', '.bash', '.zsh'],
    lineComment: '#',
    topologyStrategy: { type: 'prefixLines', prefix: '#' },
    functionPattern: /(?:function\s+\w+|\w+\s*\(\s*\))\s*\{/,
  },
  c: {
    id: 'c',
    name: 'C',
    extensions: ['.c', '.h'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:static|inline|extern|\s)*\s*\w+\s+\w+\s*\([^)]*\)\s*\{/,
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:static|inline|virtual|extern|\s)*\s*\w+(?:<[^>]+>)?\s+\w+\s*\([^)]*\)(?:\s*const)?\s*\{/,
  },
  dart: {
    id: 'dart',
    name: 'Dart',
    extensions: ['.dart'],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    topologyStrategy: { type: 'docblock', start: '/**', end: '*/' },
    functionPattern: /(?:void|Future|Widget|String|int|double|bool|dynamic|\w+)(?:<[^>]+>)?\s+\w+\s*\(/,
  },
};

export function detectLanguage(filePath: string, configLanguages: string[]): string {
  const extIndex = filePath.lastIndexOf('.');
  const ext = extIndex >= 0 ? filePath.slice(extIndex).toLowerCase() : '';
  for (const lang of configLanguages) {
    const profile = LANGUAGE_PROFILES[lang];
    if (profile && profile.extensions.includes(ext)) return lang;
  }
  return configLanguages[0] || 'python';
}

export function getProfile(language: string): LanguageProfile {
  return LANGUAGE_PROFILES[language] || LANGUAGE_PROFILES['python'];
}
