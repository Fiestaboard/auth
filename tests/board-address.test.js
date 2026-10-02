import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CALLBACK_PATH,
  boardFromState,
  forgetBoard,
  isLocalHost,
  parseBoardAddress,
  parseRemembered,
  planRedirect,
  rememberBoard,
} from "../src/lib/board-address.js";

const accepted = [
  ["http://192.168.1.50:4420", "http://192.168.1.50:4420"],
  ["http://192.168.1.50:4420/", "http://192.168.1.50:4420"],
  ["192.168.1.50:4420", "http://192.168.1.50:4420"],
  ["  http://10.0.0.7  ", "http://10.0.0.7"],
  ["http://172.16.0.1", "http://172.16.0.1"],
  ["http://172.31.255.254:8080", "http://172.31.255.254:8080"],
  ["http://127.0.0.1:4420", "http://127.0.0.1:4420"],
  ["http://127.8.9.10", "http://127.8.9.10"],
  ["http://100.100.20.30:4420", "http://100.100.20.30:4420"],
  ["http://localhost:4420", "http://localhost:4420"],
  ["localhost:4420", "http://localhost:4420"],
  ["http://board.localhost", "http://board.localhost"],
  ["http://fiestaboard.local:4420", "http://fiestaboard.local:4420"],
  ["HTTP://FiestaBoard.LOCAL:4420", "http://fiestaboard.local:4420"],
  ["https://fiestaboard.local", "https://fiestaboard.local"],
  ["http://fiestaboard.local.:4420", "http://fiestaboard.local.:4420"],
  ["http://pi.home.arpa", "http://pi.home.arpa"],
  ["http://board.lan:4420", "http://board.lan:4420"],
  ["http://board.internal", "http://board.internal"],
  ["http://raspberrypi:4420", "http://raspberrypi:4420"],
  ["http://[::1]:4420", "http://[::1]:4420"],
  ["http://[fd12:3456:789a::1]", "http://[fd12:3456:789a::1]"],
  // A path prefix survives, for boards behind Home Assistant ingress.
  [
    "http://homeassistant.local:8123/api/hassio_ingress/abc123/",
    "http://homeassistant.local:8123/api/hassio_ingress/abc123",
  ],
];

for (const [input, address] of accepted) {
  test(`accepts ${JSON.stringify(input)}`, () => {
    assert.deepEqual(parseBoardAddress(input), { ok: true, address });
  });
}

const rejected = [
  ["", "empty"],
  ["   ", "empty"],
  // Public hosts.
  ["http://example.com", "public"],
  ["https://evil.example/oauth", "public"],
  ["http://8.8.8.8", "public"],
  ["http://172.15.0.1", "public"],
  ["http://172.32.0.1", "public"],
  ["http://192.169.1.1", "public"],
  ["http://11.0.0.1", "public"],
  ["http://100.63.0.1", "public"],
  ["http://100.128.0.1", "public"],
  ["http://169.254.169.254", "public"],
  ["http://0.0.0.0", "public"],
  ["http://[2001:db8::1]", "public"],
  ["http://[fe80::1]", "public"],
  // Private-looking prefixes on a public name.
  ["http://192.168.1.50.evil.example", "public"],
  ["http://10.0.0.1.nip.io", "public"],
  ["http://localhost.evil.example", "public"],
  ["http://fiestaboard.local.evil.example", "public"],
  ["http://evil.example/fiestaboard.local", "public"],
  // Alternate IPv4 spellings the URL parser normalises to a public address.
  ["http://134744072", "public"],
  ["http://0x08080808", "public"],
  ["http://010.8.8.8", "public"],
  // Userinfo tricks.
  ["http://192.168.1.50@evil.example", "credentials"],
  ["http://user:pass@192.168.1.50", "credentials"],
  ["http://192.168.1.50\\@evil.example", "invalid"],
  // Schemes.
  ["javascript:alert(1)", "scheme"],
  ["data:text/html,hi", "scheme"],
  ["ftp://192.168.1.50", "scheme"],
  ["file:///etc/passwd", "scheme"],
  // Extra URL parts.
  ["http://192.168.1.50/?next=http://evil.example", "extra"],
  ["http://192.168.1.50/#x", "extra"],
  ["http://192.168.1.50?", "extra"],
  // Not URLs.
  ["http://", "invalid"],
  ["http://exa mple.local", "invalid"],
  [`http://${"a".repeat(2100)}.local`, "invalid"],
];

