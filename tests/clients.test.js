// OAuth client metadata documents (draft-ietf-oauth-client-id-metadata-document).
//
// A provider that supports these fetches the client_id itself: the client_id
// is the URL of the document. Vite copies public/ into dist/ unchanged, so
// public/clients/<name>.json is served at https://fiestaboard.app/auth/clients/<name>.json.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const SITE = "https://fiestaboard.app/auth/";
// Both forms are registered: FiestaBoard 9.5.0 through 9.7.x sends the .html one.
const REDIRECT_URIS = [`${SITE}oauth/redirect`, `${SITE}oauth/redirect.html`];
const CLIENTS = ["todoist", "huggingface"];

const load = (name) => JSON.parse(readFileSync(resolve(import.meta.dirname, `../public/clients/${name}.json`), "utf8"));

for (const name of CLIENTS) {
  test(`${name}: client_id is the URL the document is served at`, () => {
    assert.equal(load(name).client_id, `${SITE}clients/${name}.json`);
  });

  test(`${name}: a public client that returns through the relay`, () => {
    const doc = load(name);
    assert.equal(doc.token_endpoint_auth_method, "none");
    assert.deepEqual(doc.redirect_uris, REDIRECT_URIS);
    assert.equal(typeof doc.client_name, "string");
    assert.ok(!("client_secret" in doc));
  });

  test(`${name}: small enough for providers' fetch limits`, () => {
    // Todoist refuses documents over 5 KB.
    assert.ok(readFileSync(resolve(import.meta.dirname, `../public/clients/${name}.json`)).length < 5000);
  });
}
