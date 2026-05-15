/**
 * LanguageRegistry — 语言注册与自动检测 (registry.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: 文件路径 / 语言标识符
 *   输出: LanguageConfig / null
 *
 *   数据流向:
 *     文件路径 → 提取扩展名 → 遍历 REGISTRY 匹配 → 返回 LanguageConfig
 *     语言标识符 → 字典直接查找 → 返回 LanguageConfig
 *     语言列表 → 聚合扩展名集合 → 返回 string[]
 *
 * 修改风险点:
 *   ⚠️ 第45行: 新增语言时扩展名冲突（如 .h 同时被 C 和 C++ 声明）
 *   ⚠️ 第60行: 未知语言返回 null，调用方需做空值处理
 *   ⚠️ 第75行: getAllExtensions 聚合时可能产生重复扩展名
 *
 * 最近修改:
 *   2026-05-15: 多语言改造，支持 11 种语言
 *   2026-05-15: 新增 getAllExtensions 聚合函数
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：提供语言配置查询与文件扩展名自动匹配；不做语法解析或 AST 分析。
// 承题：无外部依赖。前置条件: 语言配置已在 REGISTRY 中静态注册。
// [起讲] 集中管理所有支持语言的元数据（注释符、扩展名、文档头策略），
//        避免各规则文件硬编码语言特定逻辑
// 入手：N/A

// ==== 起股 ====
// 取：文件路径字符串 / 语言标识符字符串
// 验：路径非空、标识符存在于 REGISTRY

// ==== 中股 ====
// 算：提取文件扩展名 → 遍历匹配 → 返回配置
// 算：标识符字典查找 → 返回配置
// 算：多语言扩展名聚合 → 去重返回
// 转：LanguageConfig 对象 / null

// ==== 后股 ====
// ✓ 正路径：扩展名匹配成功 → 返回完整 LanguageConfig
// ✓ 正路径：标识符查找成功 → 返回完整 LanguageConfig
// ✗ 降级路径：扩展名无匹配 → 返回 null（调用方按未知语言处理）
// ✗ 降级路径：标识符不存在 → 返回 null（调用方按未知语言处理）
// ✗ 降级路径：路径无扩展名 → 返回 null（如 Makefile）

// ==== 束股 ====
// 给出：LanguageConfig | null
// 留下：无副作用（纯函数，不修改外部状态）

export interface LanguageConfig {
  id: string;
  extensions: string[];
  commentChar: string;
  docstringDelimiters: [string, string];
}

const REGISTRY: Record<string, LanguageConfig> = {
  python: {
    id: 'python',
    extensions: ['.py'],
    commentChar: '#',
    docstringDelimiters: ['"""', '"""'],
  },
  typescript: {
    id: 'typescript',
    extensions: ['.ts', '.tsx'],
    commentChar: '//',
    docstringDelimiters: ['/**', '*/'],
  },
  javascript: {
    id: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    commentChar: '//',
    docstringDelimiters: ['/**', '*/'],
  },
  java: {
    id: 'java',
    extensions: ['.java'],
    commentChar: '//',
    docstringDelimiters: ['/**', '*/'],
  },
  go: {
    id: 'go',
    extensions: ['.go'],
    commentChar: '//',
    docstringDelimiters: ['', ''],
  },
  rust: {
    id: 'rust',
    extensions: ['.rs'],
    commentChar: '//',
    docstringDelimiters: ['', ''],
  },
  ruby: {
    id: 'ruby',
    extensions: ['.rb'],
    commentChar: '#',
    docstringDelimiters: ['', ''],
  },
  sql: {
    id: 'sql',
    extensions: ['.sql'],
    commentChar: '--',
    docstringDelimiters: ['', ''],
  },
  shell: {
    id: 'shell',
    extensions: ['.sh', '.bash', '.zsh'],
    commentChar: '#',
    docstringDelimiters: ['', ''],
  },
  c: {
    id: 'c',
    extensions: ['.c', '.h'],
    commentChar: '//',
    docstringDelimiters: ['/**', '*/'],
  },
  cpp: {
    id: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    commentChar: '//',
    docstringDelimiters: ['/**', '*/'],
  },
};

// 破题：根据文件扩展名自动识别编程语言配置；不做语法内容分析。
// 承题：依赖 REGISTRY 常量。前置条件: 文件路径包含扩展名。
// [起讲] 通过扩展名反向查找语言配置，支持多扩展名语言（如 .ts/.tsx）
// 入手：N/A
export function detectLanguage(filePath: string): LanguageConfig | null {
  // ==== 起股 ====
  // 取：文件路径字符串
  // 验：路径非空

  // ==== 中股 ====
  // 算：提取文件扩展名
  // 算：遍历 REGISTRY 匹配

  // ==== 后股 ====
  // ✓ 正路径：扩展名匹配成功 → 返回 LanguageConfig
  // ✗ 降级路径：扩展名无匹配 → 返回 null
  // ✗ 降级路径：路径无扩展名 → 返回 null

  // ==== 束股 ====
  // 给出：LanguageConfig | null
  // 留下：N/A

  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const ext = filePath.slice(dotIndex).toLowerCase();
  for (const config of Object.values(REGISTRY)) {
    if (config.extensions.includes(ext)) {
      return config;
    }
  }

  return null;
}

// 破题：按语言标识符直接获取配置；不做模糊匹配。
// 承题：依赖 REGISTRY 常量。前置条件: 标识符为字符串。
// [起讲] 字典直接查找，O(1) 复杂度
// 入手：N/A
export function getLanguage(id: string): LanguageConfig | null {
  // ==== 起股 ====
  // 取：语言标识符
  // 验：非空

  // ==== 中股 ====
  // 算：REGISTRY[id] 查找

  // ==== 后股 ====
  // ✓ 正路径：存在返回配置
  // ✗ 降级路径：不存在返回 null

  // ==== 束股 ====
  // 给出：LanguageConfig | null
  // 留下：N/A

  return REGISTRY[id] || null;
}

// 破题：返回所有支持的语言标识符列表；不做排序或过滤。
// 承题：依赖 REGISTRY 常量。前置条件: REGISTRY 已初始化。
// [起讲] 用于配置校验和自动补全提示
// 入手：N/A
export function supportedLanguages(): string[] {
  // ==== 起股 ====
  // 取：N/A（无参数）
  // 验：N/A

  // ==== 中股 ====
  // 算：Object.keys(REGISTRY)

  // ==== 后股 ====
  // ✓ 正路径：返回标识符数组

  // ==== 束股 ====
  // 给出：string[]
  // 留下：N/A

  return Object.keys(REGISTRY);
}

// 破题：按语言列表聚合所有扩展名；不做去重（调用方处理）。
// 承题：依赖 getLanguage。前置条件: languageIds 为有效数组。
// [起讲] 用于 CLI 文件扫描时一次性获取所有待匹配扩展名
// 入手：N/A
export function getAllExtensions(languageIds: string[]): string[] {
  // ==== 起股 ====
  // 取：语言标识符数组
  // 验：数组非空

  // ==== 中股 ====
  // 算：遍历语言 → 获取配置 → 提取扩展名 → 扁平化数组

  // ==== 后股 ====
  // ✓ 正路径：返回聚合扩展名数组
  // ✗ 降级路径：空数组返回 []
  // ✗ 降级路径：无效语言标识符静默跳过

  // ==== 束股 ====
  // 给出：string[]
  // 留下：N/A

  const result: string[] = [];
  for (const id of languageIds) {
    const config = getLanguage(id);
    if (config) {
      result.push(...config.extensions);
    }
  }
  return result;
}
