# AI Judge — Moral Court MVP

This lightweight build runs inside the `jury` collection. It exposes a Tailwind-powered front-end, JSON data store, and Node-based API routes ready for Vercel Functions.

## Structure

- `public/` – static pages for the feed, case detail, and judge bios.
- `api/` – serverless endpoints for uploads, voting, comments, sentiment summarization, and mock AI trials.
- `data/` – flat JSON storage for cases and judges.
- `vercel.json` – hourly cron configuration for running AI trials.

## Local Notes

These functions assume a Vercel-like environment with automatic JSON parsing. When adapting to Express, wrap the handlers with `app.use(express.json())` before mounting.
