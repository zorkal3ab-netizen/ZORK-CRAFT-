import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../utils/soundManager';

export const METALLIC_LOGO_SRC = '/assets/aistudio/file_00000000deb881f4abdeb400840e0850_1ec1cc6a.png';
export const CREEPER_FACE_SRC = '/assets/aistudio/1793514136262_2be51030.png';
export const CIRCULAR_MASCOT_SRC = '/assets/aistudio/________25_20261021085710_86e023ca.jpg';

interface PixelCubeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shadowColor: string;
  alpha: number;
  rotation: number;
  vRot: number;
  depth: number;
}

interface EnergySpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
}

export type AnimationStage =
  | 'idle'
  | 'materialization'
  | 'shaking'
  | 'ascending'
  | 'explosion'
  | 'restoration';

/**
 * Pure Circular Hero Mascot
 * STRICT SEPARATION: Purely visual portrait. Tapping it does NOT trigger the Easter Egg.
 */
export const CircularHeroMascot: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-[#FF284A]/60 shadow-[0_0_20px_rgba(255,40,74,0.3)] bg-[#101018]">
        <img
          src={CIRCULAR_MASCOT_SRC}
          alt="ZORK Mascot"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

interface MetallicWordmarkProps {
  className?: string;
  onExplode?: () => void;
}

/**
 * Metallic ZORK Wordmark with Dedicated Double-Tap Interaction Zone
 * 
 * REQUIREMENTS FULFILLED:
 * 1. Activation Area: Generous interaction zone surrounding the metallic logo + transparent padding.
 * 2. Double-Tap Activation: 2 taps anywhere inside the zone within 2 seconds.
 * 3. Center of Viewport: Creeper head materializes in exact viewport center.
 * 4. 5-Stage Cinematic Sequence:
 *    - Stage 1: Materialization (scale 0.6 -> 1.0, fade in, energy pulse, ~550ms)
 *    - Stage 2: Shaking (left/right rotation shake, hissing tension, ~550ms)
 *    - Stage 3: Ascending (smooth upward movement with acceleration & spark aura, ~500ms)
 *    - Stage 4: Cinematic Explosion (breaks apart into 3D green pixel cubes, particles, shockwave, explosion sound; NO FIRE, ~1100ms)
 *    - Stage 5: Disappearance & Restoration (particles dissolve smoothly, elements cleared, cooldown applied, ~500ms)
 */
export const MetallicWordmarkWithEasterEgg: React.FC<MetallicWordmarkProps> = ({
  className = '',
  onExplode,
}) => {
  const [tapCount, setTapCount] = useState(0);
  const [stage, setStage] = useState<AnimationStage>('idle');
  const [screenShake, setScreenShake] = useState(false);

  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  // Handle taps/clicks inside the generous interaction zone
  const handleZoneTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent double firing when touch triggers synthetic click
      if (e.type === 'touchstart') {
        lastTouchTimeRef.current = Date.now();
      } else if (e.type === 'click') {
        if (Date.now() - lastTouchTimeRef.current < 500) {
          return;
        }
      }

      if (stage !== 'idle' || cooldownRef.current) return;

      soundManager.playClick();

      if (tapCount === 0) {
        // First tap: start 2-second detection window
        setTapCount(1);
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
          setTapCount(0);
        }, 2000);
      } else if (tapCount === 1) {
        // Second tap within 2 seconds: activate Easter Egg!
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        setTapCount(0);
        triggerCinematicCreeper();
      }
    },
    [tapCount, stage]
  );

  const triggerCinematicCreeper = () => {
    cooldownRef.current = true;

    // STAGE 1 — MATERIALIZATION (0 - 550ms)
    setStage('materialization');

    // STAGE 2 — SHAKING (550ms - 1100ms)
    setTimeout(() => {
      setStage('shaking');
      soundManager.playHiss();
    }, 550);

    // STAGE 3 — ASCENDING (1100ms - 1650ms)
    setTimeout(() => {
      setStage('ascending');
    }, 1100);

    // STAGE 4 — CINEMATIC EXPLOSION (1650ms - 2750ms)
    setTimeout(() => {
      setStage('explosion');
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);

      soundManager.playExplosion();
      startExplosionPhysics();
      if (onExplode) onExplode();
    }, 1650);

    // STAGE 5 — RESTORATION (2750ms - 3250ms)
    setTimeout(() => {
      setStage('restoration');
    }, 2750);

    // COMPLETE AND RESET TO IDLE (3250ms)
    setTimeout(() => {
      setStage('idle');
      // Cooldown to prevent accidental repeated explosions
      setTimeout(() => {
        cooldownRef.current = false;
      }, 1200);
    }, 3250);
  };

  // High-performance 60fps canvas particle explosion
  const startExplosionPhysics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Center of screen elevated by ~75px (at the peak of the upward ascending movement)
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2 - 75;

    const particles: PixelCubeParticle[] = [];
    const greenShades = [
      { fill: '#35D16F', shadow: '#15803D' },
      { fill: '#24A853', shadow: '#166534' },
      { fill: '#4ADE80', shadow: '#15803D' },
      { fill: '#15803D', shadow: '#052E16' },
      { fill: '#166534', shadow: '#052E16' },
      { fill: '#86EFAC', shadow: '#22C55E' },
      { fill: '#22C55E', shadow: '#166534' },
      { fill: '#14532D', shadow: '#022C22' },
    ];

    // 160 3D Minecraft green pixel cubes
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 5;
      const shade = greenShades[Math.floor(Math.random() * greenShades.length)];
      particles.push({
        x: originX + (Math.random() - 0.5) * 50,
        y: originY + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        size: Math.random() * 16 + 8,
        color: shade.fill,
        shadowColor: shade.shadow,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        depth: Math.random() * 4 + 2,
      });
    }

    // 70 Emerald luminous energy sparks
    const sparks: EnergySpark[] = [];
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 22 + 7;
      sparks.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        alpha: 1,
        color: i % 2 === 0 ? '#4ADE80' : '#8ADFFF',
      });
    }

    // Expanding emerald shockwave rings
    const shockwaves: Shockwave[] = [
      {
        x: originX,
        y: originY,
        radius: 10,
        maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.55,
        alpha: 0.95,
        lineWidth: 7,
      },
      {
        x: originX,
        y: originY,
        radius: 5,
        maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.42,
        alpha: 0.75,
        lineWidth: 3.5,
      },
    ];

    let start = performance.now();
    const render = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render expanding shockwaves
      for (const sw of shockwaves) {
        if (sw.alpha > 0.01) {
          sw.radius += 14;
          sw.alpha *= 0.93;
          sw.lineWidth = Math.max(1, sw.lineWidth * 0.96);

          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(53, 209, 111, ${sw.alpha})`;
          ctx.lineWidth = sw.lineWidth;
          ctx.shadowColor = '#35D16F';
          ctx.shadowBlur = 16;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Render sparks
      for (const sp of sparks) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.alpha -= 0.022;

        if (sp.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, sp.alpha);
          ctx.fillStyle = sp.color;
          ctx.shadowColor = sp.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Render 3D pixel cubes
      let anyCubesAlive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.975; // drag
        p.rotation += p.vRot;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          anyCubesAlive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);

          // 3D Block Depth Shadow Edge
          ctx.fillStyle = p.shadowColor;
          ctx.fillRect(
            -p.size / 2 + p.depth,
            -p.size / 2 + p.depth,
            p.size,
            p.size
          );

          // Main Cube Face
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

          // Minecraft Dark Pixel Border
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

          ctx.restore();
        }
      }

      if ((anyCubesAlive || shockwaves.some((s) => s.alpha > 0.01)) && elapsed < 1600) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <>
      {/* 
        =========================================================================
        1. GENEROUS DEDICATED INTERACTION ZONE
        Includes:
        - The complete metallic ZORK logo.
        - The empty space immediately surrounding the logo.
        - Generous transparent padding (px-6 py-6 sm:px-12 sm:py-8).
        - Activation: Double-tap (2 taps within 2 seconds anywhere in this zone).
        =========================================================================
      */}
      <div
        onClick={handleZoneTap}
        onTouchStart={handleZoneTap}
        className={`relative inline-flex items-center justify-center cursor-pointer select-none group px-6 py-6 sm:px-12 sm:py-8 rounded-3xl transition-all duration-300 ${className}`}
        role="button"
        tabIndex={0}
        aria-label="منطقة شعار ZORK CRAFT المعدني"
        title="ZORK CRAFT (انقر مرتين للتأثير الخاص)"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleZoneTap(e as any);
          }
        }}
      >
        {/* Subtle hover/tap feedback inside the interaction zone */}
        <div
          className={`absolute inset-0 rounded-3xl transition-all duration-300 pointer-events-none ${
            tapCount === 1
              ? 'bg-[#35D16F]/10 border border-[#35D16F]/40 shadow-[0_0_25px_rgba(53,209,111,0.3)]'
              : 'group-hover:bg-white/[0.02] border border-transparent group-hover:border-white/10'
          }`}
        />

        {/* 
          Official Metallic ZORK Wordmark Logo
          Sizing: Mobile ~240–285px, Desktop ~300–360px
          Preserves original letters, metallic textures, and Creeper in O
        */}
        <div className="relative w-[260px] sm:w-[280px] md:w-[330px] lg:w-[350px] aspect-[2/1] transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-[0.98]">
          <img
            src={METALLIC_LOGO_SRC}
            alt="ZORK CRAFT Logo"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* First-Tap Feedback: Discreet green pulse indicator awaiting 2nd tap */}
        {tapCount === 1 && (
          <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#35D16F] shadow-[0_0_12px_#35D16F] animate-ping pointer-events-none" />
        )}
      </div>

      {/* 
        =========================================================================
        2. CINEMATIC CREEPER HEAD IN THE EXACT CENTER OF THE VIEWPORT
        Size:
        - Mobile: ~185–215px
        - Desktop: ~240–265px
        Stages:
        - Materialization (fades & scales into viewport center)
        - Shaking (quick anticipation wiggle)
        - Ascending (moves upward with green aura)
        - Explosion (triggers canvas particle blast, head hides)
        - Restoration (particles clear, website restored)
        =========================================================================
      */}
      {stage !== 'idle' && (
        <div
          className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center transition-transform duration-75 ${
            screenShake ? 'translate-x-1 -translate-y-1' : ''
          }`}
        >
          {/* Subtle Ambient Dimming Scrim behind Creeper */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
              stage === 'restoration' ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Creeper 3D Head Container */}
          {(stage === 'materialization' || stage === 'shaking' || stage === 'ascending') && (
            <div
              className={`relative z-10 w-[190px] h-[190px] sm:w-[215px] sm:h-[215px] md:w-[250px] md:h-[250px] lg:w-[260px] lg:h-[260px] transition-all ${
                stage === 'materialization'
                  ? 'animate-[creeperMaterialize_0.55s_cubic-bezier(0.16,1,0.3,1)_forwards]'
                  : stage === 'shaking'
                  ? 'animate-[creeperShake_0.55s_ease-in-out_infinite]'
                  : stage === 'ascending'
                  ? 'animate-[creeperAscend_0.5s_cubic-bezier(0.4,0,0.2,1)_forwards]'
                  : ''
              }`}
              style={{
                filter:
                  stage === 'ascending'
                    ? 'drop-shadow(0 0 35px #35D16F) drop-shadow(0 0 15px #86EFAC)'
                    : 'drop-shadow(0 0 25px rgba(53,209,111,0.7))',
              }}
            >
              {/* 3D Minecraft Cubic Head Frame */}
              <div className="relative w-full h-full rounded-lg bg-[#270B18] border-4 border-[#101018] shadow-[inset_0_4px_12px_rgba(255,255,255,0.2),inset_0_-8px_16px_rgba(0,0,0,0.7),0_12px_30px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* 3D Cube Top Highlight Strip */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-400/30 pointer-events-none z-10" />

                {/* Original Creeper Face Artwork */}
                <img
                  src={CREEPER_FACE_SRC}
                  alt="Creeper Face"
                  className="w-full h-full object-cover select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle Inner Green Neon Edge Rim */}
                <div className="absolute inset-0 rounded-lg border-2 border-[#35D16F]/40 pointer-events-none" />
              </div>

              {/* Energy Sparks emitting during Stage 3 (Ascending) */}
              {stage === 'ascending' && (
                <>
                  <div className="absolute -top-3 left-1/4 w-2 h-2 rounded-full bg-[#86EFAC] shadow-[0_0_8px_#86EFAC] animate-ping" />
                  <div className="absolute -bottom-2 right-1/4 w-2.5 h-2.5 rounded-full bg-[#35D16F] shadow-[0_0_10px_#35D16F] animate-ping" />
                  <div className="absolute top-1/2 -left-3 w-2 h-2 rounded-full bg-[#8ADFFF] shadow-[0_0_8px_#8ADFFF] animate-ping" />
                </>
              )}
            </div>
          )}

          {/* Fullscreen Canvas for Explosion Particles (Stage 4 & 5) */}
          {(stage === 'explosion' || stage === 'restoration') && (
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          )}
        </div>
      )}
    </>
  );
};
