// Forwards an OAuth provider's response to the board address saved in this
// browser. See README.md for the full flow.

import { STORAGE_KEY, planRedirect } from "./board-address.js";

function readSavedAddress() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is blocked (private window, site data disabled).
    return null;
  }
}

function show(id) {
  for (const panel of document.querySelectorAll("[data-panel]")) {
    panel.hidden = panel.id !== id;
  }
  const heading = document.querySelector(`#${id} h1`);
  if (heading) {
    document.title = `${heading.textContent} · FiestaBoard`;
    heading.focus();
  }
}

const plan = planRedirect(readSavedAddress(), window.location.search);

if (plan.action === "forward") {
  show("panel-forward");
  // replace(), not assign(): the URL carrying the authorization code must not
  // stay in this tab's history.
  window.location.replace(plan.url);
} else if (plan.action === "setup") {
  show("panel-setup");
} else {
  show("panel-nothing");
}
