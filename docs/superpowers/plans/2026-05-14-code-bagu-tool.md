# code_bagu 1.0 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务实现此计划。步骤使用 `- [ ]` 复选框来跟踪进度。

**目标：** 构建一个强制 Code Bagu 编码规范的 AI 编程 CLI 工具，支持 `chat`（对话式编程）、`check`（离线检查）、`init`（项目初始化）三个子命令。

**架构：** 四层架构——CLI 入口层（Commander.js）→ Agent 循环层（工具调度 + 上下文管理）→ Code Bagu 约束层（规则引擎 + 校验器 + Prompt 注入）→ LLM 适配层（DeepSeek v4 pro）。所有生成代码必须穿过约束层。

**技术栈：** TypeScript, Commander.js, tree-sitter, fetch (OpenAI 协议), Vitest, pnpm

---

### 任务 1：项目脚手架与基础设施

**文件：**
- 创建：`/Users/linmac/code_bagu/package.json`
- 创建：`/Users/linmac/code_bagu/tsconfig.json`
- 创建：`/Users/linmac/code_bagu/vitest.config.ts`
- 创建：`/Users/linmac/code_bagu/.gitignore`
- 创建：`/Users/linmac/code_bagu/src/index.ts`

- [ ] **步骤 1：初始化 package.json**

```bash
mkdir -p /Users/linmac/code_bagu/src/cli /Users/linmac/code_bagu/src/agent /Users/linmac/code_bagu/src/constraint/rules /Users/linmac/code_bagu/src/llm /Users/linmac/code_bagu/src/parsers /Users/linmac/code_bagu/src/config /Users/linmac/code_bagu/tests
```

写入 `package.json`：

```json
{
  "name": "code_bagu",
  "version": "1.0.0",
  "description": "AI-first coding CLI with Code Bagu constraint enforcement",
  "main": "dist/index.js",
  "bin": {
    "codebagu": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "tree-sitter": "^0.21.0",
    "tree-sitter-python": "^0.21.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **步骤 2：配置 TypeScript**

写入 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **步骤 3：配置 Vitest**

写入 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **步骤 4：创建 .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **步骤 5：创建 CLI 入口占位**

写入 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('codebagu')
  .description('AI-first coding CLI with Code Bagu constraint enforcement')
  .version('1.0.0');

program.parse(process.argv);
```

- [ ] **步骤 6：安装依赖并验证构建**

```bash
pnpm install
pnpm build
```

预期：`dist/` 目录生成，`dist/index.js` 存在。

- [ ] **步骤 7：提交**

```bash
git add .gitignore package.json pnpm-lock.yaml tsconfig.json vitest.config.ts src/index.ts
git commit -m "chore: scaffold code_bagu project with TypeScript + Commander.js + Vitest"
```

---

### 任务 2：配置模块 — .codebagu.yml 加载与校验

**文件：**
- 创建：`/Users/linmac/code_bagu/src/config/types.ts`
- 创建：`/Users/linmac/code_bagu/src/config/schema.ts`
- 创建：`/Users/linmac/code_bagu/src/config/loader.ts`
- 创建：`/Users/linmac/code_bagu/tests/config/loader.test.ts`
- 创建：`/Users/linmac/code_bagu/tests/fixtures/valid-config.yml`
- 创建：`/Users/linmac/code_bagu/tests/fixtures/invalid-config.yml`

- [ ] **步骤 1：定义配置类型 — 编写失败测试**

写入 `tests/config/loader.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/loader';

describe('loadConfig', () => {
  it('should load a valid .codebagu.yml file', async () => {
    const config = await loadConfig('tests/fixtures/valid-config.yml');
    expect(config.version).toBe('1.0');
    expect(config.languages).toContain('python');
    expect(config.rules.tuopu_header).toBe('required');
  });

  it('should throw on missing required fields', async () => {
    await expect(
      loadConfig('tests/fixtures/invalid-config.yml')
    ).rejects.toThrow();
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/config/loader.test.ts
```

预期：失败，`loadConfig` 未定义。

- [ ] **步骤 3：编写类型定义**

写入 `src/config/types.ts`：

```typescript
export type RuleSeverity = 'required' | 'optional' | 'warn' | 'off';

export interface CodeBaguRules {
  tuopu_header: RuleSeverity;
  bagu_paragraphs: RuleSeverity;
  anti_duality: RuleSeverity;
  empty_bagu: RuleSeverity;
  format_consistency: RuleSeverity;
}

export interface CodeBaguConfig {
  version: string;
  project: string;
  languages: string[];
  rules: CodeBaguRules;
  ci: {
    strict: boolean;
    format: 'text' | 'json';
  };
}
```

- [ ] **步骤 4：编写配置校验**

写入 `src/config/schema.ts`：

```typescript
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

  const ci = config.ci as Record<string, unknown> | undefined;
  const ciFormat = ci?.format;
  if (ciFormat !== undefined && ciFormat !== 'text' && ciFormat !== 'json') {
    throw new Error('ci.format 必须是 text 或 json');
  }

  return {
    version: config.version as string,
    project: config.project as string,
    languages: config.languages as string[],
    rules: rules as CodeBaguConfig['rules'],
    ci: {
      strict: ci?.strict === true,
      format: (ci?.format as 'text' | 'json') || 'text',
    },
  };
}
```

- [ ] **步骤 5：编写配置加载器**

写入 `src/config/loader.ts`：

```typescript
import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { CodeBaguConfig } from './types';
import { validateConfig } from './schema';

export function loadConfig(configPath: string): CodeBaguConfig {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parse(raw);
  return validateConfig(parsed);
}

export function loadConfigFromCwd(): CodeBaguConfig {
  return loadConfig('.codebagu.yml');
}
```

- [ ] **步骤 6：创建测试 fixture**

写入 `tests/fixtures/valid-config.yml`：

```yaml
version: "1.0"
project: "test-project"
languages:
  - python
rules:
  tuopu_header: required
  bagu_paragraphs: required
  anti_duality: required
  empty_bagu: warn
  format_consistency: required
ci:
  strict: true
  format: json
```

写入 `tests/fixtures/invalid-config.yml`：

```yaml
version: "1.0"
project: "bad"
languages: []
rules:
  tuopu_header: invalid
```

- [ ] **步骤 7：运行测试验证通过**

```bash
pnpm test tests/config/loader.test.ts
```

预期：2 tests pass。

- [ ] **步骤 8：提交**

```bash
git add src/config/ tests/config/ tests/fixtures/
git commit -m "feat: add config loader with YAML parsing and validation"
```

---

### 任务 3：规则引擎核心 — 类型、基类、执行器

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/types.ts`
- 创建：`/Users/linmac/code_bagu/src/constraint/engine.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/engine.test.ts`

- [ ] **步骤 1：编写规则引擎失败测试**

写入 `tests/constraint/engine.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { ConstraintEngine } from '../../src/constraint/engine';
import { CodeBaguRule, RuleContext, RuleViolation } from '../../src/constraint/types';
import { CodeBaguConfig } from '../../src/config/types';

function makeConfig(overrides: Partial<CodeBaguConfig> = {}): CodeBaguConfig {
  return {
    version: '1.0',
    project: 'test',
    languages: ['python'],
    rules: {
      tuopu_header: 'required',
      bagu_paragraphs: 'required',
      anti_duality: 'required',
      empty_bagu: 'warn',
      format_consistency: 'required',
    },
    ci: { strict: true, format: 'text' },
    ...overrides,
  };
}

function makeContext(code: string): RuleContext {
  return { filePath: 'test.py', source: code, language: 'python' };
}

class AlwaysPassRule implements CodeBaguRule {
  readonly id = 'test-always-pass';
  check(): RuleViolation[] { return []; }
}

class AlwaysFailRule implements CodeBaguRule {
  readonly id = 'test-always-fail';
  check(): RuleViolation[] {
    return [{ ruleId: this.id, severity: 'error', message: 'always fails', line: 1 }];
  }
}

