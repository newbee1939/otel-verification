import { Controller, Get, HttpCode, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { SpanStatusCode, trace } from '@opentelemetry/api';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Verification endpoints to demonstrate that @fastify/otel's finalizeResponseSpanHook
   * incorrectly calls setStatus(OK) for HTTP 4xx responses.
   *
   * Endpoints:
   *   GET /verify/ok        → 200: root span should be UNSET, but @fastify/otel sets it to OK
   *   GET /verify/4xx       → 404: root span should be UNSET, but @fastify/otel sets it to OK
   *   GET /verify/error     → 500: root span should be ERROR (this works correctly)
   *   GET /verify/app-error → 400: app sets ERROR on child span, but root span is set to OK by @fastify/otel
   */
  @Get('verify/ok')
  verifyOk(): object {
    return { status: 'ok', message: 'This is a 200 response. Span should be UNSET, but @fastify/otel sets it to OK.' };
  }

  @Get('verify/4xx')
  verify4xx(@Res() reply: FastifyReply): void {
    // HTTP 4xx: per OTel spec, span status MUST be left unset for SpanKind.SERVER
    // @fastify/otel incorrectly calls setStatus(OK) here (spec violation)
    reply.status(404).send({ error: 'Not Found', message: 'Span should be UNSET, but @fastify/otel sets it to OK.' });
  }

  @Get('verify/error')
  verifyError(@Res() reply: FastifyReply): void {
    // HTTP 5xx: per OTel spec, span status should be ERROR (this works correctly)
    reply.status(500).send({ error: 'Internal Server Error', message: 'Span should be ERROR. This is correct behavior.' });
  }

  @Get('verify/app-error')
  verifyAppError(@Res() reply: FastifyReply): void {
    // trace.getActiveSpan() returns the child span created by handlerWrapper.
    // The app's setStatus(ERROR) applies to the child span, while
    // finalizeResponseSpanHook's setStatus(OK) applies to the root span "request".
    // They target different span objects, so the result is:
    //   - child span "handler - verifyAppError" → ERROR (set by the app)
    //   - root span "request" → OK (set by @fastify/otel) ← spec violation
    const span = trace.getActiveSpan();
    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: 'Application explicitly set ERROR for a 400 response',
    });
    reply.status(400).send({
      error: 'Bad Request',
      message: 'Check Jaeger: child span is ERROR, but root "request" span is incorrectly set to OK by @fastify/otel.',
    });
  }
}
