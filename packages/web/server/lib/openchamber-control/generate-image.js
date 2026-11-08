/**
 * `image.generate`: an image model the user chose in Settings makes or edits
 * pictures for any agent, through OpenCode's `POST
 * /api/experimental/generate/image` (OpenCode 2.2) or the canonical OMP
 * `POST /api/agent/v1/workspaces/:id/images/generate` route (commit 5469bb0).
 *
 * The bytes go to a file, never back into the conversation: a picture inline
 * would be stored with the session and synced to every client, a few
 * megabytes per call. The agent gets the path and reads the file when it
 * wants to look. Without a path of its own the file lands in OpenCode's
 * temporary folder, which OpenCode tells agents they may read and write
 * without asking. The chat draws the files from the call's result
 * (`../markdown-image-grants/routes.js`).
 */

import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { asNonEmptyString } from '../shared/guards.js';
import { OpenChamberControlError } from './error.js';

/** OpenCode's temporary folder (`paths.tmp` of `/api/info`), the default home of a generated file. */
export const GENERATED_IMAGE_DIRECTORY = path.join(os.tmpdir(), 'opencode', 'generated-images');

const MAX_PROMPT_LENGTH = 8_000;
const MAX_SOURCE_IMAGES = 8;
const MAX_COUNT = 4;
const SOURCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
// Image generation over remote providers routinely takes 30-90s.
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

