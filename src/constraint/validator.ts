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
