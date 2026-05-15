/**
 * ContextManager — 项目上下文与技能文件加载器 (context.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: workingDir / skillPath
 *   输出: projectContext 字符串数组 / skillContent 字符串
 *   数据流向:
 *     workingDir → 检查 AGENTS.md / .codebagu.yml → 读取内容 → 返回上下文
 *     skillPath → 检查存在性 → 读取内容 → 返回字符串
 *   修改风险点:
 *     ⚠️ 第14行: AGENTS.md 文件过大时可能撑爆 LLM 上下文窗口
 *   最近修改:
 *     2026-05-15: 新增 loadSkillFile 方法，支持外部 skill 文件
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：加载项目级上下文文件和技能文档；不做内容解析或格式转换。
// 承题：依赖 fs、path。前置条件: workingDir 存在且可读。
// [起讲] 将项目规范（AGENTS.md）和配置（.codebagu.yml）注入 LLM 的 system prompt，提供全局认知
// 入手：N/A

// ==== 起股 ====
// 取：workingDir、skillPath
// 验：workingDir 为有效目录

// ==== 中股 ====
// 算：检查 AGENTS.md → 读取 → 加入上下文
// 算：检查 .codebagu.yml → 读取 → 加入上下文
// 算：检查 skillPath → 读取 → 返回内容

// ==== 后股 ====
// ✓ 正路径：文件存在 → 读取成功 → 返回内容
// ✗ 降级路径：文件不存在 → 跳过 → 返回空数组/ null
// ✗ 降级路径：文件权限不足 → 抛出异常（上游处理）

// ==== 束股 ====
// 给出：string[]（projectContext）/ string | null（skillContent）
// 留下：N/A

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class ContextManager {
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  getProjectContext(): string[] {
    // ==== 起股 ====
    // 取：workingDir
    // 验：N/A

    const context: string[] = [];

    // ==== 中股 ====
    // 算：检查 AGENTS.md 和 .codebagu.yml

    const agentsMd = join(this.workingDir, 'AGENTS.md');
    if (existsSync(agentsMd)) {
      context.push(`## AGENTS.md\n${readFileSync(agentsMd, 'utf-8')}`);
    }
    const codebaguYml = join(this.workingDir, '.codebagu.yml');
    if (existsSync(codebaguYml)) {
      context.push(`## .codebagu.yml\n${readFileSync(codebaguYml, 'utf-8')}`);
    }

    // ==== 后股 ====
    // ✓ 正路径：返回收集到的上下文

    // ==== 束股 ====
    // 给出：string[]
    // 留下：N/A

    return context;
  }

  loadSkillFile(skillPath: string): string | null {
    // ==== 起股 ====
    // 取：skillPath
    // 验：路径非空

    // ==== 中股 ====
    // 算：检查文件存在性 → 读取

    // ==== 后股 ====
    // ✓ 正路径：文件存在 → 返回内容
    // ✗ 降级路径：文件不存在 → 返回 null

    // ==== 束股 ====
    // 给出：string | null
    // 留下：N/A

    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return null;
  }
}
