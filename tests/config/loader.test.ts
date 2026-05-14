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
