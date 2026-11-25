import { collectDefaultMetrics, Counter, Gauge, Histogram, register } from '@prometheus-io/client';
import type { Request, RequestHandler } from 'express';

/**
 * Prometheus instrumentation for the backend.
 *
 * The `/metrics` endpoint is scraped by the `prometheus` service in
 * `docker-compose.yml`. Keep metric names/labels stable: the provisioned
 * Grafana dashboard (`monitoring/grafana/dashboards/restaurant-overview.json`)
 * queries them directly.
 */

const METRIC_PREFIX = 'restaurant_';

let defaultMetricsInitialized = false;

/** Register Node/process default metrics once, from `server.ts`. */
export const initMetrics = (): void => {
  if (defaultMetricsInitialized) return;
  collectDefaultMetrics({ register, prefix: METRIC_PREFIX });
  defaultMetricsInitialized = true;
};

const HTTP_LABELS = ['method', 'route', 'status_code'] as const;

export const httpRequestsTotal = new Counter<(typeof HTTP_LABELS)[number]>({
  name: `${METRIC_PREFIX}http_requests_total`,
  help: 'Total HTTP requests handled by the backend.',
  labelNames: HTTP_LABELS,
  registers: [register],
});

export const httpRequestDuration = new Histogram<(typeof HTTP_LABELS)[number]>({
  name: `${METRIC_PREFIX}http_request_duration_seconds`,
  help: 'HTTP request duration in seconds.',
  labelNames: HTTP_LABELS,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const graphqlErrorsTotal = new Counter<'code'>({
  name: `${METRIC_PREFIX}graphql_errors_total`,
  help: 'GraphQL errors returned to clients, by application error code.',
  labelNames: ['code'],
  registers: [register],
});

export const sseConnections = new Gauge({
  name: `${METRIC_PREFIX}sse_connections`,
  help: 'Currently open Server-Sent Events connections.',
  registers: [register],
});

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const LONG_HEX_ID_RE = /\/[0-9a-f]{24}(?=\/|$)/gi;
const NUMERIC_SEGMENT_RE = /\/\d+(?=\/|$)/g;

/**
 * Collapse identifiers in a URL path so Prometheus labels stay bounded.
 * `/orders/123` -> `/orders/:id`, `/images/pizza.jpg` -> `/images/*`.
 */
export const normalizeRoutePath = (raw: string): string => {
  if (!raw) return '/';
  const pathOnly = raw.split('?')[0] || '/';
  if (pathOnly.startsWith('/images/')) return '/images/*';
  // CRA emits content-hashed asset filenames; collapsing them keeps the
  // `route` label from growing with every frontend build.
  if (pathOnly.startsWith('/static/')) return '/static/*';
  if (pathOnly.startsWith('/events/')) return '/events/:id';
  return (
    pathOnly
      .replace(UUID_RE, ':id')
      .replace(LONG_HEX_ID_RE, '/:id')
      .replace(NUMERIC_SEGMENT_RE, '/:id') || '/'
  );
};

const routeLabel = (req: Request, requestPath: string): string => {
  const routePath = req.route?.path;
  // `*` is the SPA fallback; use the real path there so page requests stay
  // distinguishable instead of all collapsing into one label. `requestPath`
  // is captured before routing because Express strips the mount path from
  // `req.url` while a sub-router (e.g. `/graphql`) is handling the request.
  const raw =
    typeof routePath === 'string' && routePath !== '*' ? `${req.baseUrl}${routePath}` : requestPath;
  return normalizeRoutePath(raw);
};

/** Express middleware: record request count/latency after each response. */
export const metricsMiddleware: RequestHandler = (req, res, next) => {
  // Do not let Prometheus scrapes dominate the request metrics.
  if ((req.originalUrl || req.path).split('?')[0] === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  const requestPath = req.originalUrl || req.path;
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req, requestPath),
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
  });
  next();
};

/** Express handler for `GET /metrics`. */
export const metricsHandler: RequestHandler = async (_req, res, next) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    next(err);
  }
};

export { register };
