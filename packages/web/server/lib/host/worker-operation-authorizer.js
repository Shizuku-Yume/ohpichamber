import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { HostAuthorizationScopeSchema, HostWorkspacePolicySchema, WorkerPolicyRequestSchema, NativeOperationDescriptorSchema } from '@openchamber/agent-service/private-protocol';
import { resolveGuestFilePath } from '../guests/files.js';
import { unsupportedRepositoryRootReason } from '../git/repository-root.js';
import { isEnterpriseMode } from '../enterprise-mode.js';

export const PERMISSION_PRESET_IDS = Object.freeze(['ask', 'safety', 'auto']);
export const isPermissionPresetId = (value) => typeof value === 'string' && PERMISSION_PRESET_IDS.includes(value);

// A refusal names the check that refused, so the person reading it can act on it.
const denied = (reason, code = 'UNAUTHORIZED', status = 403) => ({ allowed: false, code, status, detail: reason });
const approvalRequired = reason => ({ ...denied(reason), approvalRequired: true });
const allowed = { allowed: true };
// A proposed value is one the authorized operation itself introduces into the
// workspace, so the pre-operation snapshot cannot describe it and the check
// validates the candidate the post-operation state will contain instead.
// For a server that means: the workspace will actually run it — enabled, and not
// hand-written config the UI must never mutate. Reusing an existing server id is
// how an edit is expressed, so it is not a refusal.
const proposedServerPermitted = server => server.enabled && server.managed !== false;
// A proposed provider/model must name a complete, well-formed selection: the
// worker resolves it against the live catalog, and the Host still refuses an
// empty or query-bearing endpoint rather than authorizing an opaque target.
const proposedProviderPermitted = descriptor => typeof descriptor?.providerId === 'string' && descriptor.providerId.length > 0
 && typeof descriptor.modelId === 'string' && descriptor.modelId.length > 0
 && (descriptor.endpoint === undefined || (typeof descriptor.endpoint === 'string'
  && /^https?:\/\/[^\s]+$/.test(descriptor.endpoint) && !descriptor.endpoint.includes('@')));
// SDK isolation drops the programmatic tool extensions that re-enter this
// authorizer, so an isolated child could write or run unobserved. Host-owned
// workers only admit non-isolated delegation, and a caller-supplied artifact id
// must stay a single safe path segment.
const safeTaskName = value => typeof value !== 'string' || /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const taskDelegation = input => {
 const items = Array.isArray(input.tasks) ? input.tasks.filter(isObject) : [];
 const isolated = input.isolated === true || items.some(item => item.isolated === true);
 const names = [input.name, ...items.map(item => item.name)];
 return isolated ? 'isolated' : names.every(safeTaskName) ? 'allowed' : 'invalid-name';
};

const OAuthEndpointSchema = z.string().url().pipe(z.string().refine(value => {
 const endpoint = new URL(value);
 return ['http:', 'https:'].includes(endpoint.protocol) && !endpoint.username && !endpoint.password && !endpoint.hash;
}));
const OAuthPolicyConfigurationSchema = z.strictObject({
 authorizationUrl: OAuthEndpointSchema.optional(), tokenUrl: OAuthEndpointSchema.optional(),
 issuerUrl: OAuthEndpointSchema.optional(), registrationUrl: OAuthEndpointSchema.optional(),
 resourceMetadataUrl: OAuthEndpointSchema.optional(), redirectUri: OAuthEndpointSchema.optional(),
 resource: OAuthEndpointSchema.optional(), clientId: z.string().min(1).optional(),
 scopes: z.string().min(1).optional(), prompt: z.string().optional(),
 callbackPort: z.number().int().min(1).max(65_535).optional(),
 callbackPath: z.string().startsWith('/').optional(), stripSameOriginResource: z.boolean().optional(),
});
const FilePathInputSchema = z.string().min(1).refine(value => path.isAbsolute(value) && !value.includes('\u0000'));

/** Host machine policy and source-bound consent authorize exact native operations.
 * A workspace cwd is not an OS sandbox; yolo does not confer a machine command grant.
 */
