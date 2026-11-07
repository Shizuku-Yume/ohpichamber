import { z } from "zod";

export const SERVICE_HOST_PATH = "/service/call";
export const OPENCHAMBER_HOST_CALLBACK_URL_ENV = "OPENCHAMBER_HOST_CALLBACK_URL";

export const SERVICE_PROMPT_MAX = 64_000;
export const SERVICE_INSTRUCTIONS_MAX = 4_096;
export const SERVICE_EVENT_TOPIC_MAX = 64;
export const SERVICE_EVENT_DATA_MAX = 64_000;
export const SERVICE_EVENT_RATE_MAX = 30;
export const SERVICE_STATUS_MESSAGE_MAX = 200;
export const SERVICE_HOST_TIMEOUT_MS = 30_000;

export const SERVICE_SCHEDULE_PATH = "/schedule";
export const SERVICE_SCHEDULE_WIRE_VERSION = 1;
export const SERVICE_SCHEDULE_TIMEOUT_MS = 10_000;
export const SERVICE_SCHEDULE_IDLE_MS = 10 * 60_000;
export const SERVICE_SCHEDULE_MAX = 8;
export const SERVICE_SCHEDULE_CRON_MAX = 64;
export const SERVICE_SCHEDULE_TIMEZONE_MAX = 64;

export const MENTIONS_SEARCH_PATH = "/mentions/search";
export const MENTIONS_RESOLVE_PATH = "/mentions/resolve";
export const MENTIONS_SEARCH_TIMEOUT_MS = 2_000;
export const MENTIONS_RESOLVE_TIMEOUT_MS = 10_000;
export const MENTIONS_IDLE_MS = 10 * 60_000;
export const MENTIONS_ITEMS_MAX = 20;
export const MENTION_TITLE_MAX = 120;
export const MENTION_ID_MAX = 256;
export const MENTION_TEXT_MAX = 16_000;

const prompt = z.string().trim().min(1).max(SERVICE_PROMPT_MAX);
const sessionId = z.string().trim().min(1).max(256);
const shortText = z.string().trim().min(1).max(256);
const directory = z.string().trim().min(1).max(4096);

export const serviceHostCallSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("sessions.start"),
    input: z.object({
      prompt,
      projectId: shortText.optional(),
      directory: directory.optional(),
      title: shortText.optional(),
      model: shortText.optional(),
      variant: shortText.optional(),
      agent: shortText.optional(),
    }).strict().refine((input) => !(input.projectId && input.directory), { message: "Give projectId or directory, not both" }),
  }).strict(),
  z.object({ method: z.literal("sessions.send"), input: z.object({ sessionId, prompt }).strict() }).strict(),
  z.object({ method: z.literal("sessions.retry"), input: z.object({ sessionId }).strict() }).strict(),
  z.object({ method: z.literal("sessions.status"), input: z.object({ sessionId }).strict() }).strict(),
  z.object({ method: z.literal("sessions.lastReply"), input: z.object({ sessionId }).strict() }).strict(),
  z.object({
    method: z.literal("instructions.set"),
    input: z.object({ directory: directory.nullable(), text: z.string().max(SERVICE_INSTRUCTIONS_MAX) }).strict(),
  }).strict(),
  z.object({
    method: z.literal("panels.emit"),
    input: z.object({ topic: z.string().trim().min(1).max(SERVICE_EVENT_TOPIC_MAX), data: z.unknown().optional() }).strict(),
  }).strict(),
  z.object({ method: z.literal("settings.read"), input: z.object({}).strict() }).strict(),
  z.object({
    method: z.literal("status.set"),
    input: z.object({ needsConfiguration: z.string().trim().min(1).max(SERVICE_STATUS_MESSAGE_MAX).nullable() }).strict(),
  }).strict(),
]);

export const mentionItemSchema = z.object({
  id: z.string().min(1).max(MENTION_ID_MAX),
  title: z.string().trim().min(1).max(MENTION_TITLE_MAX),
  subtitle: z.string().trim().min(1).max(MENTION_TITLE_MAX).optional(),
  url: z.string().max(2_048).refine((val) => /^https?:\/\//i.test(val)).optional(),
});

export const mentionsResolveResultSchema = z.object({ text: z.string().trim().min(1).max(MENTION_TEXT_MAX) });
