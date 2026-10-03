# FiestaBoard sign-in relay

A few static pages, served from GitHub Pages at **https://fiestaboard.app/auth/**, that let a
[FiestaBoard](https://github.com/Fiestaboard/FiestaBoard) running on someone's home network
complete an OAuth sign-in.

> **The redirect URL must never change.**
> `https://fiestaboard.app/auth/oauth/redirect` is registered as the redirect URI in OAuth apps
> that FiestaBoard users have created with providers, and so is the same address with `.html`
> on the end (FiestaBoard 9.5 through 9.7 send that form). Both must keep working. Renaming this
> repository, moving `oauth/redirect.html`, changing the domain, or moving to a host that does
> not also serve the page without its `.html` extension (GitHub Pages does) breaks sign-in for
> every board until each of those registrations is updated by hand.

Building a FiestaBoard plugin that signs in? Start with the
[plugin author's guide](https://fiestaboard.app/docs/development/plugin-oauth). You do not
need to change or host anything here.

## Why this exists

A FiestaBoard is reached at an address like `http://192.168.1.50:4420`. OAuth providers will
only redirect to an `https://` address they were told about in advance, so a board on a LAN
cannot be the redirect target itself. This site is the fixed HTTPS address the provider
redirects to; it then passes the browser on to the board. Home Assistant solves the same
problem the same way with `my.home-assistant.io`.

There is no server. Nothing is stored anywhere except one value in the visitor's own
browser.

## How it works

1. On the board, the person presses **Connect** in a plugin. The board sends them to the
   provider with `redirect_uri=https://fiestaboard.app/auth/oauth/redirect` and a `state`
   that carries the address they are browsing the board at.
2. After sign-in, the provider redirects to that address with `?code=…&state=…`, which
   GitHub Pages serves from `oauth/redirect.html`.
3. That page reads the board's address out of `state`.
   - **A board this browser has approved before:** the browser is sent straight on to
     `<board>/api/oauth/callback?code=…&state=…`.
   - **A board it has not seen:** the page shows the address and asks. Pressing **Continue**
     sends the browser on; a "remember this board" checkbox (on by default) means it is not
     asked again.
4. The board checks `state`, exchanges the code for tokens, and stores them.

`oauth/boards.html` lists the boards a browser remembers and lets the person forget one.

## Security model

The risk this design has to manage is a sign-in response being sent to the wrong place.
`state` comes back from the provider untouched, but that proves nothing here: anyone can
build a sign-in link whose `state` names any address they like.

- **Only local addresses are ever used.** An address in `state` that is not on a local
  network is refused outright, remembered or not. See the list below.
- **A person approves each board, in each browser.** The first sign-in for an address stops
  and shows it. A crafted link cannot move a sign-in on its own; it needs someone to read an
  address they do not recognise and press Continue anyway.
- **The pages refuse to run inside a frame**, so that click cannot be obtained by overlaying
  the page. GitHub Pages cannot send a `frame-ancestors` header, so the check is done in
  script.
- **Stored approvals are re-checked.** The remembered list is filtered through the same
  local-address rule every time it is read, so a value that reached `localStorage` some
  other way cannot widen where sign-ins go.
- **The response is passed along untouched and never kept.** The page uses
  `location.replace`, so the URL carrying the code does not stay in the tab's history, and
  every page sets `referrer` to `no-referrer`.
- **No code from other hosts.** No analytics, and no scripts, styles or fonts loaded from
  anywhere but this site. Each page sets a Content-Security-Policy of `default-src 'none'`
  that allows only its own files; `npm run test:dist` fails the build if a page gains an
  inline script or style.

What this site cannot protect, the board has to:

- GitHub's servers see the request for `redirect.html`, including the authorization code in
  its query string. Boards must use PKCE so that a code is useless without the verifier,
  which never leaves the board.
- This site cannot tell whether a response is genuine. The board must verify `state`: that
  it signed it, that it has not expired, and that it has not been used before.
- These pages share the `fiestaboard.app` origin with the documentation site, so a script
  injection there could add to the remembered list. It could still only add a local
  address, because of the re-check above.

A note for plugin authors: when each user registers their own OAuth app, a crafted link
gains an attacker nothing they could not already do with an app of their own. If a plugin
ships a shared client ID, the confirm step above is what stands between that app's
good name and a sign-in being walked to another machine on the victim's network. Prefer
per-user client IDs.

### Addresses that count as local

`http` or `https`, with an optional port and path prefix, on one of:

| Host | Why |
| --- | --- |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Private networks |
| `127.0.0.0/8`, `[::1]`, `localhost`, `*.localhost` | The same machine |
| `100.64.0.0/10` | Carrier-grade NAT range, used by Tailscale |
| `[fc00::/7]` | IPv6 unique local addresses |
| `*.local` | mDNS, such as `fiestaboard.local` |
| `*.home.arpa`, `*.internal`, `*.lan` | Names that only resolve on a local network |
| A single word, such as `raspberrypi` | Only a local resolver can answer it |

Anything else is refused, as is any address containing a username, password, query string,
or fragment. The rules live in [`src/lib/board-address.js`](src/lib/board-address.js), a
dependency-free module with no DOM access.

## How it is built

The pages are React components using [FiestaUI](https://github.com/Fiestaboard/FiestaUI)
(`@fiestaboard/ui`), prerendered to static HTML at build time and hydrated in the browser.

- `oauth/redirect.html`, `oauth/boards.html`, `index.html` are the page templates.
- `src/pages/` holds the components; `src/entries/` the browser entry points.
- `src/entries/redirect.ts` makes the forward-or-ask decision in a few kilobytes and only
  loads the UI when a person is needed, so the common case does not wait for React.
- `src/prerender.tsx` and `scripts/prerender.mjs` render each page into the built HTML.

## OAuth client metadata documents

Some providers (Todoist, Hugging Face) accept a URL as the `client_id` and fetch the app's
details from it, so nobody has to register an app
([draft-ietf-oauth-client-id-metadata-document](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/)).
`public/clients/<name>.json` is copied into the site unchanged and served at
`https://fiestaboard.app/auth/clients/<name>.json`, which is also its `client_id`.

Like the redirect URL, **these URLs must never change**: FiestaBoard plugins ship them as
their client ID. Each lists both redirect URIs and `"token_endpoint_auth_method": "none"`
(a public client using PKCE); none may ever carry a secret.

## Development

```sh
npm install
npm test          # unit tests for the address rules and redirect decision
npm run dev       # dev server with hot reload
npm run build     # typecheck, build and prerender into dist/
npm run test:dist # invariants of the built site (CSP, no inline code, fixed paths)
npm run preview   # serve dist/ at http://localhost:8787
```

Changes to `src/lib/board-address.js` need a test in `tests/`. For anything that loosens what
counts as a local address, explain in the pull request why the new form cannot be reached
from the public internet.

## Deployment

Pushing to `main` runs the tests, builds the site, and deploys `dist/` to GitHub Pages
(`.github/workflows/deploy.yml`). Because the organisation's site uses the custom domain
`fiestaboard.app`, this repository is published under `https://fiestaboard.app/auth/` with
that site's certificate. This repository must not set a custom domain of its own.

## License

MIT. See [LICENSE](LICENSE).