export const createWorkerOperationAuthorizer = ({
 resolvePolicy, validateDirectoryPath, enterprisePolicyOptions, approvalPolicyStore,
}) => {
 return async (rawScope, rawRequest, rawDescriptor) => {
  try {
   const scopeResult = HostAuthorizationScopeSchema.safeParse(rawScope);
   const requestResult = WorkerPolicyRequestSchema.safeParse(rawRequest);
   if (!scopeResult.success || !requestResult.success) return denied('The authorization request did not match the Host policy protocol', 'INVALID_REQUEST', 400);
   const scope = scopeResult.data; const request = requestResult.data;
   const policyResult = HostWorkspacePolicySchema.safeParse(await resolvePolicy(scope));
   if (!policyResult.success) return denied('The workspace policy is unavailable');
   const policy = policyResult.data;
   if (policy.projectId !== scope.projectId || policy.workspaceId !== scope.workspaceId
    || policy.agentDirectoryId !== scope.agentDirectoryId || policy.cwd !== scope.cwd
    || policy.agentDirectory !== scope.agentDirectory) return denied('The workspace policy does not match the authorized scope');
   const directory = await validateDirectoryPath(scope.cwd);
   if (!directory?.ok || unsupportedRepositoryRootReason(directory.directory)
    || directory.directory !== await fs.realpath(policy.cwd)
    || await fs.realpath(scope.agentDirectory) !== await fs.realpath(policy.agentDirectory)) return denied('The authorized workspace directory could not be validated');
   const policies = approvalPolicyStore?.list({ sessionId: scope.rootSessionId, projectId: scope.projectId, workspaceId: scope.workspaceId }) ?? [];
   const toolName = request.type === 'tool' ? request.toolName : request.type === 'shell' ? 'bash' : null;
   const input = request.type === 'tool' ? request.input : request.type === 'shell' ? request.request : null;
   const nativeTool = toolName !== null && ['read', 'write', 'edit', 'grep', 'glob', 'bash', 'provider.use', 'lsp'].includes(toolName);
   const descriptorResult = rawDescriptor === undefined ? null : NativeOperationDescriptorSchema.safeParse(rawDescriptor);
   if (nativeTool && (!descriptorResult?.success || descriptorResult.data.toolName !== toolName)) return denied('The native operation descriptor is missing or names a different tool', 'INVALID_REQUEST', 400);
   const descriptor = descriptorResult?.success ? descriptorResult.data : null;
   const exactPolicies = toolName === null ? [] : policies.filter(row => row.target.toolName === toolName && row.target.pattern === JSON.stringify(input));
   if (exactPolicies.some(row => row.decision === 'deny')) return denied('An approval policy denies this exact tool request');
   const commandGranted = command => policy.shellCommands.includes(command)
    || exactPolicies.some(row => row.decision === 'allow')
    || (descriptor?.approvalGrant?.command === command
     && descriptor.approvalGrant.rootSessionId === scope.rootSessionId
     && descriptor.approvalGrant.workerGeneration === scope.workerGeneration
     && request.type === 'tool' && descriptor.approvalGrant.approvalId === request.approvalId
     && descriptor.approvalGrant.toolCallId === request.toolCallId);
   const pathAllowed = async rawPath => {
    const target = FilePathInputSchema.safeParse(rawPath);
    if (!target.success) return false;
    const relative = path.isAbsolute(target.data) ? path.relative(directory.directory, target.data) : target.data;
    const resolved = await resolveGuestFilePath({ path: relative || '.', projectDirectory: directory.directory, patterns: [], homeDir: os.homedir() });
    return resolved.ok && resolved.scope === 'project';
   };
   if (request.type === 'web-search') return isEnterpriseMode(enterprisePolicyOptions) ? denied('Enterprise mode refuses native web search', 'enterprise_mode', 403) : allowed;
   if (request.type === 'provider-entry') {
    if (isEnterpriseMode(enterprisePolicyOptions)) return denied('Enterprise mode refuses provider credential entry', 'enterprise_mode', 403);
    return policy.providerEntry ? allowed : denied('The workspace does not allow provider credential entry');
   }
   if (request.type === 'mcp-server' || request.type === 'mcp-oauth') {
    const permitted = request.proposed === true
     ? proposedServerPermitted(request.server)
     : policy.mcpServers.some(server => isDeepStrictEqual(server, request.server));
    if (!permitted) return denied(request.proposed === true
     ? 'The proposed MCP server is disabled or is not managed by OpenChamber'
     : 'The MCP server is not in the workspace configuration');
    if (request.type === 'mcp-oauth' && (request.server.transport.type === 'stdio'
     || !OAuthPolicyConfigurationSchema.safeParse(request.configuration).success)) return denied('The MCP OAuth configuration is not a valid remote OAuth configuration', 'INVALID_REQUEST', 400);
    return allowed;
   }
   if (request.type === 'shell') return descriptor?.command !== undefined && commandGranted(descriptor.command) ? allowed : denied('The native command has no Host grant');
   if (request.type !== 'tool') return denied('The request type is not authorized for this workspace');
   if (request.agentId !== undefined && !policy.agentIds.includes(request.agentId)) return denied('The agent profile is not in the workspace catalog');
   if (request.permissionPresetId !== undefined && (!isPermissionPresetId(request.permissionPresetId)
    || (!request.proposed && !policy.permissionPresetIds.includes(request.permissionPresetId)))) return denied('The permission preset is not available in this workspace');
   if (request.toolName === 'provider.use') {
    const permitted = request.proposed === true
     ? proposedProviderPermitted(descriptor)
     : descriptor !== null && policy.providers.some(provider => provider.providerId === descriptor.providerId
      && provider.modelId === descriptor.modelId && provider.endpoint === descriptor.endpoint);
    return permitted ? allowed : denied(request.proposed === true
     ? 'The proposed provider and model do not name a complete selection'
     : 'The provider and model are not enabled in this workspace');
   }
   if (request.toolName === 'permission.preset') {
    return request.input.presetId === request.permissionPresetId && isPermissionPresetId(request.input.presetId)
     && (request.proposed === true || policy.permissionPresetIds.includes(request.input.presetId))
     ? allowed : denied('The permission preset is not available in this workspace');
   }
   // Native ask only opens a scoped, CAS-protected interaction; it grants no machine capability.
   if (request.toolName === 'ask') return allowed;
   // Native yield submits the child's structured result to its parent; it opens no
   // machine capability and is the only successful child-completion path.
   if (request.toolName === 'yield') return allowed;
   // Native goal operations only read or change this session's OMP goal state.
   // Provider turns and machine tools still require their own authorization.
   if (request.toolName === 'goal') return allowed;
   // Native todo operations only read or update this session's OMP task/todo state.
   // Provider turns and machine tools still require their own authorization.
   if (request.toolName === 'todo') return allowed;
   // Native wait only observes this session's async jobs; it opens no machine
   // capability and OMP resolves its own job identifiers.
   if (request.toolName === 'wait') return allowed;
   // Native task delegation starts an SDK child under the captured workspace. A
   // non-isolated child's tool calls re-enter this authorizer, so the request grants
   // no machine capability; the selected profile's allowedTools gate already ran in
   // the worker. Isolated children are refused because that path bypasses these hooks.
   if (request.toolName === 'task') {
    const delegation = taskDelegation(request.input);
    return delegation === 'allowed' ? allowed : delegation === 'isolated'
     ? denied('Isolated task delegation bypasses the Host authorization hooks')
     : denied('The task name is not a safe path segment', 'INVALID_REQUEST', 400);
   }
   if (nativeTool && descriptor) {
    const internalReadUrls = descriptor.internalReadUrls ?? [];
    // Internal URLs are OMP-owned resources, not filesystem grants. Only the
    // read path may pass them through; write/edit/grep/glob stay local.
    if (internalReadUrls.length > 0 && request.toolName !== 'read') return denied('Internal OMP URLs are readable but not writable');
    for (const target of [...descriptor.sourcePaths, ...descriptor.destinationPaths, ...descriptor.fileOps.flatMap(operation => operation.to === undefined ? [operation.path] : [operation.path, operation.to])]) {
     if (!await pathAllowed(target)) return denied('The operation targets a path outside the authorized workspace');
    }
    if (request.toolName === 'bash') return descriptor.command !== undefined && commandGranted(descriptor.command)
     ? allowed : approvalRequired('The native command requires approval');
    if (request.toolName === 'lsp') {
     const action = descriptor.lspAction;
     if (typeof action !== 'string' || action.length === 0) return denied('The LSP action is missing or empty', 'INVALID_REQUEST', 400);
     const readOnlyActions = ['diagnostics', 'definition', 'type_definition', 'implementation', 'references', 'hover', 'symbols', 'status', 'capabilities'];
     const isReadOnly = readOnlyActions.includes(action) || (action === 'code_actions' && request.input?.apply !== true);
     if (isReadOnly) {
      if (descriptor.destinationPaths.length > 0 || descriptor.fileOps.length > 0) return denied('A read-only LSP action may not modify files');
      return policy.fileTools.includes('read') ? allowed : denied('The workspace does not grant file reads');
     }
     const mutationActions = ['rename', 'rename_file', 'format'];
     const isCodeActionApply = action === 'code_actions' && request.input?.apply === true;
     if (mutationActions.includes(action) || isCodeActionApply) {
      if (!policy.fileTools.includes('write')) return denied('The workspace does not grant file writes');
      if (descriptor.destinationPaths.length === 0) return denied('The LSP mutation names no destination path');
      const granted = descriptor.approvalGrant !== undefined
       && descriptor.approvalGrant.rootSessionId === scope.rootSessionId
       && descriptor.approvalGrant.workerGeneration === scope.workerGeneration
       && descriptor.approvalGrant.approvalId === request.approvalId
       && descriptor.approvalGrant.toolCallId === request.toolCallId;
      return granted ? allowed : approvalRequired('The LSP mutation requires approval');
     }
     return denied('The LSP action is not authorized');
    }
    const capability = ['write', 'edit'].includes(request.toolName) ? 'write' : 'read';
    if (request.toolName === 'edit' && descriptor.effectiveMode === undefined) return denied('The edit operation carries no effective edit mode');
    const targets = capability === 'write' ? descriptor.destinationPaths : descriptor.sourcePaths;
    if (internalReadUrls.length > 0 && capability === 'read') return policy.fileTools.includes('read') ? allowed : denied('The workspace does not grant file reads');
    return targets.length > 0 && policy.fileTools.includes(capability) ? allowed : denied('The workspace does not grant the file capability this operation needs');
   }
   return policy.toolRequests.some(candidate => isDeepStrictEqual(candidate, request)) ? allowed : denied('The workspace policy does not allow this tool request');
  } catch { return denied('The Host authorization check failed before it could decide', 'SERVICE_UNAVAILABLE', 503); }
 };
};
