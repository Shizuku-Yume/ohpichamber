import { CanonicalEventSchema, SessionSchema, SessionSnapshotSchema } from '@openchamber/agent-contract';
import { isEnterpriseMode } from '../enterprise-mode.js';
import { redactGitText } from '../git/redaction.js';
import { truncateNotificationText } from './message.js';
import {
  defaultNotificationTemplates,
  notificationTexts,
  renderNotificationText,
  withTemplateDefaults,
} from './template-locales.js';

const TITLES = {
  ready: 'Agent response is ready', error: 'Agent hit an error', question: 'Agent needs your input', permission: 'Agent needs permission',
  goal_complete: 'Goal complete', goal_blocked: 'Goal blocked', goal_budget: 'Goal reached its token budget',
};

export const createNotificationTriggerRuntime = (deps) => {
  const {
    sessionService, resolveSessionScope, readSettingsFromDisk, readSessionMetadata,
    prepareNotificationLastMessage, buildTemplateVariables, fetchLastAssistantMessageText,
    resolveNotificationTemplate, shouldApplyResolvedTemplateMessage,
    emitDesktopNotification, broadcastUiNotification, sendPushToAllUiSessions, sendApnsToAllUiSessions,
    isAnyInteractiveClientVisible, now = Date.now,
  } = deps;
  if (typeof sessionService?.open !== 'function' || typeof sessionService?.list !== 'function' || typeof resolveSessionScope !== 'function') {
    throw new TypeError('Canonical session reader and Host scope resolver are required');
  }
  let getIsWindowFocused = deps.getIsWindowFocused;
  let getIsSessionAutoAccepting = deps.getIsSessionAutoAccepting;
  let stopped = false;
  const autoAcceptingSessions = new Set();
  const pendingPushTags = new Set();
  const pending = new Map();
  const notified = new Set();
  const lastTerminalAt = new Map();
  const deepLink = (id) => `/?session=${encodeURIComponent(id)}`;
  const safeText = (text, scope) => redactGitText(text, {
    secrets: [scope.cwd, scope.agentDirectory, ...Object.values(scope.env ?? {})].filter(Boolean), maxChars: 1000,
  });
  const clearPending = (sessionId) => {
    for (const [key, entry] of pending) {
      if (entry.sessionId !== sessionId) continue;
      clearTimeout(entry.timer); pending.delete(key);
    }
  };
  // The body a phone shows: what happened, after a word that says which kind
  // of event it is. A finished turn needs no word, its reply says it.
  const phoneBodyOf = (prefix, text) => {
    const detail = truncateNotificationText((text ?? '').trim());
    if (!detail) return '';
    return prefix ? `${prefix}: ${detail}` : detail;
  };

  const PERMISSION_PREFIX_BY_ACTION = {
    bash_command: 'Wants to run',
    file_write: 'Wants to edit',
  };

  const fanoutPush = async ({ phoneBody, ...payload }) => {
    const type = payload.data.type;
    const generic = TITLES[type] ?? 'Agent update';
    const enterprise = isEnterpriseMode();
    const web = enterprise ? { ...payload, title: generic, body: '', data: { url: payload.data.url, sessionId: payload.data.sessionId, type } } : payload;
    const visible = isAnyInteractiveClientVisible?.() === true;
    if (!visible) pendingPushTags.add(payload.tag);
    const knownSessionName = typeof payload.data.sessionName === 'string' ? payload.data.sessionName.trim() : '';
    // A phone with a push key opens the sealed text on the device; the relay
    // and the push service see only the generic title. Enterprise mode keeps
    // the generic text even sealed: the push service is outside its boundary.
    const sealed = phoneBody && !enterprise
      ? { title: knownSessionName || generic, body: phoneBody }
      : undefined;
    await Promise.all([
      Promise.resolve().then(() => sendPushToAllUiSessions?.(web, { requireNoSse: true })).catch(() => console.warn('Web push delivery failed')),
      visible ? Promise.resolve() : Promise.resolve().then(() => sendApnsToAllUiSessions?.({
        title: generic, body: enterprise ? '' : (knownSessionName || 'Session'), sealed, badge: pendingPushTags.size,
        tag: payload.tag, data: { sessionId: payload.data.sessionId },
      }, { requireNoSse: true })).catch(() => console.warn('Native push delivery failed')),
    ]);
  };
  const autoAccepts = async (sessionId, scope, approvalId) => {
    if (await getIsSessionAutoAccepting?.(sessionId, scope, approvalId)) return true;
    let current = sessionId;
    const seen = new Set();
    while (current && !seen.has(current) && autoAcceptingSessions.size > 0) {
      if (autoAcceptingSessions.has(current)) return true;
      seen.add(current);
      const snapshot = SessionSnapshotSchema.parse(await sessionService.open(current));
      current = snapshot.session.parentSessionId;
    }
    return false;
  };
  const send = async (event, scope, kind, requestKey) => {
    if (stopped) return;
    const resolved = await resolveSessionScope(event.sessionId);
    if (resolved.workspaceId !== scope.workspaceId || resolved.rootSessionId !== scope.rootSessionId || resolved.cwd !== scope.cwd) return;
    const settings = await readSettingsFromDisk();
    if ((kind === 'ready' && settings.notifyOnCompletion === false) || (kind === 'error' && settings.notifyOnError === false)
      || ((kind === 'question' || kind === 'permission') && settings.notifyOnQuestion === false)) return;
    if (settings.notificationMode !== 'always' && getIsWindowFocused?.()) return;
    if (kind === 'permission' && await autoAccepts(event.sessionId, resolved, event.approval.approvalId)) return;
    let subtask = false;
    if (kind === 'ready') {
      const snapshot = SessionSnapshotSchema.parse(await sessionService.open(event.sessionId));
      subtask = Boolean(snapshot.session.parentSessionId);
      if (subtask && settings.notifyOnSubtasks === false) return;
      const page = await sessionService.list(resolved.workspaceId);
      const sessions = SessionSchema.array().parse(page.items);
      if (Object.keys(page.errors).length > 0) return;
      if (sessions.some((session) => session.rootSessionId === resolved.rootSessionId && session.sessionId !== event.sessionId
        && ['running', 'awaiting_approval', 'awaiting_input'].includes(session.runtimeStatus))) return;
      const metadata = await readSessionMetadata(event.sessionId);
      if (metadata?.openchamber?.goal?.status === 'active') return;
    }
    if (kind === 'ready' || kind === 'error') {
      const key = `${kind}:${event.sessionId}`;
      const previous = lastTerminalAt.get(key);
      if (previous !== undefined && now() - previous < 5000) return;
      lastTerminalAt.delete(key); lastTerminalAt.set(key, now());
      while (lastTerminalAt.size > 500) lastTerminalAt.delete(lastTerminalAt.keys().next().value);
    }
    const texts = notificationTexts(settings.locale);
    let title = kind === 'permission' ? texts.permissionTitle : kind === 'question' ? texts.questionTitle
      : kind === 'error' ? texts.errorTitle : renderNotificationText(texts.readyTitle, { agent_name: 'Agent' });
    let body = kind === 'permission' ? texts.permissionBody : kind === 'question' ? texts.questionBody
      : kind === 'error' ? texts.errorBody : renderNotificationText(texts.readyMessage, { model_name: 'Assistant' });
    let sessionName = '';
    let phoneBody = '';
    try {
      const variables = await buildTemplateVariables(event, event.sessionId, resolved);
      sessionName = safeText(variables.session_name, resolved);
      const text = kind === 'ready' ? await fetchLastAssistantMessageText(event.sessionId)
        : kind === 'error' ? event.error
          : kind === 'question' ? event.question.prompt : kind === 'permission' ? event.approval.commandSummary : '';
      variables.last_message = await prepareNotificationLastMessage({ message: safeText(text, resolved), settings });
      for (const key of Object.keys(variables)) variables[key] = safeText(variables[key], resolved);
      const templates = settings.notificationTemplates ?? {};
      const defaults = defaultNotificationTemplates(settings.locale);
      // A permission reuses the question template, but its empty title is the
      // permission wording, not "Input needed".
      const template = withTemplateDefaults(
        kind === 'ready' ? (subtask ? templates.subtask ?? templates.completion : templates.completion)
          : kind === 'error' ? templates.error : templates.question,
        kind === 'ready' ? (subtask ? defaults.subtask : defaults.completion)
          : kind === 'error' ? defaults.error
            : kind === 'permission' ? { ...defaults.question, title: texts.permissionTitle } : defaults.question,
      );
      const resolvedTitle = resolveNotificationTemplate(template.title, variables);
      const resolvedBody = resolveNotificationTemplate(template.message, variables);
      if (resolvedTitle) title = resolvedTitle;
      if (shouldApplyResolvedTemplateMessage(template.message, resolvedBody, variables)) body = resolvedBody;
      phoneBody = kind === 'ready' ? phoneBodyOf('', variables.last_message)
        : kind === 'error' ? phoneBodyOf('Error', variables.last_message)
          : kind === 'question' ? phoneBodyOf('Question', safeText(event.question.prompt, resolved))
            : phoneBodyOf(PERMISSION_PREFIX_BY_ACTION[event.approval.actionType] ?? 'Wants permission', safeText(event.approval.commandSummary, resolved));
    } catch { console.warn('Notification enrichment unavailable; using generic notification'); }
    if (stopped || (requestKey && !pending.has(requestKey))) return;
    title = safeText(title, resolved); body = safeText(body, resolved);
    const tag = kind === 'permission' ? `permission-${requestKey}` : `${kind}-${event.sessionId}`;
    if (settings.nativeNotificationsEnabled) {
      const notification = { title, body, tag, kind, sessionId: event.sessionId, workspaceId: resolved.workspaceId,
        projectId: resolved.projectId, requireHidden: settings.notificationMode !== 'always' };
      const delivered = emitDesktopNotification(notification);
      broadcastUiNotification(notification, { desktopNotificationDelivered: delivered });
    }
    if (requestKey) {
      notified.add(requestKey);
      while (notified.size > 500) notified.delete(notified.values().next().value);
    }
    await fanoutPush({ title, body, phoneBody, tag, data: { url: deepLink(event.sessionId), sessionId: event.sessionId, sessionName, type: kind } });
  };
  const processCanonicalEvent = async (input, scope) => {
    if (stopped) return;
    const event = CanonicalEventSchema.parse(input);
    if (!scope?.workspaceId || !scope?.rootSessionId) throw new Error('Host event scope is required');
    if (event.type === 'session.deleted') { for (const id of event.deletedSessionIds) clearPending(id); return; }
    if (event.type === 'run.cancelled') { clearPending(event.sessionId); return; }
    if (event.type === 'run.completed' || event.type === 'run.failed') {
      return send(event, scope, event.type === 'run.completed' ? 'ready' : 'error');
    }
    const permission = event.type.startsWith('approval.');
    const question = event.type.startsWith('question.');
    if (!permission && !question) return;
    const id = permission ? event.approval.approvalId : event.question.questionId;
    const key = `${event.sessionId}:${event.epoch}:${id}`;
    if (event.type.endsWith('.resolved')) {
      clearTimeout(pending.get(key)?.timer); pending.delete(key); return;
    }
    if (notified.has(key) || pending.has(key)) return;
    const entry = { sessionId: event.sessionId, timer: null };
    pending.set(key, entry);
    entry.timer = setTimeout(() => {
      void send(event, scope, permission ? 'permission' : 'question', key)
        .catch(() => console.warn('Canonical notification trigger failed'))
        .finally(() => { if (pending.get(key) === entry) pending.delete(key); });
    }, 500);
  };
  return {
    processCanonicalEvent,
    setAutoAcceptSession(sessionId, enabled) { if (enabled) autoAcceptingSessions.add(sessionId); else autoAcceptingSessions.delete(sessionId); },
    setGetIsWindowFocused(resolver) { getIsWindowFocused = resolver; },
    setGetIsSessionAutoAccepting(resolver) { getIsSessionAutoAccepting = resolver; },
    clearPendingPushBadge() { pendingPushTags.clear(); },
    async sendGoalSettlePush({ sessionId, status, title, body }) {
      const scope = await resolveSessionScope(sessionId);
      let sessionName = '';
      try { sessionName = safeText((await buildTemplateVariables(null, sessionId, scope)).session_name, scope); } catch { /* Generic push remains useful. */ }
      const type = status === 'complete' ? 'goal_complete' : status === 'budgetLimited' ? 'goal_budget' : 'goal_blocked';
      await fanoutPush({ title: safeText(title, scope), body: safeText(body, scope),
        phoneBody: phoneBodyOf(safeText(title, scope), safeText(body, scope)) || safeText(title, scope), tag: `goal-${sessionId}`,
        data: { url: deepLink(sessionId), sessionId, sessionName, type } });
    },
    invalidateSession(sessionId) { clearPending(sessionId); },
    stop() { stopped = true; for (const entry of pending.values()) clearTimeout(entry.timer); pending.clear(); },
  };
};
