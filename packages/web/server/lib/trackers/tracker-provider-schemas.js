import { z } from "zod";

const TRACKER_PROVIDER_LIST_MAX = 100;
const TRACKER_PROVIDER_LIVE_SUMMARIES_MAX = 50;
const TRACKER_PROVIDER_CONTAINERS_MAX = 100;

const optionalText = z.string().min(1).max(256).nullable().optional();
const trackerText = z.string().min(1).max(1_024);
const trackerTitle = z.string().max(4_096);
const trackerUrl = z.string().min(1).max(2_048).refine((value) => /^https?:\/\//i.test(value), { message: "must be an http(s) URL" });
const trackerCategory = z.enum(["triage", "backlog", "todo", "in-progress", "done", "canceled"]);
const trackerPriority = z.enum(["none", "urgent", "high", "medium", "low"]);
const trackerPerson = z.object({ name: z.string().max(256).nullable(), avatarUrl: z.string().max(2_048).nullable() }).strict();
const trackerContainer = z.object({ id: trackerText, key: z.string().max(64).nullable(), name: z.string().min(1).max(256) }).strict();
const trackerState = z.object({ id: trackerText.nullable(), name: z.string().max(256), category: trackerCategory.nullable() }).strict();

const trackerItemFields = {
  id: trackerText,
  identifier: z.string().min(1).max(128),
  title: trackerTitle,
  url: trackerUrl,
  state: trackerState.nullable(),
  priority: trackerPriority.nullable().optional(),
  labels: z.array(z.object({ id: trackerText, name: z.string().min(1).max(256), color: z.string().max(32).nullable() }).strict()).max(TRACKER_PROVIDER_LIST_MAX).optional(),
  assignee: trackerPerson.nullable().optional(),
  container: trackerContainer.nullable().optional(),
  progress: z.object({ total: z.number().int().nonnegative(), done: z.number().int().nonnegative(), more: z.boolean() }).strict().nullable().optional(),
  updatedAt: z.string().max(64).nullable().optional(),
};

const trackerRelatedItemSchema = z.object({ ...trackerItemFields, parent: z.null().optional() }).strict();
const trackerItemSummarySchema = z.object({ ...trackerItemFields, parent: trackerRelatedItemSchema.nullable().optional() }).strict();
const trackerCommentSchema = z.object({
  id: trackerText,
  body: z.string().max(65_536),
  createdAt: z.string().max(64).nullable(),
  author: trackerPerson.nullable(),
}).strict();
const trackerItemSchema = trackerItemSummarySchema.extend({
  description: z.string().max(262_144).nullable().optional(),
  comments: z.array(trackerCommentSchema).max(TRACKER_PROVIDER_LIST_MAX).optional(),
  children: z.array(trackerRelatedItemSchema).max(TRACKER_PROVIDER_LIST_MAX).optional(),
  childrenMore: z.boolean().optional(),
}).strict();

const trackerAccountSchema = z.object({
  account: z.object({
    id: z.string().min(1).max(256),
    login: z.string().min(1).max(256).nullable(),
    name: optionalText,
    avatarUrl: z.string().max(2_048).optional(),
  }).strict(),
}).strict();

const trackerListSchema = z.object({
  items: z.array(trackerItemSummarySchema).max(TRACKER_PROVIDER_LIST_MAX),
  cursor: z.string().min(1).max(2_048).nullable(),
  hasMore: z.boolean(),
}).strict();

const trackerItemDataSchema = z.object({ item: trackerItemSchema.nullable() }).strict();
const trackerStatesSchema = z.object({
  states: z.array(z.object({ id: trackerText, name: z.string().min(1).max(256), category: trackerCategory.nullable(), position: z.number() }).strict()).max(TRACKER_PROVIDER_LIST_MAX * 2),
}).strict();

const trackerLiveSummariesSchema = z.object({
  items: z.array(z.object({
    identifier: z.string().min(1).max(128),
    title: trackerTitle,
    state: z.object({ name: z.string().max(256), category: trackerCategory }).strict(),
  }).strict()).max(TRACKER_PROVIDER_LIVE_SUMMARIES_MAX),
}).strict();

const trackerContainersSchema = z.object({ containers: z.array(trackerContainer).max(TRACKER_PROVIDER_CONTAINERS_MAX) }).strict();
const trackerCommentDataSchema = z.object({ comment: z.object({ id: trackerText }).strict().nullable() }).strict();

const probeSchema = z.object({ supported: z.boolean(), message: z.string().optional() }).strict();

const errorSchema = z.object({
  message: z.string().min(1).max(2_000),
  status: z.number().int().min(400).max(599).optional(),
  code: z.string().min(1).max(64).optional(),
}).strict();

const envelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: errorSchema }).strict(),
]);

const trackerDataSchemas = {
  "auth.probe": probeSchema,
  "auth.verify": trackerAccountSchema,
  "items.list": trackerListSchema,
  "items.get": trackerItemDataSchema,
  "items.updateState": trackerItemDataSchema,
  "items.liveSummaries": trackerLiveSummariesSchema,
  "states.list": trackerStatesSchema,
  "containers.list": trackerContainersSchema,
  "comments.create": trackerCommentDataSchema,
};

export const trackerProviderSchemasV1 = {
  envelope: envelopeSchema,
  error: errorSchema,
  account: trackerAccountSchema,
  probe: probeSchema,
  itemSummary: trackerItemSummarySchema,
  item: trackerItemSchema,
  list: trackerListSchema,
  states: trackerStatesSchema,
  liveSummaries: trackerLiveSummariesSchema,
  containers: trackerContainersSchema,
  comment: trackerCommentDataSchema,
  data: trackerDataSchemas,
};