describe('ConstraintEngine', () => {
  it('should return empty violations when all rules pass', () => {
    const engine = new ConstraintEngine(makeConfig(), [new AlwaysPassRule()]);
    const result = engine.evaluate(makeContext('print("hello")'));
    expect(result.violations).toHaveLength(0);
    expect(result.passed).toBe(true);
  });

  it('should collect violations when rules fail', () => {
    const engine = new ConstraintEngine(makeConfig(), [new AlwaysFailRule()]);
    const result = engine.evaluate(makeContext('print("hello")'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleId).toBe('test-always-fail');
    expect(result.passed).toBe(false);
  });

  it('should treat warn as non-blocking', () => {
    const config = makeConfig();
    config.rules.empty_bagu = 'warn';
    class WarnRule implements CodeBaguRule {
      readonly id = 'empty_bagu';
      check(): RuleViolation[] {
        return [{ ruleId: 'empty_bagu', severity: 'warning', message: 'empty', line: 1 }];
      }
    }
    const engine = new ConstraintEngine(config, [new WarnRule()]);
    const result = engine.evaluate(makeContext('x=1'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('warning');
    expect(result.passed).toBe(true);
  });

  it('should skip rule when config severity is off', () => {
    const config = makeConfig();
    config.rules.tuopu_header = 'off';
    let called = false;
    class SpyRule implements CodeBaguRule {
      readonly id = 'tuopu_header';
      check(): RuleViolation[] { called = true; return []; }
    }
    const engine = new ConstraintEngine(config, [new SpyRule()]);
    engine.evaluate(makeContext('x=1'));
    expect(called).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/constraint/engine.test.ts
```

预期：失败，类型和引擎均未定义。

- [ ] **步骤 3：编写规则类型**

写入 `src/constraint/types.ts`：

```typescript
export interface RuleContext {
  filePath: string;
  source: string;
  language: string;
}

export type ViolationSeverity = 'error' | 'warning';

export interface RuleViolation {
  ruleId: string;
  severity: ViolationSeverity;
  message: string;
  line?: number;
  column?: number;
}

export interface CodeBaguRule {
  id: string;
  check(context: RuleContext): RuleViolation[];
}

export interface EngineResult {
  passed: boolean;
  violations: RuleViolation[];
  filePath: string;
}
```

- [ ] **步骤 4：编写规则引擎**

写入 `src/constraint/engine.ts`：

```typescript
import { CodeBaguConfig, RuleSeverity } from '../config/types';
import { CodeBaguRule, RuleContext, EngineResult, RuleViolation, ViolationSeverity } from './types';

function toSeverity(severity: RuleSeverity): ViolationSeverity {
  if (severity === 'required') return 'error';
  return 'warning';
}

export class ConstraintEngine {
  private rules: CodeBaguRule[];
  private config: CodeBaguConfig;

  constructor(config: CodeBaguConfig, rules: CodeBaguRule[]) {
    this.config = config;
    this.rules = rules;
  }

  evaluate(context: RuleContext): EngineResult {
    const allViolations: RuleViolation[] = [];

    for (const rule of this.rules) {
      const severity = this.config.rules[rule.id as keyof typeof this.config.rules];
      if (severity === 'off') continue;

      const violations = rule.check(context);
      for (const v of violations) {
        v.severity = toSeverity(severity);
        allViolations.push(v);
      }
    }

    const errors = allViolations.filter(v => v.severity === 'error');
    const passed = errors.length === 0;

    return {
      passed,
      violations: allViolations,
      filePath: context.filePath,
    };
  }
}
```

- [ ] **步骤 5：运行测试验证通过**

```bash
pnpm test tests/constraint/engine.test.ts
```

预期：4 tests pass。

- [ ] **步骤 6：提交**

```bash
git add src/constraint/types.ts src/constraint/engine.ts tests/constraint/engine.test.ts
git commit -m "feat: add core constraint engine with config-driven severity"
```

---

### 任务 4：拓扑图头规则

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/rules/topology.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/rules/topology.test.ts`

- [ ] **步骤 1：编写失败测试**

写入 `tests/constraint/rules/topology.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { TopoHeaderRule } from '../../../src/constraint/rules/topology';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

const COMPLIANT = `"""
TestModule — does things (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: data
  输出: result → downstream

  数据流向:
    data → process → result

修改风险点:
  ⚠️ 第10行: something breaks

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

print("hello")
`;

describe('TopoHeaderRule', () => {
  const rule = new TopoHeaderRule();

  it('should pass for complete topology header', () => {
    const violations = rule.check(ctx(COMPLIANT));
    expect(violations).toHaveLength(0);
  });

  it('should fail when docstring is missing', () => {
    const violations = rule.check(ctx('print("no header")'));
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].message).toContain('拓扑图头');
  });

  it('should fail when missing required fields', () => {
    const partial = `"""
TestModule — desc (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: data
━━━━━━━━━━━━━━━━━━━━━━━━
"""
print("ok")
`;
    const violations = rule.check(ctx(partial));
    expect(violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/constraint/rules/topology.test.ts
```

预期：失败。

- [ ] **步骤 3：实现拓扑图头规则**

写入 `src/constraint/rules/topology.ts`：

```typescript
import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const REQUIRED_FIELDS = ['输入', '输出', '数据流向', '修改风险点', '最近修改'];

export class TopoHeaderRule implements CodeBaguRule {
  id = 'tuopu_header';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];

    const docstringMatch = source.match(/"""/);
    if (!docstringMatch) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少拓扑图头（文件顶部 docstring）`,
        line: 1,
      });
      return violations;
    }

    const headerContent = source.slice(0, source.indexOf('"""', 3) + 3).toLowerCase();

    for (const field of REQUIRED_FIELDS) {
      if (!headerContent.includes(field.toLowerCase())) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 拓扑图头缺少必填字段: "${field}"`,
          line: 1,
        });
      }
    }

    return violations;
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
pnpm test tests/constraint/rules/topology.test.ts
```

预期：3 tests pass。

- [ ] **步骤 5：提交**

```bash
git add src/constraint/rules/topology.ts tests/constraint/rules/topology.test.ts
git commit -m "feat: add topology header rule checking 5 required fields"
```

---

### 任务 5：八股段落规则

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/rules/bagu.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/rules/bagu.test.ts`

- [ ] **步骤 1：编写失败测试**

写入 `tests/constraint/rules/bagu.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { BaguParagraphsRule } from '../../../src/constraint/rules/bagu';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

const FULL_BAGU = `
# 破题：获取用户订单列表；不做分页逻辑。
# 承题：依赖 db.query。前置条件: db 已连接。
# [起讲] 使用连接池复用连接避免频繁创建
# 入手：🔒 从连接池获取连接
def get_orders():
    # ==== 起股 ====
    # 取：从参数获取 user_id
    # 验：验证 user_id 为正整数

    # ==== 中股 ====
    # 算：查询 orders 表
    # 转：转换为 dict 列表

    # ==== 后股 ====
    # ✓ 正路径：返回订单列表
    # ✗ 降级路径：返回空列表并记录日志

    # ==== 束股 ====
    # 给出：List[dict] 订单列表
    # 留下：N/A
    pass
`;

describe('BaguParagraphsRule', () => {
  const rule = new BaguParagraphsRule();

  it('should pass for complete bagu structure', () => {
    const violations = rule.check(ctx(FULL_BAGU));
    expect(violations).toHaveLength(0);
  });

  it('should fail when missing poti (破题)', () => {
    const noPoti = FULL_BAGU.replace(/# 破题：/, '# po题：');
    const violations = rule.check(ctx(noPoti));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when missing any bagu section marker', () => {
    const missingHou = FULL_BAGU.replace(/# ==== 后股 ====/, '# ==== hou股 ====');
    const violations = rule.check(ctx(missingHou));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when poti does not have semicolon separation', () => {
    const badPoti = FULL_BAGU.replace('# 破题：获取用户订单列表；不做分页逻辑。', '# 破题：获取用户订单列表。');
    const violations = rule.check(ctx(badPoti));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when second poti clause does not start with 不做', () => {
    const badPoti2 = FULL_BAGU.replace('不做分页逻辑', '也不做分页');
    const violations = rule.check(ctx(badPoti2));
    expect(violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/constraint/rules/bagu.test.ts
```

预期：失败。

- [ ] **步骤 3：实现八股段落规则**

写入 `src/constraint/rules/bagu.ts`：

```typescript
import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const BAGU_SECTIONS = ['起股', '中股', '后股', '束股'];
const BAGU_MARKER = /^#\s*====\s*(\S+)\s*====/;
const POTI_REGEX = /#\s*破题[：:]\s*(.+)/;
const CHENGTI_REGEX = /#\s*承题[：:]/;
const QIJIANG_REGEX = /#\s*\[起讲\]/;
const RUSHOU_REGEX = /#\s*入手[：:]/;

export class BaguParagraphsRule implements CodeBaguRule {
  id = 'bagu_paragraphs';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');

    // 跳过没有函数的文件
    const hasFunction = /def\s+\w+\s*\(/.test(source);
    if (!hasFunction) return violations;

    // 检查破题
    const potiMatch = source.match(POTI_REGEX);
    if (!potiMatch) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少破题（# 破题：做什么；不做什么。）`,
        line: 1,
      });
    } else {
      const potiContent = potiMatch[1].trim();
      const parts = potiContent.split(/[；;]/);
      if (parts.length < 2) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 破题必须用分号分隔两句（做什么；不做什么）`,
          line: 1,
        });
      } else if (!parts[1].trim().startsWith('不做')) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 破题第二句必须以"不做"开头，当前: "${parts[1].trim()}"`,
          line: 1,
        });
      }
    }

    // 检查承题
    if (!CHENGTI_REGEX.test(source)) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少承题（# 承题：依赖声明。前置条件。）`,
        line: 1,
      });
    }

    // 检查起讲
    if (!QIJIANG_REGEX.test(source)) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少起讲（# [起讲] 设计意图）`,
        line: 1,
      });
    }

    // 检查入手
    if (!RUSHOU_REGEX.test(source)) {
      violations.push({
        ruleId: this.id,
        severity: 'error',
        message: `[${filePath}] 缺少入手（# 入手：资源申请）`,
        line: 1,
      });
    }

    // 检查四股
    const foundBaguSections: string[] = [];
    for (const line of lines) {
      const match = line.match(BAGU_MARKER);
      if (match) {
        foundBaguSections.push(match[1]);
      }
    }

    for (const section of BAGU_SECTIONS) {
      if (!foundBaguSections.includes(section)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 缺少八股段落: ==== ${section} ====`,
          line: 1,
        });
      }
    }

    // 检查后股的正路径和降级路径
    const houGuSection = this.extractSection(source, '后股');
    if (houGuSection) {
      if (!/正路径/.test(houGuSection) && !/✓/.test(houGuSection)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 后股缺少正路径标记（✓ 正路径 / # 正路径）`,
        });
      }
      if (!/降级路径/.test(houGuSection) && !/✗/.test(houGuSection)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 后股缺少降级路径标记（✗ 降级路径 / # 降级路径）`,
        });
      }
    }

    // 检查束股的给出和留下
    const shuGuSection = this.extractSection(source, '束股');
    if (shuGuSection) {
      if (!/给出/.test(shuGuSection)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 束股缺少"给出"（返回值）`,
        });
      }
      if (!/留下/.test(shuGuSection)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 束股缺少"留下"（副作用）`,
        });
      }
    }

    return violations;
  }

  private extractSection(source: string, sectionName: string): string | null {
    const startRegex = new RegExp(`#\\s*====\\s*${sectionName}\\s*====`);
    const endRegex = /#\s*====\s*\S+\s*====/;
    const lines = source.split('\n');
    let inSection = false;
    const sectionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (startRegex.test(lines[i])) {
        inSection = true;
        continue;
      }
      if (inSection && endRegex.test(lines[i])) {
        break;
      }
      if (inSection) {
        sectionLines.push(lines[i]);
      }
    }

    return sectionLines.length > 0 ? sectionLines.join('\n') : null;
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
pnpm test tests/constraint/rules/bagu.test.ts
```

预期：5 tests pass。

- [ ] **步骤 5：提交**

```bash
git add src/constraint/rules/bagu.ts tests/constraint/rules/bagu.test.ts
git commit -m "feat: add bagu paragraphs rule checking 破题/承题/起讲/入手/四股"
```

---

### 任务 6：对偶平衡规则

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/rules/duality.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/rules/duality.test.ts`

