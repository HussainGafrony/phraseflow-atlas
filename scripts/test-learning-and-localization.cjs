const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
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
test("only Greek learning is accepted, and public defaults are four fixed Greek sentences", () => {
  const constants = load("src/lib/constants.ts");
  assert.equal(constants.LEARNING_LANGUAGE, "greek");
  assert.equal(constants.SUPPORTED_LANGUAGES.length, 1);
  assert.equal(constants.defaultLandingSentences.length, 4);
  assert.ok(
    constants.defaultLandingSentences.every(
      (item) => item.language === "greek",
    ),
  );
  const { sentenceRequestSchema } = load("src/lib/validators.ts", {
    zod: require("zod"),
    "./constants": constants,
  });
  const input = { topic: "Travel", level: "Beginner", frequency: "common" };
  assert.equal(sentenceRequestSchema.parse(input).language, "greek");
  assert.equal(
    sentenceRequestSchema.safeParse({ ...input, language: "english" }).success,
    false,
  );
  assert.equal(
    sentenceRequestSchema.safeParse({ ...input, language: "german" }).success,
    false,
  );
});
test("landing page reads fixed content without rotating or writing records", async () => {
  let filter;
  let count;
  const saved = [
    { language: "greek", text: "Stored phrase", arabicTranslation: "عبارة" },
  ];
  const landing = load("src/lib/landing.ts", {
    "./constants": load("src/lib/constants.ts"),
    "./db": { dbConnect: async () => {} },
    "@/models/LandingSentence": {
      LandingSentence: {
        find(value) {
          filter = value;
          return {
            sort() {
              return this;
            },
            limit(value) {
              count = value;
              return this;
            },
            lean: async () => saved,
          };
        },
      },
    },
  });
  const result = await landing.getLandingSentencesSafe();
  assert.equal(filter.language, "greek");
  assert.equal(filter.isActive, true);
  assert.equal(filter.activeFromWeek, undefined);
  assert.equal(count, 4);
  assert.equal(result.length, 4);
  assert.equal(result[0].text, "Stored phrase");
});
test("sound uses device speech only and removed services have no routes or storage models", () => {
  const card = fs.readFileSync("src/components/SentenceCard.tsx", "utf8");
  assert.match(card, /speechSynthesis\.speak/);
  assert.doesNotMatch(card, /fetch\(|new Audio\(|audioUrl/);
  for (const path of [
    "src/lib/tts.ts",
    "src/models/AudioAsset.ts",
    "src/models/AudioSettings.ts",
    "src/models/UnlockCode.ts",
    "src/models/WeeklyLandingRotation.ts",
    "src/app/api/audio/[key]/route.ts",
    "src/app/api/sentences/audio/route.ts",
    "src/app/api/unlock/route.ts",
    "src/app/api/cron/weekly/route.ts",
    "vercel.json",
  ])
    assert.equal(fs.existsSync(path), false, path);
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
