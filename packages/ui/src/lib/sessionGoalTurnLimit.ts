/** Bounds for the goal turn cap, shared by the settings field and the worker env capture. */
export const DEFAULT_SESSION_GOAL_MAX_AUTO_TURNS = 20;
export const SESSION_GOAL_MAX_AUTO_TURNS_LIMIT = 200;

export type SessionGoalChecker = 'classifier' | 'small-model';