- [ ] **步骤 1：编写失败测试**

写入 `tests/constraint/rules/duality.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { DualityRule } from '../../../src/constraint/rules/duality';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('DualityRule', () => {
  const rule = new DualityRule();

  it('should pass when all duality pairs balance', () => {
    const code = `
# 🔒 open connection
# 🔓 close connection
# ✓ positive path
# ✗ negative path
# ↗ count += 1
# ↘ count -= 1
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });

  it('should fail when lock/unlock mismatch', () => {
    const code = `
# 🔒 open
# 🔒 open again
# 🔓 close
print("leak")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('🔒'))).toBe(true);
  });

  it('should fail when positive/negative path mismatch', () => {
    const code = `
# ✓ path1
# ✓ path2
# ✗ path3
print("imbalance")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('✓'))).toBe(true);
  });

  it('should fail when increment/decrement mismatch', () => {
    const code = `
# ↗ up1
# ↗ up2
# ↘ down1
print("imbalance")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('↗'))).toBe(true);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/constraint/rules/duality.test.ts
```

预期：失败。

- [ ] **步骤 3：实现对偶规则**

写入 `src/constraint/rules/duality.ts`：

```typescript
import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

interface DualityPair {
  open: string;
  close: string;
  label: string;
}

const PAIRS: DualityPair[] = [
  { open: '🔒', close: '🔓', label: '资源申请/释放' },
  { open: '✓', close: '✗', label: '正路径/降级路径' },
  { open: '↗', close: '↘', label: '计数增/减' },
];

export class DualityRule implements CodeBaguRule {
  id = 'anti_duality';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];

    for (const pair of PAIRS) {
      const openCount = (source.match(new RegExp(escapeRegex(pair.open), 'g')) || []).length;
      const closeCount = (source.match(new RegExp(escapeRegex(pair.close), 'g')) || []).length;

      if (openCount !== closeCount) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}] 对偶不平衡 - ${pair.label}: ${pair.open}${openCount}个 ${pair.close}${closeCount}个`,
        });
      }
    }

    return violations;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
pnpm test tests/constraint/rules/duality.test.ts
```

预期：4 tests pass。

- [ ] **步骤 5：提交**

```bash
git add src/constraint/rules/duality.ts tests/constraint/rules/duality.test.ts
git commit -m "feat: add duality balance rule for lock/unlock, path, count pairs"
```

---

### 任务 7：格式统一规则与空八股规则

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/rules/format.ts`
- 创建：`/Users/linmac/code_bagu/src/constraint/rules/empty-bagu.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/rules/format.test.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/rules/empty-bagu.test.ts`

- [ ] **步骤 1：编写格式规则失败测试**

写入 `tests/constraint/rules/format.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { FormatRule } from '../../../src/constraint/rules/format';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('FormatRule', () => {
  const rule = new FormatRule();

  it('should pass for correct comment format', () => {
    const code = `
# 破题：xxx；不做yyy。
# ==== 起股 ====
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should fail when comment missing space after #', () => {
    const code = `
#破题：xxx；不做yyy。
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should fail when bagu marker has wrong format', () => {
    const code = `
