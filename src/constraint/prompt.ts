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
