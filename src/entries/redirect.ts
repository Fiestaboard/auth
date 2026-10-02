// Entry for oauth/redirect.html.
//
// The common case is decided here, in a few kilobytes with no UI framework:
// a sign-in for a board this browser already approved is sent straight on.
// The page's prerendered HTML already says "Returning to your board…".
// Everything else needs a person, and only then is the UI loaded.

import { planRedirect } from "../lib/board-address.js";
import { isFramed, readRemembered } from "../lib/storage";

const plan = isFramed() ? null : planRedirect(readRemembered(), window.location.search);

if (plan?.action === "forward") {
  // replace(), not assign(): the URL carrying the authorization code must not
  // stay in this tab's history.
  window.location.replace(plan.url);
} else {
  void import("./redirect-ui");
}
