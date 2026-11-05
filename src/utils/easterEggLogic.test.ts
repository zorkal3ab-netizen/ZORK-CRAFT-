import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EasterEggController,
  computeIsometricCube,
  isPointInZone,
  EASTER_EGG_TIMING,
} from './easterEggLogic';

test('EasterEggController: First tap registers and sets count to 1', () => {
  const controller = new EasterEggController();
  const triggered = controller.handleTap(1000);

  assert.equal(triggered, false);
  assert.equal(controller.getTapCount(), 1);
  assert.equal(controller.getStage(), 'idle');
});

test('EasterEggController: Second tap within 2000ms activates Easter Egg', () => {
  const controller = new EasterEggController();
  controller.handleTap(1000);
  const triggered = controller.handleTap(2500); // 1500ms later <= 2000ms

  assert.equal(triggered, true);
  assert.equal(controller.getTapCount(), 0);
  assert.equal(controller.getStage(), 'materialization');
});

test('EasterEggController: Second tap after 2000ms resets window and starts new count', () => {
  const controller = new EasterEggController();
  controller.handleTap(1000);
  const triggered = controller.handleTap(3500); // 2500ms later > 2000ms

  assert.equal(triggered, false);
  assert.equal(controller.getTapCount(), 1);
  assert.equal(controller.getStage(), 'idle');
});

test('EasterEggController: Taps during active animation or cooldown are rejected', () => {
  const controller = new EasterEggController();
  controller.handleTap(1000);
  controller.handleTap(1500); // Triggered!

  // Active in materialization
  assert.equal(controller.handleTap(1600), false);

  // Transition to restoration then idle
  controller.setStage('restoration');
  controller.setStage('idle', 5000);

  // Still in cooldown
  assert.equal(controller.isCooldown(5500), true);
  assert.equal(controller.handleTap(5500), false);

  // After cooldown expires
  assert.equal(controller.isCooldown(5000 + EASTER_EGG_TIMING.COOLDOWN_MS + 10), false);
  assert.equal(controller.handleTap(5000 + EASTER_EGG_TIMING.COOLDOWN_MS + 10), false); // 1st tap of new cycle
  assert.equal(controller.getTapCount(), 1);
});

test('isPointInZone: Validates coordinates inside generous bounding rectangle', () => {
  const zone = { left: 100, top: 100, right: 400, bottom: 250 };

  // Center of zone
  assert.equal(isPointInZone(250, 175, zone), true);
  // Padding around logo
  assert.equal(isPointInZone(105, 105, zone), true);
  assert.equal(isPointInZone(395, 245, zone), true);
  // Outside zone
  assert.equal(isPointInZone(90, 175, zone), false);
  assert.equal(isPointInZone(410, 175, zone), false);
  assert.equal(isPointInZone(250, 80, zone), false);
  assert.equal(isPointInZone(250, 260, zone), false);
});

test('computeIsometricCube: Generates valid 3D polygon face vertices', () => {
  const cube = computeIsometricCube(200, 300, 20);

  assert.equal(cube.center.x, 200);
  assert.equal(cube.center.y, 300);
  assert.equal(cube.top.length, 4);
  assert.equal(cube.left.length, 4);
  assert.equal(cube.right.length, 4);

  // Top face vertex should be strictly above center
  assert.ok(cube.top[2].y < cube.center.y);
  // Bottom vertex should be strictly below center
  assert.ok(cube.left[3].y > cube.center.y);
});
