import { test } from 'node:test';
import assert from 'node:assert';
import { onRequestGet, onRequestPost } from '../functions/api/leaderboard.ts';

test('Leaderboard API GET should return top scores', async () => {
  const context = {
    request: new Request('http://localhost/api/leaderboard'),
    env: {},
    params: {},
    waitUntil: () => {},
    next: async () => new Response(),
    data: {},
  };

  const res = await onRequestGet(context);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.strictEqual(data[0].rank, 1);
});

test('Leaderboard API POST should insert score and keep top 10 sorted', async () => {
  const context = {
    request: new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ProGamer', score: 99999 }),
    }),
    env: {},
    params: {},
    waitUntil: () => {},
    next: async () => new Response(),
    data: {},
  };

  const res = await onRequestPost(context);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  assert.strictEqual(data[0].name, 'ProGamer');
  assert.strictEqual(data[0].score, 99999);
  assert.strictEqual(data[0].rank, 1);
});

test('Leaderboard API POST should sanitize invalid inputs', async () => {
  const context = {
    request: new Request('http://localhost/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ExtremelyLongNameThatShouldBeTruncated   ', score: -50 }),
    }),
    env: {},
    params: {},
    waitUntil: () => {},
    next: async () => new Response(),
    data: {},
  };

  const res = await onRequestPost(context);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  const added = data.find((d) => d.name.startsWith('ExtremelyLongNam'));
  assert.ok(added);
  assert.strictEqual(added.name.length <= 16, true);
  assert.strictEqual(added.score, 0); // Negative score normalized to 0
});
