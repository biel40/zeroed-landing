/** Floating ember particles drawn on the shared backdrop canvas. Skipped with reduced motion. */
export function startEmbers(canvas: HTMLCanvasElement, reducedMotion: MediaQueryList) {
  const ctx = canvas.getContext('2d');
  if (ctx && !reducedMotion.matches) {
    type Ember = { x: number; y: number; r: number; vy: number; vx: number; life: number; phase: number };
    // One pre-rendered glow sprite keeps each frame to cheap drawImage calls.
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const spriteCtx = sprite.getContext('2d')!;
    const glow = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255, 200, 120, 1)');
    glow.addColorStop(0.3, 'rgba(255, 90, 30, .55)');
    glow.addColorStop(1, 'rgba(160, 20, 10, 0)');
    spriteCtx.fillStyle = glow;
    spriteCtx.fillRect(0, 0, 64, 64);
    let width = 0;
    let height = 0;
    let embers: Ember[] = [];
    const spawn = (initial = false): Ember => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 10,
      r: Math.random() * 1.8 + 0.5,
      vy: Math.random() * 0.6 + 0.25,
      vx: (Math.random() - 0.5) * 0.3,
      life: Math.random() * 0.6 + 0.4,
      phase: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (width * height) / 18000));
      embers = Array.from({ length: count }, () => spawn(true));
    };
    resize();
    window.addEventListener('resize', resize);

    let running = true;
    let t = 0;
    const tick = () => {
      if (!running) return;
      t += 0.016;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        e.y -= e.vy;
        e.x += e.vx + Math.sin(t * 1.3 + e.phase) * 0.35;
        if (e.y < -10) Object.assign(e, spawn());
        const fade = Math.min(1, e.y / height + 0.15) * e.life;
        const flick = 0.65 + Math.sin(t * 8 + e.phase * 3) * 0.35;
        const alpha = Math.max(0, fade * flick);
        const size = e.r * 10;
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, e.x - size / 2, e.y - size / 2, size, size);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) requestAnimationFrame(tick);
    });
  }
}
