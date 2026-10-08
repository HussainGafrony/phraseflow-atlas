const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { z } = require("zod");
function load(path, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    Date,
    Error,
    console,
    AbortSignal,
    ...globals,
  });
  return exports;
}
// تقييم التعبيرات التي يرسلها التطبيق إلى MongoDB، مع محاكاة الساعة وحدود التخزين فقط.
function evaluate(expression, document) {
  if (expression instanceof Date) return expression;
  if (typeof expression === "string" && expression.startsWith("$"))
    return document[expression.slice(1)];
  if (!expression || typeof expression !== "object") return expression;
  if ("$literal" in expression) return expression.$literal;
  if ("$ifNull" in expression)
    return (
      evaluate(expression.$ifNull[0], document) ??
      evaluate(expression.$ifNull[1], document)
    );
  if ("$lte" in expression)
    return (
      evaluate(expression.$lte[0], document) <=
      evaluate(expression.$lte[1], document)
    );
  if ("$add" in expression)
    return expression.$add.reduce(
      (sum, item) => sum + evaluate(item, document),
      0,
    );
  if ("$cond" in expression)
    return evaluate(
      expression.$cond[evaluate(expression.$cond[0], document) ? 1 : 2],
      document,
    );
  throw new Error("Unexpected expression");
}
function rateFixture(duplicate = false) {
  let now = Date.parse("2026-10-08T12:00:00Z");
  const records = new Map();
  let raced = false;
  class Clock extends Date {
    constructor(value) {
      super(value === undefined ? now : value);
    }
  }
  const { checkRateLimit } = load(
    "src/lib/rate-limit.ts",
    {
      "@/models/RateLimit": {
        RateLimit: {
          async findOneAndUpdate({ key }, pipeline, options) {
            const record = records.get(key) ?? {};
            const updated = {};
            for (const [field, expr] of Object.entries(pipeline[0].$set))
              updated[field] = evaluate(expr, record);
            if (duplicate && !raced && options.upsert) {
              raced = true;
              records.set(key, {
                key,
                count: 1,
                expiresAt: new Date(now + 60000),
              });
              const error = new Error("duplicate");
              error.code = 11000;
              throw error;
            }
            records.set(key, updated);
            return updated;
          },
        },
      },
    },
    { Date: Clock },
  );
  return {
    request: (key = "key") => checkRateLimit(key, 5, 60),
    advance: (ms) => {
      now += ms;
    },
  };
}
test("only five of twenty concurrent requests pass the shared limit", async () => {
  const rate = rateFixture();
  const results = await Promise.all(
    Array.from({ length: 20 }, () => rate.request()),
  );
  assert.equal(results.filter((result) => result.allowed).length, 5);
  assert.equal(results[19].retryAfter, 60);
});
test("expiration resets the window before the TTL cleanup runs", async () => {
  const rate = rateFixture();
  for (let i = 0; i < 6; i++) await rate.request();
  rate.advance(60001);
  const result = await rate.request();
  assert.equal(result.allowed, true);
  assert.equal(result.count, 1);
});
test("a simultaneous insert is counted instead of bypassing the limiter", async () => {
  const result = await rateFixture(true).request("$untrusted-key");
  assert.equal(result.count, 2);
});
function providerFixture({
  status = 200,
  valid = true,
  configured = true,
} = {}) {
  let calls = 0;
  const provider = {
    provider: "openai",
    enabled: false,
    model: "test-model",
    baseUrl: "https://example.com/v1",
    textEndpoint: "/chat/completions",
    encryptedApiKey: configured ? "encrypted" : "",
  };
  const api = load(
    "src/lib/ai/service.ts",
    {
      zod: { z },
      "../constants": {
        SUPPORTED_LANGUAGES: [{ value: "english", label: "English" }],
      },
      "../crypto": { decryptSecret: () => "test-only-key" },
      "@/models/AIProvider": {
        AIProvider: { findOne: () => ({ lean: async () => provider }) },
      },
    },
    {
      fetch: async (url, options) => {
        calls++;
        assert.equal(url, "https://example.com/v1/chat/completions");
        assert.equal(options.headers.Authorization, "Bearer test-only-key");
        assert.equal(JSON.parse(options.body).model, "test-model");
        return {
          ok: status === 200,
          status,
          json: async () => ({
            choices: [
              {
                message: {
                  content: valid
                    ? JSON.stringify({
                        sentences: [
                          { text: "Hello!", arabicTranslation: "مرحباً!" },
                        ],
                      })
                    : "{}",
                },
              },
            ],
          }),
        };
      },
    },
  );
  return {
    test: () => api.testProviderConnection("openai"),
    calls: () => calls,
  };
}
test("provider test uses the actual model, key and endpoint even before enabling it", async () => {
  const provider = providerFixture();
  assert.equal((await provider.test()).ok, true);
  assert.equal(provider.calls(), 1);
});
test("rejected keys and malformed provider output never report success", async () => {
  await assert.rejects(providerFixture({ status: 401 }).test(), /401/);
  assert.equal((await providerFixture({ valid: false }).test()).ok, false);
  const missing = providerFixture({ configured: false });
  assert.equal((await missing.test()).ok, false);
  assert.equal(missing.calls(), 0);
});
