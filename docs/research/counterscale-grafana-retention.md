# Counterscale Historical Dashboard Options (Long-Term Retention)

## Context
- Counterscale stores events in Cloudflare Workers Analytics Engine (AE); AE retention is ~90 days. To view multi-year analytics, data must be copied or aggregated before it ages out. Source: Cloudflare Analytics Engine limits. citeturn0search0

## Options to Keep History and View in Grafana

### A) ClickHouse + Grafana (recommended for speed & scale)
- Nightly cron Worker (or GitHub Action) queries AE for the last 1–7 days, aggregates (date, page, referrer, country, visitors, views) and appends to ClickHouse (Cloud or self-hosted).
- Grafana’s official ClickHouse data source provides fast time-series queries and alerting. citeturn0search1
- Pros: handles large volumes; rich Grafana UX. Cons: extra managed service cost/ops.

### B) Postgres/Supabase + Grafana
- Same cron pattern, but append aggregates to Postgres (Supabase easiest).
- Grafana has a built-in Postgres data source.
- Pros: simple/cheap, good enough for moderate traffic. Cons: slower for hit-level data; prefer daily aggregates.

### C) R2 + Parquet + Worker API + Grafana JSON/Infinity
- Store daily aggregates (or raw hits if small) as Parquet/CSV in Cloudflare R2.
- Expose a small Worker API that reads R2 and returns time-series JSON.
- Grafana uses the JSON/Infinity data source to consume that endpoint. citeturn0search2
- Pros: stays on Cloudflare stack, minimal infra. Cons: must build/maintain API; plugin is less feature-rich.

## Recommended Architecture
1) Add a `cron` trigger to the Counterscale Worker (e.g., `0 4 * * *` UTC).
2) For the prior day, run AE SQL and write **aggregated rows** to the target store (ClickHouse/Postgres/R2). Keep dimensions you need historically (date, page, referrer, country/device, views, visitors).
3) In Grafana, create dashboards against that store. For R2/JSON, the API should pre-aggregate to keep responses small.
4) Cache stitched responses (last 7/30/90/365) in KV to reduce Worker/API cost.

## Notes
- Full raw export is possible for low-traffic sites, but AE queries over long windows may be sampled—prefer daily roll-ups.
- If you keep Umami around temporarily, ensure only one tracker is active on prod pages.