# 破题：xxx；不做yyy。
# ---- 起股 ----
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.some(v => v.message.includes('股标记'))).toBe(true);
  });

  it('should fail when using // comments in Python', () => {
    const code = `
// 破题：xxx；不做yyy。
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 2：编写空八股规则失败测试**

写入 `tests/constraint/rules/empty-bagu.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { EmptyBaguRule } from '../../../src/constraint/rules/empty-bagu';

const ctx = (code: string) => ({ filePath: 'test.py', source: code, language: 'python' });

describe('EmptyBaguRule', () => {
  const rule = new EmptyBaguRule();

  it('should pass when empty bagu uses valid format', () => {
    const code = `
# ==== 起股 ====
# 取：N/A
# 验：N/A
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should pass with 无需 format', () => {
    const code = `
# ==== 起股 ====
# 取：无需
print("ok")
`;
    expect(rule.check(ctx(code))).toHaveLength(0);
  });

  it('should warn on suspicious empty bagu (just marker, no content)', () => {
    const code = `
# ==== 起股 ====
# ==== 中股 ====
print("ok")
`;
    const violations = rule.check(ctx(code));
    expect(violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 3：运行测试确认失败**

```bash
pnpm test tests/constraint/rules/format.test.ts tests/constraint/rules/empty-bagu.test.ts
```

预期：失败。

- [ ] **步骤 4：实现格式规则**

写入 `src/constraint/rules/format.ts`：

```typescript
import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const BAGU_MARKER_REGEX = /^(#|\/\/)\s*={1,8}\s*\S+\s*={1,8}/;
const CORRECT_MARKER_REGEX = /^(#|\/\/)\s====\s(起股|中股|后股|束股)\s====$/;
const COMMENT_LINE_REGEX = /^(#|\/\/)\S/;

export class FormatRule implements CodeBaguRule {
  id = 'format_consistency';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');
    const commentChar = context.language === 'python' ? '#' : '//';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('//') && commentChar === '#') {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}:${i + 1}] Python 文件不能使用 // 注释，请使用 #`,
          line: i + 1,
        });
        continue;
      }

      if (COMMENT_LINE_REGEX.test(line)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}:${i + 1}] 注释符号后必须有空格: "${line.slice(0, 20)}..."`,
          line: i + 1,
        });
        continue;
      }

      if (BAGU_MARKER_REGEX.test(line) && !CORRECT_MARKER_REGEX.test(line)) {
        violations.push({
          ruleId: this.id,
          severity: 'error',
          message: `[${filePath}:${i + 1}] 股标记格式不正确，应为: "${commentChar} ==== X股 ===="`,
          line: i + 1,
        });
      }
    }

    return violations;
  }
}
```

- [ ] **步骤 5：实现空八股规则**

写入 `src/constraint/rules/empty-bagu.ts`：

```typescript
import { CodeBaguRule, RuleContext, RuleViolation } from '../types';

const SECTION_START = /^(#|\/\/)\s*====\s*(\S+)\s*====/;
const SECTION_END = /^(#|\/\/)\s*====\s*(\S+)\s*====/;
const VALID_EMPTY = /(N\/A|无需)$/;

export class EmptyBaguRule implements CodeBaguRule {
  id = 'empty_bagu';

  check(context: RuleContext): RuleViolation[] {
    const { source, filePath } = context;
    const violations: RuleViolation[] = [];
    const lines = source.split('\n');
    let currentSection: string | null = null;
    let sectionStartLine = 0;
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(SECTION_START);

      if (match && !line.endsWith('=') && match[1] === match[2]) continue;

      if (match) {
        if (currentSection && !hasContent) {
          violations.push({
            ruleId: this.id,
            severity: 'warning',
            message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
            line: sectionStartLine + 1,
          });
        }
        currentSection = match[2];
        sectionStartLine = i;
        hasContent = false;
        continue;
      }

      if (currentSection) {
        const nextMatch = line.match(SECTION_END);
        if (nextMatch && nextMatch[2] !== currentSection) {
          if (!hasContent) {
            violations.push({
              ruleId: this.id,
              severity: 'warning',
              message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
              line: sectionStartLine + 1,
            });
          }
          currentSection = nextMatch[2];
          sectionStartLine = i;
          hasContent = false;
        } else if (line.startsWith('#') || line.startsWith('//')) {
          hasContent = true;
        } else if (line.length > 0) {
          hasContent = true;
        }
      }
    }

    if (currentSection && !hasContent) {
      violations.push({
        ruleId: this.id,
        severity: 'warning',
        message: `[${filePath}:${sectionStartLine + 1}] 股 "${currentSection}" 标记后没有内容，需声明 N/A 或 无需`,
        line: sectionStartLine + 1,
      });
    }

    return violations;
  }
}
```

- [ ] **步骤 6：运行测试验证通过**

```bash
pnpm test tests/constraint/rules/format.test.ts tests/constraint/rules/empty-bagu.test.ts
```

预期：所有测试通过。

- [ ] **步骤 7：提交**

```bash
git add src/constraint/rules/format.ts src/constraint/rules/empty-bagu.ts tests/constraint/rules/format.test.ts tests/constraint/rules/empty-bagu.test.ts
git commit -m "feat: add format consistency and empty bagu rules"
```

---

### 任务 8：Reporter 报告生成器

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/reporter.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/reporter.test.ts`

- [ ] **步骤 1：编写失败测试**

写入 `tests/constraint/reporter.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { Reporter } from '../../src/constraint/reporter';
import { EngineResult, RuleViolation } from '../../src/constraint/types';

function makeResult(violations: RuleViolation[]): EngineResult {
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    filePath: 'test.py',
  };
}

describe('Reporter', () => {
  const reporter = new Reporter();

  it('should output clean text when no violations', () => {
    const output = reporter.text(makeResult([]));
    expect(output).toContain('通过');
    expect(output).toContain('test.py');
  });

  it('should output violations with details in text mode', () => {
    const result = makeResult([
      { ruleId: 'test', severity: 'error', message: 'bad thing', line: 5 },
    ]);
    const output = reporter.text(result);
    expect(output).toContain('bad thing');
    expect(output).toContain('✗');
  });

  it('should output valid JSON in json mode', () => {
    const result = makeResult([
      { ruleId: 'r1', severity: 'error', message: 'm1', line: 1 },
      { ruleId: 'r2', severity: 'warning', message: 'm2', line: 3 },
    ]);
    const output = reporter.json(result);
    const parsed = JSON.parse(output);
    expect(parsed.file).toBe('test.py');
    expect(parsed.violations).toHaveLength(2);
    expect(parsed.passed).toBe(false);
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
pnpm test tests/constraint/reporter.test.ts
```

预期：失败。

- [ ] **步骤 3：实现 Reporter**

写入 `src/constraint/reporter.ts`：

```typescript
import { EngineResult } from './types';

export class Reporter {
  text(result: EngineResult): string {
    const lines: string[] = [];
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? '通过' : '不合规';
    const count = `(${result.violations.length} 个问题)`;

    lines.push(`${icon} ${result.filePath} — ${status} ${count}`);

    for (const v of result.violations) {
      const prefix = v.severity === 'error' ? '✗' : '⚠';
      const loc = v.line ? `:${v.line}` : '';
      lines.push(`  ${prefix} [${v.ruleId}${loc}] ${v.message}`);
    }

    return lines.join('\n');
  }

  json(result: EngineResult): string {
    return JSON.stringify({
      file: result.filePath,
      passed: result.passed,
      violations: result.violations.map(v => ({
        rule: v.ruleId,
        severity: v.severity,
        message: v.message,
        line: v.line,
        column: v.column,
      })),
    }, null, 2);
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
pnpm test tests/constraint/reporter.test.ts
```

预期：3 tests pass。

- [ ] **步骤 5：提交**

```bash
git add src/constraint/reporter.ts tests/constraint/reporter.test.ts
git commit -m "feat: add reporter with text and json output formats"
```

---

### 任务 9：check 子命令（端到端可交付）

**文件：**
- 创建：`/Users/linmac/code_bagu/src/cli/check.ts`
- 创建：`/Users/linmac/code_bagu/tests/cli/check.test.ts`
- 创建：`/Users/linmac/code_bagu/tests/fixtures/compliant.py`
- 创建：`/Users/linmac/code_bagu/tests/fixtures/noncompliant.py`

- [ ] **步骤 1：创建测试 fixture 文件**

写入 `tests/fixtures/compliant.py`：

```python
"""
CompliantModule — 示例合规模块 (compliant.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: data
  输出: result → downstream

  数据流向:
    data → process → result

修改风险点:
  ⚠️ 第10行: 示例风险

最近修改:
  2026-05-14: initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# 破题：处理输入数据并返回结果；不做数据库操作。
# 承题：无外部依赖。前置条件: data 非空。
# [起讲] 简单的数据处理函数
# 入手：N/A
def process_data():
    # ==== 起股 ====
    # 取：N/A
    # 验：N/A

    # ==== 中股 ====
    # 算：直接返回
    # 转：N/A

    # ==== 后股 ====
    # ✓ 正路径：返回结果
    # ✗ 降级路径：N/A

    # ==== 束股 ====
    # 给出：str
    # 留下：N/A
    return "result"
```

写入 `tests/fixtures/noncompliant.py`：

```python
def broken_function():
    return "nothing"
# 缺少所有八股结构
```

- [ ] **步骤 2：编写 check 命令测试**

写入 `tests/cli/check.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('codebagu check', () => {
  it('should pass for compliant file', () => {
    const output = execSync(
      'tsx src/index.ts check tests/fixtures/compliant.py --format json',
      { encoding: 'utf-8', cwd: process.cwd() }
    );
    const result = JSON.parse(output);
    expect(result.passed).toBe(true);
  });

  it('should fail for noncompliant file', () => {
    const output = execSync(
      'tsx src/index.ts check tests/fixtures/noncompliant.py --format json --strict',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).replace(/[\s\S]*?(\[[\s\S]*)/, '$1');
    const result = JSON.parse(output);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 3：实现 check 子命令**

写入 `src/cli/check.ts`：

```typescript
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { ConstraintEngine } from '../constraint/engine';
import { TopoHeaderRule } from '../constraint/rules/topology';
import { BaguParagraphsRule } from '../constraint/rules/bagu';
import { DualityRule } from '../constraint/rules/duality';
import { FormatRule } from '../constraint/rules/format';
import { EmptyBaguRule } from '../constraint/rules/empty-bagu';
import { Reporter } from '../constraint/reporter';
import { CodeBaguConfig } from '../config/types';

function createEngine(config: CodeBaguConfig): ConstraintEngine {
  return new ConstraintEngine(config, [
    new TopoHeaderRule(),
    new BaguParagraphsRule(),
    new DualityRule(),
    new FormatRule(),
    new EmptyBaguRule(),
  ]);
}

function collectFiles(inputPath: string): string[] {
  const stat = statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) throw new Error(`路径不存在: ${inputPath}`);

  const files: string[] = [];
  const entries = readdirSync(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(inputPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (entry.name.endsWith('.py')) {
      files.push(full);
    }
  }
  return files;
}

export interface CheckOptions {
  format: 'text' | 'json';
  strict: boolean;
}

export function runCheck(inputPath: string, config: CodeBaguConfig, options: CheckOptions): string {
  const engine = createEngine(config);
  const reporter = new Reporter();
  const files = collectFiles(inputPath);
  const results: string[] = [];
  let hasErrors = false;

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const result = engine.evaluate({
      filePath: file,
      source,
      language: 'python',
    });

    if (options.format === 'json') {
      results.push(reporter.json(result));
    } else {
      results.push(reporter.text(result));
    }

    if (!result.passed && options.strict) hasErrors = true;
    if (options.strict) {
      const warnings = result.violations.filter(v => v.severity === 'warning');
      if (warnings.length > 0) hasErrors = true;
    }
  }

  if (options.format === 'json') {
    return results.join('\n');
  }

  return results.join('\n\n');
}
```

- [ ] **步骤 4：更新 CLI 入口注册 check 命令**

写入 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck, CheckOptions } from './cli/check';
import { loadConfigFromCwd } from './config/loader';

const program = new Command();

program
  .name('codebagu')
  .description('AI-first coding CLI with Code Bagu constraint enforcement')
  .version('1.0.0');

program
  .command('check <path>')
  .description('离线检查文件或目录的 Code Bagu 合规性')
  .option('-f, --format <format>', '输出格式: text | json', 'text')
  .option('--strict', '严格模式，警告也报错', false)
  .action(async (path: string, options: { format: string; strict: boolean }) => {
    try {
      const config = loadConfigFromCwd();
      const output = runCheck(path, config, {
        format: options.format as CheckOptions['format'],
        strict: options.strict,
      });
      console.log(output);
      process.exit(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error:', message);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

- [ ] **步骤 5：创建临时 .codebagu.yml 用于测试**

```bash
cp tests/fixtures/valid-config.yml .codebagu.yml
```

- [ ] **步骤 6：运行测试**

```bash
pnpm test tests/cli/check.test.ts
```

预期：2 tests pass。

- [ ] **步骤 7：提交**

```bash
git add src/cli/check.ts tests/cli/check.test.ts tests/fixtures/compliant.py tests/fixtures/noncompliant.py src/index.ts
git commit -m "feat: add check subcommand with file scanning and JSON output"
```

---

### 任务 10：LLM 适配层 — DeepSeek v4 pro

**文件：**
- 创建：`/Users/linmac/code_bagu/src/llm/types.ts`
- 创建：`/Users/linmac/code_bagu/src/llm/adapter.ts`
- 创建：`/Users/linmac/code_bagu/src/llm/deepseek.ts`
- 创建：`/Users/linmac/code_bagu/tests/llm/deepseek.test.ts`

- [ ] **步骤 1：编写 LLM 类型**

写入 `src/llm/types.ts`：

```typescript
export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  max_tokens?: number;
  temperature?: number;
}

export interface Completion {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface LLMResponse {
  choices: Array<{ message: Completion; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface LLMAdapter {
  chat(request: LLMRequest): Promise<LLMResponse>;
}
```

- [ ] **步骤 2：实现 DeepSeek 适配器**

写入 `src/llm/deepseek.ts`：

```typescript
import { LLMAdapter, LLMRequest, LLMResponse, Message, ToolDefinition } from './types';

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class DeepSeekAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: request.model || this.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }
    if (request.max_tokens) body.max_tokens = request.max_tokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<LLMResponse>;
  }
}
```

- [ ] **步骤 3：编写 LLM 适配器测试**

写入 `tests/llm/deepseek.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DeepSeekAdapter } from '../../src/llm/deepseek';

describe('DeepSeekAdapter', () => {
  it('should construct message payload correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new DeepSeekAdapter({ apiKey: 'test-key' });
    const response = await adapter.chat({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(response.choices[0].message.content).toBe('hello');
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages).toHaveLength(1);
    expect(callBody.messages[0].content).toBe('hi');

    vi.unstubAllGlobals();
  });
});
```

- [ ] **步骤 4：运行测试验证通过**

```bash
pnpm test tests/llm/deepseek.test.ts
```

预期：通过。

- [ ] **步骤 5：提交**

```bash
git add src/llm/ tests/llm/
git commit -m "feat: add DeepSeek v4 pro adapter with OpenAI-compatible API"
```

---

### 任务 11：Prompt 注入器

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/prompt.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/prompt.test.ts`

- [ ] **步骤 1：编写测试**

写入 `tests/constraint/prompt.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { PromptInjector } from '../../src/constraint/prompt';
import { CodeBaguConfig } from '../../src/config/types';

const config: CodeBaguConfig = {
  version: '1.0',
  project: 'test',
  languages: ['python'],
  rules: {
    tuopu_header: 'required',
    bagu_paragraphs: 'required',
    anti_duality: 'required',
    empty_bagu: 'warn',
    format_consistency: 'required',
  },
  ci: { strict: true, format: 'text' },
};

describe('PromptInjector', () => {
  it('should build system prompt with code bagu rules', () => {
    const injector = new PromptInjector(config);
    const systemPrompt = injector.buildSystemPrompt([], 'test-skill-content');

    expect(systemPrompt).toContain('Code Bagu');
    expect(systemPrompt).toContain('拓扑图头');
    expect(systemPrompt).toContain('破题');
    expect(systemPrompt).toContain('test-skill-content');
  });

  it('should build constraint prompt for post-generation check', () => {
    const injector = new PromptInjector(config);
    const constraintPrompt = injector.buildConstraintPrompt([
      { ruleId: 'bagu', severity: 'error', message: '缺少束股' },
    ]);

    expect(constraintPrompt).toContain('缺少束股');
    expect(constraintPrompt).toContain('修正');
  });
});
```

- [ ] **步骤 2：实现 Prompt 注入器**

写入 `src/constraint/prompt.ts`：

```typescript
import { CodeBaguConfig } from '../config/types';
import { RuleViolation } from './types';

const BAGU_SYSTEM_PROMPT = `
你是 code_bagu 的 AI 编程助手，必须严格遵守 Code Bagu（代码八股）编码规范。

## 核心规则

1. **文件级**：每个 .py 文件顶部必须有拓扑图头（docstring），包含 5 个必填字段：
   - 模块名 + 职责 + 文件名
   - 输入 / 输出 → 下游模块
   - 数据流向
   - 修改风险点（⚠️ 行号: 说明）
   - 最近修改记录

2. **函数级**：每个函数必须有完整的八股框架：
   - # 破题：<做什么>；<不做什么>。（第二句必须以"不做"开头，分号分隔）
   - # 承题：<依赖声明>。<前置条件>。
   - # [起讲] <设计意图，禁止实现细节>
   - # 入手：<资源申请，必须成对>
   - # ==== 起股 ====  → 取/验
   - # ==== 中股 ====  → 算/转
   - # ==== 后股 ====  → ✓ 正路径 / ✗ 降级路径
   - # ==== 束股 ====  → 给出 / 留下

3. **对偶标记**：所有逻辑必须成对出现：
   - 🔒 / 🔓 — 资源申请与释放（数量必须相等）
   - ✓ / ✗ — 正路径与降级路径
   - ↗ / ↘ — 计数器增减（如适用）

4. **格式铁律**：
   - # 后必须有空格
   - 股标记格式：==== X股 ====  （8个= + 空格 + 股名 + 空格 + 8个=）
   - 空八股声明：股名：N/A 或 股名：无需

5. **禁止事项**：
   - ❌ 破题直抄文件名
   - ❌ 起讲写实现细节
   - ❌ 后股省略降级路径
   - ❌ 用 // 或 /* */ 代替 #（Python）

代码将在写入文件前被自动校验。不合规的代码会被拒绝并要求修正。
`;

export class PromptInjector {
  private config: CodeBaguConfig;

  constructor(config: CodeBaguConfig) {
    this.config = config;
  }

  buildSystemPrompt(projectContext: string[], skillContent?: string): string {
    const parts: string[] = [BAGU_SYSTEM_PROMPT];

    if (skillContent) {
      parts.push(`\n## Code Bagu 完整规范\n${skillContent}`);
    }

    if (projectContext.length > 0) {
      parts.push(`\n## 项目上下文\n${projectContext.join('\n')}`);
    }

    parts.push(`\n## 当前配置
语言: ${this.config.languages.join(', ')}
规则要求:
  拓扑图头: ${this.config.rules.tuopu_header}
  八股段落: ${this.config.rules.bagu_paragraphs}
  对偶检查: ${this.config.rules.anti_duality}
  空八股: ${this.config.rules.empty_bagu}
  格式统一: ${this.config.rules.format_consistency}
`);

    return parts.join('\n');
  }

  buildConstraintPrompt(violations: RuleViolation[]): string {
    if (violations.length === 0) return '';

    const violationText = violations
      .map(v => `  - [${v.ruleId}] ${v.message}`)
      .join('\n');

    return `你刚才生成的代码违反了 Code Bagu 规范，请修正以下问题后重新生成完整的代码：

${violationText}

请确保修正后的代码完全符合 Code Bagu 规范。`;
  }
}
```

- [ ] **步骤 3：运行测试验证通过**

```bash
pnpm test tests/constraint/prompt.test.ts
```

预期：2 tests pass。

- [ ] **步骤 4：提交**

```bash
git add src/constraint/prompt.ts tests/constraint/prompt.test.ts
git commit -m "feat: add prompt injector for system prompt and constraint feedback"
```

---

### 任务 12：校验器 — 生成拦截

**文件：**
- 创建：`/Users/linmac/code_bagu/src/constraint/validator.ts`
- 创建：`/Users/linmac/code_bagu/tests/constraint/validator.test.ts`

- [ ] **步骤 1：编写测试**

写入 `tests/constraint/validator.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { GenerationValidator } from '../../src/constraint/validator';
import { ConstraintEngine } from '../../src/constraint/engine';
import { CodeBaguConfig } from '../../src/config/types';
import { TopoHeaderRule } from '../../src/constraint/rules/topology';
import { BaguParagraphsRule } from '../../src/constraint/rules/bagu';
import { DualityRule } from '../../src/constraint/rules/duality';
import { FormatRule } from '../../src/constraint/rules/format';
import { EmptyBaguRule } from '../../src/constraint/rules/empty-bagu';

const config: CodeBaguConfig = {
  version: '1.0',
  project: 'test',
  languages: ['python'],
  rules: {
    tuopu_header: 'required',
    bagu_paragraphs: 'required',
    anti_duality: 'required',
    empty_bagu: 'warn',
    format_consistency: 'required',
  },
  ci: { strict: true, format: 'text' },
};

function makeEngine(): ConstraintEngine {
  return new ConstraintEngine(config, [
    new TopoHeaderRule(),
    new BaguParagraphsRule(),
    new DualityRule(),
    new FormatRule(),
    new EmptyBaguRule(),
  ]);
}

const COMPLIANT_CODE = `"""
Test — desc (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: x
  输出: y → downstream
  数据流向:
    x → y
修改风险点:
  ⚠️ 第1行: test
最近修改:
  2026-05-14: init
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
# 破题：处理数据；不做验证。
# 承题：N/A。前置条件: N/A。
# [起讲] 简单处理
# 入手：N/A
def f():
    # ==== 起股 ====
    # 取：N/A
    # 验：N/A
    # ==== 中股 ====
    # 算：pass
    # 转：N/A
    # ==== 后股 ====
    # ✓ 正路径：ok
    # ✗ 降级路径：N/A
    # ==== 束股 ====
    # 给出：N/A
    # 留下：N/A
    pass
`;

describe('GenerationValidator', () => {
  it('should return valid for compliant code', () => {
    const validator = new GenerationValidator(makeEngine());
    const result = validator.validate('test.py', COMPLIANT_CODE);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should return invalid for noncompliant code', () => {
    const validator = new GenerationValidator(makeEngine());
    const result = validator.validate('test.py', 'print("no bagu")');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **步骤 2：实现校验器**

写入 `src/constraint/validator.ts`：

```typescript
import { ConstraintEngine } from './engine';
import { RuleViolation } from './types';

export interface ValidationResult {
  valid: boolean;
  violations: RuleViolation[];
}

export class GenerationValidator {
  private engine: ConstraintEngine;

  constructor(engine: ConstraintEngine) {
    this.engine = engine;
  }

  validate(filePath: string, source: string, language: string = 'python'): ValidationResult {
    const result = this.engine.evaluate({ filePath, source, language });
    return {
      valid: result.passed,
      violations: result.violations,
    };
  }
}
```

- [ ] **步骤 3：运行测试验证通过**

```bash
pnpm test tests/constraint/validator.test.ts
```

预期：2 tests pass。

- [ ] **步骤 4：提交**

```bash
git add src/constraint/validator.ts tests/constraint/validator.test.ts
git commit -m "feat: add generation validator for write_file interception"
```

---

### 任务 13：Agent 工具层 — 文件读写

**文件：**
- 创建：`/Users/linmac/code_bagu/src/agent/tools.ts`
- 创建：`/Users/linmac/code_bagu/tests/agent/tools.test.ts`

- [ ] **步骤 1：编写 Agent 工具类型与实现**

写入 `src/agent/tools.ts`：

```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
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
      case 'read_file':
        return this.readFile(args.path as string);
      case 'write_file':
        return this.writeFile(args.path as string, args.content as string);
      case 'search_content':
        return this.searchContent(args.pattern as string, args.path as string);
      case 'list_files':
        return this.listFiles(args.path as string);
      default:
        return { success: false, output: `未知工具: ${name}` };
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
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
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

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const regex = new RegExp(pattern, 'g');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${file}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      }

      return {
        success: true,
        output: results.length > 0 ? results.join('\n') : '未找到匹配',
      };
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
      if (entry.isDirectory()) {
        files.push(...this.collectFiles(full, ext));
      } else if (entry.name.endsWith(ext)) {
        files.push(full);
      }
    }
    return files;
  }
}
```

- [ ] **步骤 2：编写工具测试**

写入 `tests/agent/tools.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentToolExecutor } from '../../src/agent/tools';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('AgentToolExecutor', () => {
  const testDir = join(process.cwd(), 'tests/fixtures/tmp');

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'hello.py'), 'print("hello")');
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it('should read a file', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('read_file', { path: 'hello.py' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });

  it('should write a file', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('write_file', {
      path: 'new.py',
      content: '# test\nprint("new")',
    });
    expect(result.success).toBe(true);
  });

  it('should list files in directory', async () => {
    const executor = new AgentToolExecutor(testDir);
    const result = await executor.execute('list_files', { path: '.' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello.py');
  });

  it('should block noncompliant write when validator is set', async () => {
    const config = {
      version: '1.0', project: 'test', languages: ['python'],
      rules: {
        tuopu_header: 'required' as const, bagu_paragraphs: 'required' as const,
        anti_duality: 'required' as const, empty_bagu: 'warn' as const, format_consistency: 'required' as const,
      },
      ci: { strict: true, format: 'text' as const },
    };
    const { ConstraintEngine } = await import('../../src/constraint/engine');
    const { TopoHeaderRule } = await import('../../src/constraint/rules/topology');
    const { BaguParagraphsRule } = await import('../../src/constraint/rules/bagu');
    const { DualityRule } = await import('../../src/constraint/rules/duality');
    const { FormatRule } = await import('../../src/constraint/rules/format');
    const { EmptyBaguRule } = await import('../../src/constraint/rules/empty-bagu');
    const { GenerationValidator } = await import('../../src/constraint/validator');

    const engine = new ConstraintEngine(config, [
      new TopoHeaderRule(), new BaguParagraphsRule(),
      new DualityRule(), new FormatRule(), new EmptyBaguRule(),
    ]);
    const validator = new GenerationValidator(engine);

    const executor = new AgentToolExecutor(testDir, validator);
    const result = await executor.execute('write_file', {
      path: 'bad.py',
      content: 'print("no bagu")',
    });

    expect(result.success).toBe(false);
    expect(result.validationError).toBeDefined();
  });
});
```

- [ ] **步骤 3：运行测试验证通过**

```bash
pnpm test tests/agent/tools.test.ts
```

预期：4 tests pass。

- [ ] **步骤 4：提交**

```bash
git add src/agent/tools.ts tests/agent/tools.test.ts
git commit -m "feat: add agent tools with write_file validation interception"
```

---

### 任务 14：Agent 循环

**文件：**
- 创建：`/Users/linmac/code_bagu/src/agent/loop.ts`
- 创建：`/Users/linmac/code_bagu/src/agent/context.ts`
- 创建：`/Users/linmac/code_bagu/src/agent/history.ts`

- [ ] **步骤 1：实现上下文管理器**

写入 `src/agent/context.ts`：

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class ContextManager {
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  getProjectContext(): string[] {
    const context: string[] = [];

    const agentsMd = join(this.workingDir, 'AGENTS.md');
    if (existsSync(agentsMd)) {
      context.push(`## AGENTS.md\n${readFileSync(agentsMd, 'utf-8')}`);
    }

    const codebaguYml = join(this.workingDir, '.codebagu.yml');
    if (existsSync(codebaguYml)) {
      context.push(`## .codebagu.yml\n${readFileSync(codebaguYml, 'utf-8')}`);
    }

    return context;
  }

  loadSkillFile(skillPath: string): string | null {
    if (existsSync(skillPath)) {
      return readFileSync(skillPath, 'utf-8');
    }
    return null;
  }
}
```

- [ ] **步骤 2：实现对话历史管理器**

写入 `src/agent/history.ts`：

```typescript
import { Message } from '../llm/types';

const MAX_HISTORY = 100;

export class HistoryManager {
  private messages: Message[] = [];

  add(message: Message): void {
    this.messages.push(message);
    if (this.messages.length > MAX_HISTORY) {
      this.messages = this.messages.slice(-MAX_HISTORY);
    }
  }

  getAll(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  lastAssistantMessage(): Message | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') {
        return this.messages[i];
      }
    }
    return null;
  }
}
```

- [ ] **步骤 3：实现 Agent 循环**

写入 `src/agent/loop.ts`：

```typescript
import { LLMAdapter, Message, ToolCall } from '../llm/types';
import { LLMResponse } from '../llm/types';
import { PromptInjector } from '../constraint/prompt';
import { AgentToolExecutor } from './tools';
import { ContextManager } from './context';
import { HistoryManager } from './history';
import { GenerationValidator } from '../constraint/validator';
import { CodeBaguConfig } from '../config/types';

