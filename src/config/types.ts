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
