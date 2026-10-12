# therodrigo.com — portfolio

Personal about-me / portfolio dashboard. Express 5 + EJS, self-hosted on a
ZAP-Hosting Debian VPS. Layout inspired by justiin.de, theme switcher inspired
by ezgclan.eu, terminal flavor everywhere.

## Structure

```
app.js               Routes only (page render + 2 APIs). No content here.
data/profile.js      ALL site content — edit this to change what the page says.
views/index.ejs      Skeleton; sections live in views/partials/*.ejs
public/css/style.css Design system: 6 themes via [data-theme] CSS variables.
public/js/main.js    Theme switcher, copy-code buttons, RRD refresh, Steam fetch.
```

## Run locally

```sh
npm install
cp .env.example .env    # fill STEAM_API_KEY / STEAM_ID
npm start               # http://localhost:3000
```

Without `rrdtool` / the `.rrd` files (e.g. on Windows), the latency graphs
render a "[ NO DATA // RRD OFFLINE ]" placeholder instead of failing — the
real graphs only work on the VPS where the ping cron job writes
`/var/lib/rrd/<node>_ping.rrd`.

## Content you still need to fill in (`data/profile.js`)

- `hubLinks` → **ZAP-Hosting card**: replace `SET-YOUR-CODE` with the real 20% off code.
- `hubLinks` → **Script Vault**: set `href` to the project/repo URL (it renders as
  "SOON" while `href` is `null`).
- FOSSology card: set its `href` once the instance is up.

## Ping graph spike fix

The graph API (`/api/graphs/latency/:serverId`) now renders a **rigid 0–150 ms
scale**, and any sample above 500 ms (timeouts) becomes a gap in the line
instead of a spike that flattens everything. Bands: green ≤60 ms, amber
60–120 ms, red >120 ms. If your nodes legitimately sit above 150 ms, raise
`--upper-limit` in `app.js`.

## Deploy checklist (run on the VPS yourself)

```sh
# from your machine
rsync -av --exclude node_modules --exclude .env ./ root@<vps>:/var/www/my-portfolio/

# on the VPS
cd /var/www/my-portfolio
npm install --omit=dev
# restart however the app is managed, e.g.:
systemctl restart my-portfolio   # or: pm2 restart my-portfolio
```

Then verify: real RRD graphs render, a ping spike no longer crushes the scale,
and the Steam section loads.

**Security notes**
- `.env` holds the real Steam API key — it is git-ignored; never commit or copy
  it into backups you share.
- The VPS root password was shared over WhatsApp in plain text. **Change it**
  and prefer SSH keys (`PasswordAuthentication no`).

## Accessibility

Built to WCAG 2.1 AA (ISO/IEC 40500): semantic landmarks, skip link, keyboard
operable theme switcher (`aria-pressed`), `alt` text, AA-checked contrast in
all 6 themes, `prefers-reduced-motion` support (marquee/animations stop).
Before claiming compliance after big changes, re-run **Accessibility Insights
for Web → FastPass** in Edge and fix anything it flags — the footer legend
depends on it staying true.

## License & Copyright

Copyright (c) 2026 Luis Rodrigo García Hernández. Released under the [MIT License](LICENSE).
