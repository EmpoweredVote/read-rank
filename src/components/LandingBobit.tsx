import { useEffect, useRef, useState } from 'react';
import '../vendor/leremy-rig.js';
import type { LeremyRigApi, RigPose } from '../vendor/leremy-rig.js';

/** "How it works" on the landing page: an animated Bobit (Empowered Vote's
 *  Leremy rig) walks through the three steps on his own, a logo color per step.
 *  Hover pauses the timer; a click makes him hop to the next step. The figure
 *  is decorative: screen readers get the steps as a plain ordered list. Ported from the UX redesign prototype (#141, landing.html). */

export interface BobitStep { title: string; text: string }

interface StepMotion {
  x: number;
  /** CSS custom property holding this step's color. */
  color: string;
  pose: (A: LeremyRigApi['ANIMATIONS'], t: number) => RigPose;
  book?: string;
  board?: boolean;
}

function wave(t: number, hz: number) { return Math.sin(t * hz * Math.PI * 2); }

const MOTION: StepMotion[] = [
  { x: 0.3, color: '--text-link', pose: (A, t) => A.greet.frame(t) },
  {
    x: 0.62, color: '--color-ev-yellow', book: '--text-link',
    pose: (A, t) => {
      const p = A.present.frame(t), r = A.read.frame(t);
      return { ...p, lean: 2, hunch: -10, headTilt: r.headTilt, bob: r.bob,
        armRU: r.armRU, armRF: r.armRF, armLU: r.armLU, armLF: r.armLF };
    },
  },
  {
    x: 0.36, color: '--color-ev-coral', board: true,
    // Ranking board held out to the side at shoulder height.
    pose: (A, t) => ({ ...A.present.frame(t),
      armRU: 62 + wave(t, 0.6) * 3, armRF: 150 + wave(t, 0.6) * 4,
      headTilt: -12 + wave(t, 0.3) * 3, bob: 1 + wave(t, 0.9) * 1.5 }),
  },
];

const HOLD = 3.5, SPEED = 130, HOP = 0.38; // seconds on each step, walking speed (px/s), hop length (s)

