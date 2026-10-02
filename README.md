# FiestaBoard sign-in relay

A few static pages, served from GitHub Pages at **https://fiestaboard.app/auth/**, that let a
[FiestaBoard](https://github.com/Fiestaboard/FiestaBoard) running on someone's home network
complete an OAuth sign-in.

> **The redirect URL must never change.**
> `https://fiestaboard.app/auth/oauth/redirect.html` is registered as the redirect URI in every
> OAuth app that FiestaBoard, or a FiestaBoard user, has created with a provider. Renaming
> this repository, moving these files, or changing the domain breaks sign-in for every board
> until each of those registrations is updated by hand.

## Why this exists

A FiestaBoard is reached at an address like `http://192.168.1.50:4420`. OAuth providers will
only redirect to an `https://` address they were told about in advance, so a board on a LAN
cannot be the redirect target itself. This site is the fixed HTTPS address the provider
redirects to; it then passes the browser on to the board. Home Assistant solves the same
problem the same way with `my.home-assistant.io`.

There is no server. Nothing is stored anywhere except one value in the visitor's own
browser.

## How it works

1. **Once per browser**, the person opens [`oauth/setup.html`](oauth/setup.html) and saves
   their board's address. It is kept in that browser's `localStorage`.
2. On the board they press **Connect**. The board sends them to the provider with
   `redirect_uri=https://fiestaboard.app/auth/oauth/redirect.html`.
3. After sign-in, the provider redirects to
   [`oauth/redirect.html`](oauth/redirect.html)`?code=…&state=…`.
4. That page reads the saved address and replaces itself with
   `<board>/api/oauth/callback?code=…&state=…`.
5. The board checks `state`, exchanges the code for tokens, and stores them.

## Security model

The risk this design has to manage is a sign-in response being sent to the wrong place.

- **Saving an address takes a click.** `setup.html` accepts a suggested address in the URL
  fragment (`#board=…`) so the board's own UI can fill the field in, but nothing is stored
  until the person presses **Save board address**. A crafted link cannot reroute anyone's
  sign-in on its own.
- **`setup.html` refuses to run inside a frame**, so that click cannot be obtained by
  overlaying the page. GitHub Pages cannot send a `frame-ancestors` header, so the check is
  done in script.
- **Only local addresses are accepted**, and the check runs twice: when the address is saved
  and again on every redirect. A value that reached `localStorage` some other way is refused
  just the same. See the list below.
- **The response is passed along untouched and never kept.** `redirect.html` uses
  `location.replace`, so the URL carrying the code does not stay in the tab's history, and
  every page sets `referrer` to `no-referrer`.
- **No third-party code.** No analytics, fonts, or scripts from other hosts. Each page sets a
  Content-Security-Policy of `default-src 'none'` and loads only its own script and
  stylesheet.

What this site cannot protect, the board has to:

- GitHub's servers see the request for `redirect.html`, including the authorization code in
  its query string. Boards must use PKCE so that a code is useless without the verifier,
  which never leaves the board.
- This site cannot tell whether a response is genuine. The board must verify `state`.
- These pages share the `fiestaboard.app` origin with the documentation site, so a script
  injection there could overwrite the saved address. It could still only point at a local
  address, because of the second check above.

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
or fragment. The rules live in [`oauth/board-address.js`](oauth/board-address.js).

## Development

No build step and no dependencies.

```sh
npm test         # unit tests for the address rules and redirect decision
npm run serve    # serve the site at http://localhost:8787
```

Changes to `oauth/board-address.js` need a test in `tests/`. For anything that loosens what
counts as a local address, explain in the pull request why the new form cannot be reached
from the public internet.

## Deployment

GitHub Pages serves the `main` branch from the repository root. Because the organisation's
site uses the custom domain `fiestaboard.app`, this repository is published under
`https://fiestaboard.app/auth/` with that site's certificate. There is nothing else to
configure, and this repository must not set a custom domain of its own.

## License

MIT. See [LICENSE](LICENSE).
