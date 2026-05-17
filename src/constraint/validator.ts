/**
 * GenerationValidator — 代码生成校验器 (validator.ts)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 拓扑图:
 *   输入: filePath / source / configLanguages
 *   输出: ValidationResult（valid / violations）
 *   数据流向:
 *     filePath + source + configLanguages → detectLanguage → ConstraintEngine.evaluate → ValidationResult
 *     filePath + configLanguages → shouldValidate → boolean
 *   修改风险点:
 *     ⚠️ 第20行: detectLanguage 回退到 configLanguages[0]，可能误判语言
 *     ⚠️ 第28行: shouldValidate 按扩展名判断，新增语言需同步扩展名列表
 *   最近修改:
 *     2026-05-15: 新增 shouldValidate 方法，支持多语言扩展名判断
 *     2026-05-15: validate 自动调用 detectLanguage，无需外部传入 language
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// 破题：对 AI 生成的代码进行语言检测和八股合规校验；不做自动修正。
// 承题：依赖 ConstraintEngine、detectLanguage、LANGUAGE_PROFILES。前置条件: engine 已初始化。
// [起讲] 校验器是"守门人"——write_file 前最后一道检查，失败则返回 violation 触发 LLM 重试
// 入手：N/A（engine 由外部注入）

// ==== 起股 ====
// 取：filePath、source、configLanguages
// 验：filePath 非空、source 为字符串

// ==== 中股 ====
// 算：detectLanguage(filePath, configLanguages) → 识别语言
// 算：engine.evaluate({ filePath, source, language }) → 执行规则校验
// 转：EngineResult → ValidationResult

// ==== 后股 ====
// ✓ 正路径：全部规则通过 → valid = true, violations = []
// ✗ 降级路径：存在 error 级违规 → valid = false, violations 非空
// ✗ 降级路径：语言不在配置列表 → 回退到默认语言校验

// ==== 束股 ====
// 给出：ValidationResult（valid, violations）
// 留下：无副作用（纯计算）

import { ConstraintEngine } from './engine';
import { RuleViolation } from './types';
import { detectLanguage, LANGUAGE_PROFILES } from '../config/languages';

export interface ValidationResult {
  valid: boolean;
  violations: RuleViolation[];
}

export class GenerationValidator {
  private engine: ConstraintEngine;
  private configLanguages: string[];

  constructor(engine: ConstraintEngine, configLanguages: string[] = ['python']) {
    this.engine = engine;
    this.configLanguages = configLanguages;
  }

  // 破题：对指定文件路径和源码进行语言检测与八股合规校验；不做自动修正。
  // 承题：依赖 detectLanguage、this.engine。前置条件: filePath 非空、source 为字符串。
  // [起讲] 先检测语言 → 再调用引擎 evaluate → 返回 valid/violations
  // 入手：N/A
  validate(filePath: string, source: string): ValidationResult {
    // ==== 起股 ====
    // 取：filePath、source
    // 验：filePath 为字符串、source 为字符串

    // ==== 中股 ====
    // 算：detectLanguage(filePath, this.configLanguages) → 识别语言
    // 算：this.engine.evaluate({ filePath, source, language }) → 执行规则校验
    // 转：EngineResult → ValidationResult

    // ==== 后股 ====
    // ✓ 正路径：全部规则通过 → valid = true, violations = []
    // ✗ 降级路径：存在 error 级违规 → valid = false, violations 非空
    // ✗ 降级路径：语言不在配置列表 → 回退到默认语言校验

    // ==== 束股 ====
    // 给出：ValidationResult（valid, violations）
    // 留下：无副作用（纯计算）

    const language = detectLanguage(filePath, this.configLanguages);
    const result = this.engine.evaluate({ filePath, source, language });
    return {
      valid: result.passed,
      violations: result.violations,
    };
  }

  // 破题：按文件扩展名判断是否应该进行八股校验；不做内容分析。
  // 承题：依赖 LANGUAGE_PROFILES、this.configLanguages。前置条件: filePath 含扩展名。
  // [起讲] 提取扩展名 → 遍历配置语言 → 匹配 LANGUAGE_PROFILES.extensions
  // 入手：N/A
  shouldValidate(filePath: string): boolean {
    // ==== 起股 ====
    // 取：filePath
    // 验：filePath 含 '.'

    // ==== 中股 ====
    // 算：提取扩展名 → 遍历 this.configLanguages → 匹配 LANGUAGE_PROFILES.extensions

    // ==== 后股 ====
    // ✓ 正路径：扩展名在配置语言中 → true
    // ✗ 降级路径：扩展名无匹配 → false
    // ✗ 降级路径：filePath 无扩展名 → false

    // ==== 束股 ====
    // 给出：boolean
    // 留下：N/A

    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    for (const lang of this.configLanguages) {
      const profile = LANGUAGE_PROFILES[lang];
      if (profile && profile.extensions.includes(ext)) return true;
    }
    return false;
  }
}
