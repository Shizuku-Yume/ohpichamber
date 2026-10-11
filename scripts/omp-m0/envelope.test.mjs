import { describe, expect, test } from 'bun:test';
import { finishEnvelope, ProbeError, probeResult, safeError, serializeEnvelope } from './envelope.mjs';

describe('M0 evidence envelope', () => {
  test('retains each capability status rather than empty success', () => {
    const probes = ['passed', 'partial', 'failed', 'unsupported', 'unavailable', 'unknown'].map(status => probeResult(status, 'fixture capability', status));
    const report = finishEnvelope({ command: 'fixture' }, probes, { temporaryDirectoriesRemoved: true }, 1);
    expect(JSON.parse(serializeEnvelope(report)).summary).toEqual({ passed: 1, partial: 1, failed: 1, unsupported: 1, unavailable: 1, unknown: 1 });
    expect(report.probes).toHaveLength(6);
    expect(report.run.exitCode).toBe(1);
    expect(report.schemaVersion).toBe(2);
  });

  test('does not serialize raw errors or message bodies', () => {
    expect(safeError(new Error('private fixture exception'))).toBe('PROBE_FAILED');
    expect(safeError(new ProbeError('SOURCE_NOT_SELECTED', 'unavailable'))).toBe('SOURCE_NOT_SELECTED');
    for (const key of ['prompt', 'response', 'content', 'stack', 'delta', 'authorization']) {
      expect(() => serializeEnvelope({ [key]: 'private fixture text' })).toThrow('UNSAFE_REPORT_FIELD');
    }
  });

  test('rejects paths and endpoint strings', () => {
    for (const value of ['/home/fixture/workspace', '/tmp/fixture', 'C:\\fixture\\workspace', 'https://fixture.invalid/private', 'Bearer fixture-marker']) {
      expect(() => serializeEnvelope({ observations: { value } })).toThrow('UNSAFE_REPORT_VALUE');
    }
  });

  test('fails closed for invalid statuses and circular SDK-like data', () => {
    expect(() => finishEnvelope({}, [probeResult('empty', 'fixture', 'success')], {}, 0)).toThrow('INVALID_STATUS');
    const circular = {};
    circular.self = circular;
    expect(() => serializeEnvelope(circular)).toThrow();
  });
});
