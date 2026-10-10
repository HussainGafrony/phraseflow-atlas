// Check the API contract after moving sentence formatting into a shared function.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(path, mocks = {}) {
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
    require(name) {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
  });
  return exports;
}
const formatter = load("src/lib/sentence-view.ts");
function sentence(id) {
  return {
    _id: { toString: () => id },
    language: "greek",
    topic: "Travel",
    level: "Beginner",
    frequency: "common",
    text: "Καλημέρα",
    arabicTranslation: "صباح الخير",
    hash: "internal",
    sourceProvider: "internal",
  };
}
function query(rows) {
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    populate() {
      return this;
    },
    lean: async () => rows,
  };
}
test("sentence responses expose the same public fields and hide internal database fields", () => {
  const view = formatter.toSentenceView(sentence("one"));
  assert.equal(view.id, "one");
  assert.equal(view.text, "Καλημέρα");
  assert.equal(
    Object.keys(view).sort().join(","),
    "arabicTranslation,frequency,id,language,level,text,topic",
  );
});
test("restoring today preserves delivery order and excludes saved or missing sentences", async () => {
  const mocks = {
    "@/lib/sentence-view": formatter,
    "next/server": {
      NextResponse: { json: (data, options) => ({ data, options }) },
    },
    "@/lib/db": { dbConnect: async () => {} },
    "@/lib/http": {
      jsonError: (message, status) => ({ message, status }),
      handleRouteError: (error) => {
        throw error;
      },
    },
    "@/lib/auth": { requireApiSession: async () => ({ userId: "user" }) },
    "@/lib/validators": {},
    "@/lib/sentences": {},
    "@/lib/rate-limit": {},
    "@/lib/dates": { getDayKey: () => "2026-10-10" },
    "@/lib/constants": { DAILY_SENTENCE_LIMIT: 20 },
    "@/models/DailyUsage": {
      DailyUsage: { findOne: () => query({ totalDelivered: 15 }) },
    },
    "@/models/SentenceDelivery": {
      SentenceDelivery: {
        find: () =>
          query(
            ["first", "saved", "missing", "last"].map((sentenceId) => ({
              sentenceId,
            })),
          ),
      },
    },
    "@/models/SavedSentence": {
      SavedSentence: { find: () => query([{ sentenceId: "saved" }]) },
    },
    "@/models/Sentence": {
      Sentence: {
        find: (filter) => {
          assert.equal(filter._id.$in.join(","), "first,missing,last");
          return query([sentence("last"), sentence("first")]);
        },
      },
    },
  };
  const route = load("src/app/api/sentences/today/route.ts", mocks);
  const response = await route.GET();
  assert.equal(
    response.data.sentences.map((item) => item.id).join(","),
    "first,last",
  );
  assert.equal(response.data.remaining, 5);
  assert.equal(response.options.headers["Cache-Control"], "private, no-store");
  mocks["@/lib/auth"].requireApiSession = async () => null;
  assert.equal((await route.GET()).status, 401);
});
test("saved sentences keep their save date and public sentence shape", async () => {
  const route = load("src/app/api/saved/route.ts", {
    "@/lib/sentence-view": formatter,
    "next/server": { NextResponse: { json: (data) => data } },
    "@/lib/auth": { requireApiSession: async () => ({ userId: "user" }) },
    "@/lib/db": { dbConnect: async () => {} },
    "@/lib/http": {
      handleRouteError: (error) => {
        throw error;
      },
    },
    "@/models/SavedSentence": {
      SavedSentence: {
        find: (filter) => {
          assert.equal(filter.userId, "user");
          return query([
            {
              _id: "save-id",
              dayKey: "2026-10-09",
              createdAt: "date",
              sentenceId: sentence("one"),
            },
          ]);
        },
      },
    },
  });
  const result = await route.GET();
  assert.equal(result.saved[0].dayKey, "2026-10-09");
  assert.equal(result.saved[0].sentence.id, "one");
  assert.equal(result.saved[0].sentence.hash, undefined);
});