for (const [input, reason] of rejected) {
  const label = input.length > 60 ? `${input.slice(0, 60)}…` : input;
  test(`rejects ${JSON.stringify(label)} as ${reason}`, () => {
    assert.deepEqual(parseBoardAddress(input), { ok: false, reason });
  });
}

test("rejects values that are not strings", () => {
  for (const value of [null, undefined, 42, {}, ["http://192.168.1.50"]]) {
    assert.deepEqual(parseBoardAddress(value), { ok: false, reason: "invalid" });
  }
});

test("alternate spellings of a private IPv4 address normalise to the dotted form", () => {
  // 3232235826 == 192.168.1.50
  assert.deepEqual(parseBoardAddress("http://3232235826:4420"), {
    ok: true,
    address: "http://192.168.1.50:4420",
  });
});

test("isLocalHost treats an all-numeric single label as not local", () => {
  assert.equal(isLocalHost("12345"), false);
});

test("isLocalHost refuses a bare suffix", () => {
  assert.equal(isLocalHost(".local"), false);
  assert.equal(isLocalHost(""), false);
});

// A state shaped the way a FiestaBoard builds it: base64url JSON, a dot, a signature.
function stateFor(board, extra = {}) {
  const payload = Buffer.from(JSON.stringify({ n: "nonce", c: "music", e: 1900000000, b: board, ...extra }));
  return `${payload.toString("base64url")}.c2lnbmF0dXJl`;
}

const BOARD = "http://192.168.1.50:4420";
const REMEMBERED = JSON.stringify([BOARD]);

function search(board, rest = "code=abc") {
  return `?${rest}&state=${stateFor(board)}`;
}

// ── boardFromState ──────────────────────────────────────────────────────────

test("boardFromState reads the address a board put in its state", () => {
  assert.equal(boardFromState(stateFor(BOARD)), BOARD);
});

test("boardFromState reads an address with non-ASCII characters", () => {
  assert.equal(boardFromState(stateFor("http://tablero-señal.local")), "http://tablero-señal.local");
});

test("boardFromState returns an empty string for anything that is not such a state", () => {
  const notJson = Buffer.from("not json").toString("base64url");
  const noBoard = Buffer.from(JSON.stringify({ n: "x" })).toString("base64url");
  const wrongType = Buffer.from(JSON.stringify({ b: 42 })).toString("base64url");
  const jsonNull = Buffer.from("null").toString("base64url");
  for (const state of [null, undefined, "", ".", "plain", "!!!.sig", `${notJson}.sig`, `${noBoard}.sig`, `${wrongType}.sig`, `${jsonNull}.sig`, "a".repeat(3000)]) {
    assert.equal(boardFromState(state), "", JSON.stringify(state));
  }
});

// ── Remembered boards ───────────────────────────────────────────────────────

test("parseRemembered returns the stored addresses", () => {
  assert.deepEqual(parseRemembered(JSON.stringify([BOARD, "http://fiestaboard.local:4420"])), [
    BOARD,
    "http://fiestaboard.local:4420",
  ]);
});

test("parseRemembered drops anything that is not a local address, however it got there", () => {
  const stored = JSON.stringify(["https://evil.example", BOARD, "javascript:alert(1)", 7, null, BOARD]);
  assert.deepEqual(parseRemembered(stored), [BOARD]);
});

test("parseRemembered treats unreadable storage as empty", () => {
  for (const raw of [null, undefined, "", "{not json", '"a string"', "{}", "42"]) {
    assert.deepEqual(parseRemembered(raw), []);
  }
});

test("rememberBoard adds an address once, most recent first", () => {
  const once = rememberBoard(null, BOARD);
  assert.deepEqual(JSON.parse(once), [BOARD]);
  const twice = rememberBoard(once, "http://10.0.0.7");
  assert.deepEqual(JSON.parse(twice), ["http://10.0.0.7", BOARD]);
  assert.deepEqual(JSON.parse(rememberBoard(twice, `${BOARD}/`)), [BOARD, "http://10.0.0.7"]);
});

test("rememberBoard will not store an address that is not local", () => {
  assert.deepEqual(JSON.parse(rememberBoard(REMEMBERED, "https://evil.example")), [BOARD]);
});

