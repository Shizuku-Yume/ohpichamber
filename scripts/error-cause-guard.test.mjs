import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { findReasonlessDenials, findTranslationOnlyCatches } from './error-cause-guard.mjs';

const tree = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'error-cause-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
};

test('a catch that discards its error and shows a translation is a finding', () => {
  const root = tree({
    'a.ts': 'try { await save() } catch {\n  toast.error(t(\'save.failed\'));\n}\n',
    'b.tsx': 'try { await save() } catch (failure) {\n  setSaveError(t(\'save.failed\'));\n}\n',
  });
  assert.deepEqual(findTranslationOnlyCatches(root, root), ['a.ts:1', 'b.tsx:1']);
});

test('showing the caught cause clears the finding', () => {
  const root = tree({
    'a.ts': 'try { await save() } catch (error) {\n  toast.error(problemMessage(error, t(\'save.failed\')));\n}\n',
    'b.ts': 'try { await save() } catch (error) {\n  setSaveError(error.message);\n}\n',
    'c.ts': 'try { await save() } catch {\n  toast.success(t(\'saved\'));\n}\n',
  });
  assert.deepEqual(findTranslationOnlyCatches(root, root), []);
});

test('logging the caught error is not showing it', () => {
  const root = tree({
    'a.ts': 'try { await save() } catch (error) {\n  console.error(error);\n  toast.error(t(\'save.failed\'));\n}\n',
    'b.ts': 'try { await save() } catch (error) {\n  console.error(\'save failed\', error);\n  setSaveError(t(\'save.failed\'));\n}\n',
    'c.ts': 'try { await save() } catch (error) {\n  console.error(error);\n  toast.error(problemMessage(error, t(\'save.failed\')));\n}\n',
  });
  assert.deepEqual(findTranslationOnlyCatches(root, root), ['a.ts:1', 'b.ts:1']);
});

test('a denial without a reason is a finding', () => {
  const root = tree({
    'authorizer.js': [
      "const denied = (reason, code = 'UNAUTHORIZED') => ({ allowed: false, code, detail: reason });",
      "if (!policy) return denied('The workspace policy is unavailable');",
      'if (!scope) return denied();',
      'return denied();',
    ].join('\n'),
  });
  assert.deepEqual(findReasonlessDenials(path.join(root, 'authorizer.js'), root), ['authorizer.js:3', 'authorizer.js:4']);
});