const MAX_RETRIES = 3;
const SYSTEM_PROMPT_BASE = 'You are a helpful AI coding assistant.';

export class AgentLoop {
  private llm: LLMAdapter;
  private tools: AgentToolExecutor;
  private promptInjector: PromptInjector;
  private context: ContextManager;
  private history: HistoryManager;
  private validator: GenerationValidator;
  private model: string;

  constructor(
    llm: LLMAdapter,
    toolExecutor: AgentToolExecutor,
    promptInjector: PromptInjector,
    contextManager: ContextManager,
    validator: GenerationValidator,
    model: string,
  ) {
    this.llm = llm;
    this.tools = toolExecutor;
    this.promptInjector = promptInjector;
    this.context = contextManager;
    this.history = new HistoryManager();
    this.validator = validator;
    this.model = model;
  }

  setSystemPrompt(skillContent?: string): void {
    const projectContext = this.context.getProjectContext();
    const systemContent = this.promptInjector.buildSystemPrompt(projectContext, skillContent);
    this.history = new HistoryManager();
    this.history.add({ role: 'system', content: systemContent + '\n\n' + SYSTEM_PROMPT_BASE });
  }

  async sendMessage(userInput: string): Promise<string> {
    let retryCount = 0;

    this.history.add({ role: 'user', content: userInput });

    while (retryCount <= MAX_RETRIES) {
      const response = await this.llm.chat({
        model: this.model,
        messages: this.history.getAll(),
        tools: (await import('./tools')).AGENT_TOOLS,
        max_tokens: 4096,
      });

      const choice = response.choices[0];
      const assistantMsg: Message = {
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      };
      this.history.add(assistantMsg);

      if (choice.message.content && !choice.message.tool_calls) {
        return choice.message.content;
      }

      if (choice.message.tool_calls) {
        const result = await this.handleToolCalls(choice.message.tool_calls);

        if (result.retry && retryCount < MAX_RETRIES) {
          retryCount++;
          const constraintPrompt = this.promptInjector.buildConstraintPrompt(
            this.validator.validate(result.filePath || '', result.content || '').violations,
          );
          this.history.add({ role: 'user', content: constraintPrompt });
          continue;
        }

        if (result.done) {
          return result.output;
        }

        return result.output || '操作完成';
      }

      return choice.message.content || '';
    }

    return '已达到最大重试次数，请检查 Code Bagu 规范并手动修正。';
  }

