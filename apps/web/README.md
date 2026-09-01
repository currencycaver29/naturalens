# Naturalens web

Landing page for Naturalens, hosted on Cloudflare Workers with a D1-backed waitlist
and the mobile app's email + OTP sign-in.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Next.js dev server does not run the Worker API. To test waitlist and auth locally:

```bash
cp .dev.vars.example .dev.vars   # fill RESEND_API_KEY and AUTH_PEPPER
npm run db:migrate:local
npm run preview
```

`preview` serves the Worker (including `/api/auth/*` and `/api/me`) on port 8787.

## Auth secrets

Sign-in emails go through [Resend](https://resend.com). Verify `naturalens.ca` there, then:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put AUTH_PEPPER   # e.g. openssl rand -base64 32
```

`AUTH_FROM` is a wrangler var (`NaturaLens <hello@naturalens.ca>`), not a secret.
Until both secrets are set, `POST /api/auth/request-code` fails closed.

## Deploy

```bash
npm run deploy   # applies D1 migrations, then builds and deploys
```

Live site: `https://naturalens.ca`

Waitlist and app accounts share the `naturalens-waitlist` D1 database (`users`,
`otp_challenges`, `sessions`). Auth routes do not use the waitlist origin check —
React Native has no `Origin` header.
