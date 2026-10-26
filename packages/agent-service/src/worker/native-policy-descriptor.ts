import { z } from 'zod';
import { editInspect } from '@oh-my-pi/pi-natives';
import { parseArchivePathCandidates } from '@oh-my-pi/pi-utils/ar';
import { toPathList } from '@oh-my-pi/pi-tui/render/render-utils';
import { splitPathAndSel } from '@oh-my-pi/pi-tui/tools/read';
import { expandDelimitedPathEntries, normalizePathLikeInput, parseFindPattern, parseSearchPathPreferringLiteral, resolveReadPathAsync, resolveToCwd, splitDelimitedPathEntry, splitMixedUrlPathList, splitPathAndSelPreferringLiteral } from '@oh-my-pi/pi-coding-agent/tools/path-utils';
import { unwrapHashlineHeaderPath } from '@oh-my-pi/pi-coding-agent/tools/plan-mode-guard';
import { splitJsonQueryTarget } from '@oh-my-pi/pi-coding-agent/tools/read-json';
import { parseSqlitePathCandidates } from '@oh-my-pi/pi-coding-agent/tools/sqlite-reader';
import { splitVideoReadTarget } from '@oh-my-pi/pi-coding-agent/utils/video';
import { splitPdfImageReadPath } from '@oh-my-pi/pi-coding-agent/tools/read-pdf';
import { InternalUrlRouter } from '@oh-my-pi/pi-coding-agent/internal-urls';
import { NativeOperationDescriptorSchema, OMP_INTERNAL_URL_SCHEMES, type NativeOperationDescriptor, type NativePolicyContext } from '../native-policy-protocol.ts';
import type { WorkerPolicyRequest } from '../protocol.ts';

const OMP_INTERNAL_URL_SCHEME_SET: Record<string, true> = Object.fromEntries(OMP_INTERNAL_URL_SCHEMES.map(scheme => [scheme, true]));
const URL_SCHEME_PREFIX = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//;

/**
 * The normalized URL only when OMP itself would dispatch it to one of the
 * allowlisted internal schemes. OMP's router owns aliases and selectors; the
 * Host neither parses nor resolves the target.
 */
function ompInternalUrl(value: string): string | null {
  const router = InternalUrlRouter.instance();
  const normalized = router.normalize(value);
  const match = URL_SCHEME_PREFIX.exec(normalized);
  return match !== null && OMP_INTERNAL_URL_SCHEME_SET[match[1]!.toLowerCase()] === true && router.canHandle(normalized)
    ? normalized : null;
}

function requireNoNul(raw: string): void {
  if (raw.includes('\0')) throw new Error('Native target contains an invalid byte');
}

function localPath(raw: string, cwd: string): string {
  requireNoNul(raw);
  const value = normalizePathLikeInput(raw);
  // Remote/internal device ownership is not a filesystem capability.
  if (value.includes('://')) throw new Error('Target requires a separate Host capability');
  return resolveToCwd(value, cwd);
}

async function fileTargets(raw: string, cwd: string, read: boolean): Promise<{ targets: string[]; internalUrls: string[] }> {
  requireNoNul(raw);
  const normalized = unwrapHashlineHeaderPath(normalizePathLikeInput(raw));
  const targets = new Set<string>();
  const internalUrls: string[] = [];
  let parts = read ? await splitDelimitedPathEntry(normalized, cwd, { splitter: item => ({ basePath: splitPathAndSel(item).path }) }) ?? [normalized] : [normalized];
  if (read && parts.length === 1) parts = await splitMixedUrlPathList(parts[0]!, cwd, part => ompInternalUrl(part) !== null) ?? parts;
  for (const part of parts) {
    // OMP owns the URL grammar, including selectors; the Host neither peels nor
    // resolves these targets and only admits the allowlisted scheme.
    const internal = read ? ompInternalUrl(part) : null;
    if (internal !== null) {
      internalUrls.push(internal);
      continue;
    }
    const split = read ? await splitPathAndSelPreferringLiteral(part, cwd) : { path: part };
    targets.add(localPath(split.path, cwd));
    if (read) targets.add(await resolveReadPathAsync(split.path, cwd));
    const json = splitJsonQueryTarget(split.path);
    if (json) targets.add(localPath(json.jsonPath, cwd));
    for (const candidate of parseArchivePathCandidates(split.path)) targets.add(localPath(candidate.archivePath, cwd));
    if (read) {
      const video = splitVideoReadTarget(part);
      if (video) targets.add(localPath(video.path, cwd));
      const pdf = splitPdfImageReadPath(part);
      if (pdf) targets.add(localPath(pdf.pdfPath, cwd));
    }
    for (const candidate of parseSqlitePathCandidates(split.path)) targets.add(localPath(candidate.sqlitePath, cwd));
  }
  return { targets: [...targets], internalUrls };
}