  private async handleToolCalls(toolCalls: ToolCall[]): Promise<{
    retry: boolean;
    done: boolean;
    output: string;
    filePath?: string;
    content?: string;
  }> {
    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments);
      const result = await this.tools.execute(call.function.name, args);

      if (result.validationError) {
        return {
          retry: true,
          done: false,
          output: result.validationError,
          filePath: args.path as string,
          content: args.content as string,
        };
      }

      this.history.add({
        role: 'tool',
        content: result.output,
        tool_call_id: call.id,
      });

      if (call.function.name === 'write_file' && result.success) {
        return { retry: false, done: true, output: result.output };
      }
    }

    const followUp = await this.llm.chat({
      model: this.model,
      messages: this.history.getAll(),
      max_tokens: 4096,
    });

    const msg = followUp.choices[0].message;
    this.history.add({ role: 'assistant', content: msg.content });
    return { retry: false, done: true, output: msg.content || '完成' };
  }
}
```

- [ ] **步骤 4：提交**

```bash
git add src/agent/loop.ts src/agent/context.ts src/agent/history.ts
git commit -m "feat: add agent loop with retry, context, history, and tool dispatch"
```

---

### 任务 15：chat 子命令

**文件：**
- 创建：`/Users/linmac/code_bagu/src/cli/chat.ts`
- 更新：`/Users/linmac/code_bagu/src/index.ts`

- [ ] **步骤 1：实现 chat 命令**

写入 `src/cli/chat.ts`：

```typescript
import * as readline from 'readline';
import { CodeBaguConfig } from '../config/types';
import { DeepSeekAdapter } from '../llm/deepseek';
import { AgentLoop } from '../agent/loop';
import { AgentToolExecutor } from '../agent/tools';
import { PromptInjector } from '../constraint/prompt';
import { ContextManager } from '../agent/context';
import { GenerationValidator } from '../constraint/validator';
import { ConstraintEngine } from '../constraint/engine';
import { TopoHeaderRule } from '../constraint/rules/topology';
import { BaguParagraphsRule } from '../constraint/rules/bagu';
import { DualityRule } from '../constraint/rules/duality';
import { FormatRule } from '../constraint/rules/format';
import { EmptyBaguRule } from '../constraint/rules/empty-bagu';

