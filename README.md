# otel-verification

A sandbox for verifying [OpenTelemetry](https://opentelemetry.io/) behavior, built on NestJS + Fastify.

## Setup

```bash
mise install
npm install
```

## Usage

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

## Test

```bash
npm run test        # unit
npm run test:e2e    # e2e
npm run test:cov    # coverage
```
