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
