# NBA Auto Writer (GitHub Pages in `site/`)

This repository scrapes public NBA news (no API keys), writes original daily stories, and publishes them to **GitHub Pages** from the `site/` subfolder.

## How it works
- A GitHub Action runs daily.
- It executes `pipeline/nba_news_pipeline.py` which scrapes public sources (RSS + HTML) and writes original stories into `site/content/YYYY-MM-DD/`.
- The workflow deploys `site/` to GitHub Pages using Actions.

## One-time setup
1. Create a **public** repository and upload these files.
2. In **Settings → Pages**: set **Build and deployment** to **GitHub Actions**.
3. In **Settings → Actions → General**: ensure Actions are enabled.
4. Optional: set `OPENAI_API_KEY` as a repository secret to enable the LLM writer. Without it, a solid rule-based writer is used.

## Manual run
- In **Actions**, run the workflow **“Daily NBA Story Pull (Pages)”** using **Run workflow**.

## Output
- Published site at your GitHub Pages URL, e.g. `https://<user>.github.io/<repo>/`
- Stories live under `site/content/YYYY-MM-DD/` with an `index.json` and multiple `.md` files.
