import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CALLBACK_PATH,
  boardFromFragment,
  isLocalHost,
  parseBoardAddress,
  planRedirect,
} from "../oauth/board-address.js";

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

test("planRedirect forwards a successful response to the saved board", () => {
  assert.deepEqual(planRedirect("http://192.168.1.50:4420", "?code=abc&state=xyz"), {
    action: "forward",
    url: `http://192.168.1.50:4420${CALLBACK_PATH}?code=abc&state=xyz`,
  });
});

test("planRedirect forwards a provider error so the board can report it", () => {
  const plan = planRedirect("http://fiestaboard.local:4420", "?error=access_denied&state=xyz");
  assert.equal(plan.action, "forward");
  assert.equal(plan.url, `http://fiestaboard.local:4420${CALLBACK_PATH}?error=access_denied&state=xyz`);
});

test("planRedirect keeps the query string byte-for-byte", () => {
  const search = "?state=a.b-c_d&code=4%2F0AX%2Bz&scope=a+b&iss=https%3A%2F%2Fid.example";
  const plan = planRedirect("http://10.0.0.7", search);
  assert.equal(plan.url, `http://10.0.0.7${CALLBACK_PATH}${search}`);
});

test("planRedirect keeps a path prefix ahead of the callback path", () => {
  const plan = planRedirect("http://homeassistant.local:8123/api/hassio_ingress/abc123", "?code=a&state=b");
  assert.equal(plan.url, `http://homeassistant.local:8123/api/hassio_ingress/abc123${CALLBACK_PATH}?code=a&state=b`);
});

test("planRedirect asks for setup when nothing is saved", () => {
  for (const saved of [null, undefined, ""]) {
    assert.deepEqual(planRedirect(saved, "?code=abc&state=xyz"), { action: "setup" });
  }
});

test("planRedirect refuses a saved address that is not local, however it got there", () => {
  for (const saved of ["https://evil.example", "javascript:alert(1)", "http://192.168.1.50@evil.example"]) {
    assert.deepEqual(planRedirect(saved, "?code=abc&state=xyz"), { action: "setup" });
  }
});

test("planRedirect does nothing without an OAuth response", () => {
  for (const search of ["", "?", "?code=abc", "?state=xyz", "?foo=bar", null, undefined]) {
    assert.deepEqual(planRedirect("http://192.168.1.50:4420", search), { action: "nothing" });
  }
});

test("planRedirect does nothing with an oversized query string", () => {
  const search = `?code=${"a".repeat(9000)}&state=xyz`;
  assert.deepEqual(planRedirect("http://192.168.1.50:4420", search), { action: "nothing" });
});

test("boardFromFragment reads the board value", () => {
  assert.equal(boardFromFragment("#board=http%3A%2F%2F192.168.1.50%3A4420"), "http://192.168.1.50:4420");
  assert.equal(boardFromFragment("board=http://fiestaboard.local:4420"), "http://fiestaboard.local:4420");
});

test("boardFromFragment returns an empty string when there is no board value", () => {
  for (const hash of ["", "#", "#other=1", null, undefined]) {
    assert.equal(boardFromFragment(hash), "");
  }
});
