// Regression tests for allowance accounting. Database boundaries are mocked;
// deployment verification must also exercise MongoDB Atlas transactions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ total = 0, unlocked = false, generationFails = false, deliveryFails = false, generatedCount = 9 } = {}) {
  let usage = { _id: 'usage', totalDelivered: total, batchesDelivered: 0, unlocked };
  let delivered = [];
  let records = [];
  let sequence = 0;
  let transactionQueue = Promise.resolve();
  const query = (rows) => ({ select() { return this; }, async lean() { return rows; } });
  const mocks = {
    mongoose: {
      Types: { ObjectId: class { constructor(id) { this.id = id; } } },
      async startSession() {
        return {
          async endSession() {},
          async withTransaction(work) {
            const previous = transactionQueue;
            let release;
            transactionQueue = new Promise((resolve) => { release = resolve; });
            await previous;
            const before = { ...usage };
            const deliveriesBefore = [...delivered];
            try { await work(); }
            catch (error) { usage = before; delivered = deliveriesBefore; throw error; }
            finally { release(); }
          }
        };
      }
    },
    './constants': { DAILY_BATCH_SIZE: 5, DAILY_SENTENCE_LIMIT: 20, UNLOCK_AFTER_SENTENCES: 10 },
    './crypto': { createStableHash: (value) => value },
    './dates': { getDayKey: () => '2026-10-08' },
    './tts': { generateAudioUrlOnce: async () => '' },
    './ai/service': { async generateSentences() {
      if (generationFails) throw new Error('Provider failed');
      const run = sequence++;
      return Array.from({ length: generatedCount }, (_, i) => ({ text: `Sentence ${run}-${i}`, arabicTranslation: 'ترجمة', sourceProvider: 'test' }));
    } },
    '@/models/DailyUsage': { DailyUsage: {
      async findOneAndUpdate(filter, update) {
        if (update.$setOnInsert) return { ...usage };
        if (filter.totalDelivered !== usage.totalDelivered || filter.unlocked !== usage.unlocked) return null;
        usage.totalDelivered += update.$inc.totalDelivered;
        usage.batchesDelivered += update.$inc.batchesDelivered;
        return { ...usage };
      }
    } },
    '@/models/SentenceDelivery': { SentenceDelivery: {
      find: () => query(delivered),
      async insertMany(items) {
        if (deliveryFails) throw new Error('Delivery write failed');
        delivered.push(...items);
      }
    } },
    '@/models/Sentence': { Sentence: {
      find: () => query(records.filter((record) => delivered.some((delivery) => delivery.sentenceId === record._id))),
      async findOne({ hash }) { return records.find((record) => record.hash === hash); },
      async create(value) { const record = { ...value, _id: `sentence-${records.length}` }; records.push(record); return record; }
    } }
  };
  const code = ts.transpileModule(fs.readFileSync('src/lib/sentences.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } });
  const criteria = { language: 'english', topic: 'Travel', level: 'A1', frequency: 'common' };
  return {
    request: () => exports.getTodaySentencesForUser('user', criteria),
    unlock: () => { usage.unlocked = true; },
    usage: () => usage,
    delivered: () => delivered
  };
}

test('two batches, unlock, two batches, then a hard daily limit', async () => {
  const app = fixture();
  assert.equal((await app.request()).sentences.length, 5);
  assert.equal((await app.request()).needsUnlock, true);
  assert.equal((await app.request()).status, 'unlock-required');
  app.unlock();
  assert.equal((await app.request()).remaining, 5);
  assert.equal((await app.request()).remaining, 0);
  assert.equal((await app.request()).status, 'limit-reached');
  assert.equal(app.delivered().length, 20);
});

test('generation failure never consumes the allowance', async () => {
  const app = fixture({ generationFails: true });
  await assert.rejects(app.request(), /Provider failed/);
  assert.equal(app.usage().totalDelivered, 0);
});

test('delivery failure rolls back the allowance and delivery records', async () => {
  const app = fixture({ deliveryFails: true });
  await assert.rejects(app.request(), /Delivery write failed/);
  assert.equal(app.usage().totalDelivered, 0);
  assert.equal(app.delivered().length, 0);
});

test('simultaneous requests cannot cross the locked ten-sentence boundary', async () => {
  const app = fixture({ total: 5 });
  const results = await Promise.all([app.request(), app.request()]);
  assert.equal(results.filter((result) => result.status === 'ok').length, 1);
  assert.equal(results.filter((result) => result.status === 'retry').length, 1);
  assert.equal(app.usage().totalDelivered, 10);
  assert.equal(app.delivered().length, 5);
});

test('an incomplete batch is not delivered or charged', async () => {
  const app = fixture({ generatedCount: 3 });
  assert.equal((await app.request()).status, 'empty');
  assert.equal(app.usage().totalDelivered, 0);
  assert.equal(app.delivered().length, 0);
});

test('simultaneous requests cannot exceed the final daily allowance', async () => {
  const app = fixture({ total: 15, unlocked: true });
  const results = await Promise.all([app.request(), app.request()]);
  assert.equal(results.filter((result) => result.status === 'ok').length, 1);
  assert.equal(app.usage().totalDelivered, 20);
  assert.equal(app.delivered().length, 5);
});
