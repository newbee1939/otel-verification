# otel-verification

A sandbox for verifying [OpenTelemetry](https://opentelemetry.io/) behavior, built on NestJS + Fastify.

## Architecture

```
NestJS App (port 3000)
  └── OTel SDK (tracer.ts)
        └── OTLP gRPC → OTel Collector (port 4317)
                              └── OTLP → Jaeger (port 16686)
```

## Stack

| Component | Detail |
|---|---|
| Runtime | NestJS 11 + Fastify |
| OTel SDK | `@opentelemetry/sdk-node` |
| Exporter | OTLP gRPC (`@opentelemetry/exporter-trace-otlp-grpc`) |
| Instrumentation | HTTP / Fastify (`@fastify/otel`) / GraphQL |
| Collector | OpenTelemetry Collector Contrib 0.143.1 |
| Backend | Jaeger 1.76.0 |

## Setup

```bash
mise install
npm install
```

## Usage

```bash
# Start OTel Collector + Jaeger
docker compose up -d

# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

## Endpoints

| URL | Description |
|---|---|
| `http://localhost:3000/` | REST: Hello World |
| `http://localhost:3000/verify/ok` | Returns 200 — root span should be UNSET |
| `http://localhost:3000/verify/4xx` | Returns 404 — root span should be UNSET |
| `http://localhost:3000/verify/error` | Returns 500 — root span should be ERROR |
| `http://localhost:3000/verify/app-error` | Returns 400 — app sets ERROR, root span is overridden to OK |
| `http://localhost:3000/graphql` | GraphQL Playground |
| `http://localhost:16686` | Jaeger UI |

## Verifying `@fastify/otel` Span Status Behavior

### Background

`@fastify/otel`'s `finalizeResponseSpanHook` unconditionally calls `setStatus(OK)` for all responses with HTTP status codes below 500. This violates the OTel spec:

> Instrumentation Libraries SHOULD NOT set the status code to `Ok`, unless explicitly configured to do so.
>
> — [OTel Trace API: Set Status](https://opentelemetry.io/docs/specs/otel/trace/api/#set-status)

### How to Verify

```bash
# Case 1: 200 — root span should be UNSET, actually OK
curl -s http://localhost:3000/verify/ok | jq

# Case 2: 404 — root span should be UNSET, actually OK
curl -s http://localhost:3000/verify/4xx | jq

# Case 3: 500 — root span should be ERROR (correct behavior)
curl -s http://localhost:3000/verify/error | jq

# Case 4: 400 + app explicitly sets ERROR — root span is overridden to OK
curl -s http://localhost:3000/verify/app-error | jq
```

Open Jaeger UI (`http://localhost:16686`) and inspect the root span (`name: "request"`) for each trace.

| Endpoint | Expected `otel.status_code` | Actual `otel.status_code` |
|---|---|---|
| `GET /verify/ok` | UNSET | OK ← spec violation |
| `GET /verify/4xx` | UNSET | OK ← spec violation |
| `GET /verify/error` | ERROR | ERROR ✓ |
| `GET /verify/app-error` | ERROR | OK ← spec violation |

### Span Hierarchy

`@fastify/otel` wraps each handler with `handlerWrapper`, creating the following span hierarchy:

```
root span "request"           ← finalizeResponseSpanHook calls setStatus(OK) on this
  └── child span "handler - ..."  ← trace.getActiveSpan() returns this
```

For `GET /verify/app-error`, the app calls `trace.getActiveSpan()?.setStatus(ERROR)`, which targets the **child span**. Meanwhile `finalizeResponseSpanHook` calls `setStatus(OK)` on the **root span**. They target different objects, so the root span ends up as `OK` regardless of what the app sets.

## GraphQL

The following operations are available at `http://localhost:3000/graphql`.

```graphql
# Fetch all books
query {
  getBooks { id title author }
}

# Fetch a book by ID
query {
  getBook(id: 1) { id title author }
}

# Add a book
mutation {
  addBook(title: "Clean Architecture", author: "Robert C. Martin") {
    id title author
  }
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OTEL_SERVICE_NAME` | `otel-nest` | Service name reported to OTel |
| `OTEL_SERVICE_VERSION` | `0.0.1` | Service version reported to OTel |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `localhost:4317` | OTel Collector gRPC endpoint |
| `PORT` | `3000` | Port the app listens on |
