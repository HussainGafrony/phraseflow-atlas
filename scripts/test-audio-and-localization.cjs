const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const crypto = require("node:crypto");
function load(path, mocks = {}, globals = {}) {
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
    process: { env: {} },
    console,
    Date,
    Intl,
    URL,
    AbortSignal,
    Error,
    ...globals,
  });
  return exports;
}
function audioFixture({
  enabled = true,
  uploadFails = false,
  token = "storage",
} = {}) {
  let asset;
  let generated = 0;
  let uploads = 0;
  const settings = {
    enabled,
    encryptedApiKey: "api",
    encryptedBlobToken: token,
    model: "speech-model",
    voice: "alloy",
    endpoint: "/audio/speech",
    baseUrl: "https://example.com/v1",
  };
  const { generateAudioUrlOnce } = load(
    "src/lib/tts.ts",
    {
      "@vercel/blob": {
        async head() {
          const error = new Error();
          error.name = "BlobNotFoundError";
          throw error;
        },
        async put(path, bytes, options) {
          uploads++;
          assert.equal(options.access, "private");
          assert.equal(options.allowOverwrite, false);
          if (uploadFails) throw new Error("Storage failed");
          return {
            pathname: path,
            url: "https://store.private.blob.vercel-storage.com/" + path,
          };
        },
      },
      "./crypto": {
        decryptSecret: (value) => value,
        createStableHash: (value) =>
          crypto.createHash("sha256").update(value).digest("hex"),
      },
      "@/models/AudioSettings": {
        AudioSettings: { findById: async () => settings },
      },
      "@/models/AudioAsset": {
        AudioAsset: {
          findOne: async () => asset,
          async updateOne(filter, update) {
            if (update.$setOnInsert && !asset)
              asset = { ...update.$setOnInsert };
            if (update.$set) Object.assign(asset, update.$set);
            if (update.$unset) delete asset.leaseUntil;
          },
          async findOneAndUpdate(filter, update) {
            if (asset.state === "ready" || asset.leaseUntil) return null;
            Object.assign(asset, update.$set);
            return asset;
          },
        },
      },
    },
    {
      async fetch(url, options) {
        generated++;
        assert.equal(String(url), "https://example.com/v1/audio/speech");
        const body = JSON.parse(options.body);
        assert.equal(body.voice, "alloy");
        assert.equal(body.model, "speech-model");
        return {
          ok: true,
          headers: new Headers({ "content-type": "audio/mpeg" }),
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        };
      },
    },
  );
  return {
    generate: () => generateAudioUrlOnce("Hello!", "english", true),
    stats: () => ({ generated, uploads, asset }),
  };
}
test("audio is uploaded privately and subsequent listens reuse the persisted asset", async () => {
  const app = audioFixture();
  const first = await app.generate();
  assert.match(first, /^\/api\/audio\/[a-f0-9]{64}$/);
  assert.equal(await app.generate(), first);
  assert.equal(app.stats().generated, 1);
  assert.equal(app.stats().uploads, 1);
  assert.equal(app.stats().asset.state, "ready");
});
test("missing storage configuration does not call the paid speech service", async () => {
  const app = audioFixture({ token: "" });
  await assert.rejects(app.generate(), /Configure/);
  assert.equal(app.stats().generated, 0);
});
test("storage failures never produce a fake permanent audio link", async () => {
  const app = audioFixture({ uploadFails: true });
  await assert.rejects(app.generate(), /Storage failed/);
  assert.equal(app.stats().asset.state, "failed");
  assert.equal(app.stats().asset.blobUrl, undefined);
});
test("concurrent speech requests produce only one paid generation", async () => {
  const app = audioFixture();
  const results = await Promise.allSettled([app.generate(), app.generate()]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(app.stats().generated, 1);
});
const constants = load("src/lib/constants.ts");
const dates = load("src/lib/dates.ts");
const defaults = load("src/lib/weekly-defaults.ts", {
  "./constants": constants,
});
const landing = load("src/lib/landing.ts", {
  mongoose: {},
  "./db": {},
  "./dates": dates,
  "./ai/service": {},
  "./weekly-defaults": defaults,
  "@/models/LandingSentence": {},
  "@/models/WeeklyLandingRotation": {},
});
test("weekly rotation follows Monday in Athens across the UTC date boundary", () => {
  assert.equal(
    landing.getCurrentWeekKey(new Date("2026-10-04T20:59:00Z")),
    "2026-09-28",
  );
  assert.equal(
    landing.getCurrentWeekKey(new Date("2026-10-04T21:01:00Z")),
    "2026-10-05",
  );
  assert.notDeepEqual(
    defaults.weeklyDefaults("2026-10-05"),
    defaults.weeklyDefaults("2026-10-12"),
  );
  assert.equal(defaults.weeklyDefaults("2026-10-05").length, 4);
});
test("every static UI translation reference is available in Arabic and Greek only", () => {
  const { dictionary, sourceKeys, UI_LANGUAGES, DEFAULT_UI_LANGUAGE } =
    load("src/lib/i18n.ts");
  const { uiPhrases } = load("src/lib/ui-phrases.ts");
  assert.equal(
    JSON.stringify(UI_LANGUAGES.map((item) => item.value)),
    '["ar","el"]',
  );
  assert.equal(DEFAULT_UI_LANGUAGE, "ar");
  assert.equal(dictionary.en, undefined);
  assert.equal(dictionary.de, undefined);
  const supported = new Set([
    ...Object.keys(dictionary.ar),
    ...Object.keys(sourceKeys),
    ...Object.keys(uiPhrases),
  ]);
  const files = fs
    .readdirSync("src", { recursive: true })
    .filter((path) => path.endsWith(".tsx"));
  for (const path of files) {
    const file = ts.createSourceFile(
      path,
      fs.readFileSync("src/" + path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(file) === "t" &&
        node.arguments.length &&
        ts.isStringLiteral(node.arguments[0])
      )
        assert.ok(
          supported.has(node.arguments[0].text),
          `${path}: ${node.arguments[0].text}`,
        );
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(file) === "k" &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        assert.ok(
          supported.has(node.initializer.text),
          `${path}: ${node.initializer.text}`,
        );
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  for (const language of ["ar", "el"]) {
    for (const key of Object.keys(dictionary.ar))
      assert.ok(dictionary[language][key], `${language}:${key}`);
    for (const [key, translations] of Object.entries(uiPhrases))
      assert.ok(translations[language], `${language}:${key}`);
  }
});
