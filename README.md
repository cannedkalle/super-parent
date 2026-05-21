# Super Parent Toolkit

A local-first toolkit for parent planning workflows. The MVP includes the Summer Camp & Activity Planner as the first app.

## Apps

- `/` - Super Parent Toolkit home
- `/camp-planner` - Summer Camp & Activity Planner

## Local Development

```bash
npm install
npm run dev
```

Open the URL printed by Next.js. If port `3000` is busy, Next.js will choose another port.

## Production Check

```bash
npm run build
```

## Publish MVP On Vercel

1. Push this project to GitHub.
2. In Vercel, create a new project from that repository.
3. Keep the default Next.js settings.
4. Deploy.

The site will publish with:

- Toolkit home at `/`
- Camp Planner at `/camp-planner`
- PWA manifest and service worker assets

## PWA Notes

The PWA install prompt works on `localhost` and HTTPS deployments. The service worker registers only in production builds.
