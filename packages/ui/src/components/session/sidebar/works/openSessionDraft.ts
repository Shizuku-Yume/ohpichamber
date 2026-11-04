import { toServerFileUrl } from '@/components/chat/composer/attachments/filePaths';
import { createChatDraftIdentity, getChatDraftIdentityKey } from '@/lib/chatDraftPersistence';
import { normalizePath } from '@/lib/pathNormalization';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { hasUnsyncedSessionDraft, readSessionDraftAttachment, type SessionDraft } from '@/stores/useSessionDraftsStore';
import { useInputStore } from '@/sync/input-store';
import { useSessionUIStore } from '@/sync/session-ui-store';

/** Whether the composer still shows this draft's directory, after the user had time to move on. */
const isDraftOpen = (directory: string): boolean => {
  const state = useSessionUIStore.getState();
  return !state.currentSessionId
    && state.newSessionDraft.open
    && normalizePath(state.newSessionDraft.directoryOverride) === normalizePath(directory);
};

/**
 * Opens a Host-shared draft from the sidebar in the composer. The composer's
 * own per-device draft for that directory keeps the text; the server's copy
 * supplies the files it stored and their bytes follow when they have
 * downloaded, if the user is still on the draft. Resolves false when an
 * attachment could not be read; the draft still opens with the rest.
 */
export async function openSessionDraft(draft: SessionDraft): Promise<boolean> {
  useSessionUIStore.getState().openNewSessionDraft({
    selectedProjectId: draft.projectId ?? undefined,
    directoryOverride: draft.directory,
  });
  if (hasUnsyncedSessionDraft(draft.id)) return true;
  const target = createChatDraftIdentity(getRuntimeKey(), draft.directory, null);
  if (!target) return true;
  const pathFiles = draft.attachments.flatMap((attachment) => (
    attachment.kind === 'path' && attachment.path
      ? [{ url: toServerFileUrl(attachment.path), mimeType: attachment.mimeType, filename: attachment.filename }]
      : []
  ));
  // The composer applies it once it shows this draft, over what it kept of it.
  useInputStore.setState({ pendingComposerRestore: { target, text: draft.text, files: pathFiles } });

  const stored = draft.attachments.filter((attachment) => attachment.kind === 'data');
  if (stored.length === 0) return true;
  const downloaded = await Promise.all(stored.map(async (attachment) => {
    const url = await readSessionDraftAttachment(draft.id, attachment);
    return url ? { url, mimeType: attachment.mimeType, filename: attachment.filename } : null;
  }));
  const files = downloaded.flatMap((file) => (file ? [file] : []));
  if (!isDraftOpen(draft.directory)) return true;
  const input = useInputStore.getState();
  const pending = input.pendingComposerRestore;
  if (pending && getChatDraftIdentityKey(pending.target) === getChatDraftIdentityKey(target)) {
    useInputStore.setState({ pendingComposerRestore: { ...pending, text: pending.text, files: [...pending.files, ...files] } });
  } else {
    for (const file of files) input.addRestoredAttachment(file);
  }
  return files.length === stored.length;
}