export async function startChat(config: CodeBaguConfig, options: {
  model?: string;
  apiKey?: string;
  skillPath?: string;
  workingDir?: string;
}): Promise<void> {
  const apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('请设置 DEEPSEEK_API_KEY 环境变量或通过 --api-key 提供');
  }

  const workingDir = options.workingDir || process.cwd();
  const model = options.model || 'deepseek-chat';

  const engine = new ConstraintEngine(config, [
    new TopoHeaderRule(),
    new BaguParagraphsRule(),
    new DualityRule(),
    new FormatRule(),
    new EmptyBaguRule(),
  ]);

  const validator = new GenerationValidator(engine);
  const toolExecutor = new AgentToolExecutor(workingDir, validator);
  const llm = new DeepSeekAdapter({ apiKey, model });
  const promptInjector = new PromptInjector(config);
  const contextManager = new ContextManager(workingDir);

  const agent = new AgentLoop(llm, toolExecutor, promptInjector, contextManager, validator, model);

  const skillContent = options.skillPath ? contextManager.loadSkillFile(options.skillPath) : undefined;
  agent.setSystemPrompt(skillContent);

  console.log(`Code Bagu v1.0.0 | 八股约束: 启用 | 模型: ${model}`);
  console.log(`项目: ${config.project} | 语言: ${config.languages.join(', ')}`);
  console.log('输入 /quit 退出，/clear 清除对话\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();
    if (input === '/quit' || input === '/exit') {
      console.log('再见!');
      rl.close();
      process.exit(0);
    }

    if (input === '/clear') {
      agent.setSystemPrompt(skillContent);
      console.log('对话已清除\n');
      rl.prompt();
      return;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    try {
      const response = await agent.sendMessage(input);
      console.log(`\n${response}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`\n❌ 错误: ${message}\n`);
    }

    rl.prompt();
  });
}
```

- [ ] **步骤 2：更新 CLI 入口注册 chat 命令**

更新 `src/index.ts`，在现有 check 命令后添加 chat 命令：

```typescript
import { startChat } from './cli/chat';

// ... (在 program 定义后)

program
  .command('chat')
  .description('对话式 AI 编程（Code Bagu 约束）')
  .option('-m, --model <model>', '模型名称', 'deepseek-chat')
  .option('-k, --api-key <key>', 'DeepSeek API Key')
  .option('-s, --skill <path>', 'code_bagu_skill.md 路径')
  .option('-w, --working-dir <path>', '工作目录')
  .action(async (options: { model: string; apiKey?: string; skill?: string; workingDir?: string }) => {
    try {
      const config = loadConfigFromCwd();
      await startChat(config, {
        model: options.model,
        apiKey: options.apiKey,
        skillPath: options.skill,
        workingDir: options.workingDir,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error:', message);
      process.exit(1);
    }
  });
```

完整 `src/index.ts` 应为：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck, CheckOptions } from './cli/check';
import { startChat } from './cli/chat';
import { loadConfigFromCwd } from './config/loader';

const program = new Command();

program
  .name('codebagu')
  .description('AI-first coding CLI with Code Bagu constraint enforcement')
  .version('1.0.0');

program
  .command('check <path>')
  .description('离线检查文件或目录的 Code Bagu 合规性')
  .option('-f, --format <format>', '输出格式: text | json', 'text')
  .option('--strict', '严格模式，警告也报错', false)
  .action(async (path: string, options: { format: string; strict: boolean }) => {
    try {
      const config = loadConfigFromCwd();
      const output = runCheck(path, config, {
        format: options.format as CheckOptions['format'],
        strict: options.strict,
      });
      console.log(output);
      process.exit(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error:', message);
      process.exit(1);
    }
  });

program
  .command('chat')
  .description('对话式 AI 编程（Code Bagu 约束）')
  .option('-m, --model <model>', '模型名称', 'deepseek-chat')
  .option('-k, --api-key <key>', 'DeepSeek API Key')
  .option('-s, --skill <path>', 'code_bagu_skill.md 路径')
  .option('-w, --working-dir <path>', '工作目录')
  .action(async (options: { model: string; apiKey?: string; skill?: string; workingDir?: string }) => {
    try {
      const config = loadConfigFromCwd();
      await startChat(config, {
        model: options.model,
        apiKey: options.apiKey,
        skillPath: options.skill,
        workingDir: options.workingDir,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error:', message);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

- [ ] **步骤 3：验证构建**

```bash
pnpm build
```

预期：无 TS 编译错误。

- [ ] **步骤 4：提交**

```bash
git add src/cli/chat.ts src/index.ts
git commit -m "feat: add chat subcommand with interactive agent loop"
```

---

### 任务 16：init 子命令

**文件：**
- 创建：`/Users/linmac/code_bagu/src/cli/init.ts`
- 更新：`/Users/linmac/code_bagu/src/index.ts`

- [ ] **步骤 1：实现 init 命令**

写入 `src/cli/init.ts`：

```typescript
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_CONFIG = `version: "1.0"
project: "<项目名>"

languages:
  - python

rules:
  tuopu_header: required
  bagu_paragraphs: required
  anti_duality: required
  empty_bagu: warn
  format_consistency: required

ci:
  strict: true
  format: text
`;

export function runInit(targetDir: string, projectName: string): string {
  const configPath = join(targetDir, '.codebagu.yml');

  if (existsSync(configPath)) {
    return '.codebagu.yml 已存在，跳过创建。';
  }

  const content = DEFAULT_CONFIG.replace('<项目名>', projectName);
  writeFileSync(configPath, content, 'utf-8');
  return `✅ 已创建 .codebagu.yml (项目: ${projectName})`;
}
```

- [ ] **步骤 2：更新 CLI 入口注册 init 命令**

在 `src/index.ts` 中添加 init 命令（在 chat 命令之后）：

```typescript
import { runInit } from './cli/init';

program
  .command('init')
  .description('初始化项目，创建 .codebagu.yml')
  .option('-n, --name <name>', '项目名称', 'my-project')
  .action((options: { name: string }) => {
    const result = runInit(process.cwd(), options.name);
    console.log(result);
  });
```

- [ ] **步骤 3：验证构建**

```bash
pnpm build
```

预期：无 TS 编译错误。

- [ ] **步骤 4：提交**

```bash
git add src/cli/init.ts src/index.ts
git commit -m "feat: add init subcommand for .codebagu.yml generation"
```

---

### 任务 17：端到端集成测试

**文件：**
- 创建：`/Users/linmac/code_bagu/tests/integration/e2e.test.ts`

- [ ] **步骤 1：编写端到端集成测试**

写入 `tests/integration/e2e.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tests/fixtures/e2e-project');

function runCli(args: string): string {
  try {
    return execSync(`tsx src/index.ts ${args}`, {
      encoding: 'utf-8',
      cwd: TEST_DIR,
    });
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr;
    return stderr?.toString() || String(err);
  }
}

describe('codebagu end-to-end', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('init → check compliant → check noncompliant', () => {
    // init
    const initOut = runCli('init --name e2e-test');
    expect(initOut).toContain('.codebagu.yml');

    const configExists = existsSync(join(TEST_DIR, '.codebagu.yml'));
    expect(configExists).toBe(true);

    // check: noncompliant file fails
    writeFileSync(join(TEST_DIR, 'bad.py'), 'def f(): return 1');
    const checkBad = runCli('check bad.py --format json --strict');

    // 提取 JSON（可能有错误输出在前面）
    const jsonMatch = checkBad.match(/\{[^]*\}/);
    expect(jsonMatch).not.toBeNull();
    const result = JSON.parse(jsonMatch![0]);
    expect(result.passed).toBe(false);

    // check: compliant file passes
    const compliantContent = `"""
Test — test file (test.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
拓扑图:
  输入: x
  输出: y → z
  数据流向:
    x → y
修改风险点:
  ⚠️ 第1行: test
最近修改:
  2026-05-14: init
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
# 破题：处理数据；不做验证。
# 承题：N/A。前置条件: N/A。
# [起讲] test
# 入手：N/A
def f():
    # ==== 起股 ====
    # 取：N/A
    # 验：N/A
    # ==== 中股 ====
    # 算：N/A
    # 转：N/A
    # ==== 后股 ====
    # ✓ 正路径：ok
    # ✗ 降级路径：N/A
    # ==== 束股 ====
    # 给出：N/A
    # 留下：N/A
    pass
`;
    writeFileSync(join(TEST_DIR, 'good.py'), compliantContent);
    const checkGood = runCli('check good.py --format json');
    const goodMatch = checkGood.match(/\{[^]*\}/);
    const goodResult = JSON.parse(goodMatch![0]);
    expect(goodResult.passed).toBe(true);
  });
});
```

- [ ] **步骤 2：运行集成测试**

```bash
pnpm test tests/integration/e2e.test.ts
```

预期：通过。

- [ ] **步骤 3：提交**

```bash
git add tests/integration/e2e.test.ts
git commit -m "test: add end-to-end integration test for init + check"
```

---

### 任务 18：构建与二进制打包

**文件：**
- 更新：`/Users/linmac/code_bagu/package.json`

- [ ] **步骤 1：更新 package.json 添加 build info 和 scripts**

在 `package.json` 中确保有以下字段：

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  }
}
```

- [ ] **步骤 2：全量 build 与测试**

```bash
pnpm build
pnpm test
```

预期：所有测试通过，构建成功。

- [ ] **步骤 3：提交**

```bash
git add package.json
git commit -m "chore: finalize build and test scripts"
```

---

## 计划自检

**规格覆盖度**：
- 四层架构 → 任务 1-17 全部覆盖
- 规则引擎 → 任务 3-7
- Prompt 注入器 → 任务 11
- 校验器 → 任务 12
- check 命令 → 任务 9
- chat 命令 → 任务 15
- init 命令 → 任务 16
- DeepSeek 适配器 → 任务 10
- Agent 循环 → 任务 14
- 端到端测试 → 任务 17

**无占位符**：所有步骤均含实际代码。

**类型一致性**：`RuleViolation`, `EngineResult`, `ValidationResult`, `CodeBaguConfig` 在各任务间一致使用。
