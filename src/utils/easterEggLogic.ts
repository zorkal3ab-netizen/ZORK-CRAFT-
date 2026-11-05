export type EasterEggStage =
  | 'idle'
  | 'materialization'
  | 'shaking'
  | 'ascending'
  | 'explosion'
  | 'restoration';

export interface InteractionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const EASTER_EGG_TIMING = {
  WINDOW_MS: 2000,
  STAGE_MATERIALIZE_MS: 350,
  STAGE_SHAKE_MS: 500,
  STAGE_ASCEND_MS: 500,
  STAGE_EXPLODE_MS: 1000,
  STAGE_RESTORE_MS: 750,
  COOLDOWN_MS: 1200,
} as const;

export class EasterEggController {
  private tapCount: number = 0;
  private firstTapTime: number = 0;
  private stage: EasterEggStage = 'idle';
  private cooldownUntil: number = 0;

  public getTapCount(): number {
    return this.tapCount;
  }

  public getStage(): EasterEggStage {
    return this.stage;
  }

  public isCooldown(now: number = Date.now()): boolean {
    return now < this.cooldownUntil;
  }

  /**
   * Registers a tap inside the interaction zone.
   * Returns true if this tap activates the Easter Egg sequence.
   */
  public handleTap(now: number = Date.now()): boolean {
    if (this.stage !== 'idle' || this.isCooldown(now)) {
      return false;
    }

    if (this.tapCount === 0) {
      this.tapCount = 1;
      this.firstTapTime = now;
      return false;
    }

    if (this.tapCount === 1) {
      if (now - this.firstTapTime <= EASTER_EGG_TIMING.WINDOW_MS) {
        // Second tap within 2-second window: TRIGGER!
        this.tapCount = 0;
        this.firstTapTime = 0;
        this.stage = 'materialization';
        return true;
      } else {
        // Window expired; this tap becomes the new first tap
        this.tapCount = 1;
        this.firstTapTime = now;
        return false;
      }
    }

    return false;
  }

  public setStage(stage: EasterEggStage, now: number = Date.now()) {
    this.stage = stage;
    if (stage === 'idle') {
      this.cooldownUntil = now + EASTER_EGG_TIMING.COOLDOWN_MS;
    }
  }

  public reset() {
    this.tapCount = 0;
    this.firstTapTime = 0;
    this.stage = 'idle';
    this.cooldownUntil = 0;
  }
}

/**
 * Validates if coordinates land inside the expanded interaction zone.
 */
export function isPointInZone(x: number, y: number, rect: InteractionRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Calculates 3D isometric cube vertices for rendering on 2D canvas.
 * (3 faces: Top, Left, Right with isometric shading)
 */
export interface IsometricCubeVertices {
  center: { x: number; y: number };
  top: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
  left: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
  right: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
}

export function computeIsometricCube(cx: number, cy: number, size: number): IsometricCubeVertices {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  const dx = size * cos30;
  const dy = size * sin30;
  const h = size;

  // Center point: (cx, cy)
  // Top face vertices
  const pTop = { x: cx, y: cy - h };
  const pRightTop = { x: cx + dx, y: cy - dy };
  const pCenter = { x: cx, y: cy };
  const pLeftTop = { x: cx - dx, y: cy - dy };

  // Bottom vertices
  const pBottom = { x: cx, y: cy + h };
  const pLeftBottom = { x: cx - dx, y: cy + dy };
  const pRightBottom = { x: cx + dx, y: cy + dy };

  return {
    center: { x: cx, y: cy },
    top: [pCenter, pRightTop, pTop, pLeftTop],
    left: [pCenter, pLeftTop, pLeftBottom, pBottom],
    right: [pCenter, pRightTop, pRightBottom, pBottom],
  };
}
