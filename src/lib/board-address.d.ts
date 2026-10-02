// Types for board-address.js, which stays plain JavaScript so `node --test`
// runs it with no build step.

export const STORAGE_KEY: string;
export const CALLBACK_PATH: string;

export type RefusalReason = "empty" | "invalid" | "scheme" | "credentials" | "extra" | "public";

export function isLocalHost(hostname: string): boolean;

export function parseBoardAddress(input: unknown): { ok: true; address: string } | { ok: false; reason: RefusalReason };

export function boardFromState(state: unknown): string;

export function parseRemembered(raw: unknown): string[];
export function rememberBoard(raw: unknown, address: string): string;
export function forgetBoard(raw: unknown, address: string): string;

export type RedirectPlan =
  | { action: "forward"; address: string; url: string }
  | { action: "confirm"; address: string; url: string }
  | { action: "refused"; reason: RefusalReason }
  | { action: "unknown" }
  | { action: "nothing" };

export function planRedirect(rememberedRaw: unknown, search: unknown): RedirectPlan;
