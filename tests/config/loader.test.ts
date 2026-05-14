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

  it('should throw when file does not exist', async () => {
    await expect(
      loadConfig('tests/fixtures/nonexistent.yml')
    ).rejects.toThrow('配置文件不存在');
  });

  it('should throw on empty languages array', async () => {
    await expect(
      loadConfig('tests/fixtures/invalid-config.yml')
    ).rejects.toThrow('languages 必须是非空数组');
  });

  it('should throw when a required rule is missing', async () => {
    await expect(
      loadConfig('tests/fixtures/missing-rule.yml')
    ).rejects.toThrow('rules.format_consistency 必须是');
  });

  it('should throw on invalid ci.format', async () => {
    await expect(
      loadConfig('tests/fixtures/ci-format-invalid.yml')
    ).rejects.toThrow('ci.format 必须是 text 或 json');
  });

  it('should throw on empty version string', async () => {
    await expect(
      loadConfig('tests/fixtures/empty-version.yml')
    ).rejects.toThrow('缺少 version 字段');
  });

  it('should throw when ci.strict is not a boolean', async () => {
    await expect(
      loadConfig('tests/fixtures/ci-strict-string.yml')
    ).rejects.toThrow('ci.strict 必须是布尔值');
  });

  it('should throw on unknown rule key', async () => {
    await expect(
      loadConfig('tests/fixtures/unknown-rule.yml')
    ).rejects.toThrow('未知的规则: rules.topo_header');
  });
});
