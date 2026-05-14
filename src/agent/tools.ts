import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { ToolDefinition } from '../llm/types';
import { GenerationValidator } from '../constraint/validator';

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

  constructor(workingDir: string, validator?: GenerationValidator) {
    this.workingDir = workingDir;
    this.validator = validator;
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

      if (this.validator && path.endsWith('.py')) {
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
      const files = this.collectFiles(fullPath, '.py');
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

  private collectFiles(dir: string, ext: string): string[] {
    const files: string[] = [];
    if (!existsSync(dir)) return files;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...this.collectFiles(full, ext));
      else if (entry.name.endsWith(ext)) files.push(full);
    }
    return files;
  }
}
