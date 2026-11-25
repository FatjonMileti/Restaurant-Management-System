# Observability

The compose stack ships a self-hosted Prometheus + Grafana + Loki setup:

| Service    | Purpose                                     | Local URL             |
| ---------- | ------------------------------------------- | --------------------- |
| Grafana    | Provisioned dashboards, metric/log explorer | http://localhost:3000 |
| Prometheus | Scrapes `backend:5000/metrics`              | http://localhost:9090 |
| Loki       | Log store fed by Promtail                   | http://localhost:3100 |
| Promtail   | Tails Docker container logs via the socket  | internal :9080        |

Start everything:

```bash
docker compose up --build -d
```

Grafana logs in with `admin` / `admin` by default. Override before first start
if the port is reachable by anyone else:

```bash
GRAFANA_ADMIN_PASSWORD='change-me' docker compose up -d grafana
```

The observability ports bind to `127.0.0.1` by default. To expose Grafana on a
remote host, set `GRAFANA_BIND=0.0.0.0` (and put TLS/auth in front of it).
`PROMETHEUS_BIND` and `LOKI_BIND` work the same way; changing `*_PORT` updates
the published port only.

## What is collected

- **Backend metrics** (`backend/metrics.ts`):
  - `restaurant_http_requests_total{method,route,status_code}`
  - `restaurant_http_request_duration_seconds{method,route,status_code}`
  - `restaurant_graphql_errors_total{code}`
  - `restaurant_sse_connections`
  - Node/process defaults prefixed with `restaurant_` (CPU, memory, event loop
    lag, GC, handles, etc.)
- **Container logs**: Promtail discovers containers through
  `/var/run/docker.sock` and keeps only the `restaurant-management` compose
  project. Labels include `compose_project`, `service`, `container`, and
  `stream`.

The backend exposes `GET /metrics` unauthenticated. It is internal-only in
compose: the backend port is not published and Caddy does not proxy `/metrics`.
In local dev it is available at `http://localhost:5000/metrics`.

## Dashboard and queries

Grafana provisions:

- Datasources: `Prometheus` (`uid: prometheus`) and `Loki` (`uid: loki`)
- Dashboard: **Restaurant Management Overview** (`uid: restaurant-overview`)

Useful PromQL:

```promql
# request rate
sum(rate(restaurant_http_requests_total[5m]))

# p95 latency across all routes
histogram_quantile(0.95, sum by (le) (rate(restaurant_http_request_duration_seconds_bucket[5m])))

# 5xx rate
sum(rate(restaurant_http_requests_total{status_code=~"5.."}[5m]))
  / clamp_min(sum(rate(restaurant_http_requests_total[5m])), 0.000001)

# GraphQL errors by code
sum by (code) (rate(restaurant_graphql_errors_total[5m]))
```

Useful LogQL:

```logql
{service=~"backend|web"}

{service="backend"} |= "retrying transient failure"

{compose_project="restaurant-management"} |~ "SQLITE_(BUSY|LOCKED)"
```

## Configuration

| File                                      | Purpose                            |
| ----------------------------------------- | ---------------------------------- |
| `monitoring/prometheus/prometheus.yml`    | Scrape jobs and intervals          |
| `monitoring/loki/loki-config.yml`         | Loki storage, schema, retention    |
| `monitoring/promtail/promtail-config.yml` | Docker discovery and relabeling    |
| `monitoring/grafana/provisioning/`        | Datasources and dashboard provider |
| `monitoring/grafana/dashboards/`          | Dashboard JSON                     |

Retention defaults are 15 days for Prometheus
(`--storage.tsdb.retention.time`) and 7 days for Loki
(`limits_config.retention_period`). Adjust both if the volumes grow too large.

After editing Prometheus config, reload without restarting:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Troubleshooting

- **Prometheus target down**: check `docker compose ps backend` and open
  `http://localhost:9090/targets`. The backend must be healthy before Prometheus
  starts.
- **No logs in Grafana**: verify Promtail is running and can read the Docker
  socket. Rootless Docker or a non-standard socket path needs the
  `promtail` volume mount changed. Promtail only collects the
  `restaurant-management` compose project, not `npm run dev` processes.
- **Grafana shows no dashboard**: provisioning is mounted read-only from
  `monitoring/grafana`; check `docker compose logs grafana` for provisioning
  errors, then restart Grafana.
- **Port already in use**: set `GRAFANA_PORT`, `PROMETHEUS_PORT`, or
  `LOKI_PORT` in the environment.