test("rememberBoard keeps a bounded list", () => {
  let raw = null;
  for (let i = 1; i <= 30; i += 1) raw = rememberBoard(raw, `http://10.0.0.${i}`);
  const boards = JSON.parse(raw);
  assert.equal(boards.length, 20);
  assert.equal(boards[0], "http://10.0.0.30");
});

test("forgetBoard removes only the named address", () => {
  const raw = JSON.stringify([BOARD, "http://10.0.0.7"]);
  assert.deepEqual(JSON.parse(forgetBoard(raw, BOARD)), ["http://10.0.0.7"]);
  assert.deepEqual(JSON.parse(forgetBoard(raw, "http://10.9.9.9")), [BOARD, "http://10.0.0.7"]);
});

// ── planRedirect ────────────────────────────────────────────────────────────

test("planRedirect forwards straight to a board this browser has approved before", () => {
  const query = search(BOARD);
  assert.deepEqual(planRedirect(REMEMBERED, query), {
    action: "forward",
    address: BOARD,
    url: `${BOARD}${CALLBACK_PATH}${query}`,
  });
});

test("planRedirect asks first for a local board this browser has not approved", () => {
  const query = search(BOARD);
  for (const remembered of [null, "", "[]", JSON.stringify(["http://10.0.0.7"])]) {
    assert.deepEqual(planRedirect(remembered, query), {
      action: "confirm",
      address: BOARD,
      url: `${BOARD}${CALLBACK_PATH}${query}`,
    });
  }
});

test("planRedirect matches an approved board whatever spelling the state uses", () => {
  const plan = planRedirect(REMEMBERED, search("HTTP://192.168.1.50:4420/"));
  assert.equal(plan.action, "forward");
  assert.equal(plan.address, BOARD);
});

test("planRedirect never forwards to a public address, approved or not", () => {
  const planted = JSON.stringify(["https://evil.example"]);
  for (const remembered of [null, planted]) {
    assert.deepEqual(planRedirect(remembered, search("https://evil.example")), { action: "refused", reason: "public" });
  }
});

test("planRedirect refuses every non-local form a crafted state could carry", () => {
  const crafted = {
    "http://192.168.1.50@evil.example": "credentials",
    "javascript:alert(1)": "scheme",
    "http://192.168.1.50.evil.example": "public",
    "http://192.168.1.50/?next=https://evil.example": "extra",
    "http://8.8.8.8": "public",
  };
  for (const [board, reason] of Object.entries(crafted)) {
    assert.deepEqual(planRedirect(REMEMBERED, search(board)), { action: "refused", reason }, board);
  }
});

test("planRedirect forwards a provider error so the board can report it", () => {
  const query = search(BOARD, "error=access_denied");
  assert.equal(planRedirect(REMEMBERED, query).url, `${BOARD}${CALLBACK_PATH}${query}`);
});

test("planRedirect keeps the query string byte-for-byte", () => {
  const query = `?code=4%2F0AX%2Bz&scope=a+b&iss=https%3A%2F%2Fid.example&state=${stateFor(BOARD)}`;
  assert.equal(planRedirect(REMEMBERED, query).url, `${BOARD}${CALLBACK_PATH}${query}`);
});

test("planRedirect keeps a path prefix ahead of the callback path", () => {
  const board = "http://homeassistant.local:8123/api/hassio_ingress/abc123";
  const plan = planRedirect(JSON.stringify([board]), search(board));
  assert.equal(plan.action, "forward");
  assert.ok(plan.url.startsWith(`${board}${CALLBACK_PATH}?`));
});

test("planRedirect reports an OAuth response whose state names no board", () => {
  for (const state of ["opaque-state", "abc.def", stateFor(undefined), stateFor("")]) {
    assert.deepEqual(planRedirect(REMEMBERED, `?code=abc&state=${state}`), { action: "unknown" });
  }
});

test("planRedirect does nothing without an OAuth response", () => {
  for (const query of ["", "?", "?code=abc", `?state=${stateFor(BOARD)}`, "?foo=bar", null, undefined]) {
    assert.deepEqual(planRedirect(REMEMBERED, query), { action: "nothing" });
  }
});

test("planRedirect does nothing with an oversized query string", () => {
  const query = `?code=${"a".repeat(9000)}&state=${stateFor(BOARD)}`;
  assert.deepEqual(planRedirect(REMEMBERED, query), { action: "nothing" });
});