export function LandingBobit({ steps }: { steps: BobitStep[] }) {
  const figureRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [swapKey, setSwapKey] = useState(0);

  useEffect(() => {
    const LR = window.LeremyRig;
    const figure = figureRef.current, stage = stageRef.current, canvas = canvasRef.current, bubble = bubbleRef.current;
    if (!LR || !figure || !stage || !canvas || !bubble) return;
    const A = LR.ANIMATIONS;
    const CFG = { ...LR.CFG, R: 28, torsoW: 21, neckW: 19, armW: 10.5, legW: 12.5 }; // a slightly thinner Bobit
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    let cur = 0, phase: 'pose' | 'walk' = 'pose', clock = 0, held = 0, hop = 9;
    let x: number | null = null, fromX = 0, toX = 0, dur = 1, face = 1;
    let paused = false, pointerX: number | null = null, visible = true, raf = 0, last = 0;

    // A step's color, read from the page's tokens so dark mode follows.
    const tone = (name: string) => getComputedStyle(canvas).getPropertyValue(name).trim() || '#00657C';
    const show = (i: number) => { setStep(i); setSwapKey((k) => k + 1); };

    function next(w: number) {
      cur = (cur + 1) % MOTION.length;
      show(cur);
      fromX = x ?? 0; toX = MOTION[cur].x * w;
      face = toX >= fromX ? 1 : -1;
      dur = Math.max(0.5, Math.abs(toX - fromX) / SPEED);
      phase = still.matches ? 'pose' : 'walk';
      if (still.matches) x = toX;
      clock = 0; held = 0;
    }

    // The open book, outlined in its own color so it stands out on a yellow Bobit.
    function drawBook(ctx: CanvasRenderingContext2D, bx: number, by: number, color: string) {
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(-0.24);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -2); ctx.lineTo(-21, -12); ctx.lineTo(-21, 4); ctx.lineTo(0, 13); ctx.closePath();
      ctx.moveTo(0, -2); ctx.lineTo(27, -9); ctx.lineTo(27, 8); ctx.lineTo(0, 13); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // The ranking board: three rows slide into order, then the top row lights up.
    function drawBoard(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, t: number) {
      const bw = 74 * s, bh = 82 * s, r = 9 * s;
      ctx.save();
      ctx.translate(cx - bw / 2, cy - bh / 2);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = color; ctx.lineWidth = 3.5 * s;
      ctx.beginPath(); ctx.roundRect(0, 0, bw, bh, r); ctx.fill(); ctx.stroke();
      const cyc = t % 4;
      let k = Math.min(1, Math.max(0, (cyc - 0.8) / 0.7)); // 0 = shuffled, 1 = ranked
      k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const widths = [1, 0.72, 0.46], shuffled = [1, 2, 0]; // bar i sits in row shuffled[i] before ranking
      const row = (n: number) => 13 * s + n * 23 * s;
      for (let n = 0; n < 3; n++) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(14 * s, row(n) + 6 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = `800 ${9 * s}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(n + 1), 14 * s, row(n) + 6.5 * s);
      }
      for (let i = 0; i < 3; i++) {
        const y = row(shuffled[i]) + (row(i) - row(shuffled[i])) * k;
        const top = i === 0 && k >= 1 && cyc > 1.6;
        ctx.fillStyle = top ? tone('--color-ev-yellow') : 'rgba(122, 125, 146, .45)';
        ctx.beginPath(); ctx.roundRect(27 * s, y + 2 * s, 38 * s * widths[i], 8 * s, 4 * s); ctx.fill();
      }
      ctx.restore();
    }

    function draw(w: number, h: number, pose: RigPose, color: string, board: boolean, book: string | undefined) {
      const LRx = LR!;
      const px = x ?? 0;
      const dpr = window.devicePixelRatio || 1;
      if (canvas!.width !== Math.round(w * dpr) || canvas!.height !== Math.round(h * dpr)) {
        canvas!.width = Math.round(w * dpr); canvas!.height = Math.round(h * dpr);
      }
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const s = (h - 14) / 270, ground = h - 8;
      const lift = hop < HOP ? Math.sin(hop / HOP * Math.PI) * 22 : 0;
      LRx.drawShadow(ctx, px, ground, 34 * s * 2 * (1 - lift / 60), 'rgba(120, 125, 146, .18)');
      const j = LRx.computePose(pose, CFG, { x: 0, y: 0 });
      const ox = px, oy = ground - 112 * s - lift;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(face * s, s);
      LRx.draw(ctx, j, CFG, { color });
      if (book) drawBook(ctx, (j.hR.x + j.hL.x) / 2, (j.hR.y + j.hL.y) / 2, tone(book));
      ctx.restore();
      if (board) drawBoard(ctx, ox + face * (j.hR.x + 26) * s, oy + j.hR.y * s - 30 * s, s, color, clock);
      bubble!.style.setProperty('--tail', `${Math.min(88, Math.max(12, px / w * 100))}%`);
    }

    function frame(now: number) {
      raf = 0;
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      if (!w || !visible || document.hidden) return; // off screen: stop until shown again
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (x === null) x = MOTION[cur].x * w;
      clock += dt; hop += dt;
      if (!paused && phase === 'pose') held += dt;
      const m = MOTION[cur];
      let pose: RigPose, board = false;
      if (phase === 'walk') {
        const k = Math.min(1, clock / dur);
        x = fromX + (toX - fromX) * k;
        pose = A.stroll.frame(clock);
        if (k >= 1) { phase = 'pose'; clock = 0; held = 0; }
      } else {
        if (paused && pointerX !== null && Math.abs(pointerX - x) > 24) face = pointerX > x ? 1 : -1;
        pose = m.pose(A, still.matches ? 1.2 : clock);
        board = !!m.board;
        if (held >= HOLD) next(w);
      }
      bubble!.style.setProperty('--progress', phase === 'pose' ? Math.min(1, held / HOLD).toFixed(3) : '0');
      draw(w, h, pose, tone(m.color), board, phase === 'pose' ? m.book : undefined);
      start();
    }
    function start() { if (!raf) { if (!last) last = performance.now(); raf = requestAnimationFrame(frame); } }
    function restart() { last = performance.now(); start(); }

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; pointerX = null; };
    const onMove = (e: PointerEvent) => { pointerX = e.clientX - canvas.getBoundingClientRect().left; };
    // Every click counts: mid-walk he finishes the walk at once, then moves on.
    const onClick = () => {
      if (x === null) return;
      if (phase === 'walk') { x = toX; phase = 'pose'; }
      hop = still.matches ? HOP : 0;
      next(canvas.clientWidth);
      restart();
    };
    figure.addEventListener('pointerenter', onEnter);
    figure.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', restart);
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) restart(); });
      io.observe(canvas);
    }
    restart();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      figure.removeEventListener('pointerenter', onEnter);
      figure.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', restart);
    };
  }, []);

  const s = steps[step] ?? steps[0];
  return (
    <figure ref={figureRef} className="rr-bobit">
      {/* Screen readers get the three steps as a plain list; the animation is decorative. */}
      <ol className="sr-only" aria-label="How it works">
        {steps.map((st) => <li key={st.title}>{st.title}. {st.text}</li>)}
      </ol>
      <div ref={bubbleRef} className="rr-bobit__bubble" aria-hidden="true"
        style={{ ['--step-color' as string]: `var(${MOTION[step]?.color ?? '--text-link'})` }}>
        <div key={swapKey} className="rr-bobit__swap">
          <span className="rr-bobit__step">Step {step + 1} of {steps.length}</span>
          <h3 className="rr-bobit__title">{s.title}</h3>
          <p className="rr-bobit__text">{s.text}</p>
        </div>
        <span className="rr-bobit__bar" aria-hidden="true"><i /></span>
      </div>
      <button ref={stageRef} className="rr-bobit__stage" type="button" tabIndex={-1} aria-hidden="true">
        <canvas ref={canvasRef} aria-hidden="true" />
      </button>
    </figure>
  );
}
