/**
 * opentelemetry-js の setStatus() 仕様違反を再現するスクリプト
 *
 * SpanImpl#setStatus() が以下の仕様ルールを強制していないことを検証する
 * https://opentelemetry.io/docs/specs/otel/trace/api/#set-status
 *
 * 実行: npx ts-node scripts/verify-set-status.ts
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

const tracer = provider.getTracer('set-status-verification');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`          ${e.message}`);
  }
}

function assert(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: 期待値 ${JSON.stringify(expected)}, 実際 ${JSON.stringify(actual)}`);
  }
}

// ─── ケース 1: Ok は final であるべき ────────────────────────────────
// 仕様: "When span status is set to Ok it SHOULD be considered final
//        and any further attempts to change it SHOULD be ignored."

console.log('\n📋 ケース 1: Ok は final であるべき (SHOULD)');

test('setStatus(OK) → setStatus(ERROR): OK のまま残るべき', () => {
  const span = tracer.startSpan('case1-ok-then-error');
  span.setStatus({ code: SpanStatusCode.OK });
  span.setStatus({ code: SpanStatusCode.ERROR, message: 'fail' });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.OK, 'status.code');
  assert(status.message, undefined, 'status.message');
  span.end();
});

test('setStatus(OK) → setStatus(UNSET): OK のまま残るべき', () => {
  const span = tracer.startSpan('case1-ok-then-unset');
  span.setStatus({ code: SpanStatusCode.OK });
  span.setStatus({ code: SpanStatusCode.UNSET });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.OK, 'status.code');
  span.end();
});

// ─── ケース 2: Unset の設定は無視されるべき ─────────────────────────
// 仕様: "An attempt to set value Unset SHOULD be ignored."

console.log('\n📋 ケース 2: Unset の設定は無視されるべき (SHOULD)');

test('setStatus(ERROR) → setStatus(UNSET): ERROR のまま残るべき', () => {
  const span = tracer.startSpan('case2-error-then-unset');
  span.setStatus({ code: SpanStatusCode.ERROR, message: 'fail' });
  span.setStatus({ code: SpanStatusCode.UNSET });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.ERROR, 'status.code');
  assert(status.message, 'fail', 'status.message');
  span.end();
});

test('新規 Span に setStatus(UNSET): UNSET のまま（no-op）', () => {
  const span = tracer.startSpan('case2-unset-on-fresh');
  span.setStatus({ code: SpanStatusCode.UNSET });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.UNSET, 'status.code');
  span.end();
});

// ─── ケース 3: Total Order (Ok > Error > Unset) ─────────────────────
// 仕様: "These values form a total order: Ok > Error > Unset."

console.log('\n📋 ケース 3: Total Order の強制 (SHOULD)');

test('setStatus(ERROR) → setStatus(OK): OK になるべき（Ok > Error）', () => {
  const span = tracer.startSpan('case3-error-then-ok');
  span.setStatus({ code: SpanStatusCode.ERROR, message: 'fail' });
  span.setStatus({ code: SpanStatusCode.OK });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.OK, 'status.code');
  span.end();
});

// ─── ケース 4: Ok・Unset では Description が無視されるべき ───────────
// 仕様: "Description MUST only be used with the Error StatusCode value."
// 仕様: "Description MUST be IGNORED for StatusCode Ok & Unset values."

console.log('\n📋 ケース 4: Ok・Unset では Description が無視されるべき (MUST)');

test('setStatus(OK, message): message は破棄されるべき', () => {
  const span = tracer.startSpan('case4-ok-with-message');
  span.setStatus({ code: SpanStatusCode.OK, message: 'success' });

  const status = (span as any).status;
  assert(status.code, SpanStatusCode.OK, 'status.code');
  assert(status.message, undefined, 'status.message');
  span.end();
});

test('setStatus(UNSET, message): message は破棄されるべき', () => {
  const span = tracer.startSpan('case4-unset-with-message');
  span.setStatus({ code: SpanStatusCode.UNSET, message: 'info' } as any);

  const status = (span as any).status;
  assert(status.message, undefined, 'status.message');
  span.end();
});

// ─── 結果サマリー ────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`結果: ${passed} passed, ${failed} failed / 全 ${passed + failed} テスト`);

if (failed > 0) {
  console.log('\n⚠️  上記の FAIL は Span#setStatus() の仕様違反を示しています。');
  console.log('   仕様: https://opentelemetry.io/docs/specs/otel/trace/api/#set-status');
}

provider.shutdown();
process.exit(failed > 0 ? 1 : 0);