/** Execution-free first-party grammar inspection, only in the trusted Bun supervisor. */
export async function describeNativeOperation(cwd: string, request: WorkerPolicyRequest, context?: NativePolicyContext): Promise<NativeOperationDescriptor | undefined> {
  if (request.type === 'shell') return NativeOperationDescriptorSchema.parse({ toolName: 'bash', command: request.request.command, sourcePaths: [cwd], destinationPaths: [], fileOps: [] });
  if (request.type !== 'tool') return undefined;
  const { toolName, input } = request;
  const sourcePaths: string[] = [];
  const destinationPaths: string[] = [];
  const base = { toolName, sourcePaths, destinationPaths, fileOps: [], ...context };
  const { editMode: effectiveMode, ...effective } = base;
  if (toolName === 'edit') {
    if (!context) throw new Error('SDK effective edit mode is unavailable');
    const inspection = editInspect(context.editMode, JSON.stringify(input));
    const fileOps = inspection.fileOps.map(operation => {
      const fileOp: NativeOperationDescriptor['fileOps'][number] = { kind: operation.kind, path: localPath(operation.path, cwd) };
      if (operation.to !== undefined) fileOp.to = localPath(operation.to, cwd);
      return fileOp;
    });
    const sourcePaths = [...new Set([...inspection.paths.map(target => localPath(target, cwd)), ...fileOps.map(operation => operation.path)])];
    if (sourcePaths.length === 0) throw new Error('Native edit input has no targets');
    return NativeOperationDescriptorSchema.parse({ ...effective, effectiveMode, sourcePaths, destinationPaths: [...new Set([...sourcePaths, ...fileOps.flatMap(operation => operation.to === undefined ? [] : [operation.to])])], fileOps });
  }
  if (toolName === 'read' || toolName === 'write') {
    const path = z.string().safeParse(input.path);
    if (!path.success) throw new Error('Native file path is missing');
    const { targets, internalUrls } = await fileTargets(path.data, cwd, toolName === 'read');
    if (toolName !== 'read') return NativeOperationDescriptorSchema.parse({ ...effective, destinationPaths: targets });
    const descriptor = { ...effective, sourcePaths: targets };
    return NativeOperationDescriptorSchema.parse(internalUrls.length > 0 ? { ...descriptor, internalReadUrls: internalUrls } : descriptor);
  }
  if (toolName === 'grep' || toolName === 'glob') {
    const path = z.string().safeParse(input.path);
    const entries = await expandDelimitedPathEntries(toPathList(path.success ? path.data : '.'), cwd, toolName === 'glob' ? { splitter: parseFindPattern } : {});
    const sourcePaths: string[] = [];
    for (const entry of entries) {
      const split = toolName === 'grep' ? await splitPathAndSelPreferringLiteral(entry, cwd) : { path: entry };
      const parsed = toolName === 'glob' ? parseFindPattern(split.path) : await parseSearchPathPreferringLiteral(split.path, cwd);
      sourcePaths.push(localPath(parsed.basePath, cwd));
    }
    return NativeOperationDescriptorSchema.parse({ ...effective, sourcePaths });
  }
  if (toolName === 'bash') {
    const command = z.object({ command: z.string(), cwd: z.string().optional() }).safeParse(input);
    if (!command.success) throw new Error('Native command is invalid');
    return NativeOperationDescriptorSchema.parse({ ...effective, command: command.data.command, sourcePaths: [command.data.cwd === undefined ? cwd : localPath(command.data.cwd, cwd)] });
  }
  if (toolName === 'provider.use') {
    return NativeOperationDescriptorSchema.parse({ ...effective, providerId: input.providerId, modelId: input.modelId, endpoint: input.endpoint });
  }
  return undefined;
}
