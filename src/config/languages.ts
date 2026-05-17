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

// ==== 起股 ====
// 取：N/A（静态配置，无运行时输入）
// 验：N/A

// ==== 中股 ====
// 算：定义 LanguageProfile 接口与 12 种语言配置
// 算：detectLanguage → 按扩展名匹配语言 ID
// 算：getProfile → 按 ID 返回配置（回退到 python）
// 转：字符串 → LanguageProfile

// ==== 后股 ====
// ✓ 正路径：扩展名匹配 → 返回正确语言 ID
// ✓ 正路径：已知 ID → 返回完整配置
// ✗ 降级路径：未知扩展名 → 回退到 configLanguages[0]
// ✗ 降级路径：未知 ID → 回退到 python

// ==== 束股 ====
// 给出：LanguageProfile / language id
// 留下：N/A（纯静态数据 + 纯函数）

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

// 破题：根据文件扩展名检测语言标识符；不做内容分析或语法解析。
// 承题：依赖 LANGUAGE_PROFILES。前置条件: filePath 含扩展名、configLanguages 非空。
// [起讲] 扩展名反向查找——支持多扩展名语言（如 .ts/.tsx）
// 入手：N/A
export function detectLanguage(filePath: string, configLanguages: string[]): string {
  // ==== 起股 ====
  // 取：filePath、configLanguages
  // 验：configLanguages 非空

  // ==== 中股 ====
  // 算：提取扩展名 → 遍历 configLanguages → 匹配 LANGUAGE_PROFILES.extensions

  // ==== 后股 ====
  // ✓ 正路径：扩展名匹配成功 → 返回对应语言 ID
  // ✗ 降级路径：无匹配 → 回退到 configLanguages[0]
  // ✗ 降级路径：configLanguages 为空 → 回退到 'python'

  // ==== 束股 ====
  // 给出：language id（string）
  // 留下：N/A

  const extIndex = filePath.lastIndexOf('.');
  const ext = extIndex >= 0 ? filePath.slice(extIndex).toLowerCase() : '';
  for (const lang of configLanguages) {
    const profile = LANGUAGE_PROFILES[lang];
    if (profile && profile.extensions.includes(ext)) return lang;
  }
  return configLanguages[0] || 'python';
}

// 破题：按语言标识符获取对应配置；不做扩展名反向查找。
// 承题：依赖 LANGUAGE_PROFILES。前置条件: language 为字符串。
// [起讲] 字典直接查找，O(1) 复杂度，失败回退到 python
// 入手：N/A
export function getProfile(language: string): LanguageProfile {
  // ==== 起股 ====
  // 取：language 标识符
  // 验：N/A

  // ==== 中股 ====
  // 算：LANGUAGE_PROFILES[language] 查找

  // ==== 后股 ====
  // ✓ 正路径：ID 存在 → 返回完整配置
  // ✗ 降级路径：ID 不存在 → 回退到 python 配置

  // ==== 束股 ====
  // 给出：LanguageProfile
  // 留下：N/A

  return LANGUAGE_PROFILES[language] || LANGUAGE_PROFILES['python'];
}
