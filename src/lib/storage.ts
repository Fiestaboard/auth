// The one value this site keeps: the boards this browser has approved.
// Everything that interprets it lives in board-address.js; this only moves
// the raw string in and out of localStorage, which may be unavailable
// (private window, site data blocked).

import { STORAGE_KEY } from "./board-address.js";

export function readRemembered(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Returns whether the value was stored. */
export function writeRemembered(raw: string): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/** True when this page is inside another page's frame. */
export function isFramed(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}
