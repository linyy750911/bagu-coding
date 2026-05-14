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
    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return null;
  }
}
