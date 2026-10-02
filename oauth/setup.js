// Saves the address of this person's board in this browser, so redirect.html
// knows where to send OAuth responses. See README.md for the full flow.
//
// The one rule that matters: an address is only ever stored in response to a
// click on the Save button. A link can fill the field in, never save it.

import { STORAGE_KEY, boardFromFragment, parseBoardAddress } from "./board-address.js";

const REASONS = {
  empty: "Enter your board's address.",
  invalid: "That doesn't look like an address. It should look like http://192.168.1.50:4420.",
  scheme: "The address has to start with http:// or https://.",
  credentials: "Leave the username and password out of the address.",
  extra: "Use just the address of the board, without anything after a ? or #.",
  public:
    "That address is on the public internet. Only boards on your own network are accepted, " +
    "such as http://192.168.1.50:4420 or http://fiestaboard.local:4420.",
};

const form = document.getElementById("board-form");
const input = document.getElementById("board-address");
const error = document.getElementById("board-error");
const status = document.getElementById("status");
const prefillNote = document.getElementById("prefill-note");
const saved = document.getElementById("saved");
const savedAddress = document.getElementById("saved-address");
const savedLink = document.getElementById("saved-link");
const forget = document.getElementById("forget");
const blocked = document.getElementById("blocked");

function storage() {
  try {
    const probe = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function block(message) {
  blocked.textContent = message;
  blocked.hidden = false;
  form.hidden = true;
  saved.hidden = true;
}

function setError(message) {
  error.textContent = message;
  error.hidden = !message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

function renderSaved(store) {
  const current = parseBoardAddress(store.getItem(STORAGE_KEY) ?? "");
  saved.hidden = !current.ok;
  if (current.ok) {
    savedAddress.textContent = current.address;
    savedLink.href = `${current.address}/`;
  }
}

function start() {
  // Refuse to run inside a frame. The Save click is the only thing standing
  // between a crafted link and a stored address, so it must not be possible
  // to overlay this page and trick that click out of someone. (GitHub Pages
  // cannot send frame-ancestors, so this is done here.)
  if (window.top !== window.self) {
    block("This page can't be used inside another page. Open it in its own tab.");
    return;
  }

  const store = storage();
  if (!store) {
    block(
      "This browser is blocking site storage for this page, so the address can't be saved. " +
        "Allow site data for this site, or use a regular (non-private) window.",
    );
    return;
  }

  renderSaved(store);

  const applySuggestion = () => {
    const suggested = boardFromFragment(window.location.hash);
    if (!suggested) return;
    input.value = suggested;
    prefillNote.hidden = false;
    setError("");
    status.textContent = "";
    // Drop the fragment so a reload or a shared screenshot doesn't carry it.
    window.history.replaceState(null, "", window.location.pathname);
  };
  applySuggestion();
  // A link followed while this page is already open changes only the
  // fragment, which does not reload the page.
  window.addEventListener("hashchange", applySuggestion);

  input.addEventListener("input", () => {
    setError("");
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = parseBoardAddress(input.value);
    if (!result.ok) {
      setError(REASONS[result.reason] ?? REASONS.invalid);
      input.focus();
      return;
    }
    setError("");
    store.setItem(STORAGE_KEY, result.address);
    input.value = result.address;
    prefillNote.hidden = true;
    renderSaved(store);
    status.textContent = `Saved. Sign-ins from this browser will return to ${result.address}.`;
  });

  forget.addEventListener("click", () => {
    store.removeItem(STORAGE_KEY);
    renderSaved(store);
    status.textContent = "Forgotten. This browser no longer has a board address saved.";
    input.focus();
  });
}

start();
