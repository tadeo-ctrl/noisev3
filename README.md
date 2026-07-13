# NOISE curator prototype

This repository contains the NOISE curator v3.1 prototype, its media, browser checks, Vercel deployment configuration, and the internal product/relevance notes used during development.

## Local development

Requirements:

- Node.js 18 or newer (Node 24 is recorded in `.nvmrc`)
- Google Chrome for the mobile browser smoke check

Install and run:

```sh
nvm use
npm ci
npm run dev
```

Open <http://127.0.0.1:4173>. To use another host or port:

```sh
npm run dev -- --host 0.0.0.0 --port 8080
```

The local server disables caching and supports HTTP byte ranges so the prototype's MP4 assets behave like they do in deployment. It exposes only the prototype's runtime assets; internal notes and repository metadata are not served to the local network.

### Test on a phone

Keep the Mac and phone on the same Wi-Fi network, then expose the development server to the local network:

```sh
npm run dev -- --host 0.0.0.0
```

Find the Mac's active local-network address with `ipconfig getifaddr "$(route -n get default | awk '/interface:/{print $2}')"`, then open `http://<local-address>:4173` in Safari on the phone. The address can change when the Mac reconnects to the network.

If the page does not load, check that neither device is using a guest network or VPN and allow incoming connections for Node if macOS asks. Plain HTTP is sufficient for this prototype; browser features that require a secure context, such as camera or microphone access, will require a local HTTPS setup.

## Checks

```sh
npm run check
```

Run the checks separately with `npm run check:basic` and `npm run check:mobile`.

## Deployment

`vercel.json` configures the repository as a static Vercel deployment. The existing Git remote is preserved at `https://github.com/tadeo-ctrl/noisev3.git`; deployment continues through that repository's existing Vercel integration.

Do feature work on a branch and merge deliberately. Avoid committing local-only media backups, source footage, dependencies, Word documents, or archive files; the existing `.gitignore` and `.vercelignore` define those boundaries.

## Internal context

Read `AGENTS.md` before product, algorithm, or presentation changes. It points to the canonical relevance algorithm and the internal knowledge base in `kb/`.

Import details and checksums are recorded in `docs/prototype-provenance.md`.
