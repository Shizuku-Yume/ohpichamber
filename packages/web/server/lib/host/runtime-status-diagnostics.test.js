import { describe, expect, it } from 'vitest';
import { formatDiagnosticLines } from '@/lib/runtimeStatus';

describe('Runtime Status diagnostics', () => {
  it('surfaces an MCP startup failure with its root and generation', () => {
    const lines = formatDiagnosticLines([{
      at: '2026-10-23T06:30:00.000Z', level: 'error', source: 'worker',
      rootSessionId: 'root-session-1234', workerGeneration: 'generation-abc',
      message: 'MCP runtime failure (MCP_STARTUP_FAILED)',
    }]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('error worker');
    expect(lines[0]).toContain('root=root-session-123');
    expect(lines[0]).toContain('generation=generati');
    expect(lines[0]).toContain('MCP runtime failure (MCP_STARTUP_FAILED)');
  });
});
