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
| `http://localhost:3000/graphql` | GraphQL Playground |
| `http://localhost:16686` | Jaeger UI |

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
