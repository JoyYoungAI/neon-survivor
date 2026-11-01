import { test } from 'node:test';
import assert from 'node:assert';
import { ControlSettings } from '../src/utils/controls.ts';

test('ControlSettings should default to RELATIVE mode for mobile zero-occlusion', () => {
  assert.strictEqual(ControlSettings.getMode(), 'RELATIVE');
  assert.ok(ControlSettings.getModeName().includes('相對滑動'));
  assert.ok(ControlSettings.getModeDescription().includes('零手指遮擋'));
});

test('ControlSettings cycleMode should cycle RELATIVE -> OFFSET -> DIRECT -> RELATIVE', () => {
  ControlSettings.setMode('RELATIVE');
  assert.strictEqual(ControlSettings.getMode(), 'RELATIVE');

  let next = ControlSettings.cycleMode();
  assert.strictEqual(next, 'OFFSET');
  assert.strictEqual(ControlSettings.getMode(), 'OFFSET');
  assert.ok(ControlSettings.getModeName().includes('上方偏置'));

  next = ControlSettings.cycleMode();
  assert.strictEqual(next, 'DIRECT');
  assert.strictEqual(ControlSettings.getMode(), 'DIRECT');
  assert.ok(ControlSettings.getModeName().includes('直接跟隨'));

  next = ControlSettings.cycleMode();
  assert.strictEqual(next, 'RELATIVE');
  assert.strictEqual(ControlSettings.getMode(), 'RELATIVE');
});

test('ControlSettings listeners should trigger on mode change', () => {
  let receivedMode = '';
  const unsub = ControlSettings.addListener((mode) => {
    receivedMode = mode;
  });

  ControlSettings.setMode('OFFSET');
  assert.strictEqual(receivedMode, 'OFFSET');

  ControlSettings.setMode('RELATIVE');
  assert.strictEqual(receivedMode, 'RELATIVE');

  unsub();
  ControlSettings.setMode('DIRECT');
  // Should not update after unsubscribe
  assert.strictEqual(receivedMode, 'RELATIVE');

  // Reset back to RELATIVE
  ControlSettings.setMode('RELATIVE');
});

test('ControlSettings offset constants are properly calibrated', () => {
  assert.strictEqual(ControlSettings.PORTRAIT_OFFSET_Y, 70);
  assert.strictEqual(ControlSettings.LANDSCAPE_OFFSET_Y, 45);
});
