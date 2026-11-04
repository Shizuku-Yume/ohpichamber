import { expect, test } from 'bun:test';
import { approvalInputSummary } from './approval-summary.ts';

const summary = (command: string) => approvalInputSummary('bash_command', { command });

test('masks every environment assignment value', () => {
  expect(summary("FOO=private-value bash -lc 'echo done'")).toBe("FOO=[REDACTED] bash -lc 'echo done'");
  expect(summary('env FOO=\'private value\' BAR="two words" printf done')).toBe('env FOO=[REDACTED] BAR=[REDACTED] printf done');
  expect(summary('GITHUB_TOKEN=ghp_private_value bun test')).toBe('GITHUB_TOKEN=[REDACTED] bun test');
});

test('masks authorization schemes and credentials', () => {
  expect(summary("curl -H 'Authorization: Basic b3BhcXVlLXNlY3JldA==' https://example.com")).not.toContain('b3BhcXVl');
  expect(summary('curl -H "Authorization: Bearer bearer-secret" https://example.com')).not.toContain('bearer-secret');
  expect(summary('curl -u user:basic-secret https://example.com')).not.toContain('basic-secret');
  expect(summary('git clone https://user:url-secret@example.com/repo.git')).not.toContain('url-secret');
  expect(summary("curl -H 'X-Api-Key: api-key-secret' https://example.com")).not.toContain('api-key-secret');
  expect(summary('curl --header "Private-Token: private-token-secret" https://example.com')).not.toContain('private-token-secret');
  expect(summary("curl -d '{\"api_key\":\"json-key-secret\"}' https://example.com")).not.toContain('json-key-secret');
  expect(summary("curl -d \"{'password':'json-password'}\" https://example.com")).not.toContain('json-password');
  expect(summary('curl "https://example.com/?X-Amz-Signature=signed-url-secret"')).not.toContain('signed-url-secret');
  expect(summary('mysql -pR4nd0mK8vP9 app')).not.toContain('R4nd0mK8vP9');
  expect(summary('sshpass -p ssh-password ssh host')).not.toContain('ssh-password');
  expect(summary('openssl pkey -in k.pem -passin pass:hunter2')).not.toContain('hunter2');
  expect(summary('gpg --passphrase hunter3 --decrypt file.gpg')).not.toContain('hunter3');
  expect(summary('redis-cli -a hunter4 ping')).not.toContain('hunter4');
  expect(summary("curl -H 'X-Gitlab-Token: gitlab-secret' https://example.com")).not.toContain('gitlab-secret');
  expect(summary('curl "https://example.com/x?key=query-secret"')).not.toContain('query-secret');
  expect(summary('curl "https://example.com/x?auth=auth-secret"')).not.toContain('auth-secret');
  expect(summary('printf %s 0123456789abcdef0123456789abcdef01234567')).not.toContain('0123456789abcdef0123456789abcdef01234567');
});

test('masks token arguments and common credential shapes', () => {
  expect(summary('tool --token token-argument')).not.toContain('token-argument');
  expect(summary('printf %s sk-live-abcdefgh1234')).not.toContain('sk-live-abcdefgh1234');
  expect(summary('printf %s ghp_abcdefghijklmnopqrstuvwx')).not.toContain('ghp_abcdefghijklmnopqrstuvwx');
  expect(summary('printf %s xoxb-private-token-value')).not.toContain('xoxb-private-token-value');
  expect(summary('tool --jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl')).not.toContain('eyJhbGciOiJIUzI1NiJ9');
});

test('masks a private key block and keeps the rest of the command', () => {
  const key = '-----BEGIN PRIVATE KEY-----\nprivate-key-body\n-----END PRIVATE KEY-----';
  const value = summary(`cat > key.pem <<'EOF'\n${key}\nEOF\necho kept`);
  expect(value).not.toContain('private-key-body');
  expect(value).toContain('echo kept');
});

test('a value without a credential shape is only masked when it is an assignment value', () => {
  expect(summary('printf %s ordinary-value')).toContain('ordinary-value');
  expect(summary('FOO=ordinary-value printf done')).not.toContain('ordinary-value');
});
