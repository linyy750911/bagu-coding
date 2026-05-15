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

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case 'read_file': return this.readFile(args.path as string);
      case 'write_file': return this.writeFile(args.path as string, args.content as string);
      case 'search_content': return this.searchContent(args.pattern as string, args.path as string);
      case 'list_files': return this.listFiles(args.path as string);
      default: return { success: false, output: `未知工具: ${name}` };
    }
  }

  private readFile(path: string): ToolResult {
    try {
      const fullPath = join(this.workingDir, path);
      const content = readFileSync(fullPath, 'utf-8');
      return { success: true, output: content };
    } catch (err) {
      return { success: false, output: `读取失败: ${err}` };
    }
  }

  private writeFile(path: string, content: string): ToolResult {
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

  private searchContent(pattern: string, searchPath: string): ToolResult {
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

  private listFiles(path: string): ToolResult {
    try {
      const fullPath = join(this.workingDir, path);
      const entries = readdirSync(fullPath, { withFileTypes: true });
      const listing = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
      return { success: true, output: listing || '空目录' };
    } catch (err) {
      return { success: false, output: `列出失败: ${err}` };
    }
  }

  private collectFilesByLanguages(dir: string): string[] {
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

  private collectFilesWithExts(dir: string, extSet: Set<string>): string[] {
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