const EXTENSION_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MIME_BY_SIGNATURE = [
  { mime: 'image/png', match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/jpeg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { mime: 'image/webp', match: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

const countSchema = z.coerce.number().int().min(1).max(MAX_COUNT);
const sourcesSchema = z.array(z.string().min(1)).max(MAX_SOURCE_IMAGES);

const pad = (value, length = 2) => String(value).padStart(length, '0');
const stamp = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;

const detectMime = (bytes) => {
  if (bytes.length < 12) return null;
  return MIME_BY_SIGNATURE.find(({ match }) => match(bytes))?.mime ?? null;
};

const resolvePath = (candidate, directory) => {
  if (path.isAbsolute(candidate)) return path.normalize(candidate);
  if (!directory) throw new OpenChamberControlError(`Cannot resolve relative path "${candidate}" without an absolute path for the session folder`, 400);
  return path.resolve(directory, candidate);
};

const readSourceImage = async (fsPromises, source, directory) => {
  const file = resolvePath(source, directory);
  try {
    await fsPromises.access(file, fsConstants.R_OK);
  } catch {
    throw new OpenChamberControlError(`Image not found: ${source}`, 400);
  }
  const stat = await fsPromises.stat(file);
  if (stat.size > SOURCE_IMAGE_MAX_BYTES) {
    throw new OpenChamberControlError(`Image exceeds 10MB: ${source}`, 400);
  }
  const buffer = await fsPromises.readFile(file);
  const mime = detectMime(buffer);
  if (!mime) throw new OpenChamberControlError(`File is not an image (expected png, jpeg, webp or gif): ${source}`, 400);
  return { data: buffer.toString('base64'), mime, name: path.basename(file) };
};

const targetPath = ({ requested, directory, index, count, mime, now }) => {
  const extension = EXTENSION_BY_MIME[mime] ?? 'png';
  if (!requested) {
    const suffix = count > 1 ? `-${index + 1}` : '';
    return path.join(GENERATED_IMAGE_DIRECTORY, `image-${stamp(now)}${suffix}.${extension}`);
  }
  const resolved = resolvePath(requested, directory);
  const parsed = path.parse(resolved);
  const ext = parsed.ext || `.${extension}`;
  const suffix = index > 0 ? `-${index + 1}` : '';
  return path.join(parsed.dir, `${parsed.name}${suffix}${ext}`);
};

const toControlError = (error, model) => {
  const tag = error?._tag;
  const message = asNonEmptyString(error?.message) || 'Image generation failed';
  if (tag === 'ModelNotFoundError') {
    return new OpenChamberControlError(`The image model ${model} is no longer available. Ask the user to choose another in Settings > General > OpenChamber Tools`, 409);
  }
  if (tag === 'UnsupportedModelError') {
    return new OpenChamberControlError(`${model} cannot generate images. Ask the user to choose an image model in Settings > General > OpenChamber Tools`, 409);
  }
  if (tag === 'ProviderRequestError') return new OpenChamberControlError(`The provider refused: ${message}`, 502);
  if (tag === 'InvalidRequestError') return new OpenChamberControlError(message, 400);
  if (tag === 'ServiceUnavailableError') return new OpenChamberControlError(message, 503);
  return new OpenChamberControlError(message, 502);
};

const parseModel = (value) => {
  const text = asNonEmptyString(value);
  const separator = text ? text.indexOf('/') : -1;
  if (separator <= 0 || separator === text.length - 1) return null;
  return { providerID: text.slice(0, separator), id: text.slice(separator + 1) };
};

export const createImageGenerationAction = ({ service, getClient, resolveWorkspaceId, readSettings, fsPromises, now = () => new Date() }) => (
  async (input, { directory, workspaceId, signal } = {}) => {
    const settings = await readSettings().catch(() => null);
    if (settings?.agentImageToolEnabled !== true) {
      throw new OpenChamberControlError('The image tool is turned off in OpenChamber settings', 403);
    }
    const model = parseModel(settings?.agentImageModel);
    if (!model) {
      throw new OpenChamberControlError('No image model is chosen. Ask the user to pick one in Settings > General > OpenChamber Tools > Image model', 409);
    }
    const modelName = `${model.providerID}/${model.id}`;

    const prompt = asNonEmptyString(input.prompt);
    if (!prompt) throw new OpenChamberControlError('prompt is required', 400);
    if (prompt.length > MAX_PROMPT_LENGTH) throw new OpenChamberControlError(`prompt is longer than ${MAX_PROMPT_LENGTH} characters`, 400);
    const parsedCount = input.count === undefined ? { success: true, data: 1 } : countSchema.safeParse(input.count);
    if (!parsedCount.success) {
      throw new OpenChamberControlError(`count must be a whole number from 1 to ${MAX_COUNT}`, 400);
    }
    const count = parsedCount.data;
    const aspect = asNonEmptyString(input.aspect);
    if (aspect && !/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(aspect)) {
      throw new OpenChamberControlError('aspect is width:height, such as 16:9', 400);
    }
    const resolution = asNonEmptyString(input.resolution);
    if (resolution && !/^[0-9A-Za-z]{1,8}$/.test(resolution)) {
      throw new OpenChamberControlError('resolution is a size tier such as 1K, 2K or 4K', 400);
    }
    const parsedSources = input.images === undefined ? { success: true, data: [] } : sourcesSchema.safeParse(input.images);
    if (!parsedSources.success) {
      throw new OpenChamberControlError(`images is a list of at most ${MAX_SOURCE_IMAGES} image file paths`, 400);
    }
    const sources = parsedSources.data;
    const requestedPath = asNonEmptyString(input.path);
    const workDirectory = asNonEmptyString(directory);
    if (requestedPath) resolvePath(requestedPath, workDirectory);
    const images = await Promise.all(sources.map((source) => readSourceImage(fsPromises, source, workDirectory)));

    const deadline = AbortSignal.timeout(GENERATION_TIMEOUT_MS);
    const combinedSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    let result;
    try {
      if (service) {
        const effectiveWorkspaceId = workspaceId
          || (typeof resolveWorkspaceId === "function" ? await resolveWorkspaceId(workDirectory) : null)
          || "default";
        const res = await service.request("/api/agent/v1/workspaces/" + encodeURIComponent(effectiveWorkspaceId) + "/images/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: effectiveWorkspaceId,
            selection: { providerId: model.providerID, modelId: model.id },
            prompt,
            ...(images.length > 0 ? { inputImages: images.map((img) => ({ data: img.data, mimeType: img.mime })) } : {}),
            ...(aspect ? { aspectRatio: aspect } : {}),
            ...(resolution ? { imageSize: resolution } : {}),
            ...(count > 1 ? { count } : {}),
          }),
          signal: combinedSignal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = body?.error?.message || body?.message || body?.error || "Image generation failed";
          const code = body?.error?.code || body?.code;
          if (code === "MODEL_UNAVAILABLE") {
            throw new OpenChamberControlError(`The image model ${modelName} is disabled or unavailable. Ask the user to choose another in Settings > General > OpenChamber Tools`, 409);
          }
          if (code === "PROVIDER_UNAVAILABLE") {
            throw new OpenChamberControlError(`The provider for ${modelName} is disabled or has no usable credentials`, 409);
          }
          throw new OpenChamberControlError(msg, res.status >= 400 && res.status < 500 ? res.status : 502);
        }
        result = {
          images: (body?.images || []).map((img) => ({
            data: img.data,
            mime: img.mimeType || img.mime || "image/png",
          })),
          cost: body?.cost,
        };
      } else if (typeof getClient === "function") {
        const client = await getClient();
        const request = { model, prompt };
        if (images.length > 0) request.images = images;
        if (count > 1) request.n = count;
        if (aspect) request.aspect = aspect;
        if (resolution) request.resolution = resolution;
        result = await client.experimental.generate.image(request, { signal: combinedSignal });
      } else {
        throw new OpenChamberControlError("Image generation service is not available", 503);
      }
    } catch (error) {
      if (deadline.aborted) throw new OpenChamberControlError(`${modelName} did not finish within 5 minutes`, 504);
      if (signal?.aborted) throw error;
      if (error instanceof OpenChamberControlError) throw error;
      throw toControlError(error, modelName);
    }

    const generated = Array.isArray(result?.images) ? result.images : [];
    if (generated.length === 0) throw new OpenChamberControlError(`${modelName} returned no image`, 502);
    const moment = now();
    const saved = [];
    for (const [index, image] of generated.entries()) {
      const file = targetPath({ requested: requestedPath, directory: workDirectory, index, count: generated.length, mime: image.mime, now: moment });
      await fsPromises.mkdir(path.dirname(file), { recursive: true });
      await fsPromises.writeFile(file, Buffer.from(image.data, "base64"));
      saved.push({ path: file, mime: image.mime });
    }
    const output = { model: modelName, images: saved };
    if (Number.isFinite(result.cost)) output.cost = result.cost;
    return output;
  }
);

export const generatedImagePaths = (text) => {
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return [];
  }
  const images = envelope?.ok === true ? envelope.data?.images : null;
  return Array.isArray(images)
    ? images.map((image) => asNonEmptyString(image?.path)).filter(Boolean)
    : [];
};
