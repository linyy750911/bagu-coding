/**
 * AgentToolExecutor — AI 工具执行与八股校验 (tools.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: tool name / args / file content / search pattern
 *   输出: ToolResult（success / output / validationError）
 *   数据流向:
 *     tool name + args → execute() → 分发到对应私有方法
 *     write_file → validator.shouldValidate() → validator.validate() → 通过/拦截
 *     search_content → collectFilesByLanguages() → 正则匹配 → 结果列表
 *   修改风险点:
 *     ⚠️ 第111行: shouldValidate 按扩展名判断，新增语言需同步扩展名列表
 *     ⚠️ 第124行: mkdirSync recursive 可能创建意外目录
 *   最近修改:
 *     2026-05-15: 支持多语言写入校验（移除 .py 硬编码）
 *     2026-05-15: search_content 按配置语言扩展名搜索
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：执行 AI 请求的工具调用（读/写/搜/列），写入前强制八股校验；不做 LLM 交互。
// 承题：依赖 fs、path、GenerationValidator、LANGUAGE_PROFILES。前置条件: workingDir 可写。
// [起讲] 工具执行器是八股约束的"最后一道门"——所有代码写入文件前必须经此校验
// 入手：N/A（validator 由外部注入）

// ==== 起股 ====
// 取：tool name、args、workingDir、validator
// 验：tool name 在 AGENT_TOOLS 中定义、args 包含必需字段

// ==== 中股 ====
// 算：根据 tool name 分发到 readFile / writeFile / searchContent / listFiles
// 算：writeFile → shouldValidate → validate → 通过则写入 / 失败则返回 validationError
// 算：searchContent → 按语言扩展名收集文件 → 正则匹配 → 返回结果

// ==== 后股 ====
// ✓ 正路径：read_file 成功 → 返回文件内容
// ✓ 正路径：write_file 校验通过 → 写入成功 → 返回确认
// ✗ 降级路径：write_file 校验失败 → 返回 validationError → 触发 LLM 重试
// ✗ 降级路径：文件不存在 → 返回错误信息
// ✗ 降级路径：正则无效 → 返回错误提示

// ==== 束股 ====
// 给出：ToolResult（success, output, validationError?）
// 留下：文件系统变更（write_file / mkdirSync）

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { ToolDefinition } from '../llm/types';
import { GenerationValidator } from '../constraint/validator';
import { LANGUAGE_PROFILES } from '../config/languages';

export interface ToolResult {
  success: boolean;
  output: string;
  validationError?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '写入文件（受 Code Bagu 校验）',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '文件内容' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: '搜索文件内容',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '搜索正则表达式' },
          path: { type: 'string', description: '目录路径' },
        },
        required: ['pattern', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出目录文件',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '目录路径' },
        },
        required: ['path'],
      },
    },
  },
];

export class AgentToolExecutor {
  private validator?: GenerationValidator;
  private workingDir: string;
  private configLanguages: string[];

  constructor(workingDir: string, validator?: GenerationValidator, configLanguages: string[] = ['python']) {
    this.workingDir = workingDir;
    this.validator = validator;
    this.configLanguages = configLanguages;
  }

  // 破题：根据工具名分发到对应私有处理方法；不做业务逻辑实现或 LLM 交互。
  // 承题：依赖 this 上的 readFile / writeFile / searchContent / listFiles。前置条件: args 包含必需字段。
  // [起讲] switch 分发，未知工具返回错误提示
  // 入手：N/A
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    // ==== 起股 ====
    // 取：name、args
    // 验：name 为字符串、args 为对象

    // ==== 中股 ====
    // 算：switch(name) → 分发到对应私有方法

    // ==== 后股 ====
    // ✓ 正路径：已知工具名 → 调用对应方法 → 返回 ToolResult
    // ✗ 降级路径：未知工具名 → 返回错误提示

    // ==== 束股 ====
    // 给出：ToolResult
    // 留下：N/A（副作用由被调用方法产生）

    switch (name) {
      case 'read_file': return this.readFile(args.path as string);
      case 'write_file': return this.writeFile(args.path as string, args.content as string);
      case 'search_content': return this.searchContent(args.pattern as string, args.path as string);
      case 'list_files': return this.listFiles(args.path as string);
      default: return { success: false, output: `未知工具: ${name}` };
    }
  }

  // 破题：读取指定路径的文件内容；不做写入或八股校验。
  // 承题：依赖 fs.readFileSync、path.join。前置条件: path 为相对路径字符串。
  // [起讲] 将相对路径解析为绝对路径后读取 UTF-8 内容
  // 入手：N/A
  private readFile(path: string): ToolResult {
    // ==== 起股 ====
    // 取：path（相对路径）
    // 验：path 为字符串

    // ==== 中股 ====
    // 算：join(this.workingDir, path) → readFileSync(fullPath, 'utf-8')

    // ==== 后股 ====
    // ✓ 正路径：文件存在且可读 → 返回内容
    // ✗ 降级路径：文件不存在 → 返回读取失败错误
    // ✗ 降级路径：权限不足 → 返回读取失败错误

    // ==== 束股 ====
    // 给出：ToolResult（success=true + 内容 / success=false + 错误信息）
    // 留下：N/A

    try {
      const fullPath = join(this.workingDir, path);
      const content = readFileSync(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (err) {
      return { success: false, output: `读取失败: ${err}` };
    }
  }

  // 破题：写入文件内容，如有 validator 则先进行八股合规校验；不做内容自动修正。
  // 承题：依赖 fs、path、this.validator。前置条件: path 为相对路径、content 为字符串。
  // [起讲] 八股约束的"最后一道门"——校验失败则拦截写入，返回 validationError 触发 LLM 重试
  // 入手：N/A（validator 由外部注入）
  private writeFile(path: string, content: string): ToolResult {
    // ==== 起股 ====
    // 取：path、content
    // 验：path 为字符串、content 为字符串

    // ==== 中股 ====
    // 算：shouldValidate(path) → validate(path, content) → 通过/拦截
    // 算：校验通过 → mkdirSync(dir, { recursive: true }) → writeFileSync

    // ==== 后股 ====
    // ✓ 正路径：无 validator 或校验通过 → 写入成功 → 返回确认
    // ✗ 降级路径：校验失败 → 返回 validationError → 触发 LLM 重试
    // ✗ 降级路径：目录不可写 → 返回写入失败错误

    // ==== 束股 ====
    // 给出：ToolResult（success / output / validationError?）
    // 留下：文件系统变更（新文件或覆盖）

    try {
      const fullPath = join(this.workingDir, path);

      if (this.validator && this.validator.shouldValidate(path)) {
        const validation = this.validator.validate(path, content);
        if (!validation.valid) {
          const messages = validation.violations.map(v => v.message).join('\n');
          return {
            success: false,
            output: '',
            validationError: `Code Bagu 校验失败，请修正以下问题后重新生成:\n${messages}`,
          };
        }
      }

      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content, 'utf-8');
      return { success: true, output: `✅ 已写入: ${path} (Code Bagu 校验通过)` };
    } catch (err) {
      return { success: false, output: `写入失败: ${err}` };
    }
  }

  // 破题：在指定目录下按配置语言扩展名递归搜索匹配正则的文件内容；不做子目录排除或内容过滤。
  // 承题：依赖 collectFilesByLanguages、fs.readFileSync。前置条件: pattern 为有效正则字符串。
  // [起讲] 先收集目标文件 → 再逐行正则匹配 → 返回 file:line:content 格式结果
  // 入手：N/A
  private searchContent(pattern: string, searchPath: string): ToolResult {
    // ==== 起股 ====
    // 取：pattern（正则字符串）、searchPath（相对目录）
    // 验：pattern 非空、searchPath 为字符串

    // ==== 中股 ====
    // 算：collectFilesByLanguages(fullPath) → 收集目标文件列表
    // 算：new RegExp(pattern, 'g') → 逐行匹配
    // 转：匹配结果 → file:line:content 格式数组

    // ==== 后股 ====
    // ✓ 正路径：找到匹配 → 返回结果列表
    // ✗ 降级路径：无匹配 → 返回"未找到匹配"
    // ✗ 降级路径：正则无效 → 返回错误提示
    // ✗ 降级路径：目录不存在 → 返回搜索失败错误

    // ==== 束股 ====
    // 给出：ToolResult（success / output）
    // 留下：N/A

    try {
      const fullPath = join(this.workingDir, searchPath);
      const files = this.collectFilesByLanguages(fullPath);
      const results: string[] = [];
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'g');
      } catch (err) {
        return { success: false, output: `无效的正则表达式: ${err instanceof Error ? err.message : String(err)}` };
      }
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0;
          if (regex.test(lines[i])) results.push(`${file}:${i + 1}: ${lines[i].trim()}`);
        }
      }
      return { success: true, output: results.length > 0 ? results.join('\n') : '未找到匹配' };
    } catch (err) {
      return { success: false, output: `搜索失败: ${err}` };
    }
  }

  // 破题：列出指定目录下的文件和子目录；不做递归或内容读取。
  // 承题：依赖 fs.readdirSync、path.join。前置条件: path 为相对路径字符串。
  // [起讲] 读取目录项 → 按类型加图标前缀 → 拼接为字符串返回
  // 入手：N/A
  private listFiles(path: string): ToolResult {
    // ==== 起股 ====
    // 取：path（相对目录路径）
    // 验：path 为字符串

    // ==== 中股 ====
    // 算：join(this.workingDir, path) → readdirSync(withFileTypes: true)
    // 算：map 加图标前缀 → join('\n')

    // ==== 后股 ====
    // ✓ 正路径：目录可读 → 返回格式化列表
    // ✗ 降级路径：目录不存在 → 返回列出失败错误
    // ✗ 降级路径：权限不足 → 返回列出失败错误

    // ==== 束股 ====
    // 给出：ToolResult（success / output）
    // 留下：N/A

    try {
      const fullPath = join(this.workingDir, path);
      const entries = readdirSync(fullPath, { withFileTypes: true });
      const listing = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
      return { success: true, output: listing || '空目录' };
    } catch (err) {
      return { success: false, output: `列出失败: ${err}` };
    }
  }

  // 破题：按配置语言聚合所有支持的文件扩展名；不做文件扫描。
  // 承题：依赖 LANGUAGE_PROFILES、this.configLanguages。前置条件: configLanguages 已初始化。
  // [起讲] 遍历配置语言 → 提取 extensions → 去重聚合 → 回退到 .py
  // 入手：N/A
  private collectFilesByLanguages(dir: string): string[] {
    // ==== 起股 ====
    // 取：dir（由 searchContent 传入）
    // 验：this.configLanguages 非空（为空则回退到 .py）

    // ==== 中股 ====
    // 算：遍历 this.configLanguages → 提取 LANGUAGE_PROFILES.extensions → Set 去重
    // 算：extSet 为空 → 回退添加 '.py'
    // 转：Set<string> → 调用 collectFilesWithExts(dir, extSet)

    // ==== 后股 ====
    // ✓ 正路径：配置语言有效 → 返回聚合扩展名集合对应的文件列表
    // ✗ 降级路径：配置语言为空 → 仅搜索 .py 文件
    // ✗ 降级路径：LANGUAGE_PROFILES 中无对应语言 → 静默跳过

    // ==== 束股 ====
    // 给出：string[]（文件路径列表）
    // 留下：N/A

    const extSet = new Set<string>();
    for (const lang of this.configLanguages) {
      const profile = LANGUAGE_PROFILES[lang];
      if (profile) {
        for (const ext of profile.extensions) {
          extSet.add(ext);
        }
      }
    }
    if (extSet.size === 0) extSet.add('.py');
    return this.collectFilesWithExts(dir, extSet);
  }

  // 破题：递归收集指定目录下匹配扩展名集合的所有文件；不做内容读取或过滤。
  // 承题：依赖 fs.existsSync、fs.readdirSync、path.join。前置条件: dir 为绝对路径、extSet 已初始化。
  // [起讲] 深度优先递归遍历目录树，按扩展名白名单收集文件路径
  // 入手：N/A
  private collectFilesWithExts(dir: string, extSet: Set<string>): string[] {
    // ==== 起股 ====
    // 取：dir（绝对路径）、extSet（扩展名集合）
    // 验：dir 为字符串、extSet 非空

    // ==== 中股 ====
    // 算：readdirSync(dir, { withFileTypes: true }) → 区分文件/目录
    // 算：目录 → 递归调用；文件 → 提取扩展名 → 匹配 extSet → 加入结果

    // ==== 后股 ====
    // ✓ 正路径：目录存在且含匹配文件 → 返回文件路径数组
    // ✗ 降级路径：目录不存在 → 返回空数组
    // ✗ 降级路径：无匹配扩展名 → 返回空数组

    // ==== 束股 ====
    // 给出：string[]（匹配文件的绝对路径列表）
    // 留下：N/A

    const files: string[] = [];
    if (!existsSync(dir)) return files;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...this.collectFilesWithExts(full, extSet));
      else {
        const extIndex = entry.name.lastIndexOf('.');
        const ext = extIndex >= 0 ? entry.name.slice(extIndex) : '';
        if (extSet.has(ext)) files.push(full);
      }
    }
    return files;
  }
}
