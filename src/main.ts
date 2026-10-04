import './style.css';

const root = document.documentElement;
const body = document.body;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

// Rough-edged filter shared by every tally mark so they look painted, not vector-perfect.
body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
  <filter id="blood-goo" x="-10%" y="-20%" width="120%" height="200%" color-interpolation-filters="sRGB">
    <feGaussianBlur id="goo-blur" in="SourceGraphic" stdDeviation="3" result="blur"/>
    <feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -7" result="goo"/>
    <feComposite in="SourceGraphic" in2="goo" operator="atop" result="body"/>
    <feGaussianBlur id="goo-soft" in="goo" stdDeviation="2.5" result="soft"/>
    <feSpecularLighting in="soft" surfaceScale="5" specularConstant="1" specularExponent="24" lighting-color="#ffc2c2" result="spec"><feDistantLight azimuth="225" elevation="32"/></feSpecularLighting>
    <feComposite in="spec" in2="goo" operator="in" result="gloss"/>
    <feComposite in="gloss" in2="body" operator="arithmetic" k2=".5" k3="1"/>
  </filter></svg>`);
// The goo blur is in px, so it follows the title size or small screens melt the letters into a blob.
const bloodWord = document.querySelector<HTMLElement>('.blood');
const gooBlur = document.getElementById('goo-blur');
const gooSoft = document.getElementById('goo-soft');
function syncGoo() {
  if (!bloodWord) return;
  const size = parseFloat(getComputedStyle(bloodWord).fontSize);
  gooBlur?.setAttribute('stdDeviation', (size * .023).toFixed(2));
  gooSoft?.setAttribute('stdDeviation', (size * .019).toFixed(2));
}
syncGoo();
window.addEventListener('resize', syncGoo, { passive: true });

/* ───────── Boot sequence ───────── */
const glitch = document.querySelector<HTMLElement>('.wordmark .glitch');
function triggerGlitch() {
  if (!glitch) return;
  glitch.classList.remove('go');
  void glitch.offsetWidth;
  glitch.classList.add('go');
}
const bootDelay = reducedMotion.matches ? 0 : 1250;
// The entry gate resolves this on the visitor's first click; everything timed from the boot waits for it.
let enter!: () => void;
const entered = new Promise<void>((resolve) => { enter = resolve; });
function afterEntry(fn: () => void, delay: number) {
  void entered.then(() => window.setTimeout(fn, delay));
}
afterEntry(() => {
  body.classList.remove('is-booting');
  body.classList.add('is-ready');
  triggerGlitch();
  window.setTimeout(() => body.classList.add('is-dripping'), reducedMotion.matches ? 0 : 1300);
}, bootDelay);

/* ───────── Tally marks (round counter) ───────── */
const SVG_NS = 'http://www.w3.org/2000/svg';
function wobble(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x) - 0.5;
}
function tallyPath(index: number) {
  if (index === 4) return `M4 ${58 + wobble(9) * 6} Q60 ${42 + wobble(3) * 8} 114 ${18 + wobble(5) * 6}`;
  const x = 16 + index * 24;
  return `M${x + wobble(index) * 4} 8 Q${x + wobble(index + 4) * 8} 40 ${x + wobble(index + 8) * 5} 72`;
}
function renderTally(svg: SVGSVGElement, count: number, animateFrom = count) {
  svg.replaceChildren();
  for (let i = 0; i < Math.min(count, 5); i++) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', tallyPath(i));
    path.setAttribute('pathLength', '1');
    if (i >= animateFrom) {
      path.classList.add('mark');
      path.style.setProperty('--d', `${(i - animateFrom) * 0.18}s`);
    }
    svg.append(path);
  }
}

const hudTally = document.querySelector<SVGSVGElement>('#round-tally')!;
const roundFlash = document.querySelector<HTMLElement>('.round-flash')!;
let round = 0;
function setRound(next: number) {
  if (next <= round) return;
  const previous = round;
  round = next;
  renderTally(hudTally, round, previous);
  if (previous > 0 && !reducedMotion.matches) {
    roundFlash.classList.remove('go');
    void roundFlash.offsetWidth;
    roundFlash.classList.add('go');
    triggerGlitch();
  }
}
afterEntry(() => setRound(1), bootDelay + 300);

// Step tallies count 1, 2, 3 and draw themselves when revealed.
document.querySelectorAll<SVGSVGElement>('.step-tally .tally').forEach((svg, i) => {
  svg.dataset['count'] = String(i + 1);
});

/* ───────── Scroll reveals & round progression ───────── */
const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const el = entry.target as HTMLElement;
    el.classList.add('in');
    const tally = el.querySelector<SVGSVGElement>('.step-tally .tally');
    if (tally) window.setTimeout(() => renderTally(tally, Number(tally.dataset['count']), 0), 300 + (parseInt(el.style.getPropertyValue('--d')) || 0));
    revealObserver.unobserve(el);
  }
}, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

const roundObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting && body.classList.contains('is-ready')) setRound(Number((entry.target as HTMLElement).dataset['round']));
  }
}, { threshold: 0.35 });
afterEntry(() => {
  document.querySelectorAll('[data-round]').forEach((el) => roundObserver.observe(el));
}, bootDelay + 400);

/* ───────── Points (+10 on every hit, like the old days) ───────── */
const pointsLayer = document.getElementById('points-layer')!;
function addPoints(amount: number, x: number, y: number, big = false) {
  if (reducedMotion.matches) return;
  const pop = document.createElement('span');
  pop.className = big ? 'pop big' : 'pop';
  pop.textContent = `+${amount}`;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  pop.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 60)}px`);
  pointsLayer.append(pop);
  pop.addEventListener('animationend', () => pop.remove());
}
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('input, label, #beta-form, footer')) return;
  const bonus = target.closest<HTMLElement>('[data-points]');
  addPoints(bonus ? Number(bonus.dataset['points']) : 10, event.clientX, event.clientY);
});

/* ───────── Flashlight & card tilt ───────── */
const finePointer = window.matchMedia('(pointer: fine)');
if (finePointer.matches && !reducedMotion.matches) {
  let frame = 0;
  let mx = 0;
  let my = 0;
  window.addEventListener('pointermove', (event) => {
    mx = event.clientX;
    my = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      root.style.setProperty('--mx', `${mx}px`);
      root.style.setProperty('--my', `${my}px`);
      frame = 0;
    });
  }, { passive: true });
  afterEntry(() => body.classList.add('has-pointer'), bootDelay + 800);

  document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--cx', `${px * 100}%`);
      card.style.setProperty('--cy', `${py * 100}%`);
      card.style.transform = `perspective(800px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ───────── Embers ───────── */
const canvas = document.querySelector<HTMLCanvasElement>('#embers')!;
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

/* ───────── Beta signup ───────── */
const form = document.querySelector<HTMLFormElement>('#beta-form')!;
const signup = document.querySelector<HTMLElement>('.signup')!;
const status = document.getElementById('form-status')!;
const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
const submitLabel = submit.querySelector<HTMLElement>('.cta-label')!;
const defaultLabel = submitLabel.textContent;
let pending = false;
function setStatus(message: string, error = false) {
  status.textContent = message;
  status.classList.toggle('err', error);
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  const fields = new FormData(form);
  pending = true;
  submit.disabled = true;
  submitLabel.textContent = 'ENVIANDO…';
  setStatus('Enviando tu solicitud…');
  void (async () => {
    try {
      const response = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ email: fields.get('email'), consent: fields.get('consent') === 'on', website: fields.get('website') }),
      });
      if (!response.ok) {
        setStatus(response.status === 503
          ? 'Las inscripciones todavía no están abiertas. Vuelve pronto.'
          : 'No hemos podido enviar tu solicitud. Inténtalo de nuevo en unos minutos.', true);
        return;
      }
      const result: { ok?: boolean } = await response.json();
      if (result.ok !== true) throw new Error('Unexpected signup response');
      form.reset();
      setStatus('¡Solicitud enviada! Te avisaremos por email si eres seleccionado.');
      const rect = submit.getBoundingClientRect();
      addPoints(1000, rect.left + rect.width / 2, rect.top, true);
      setRound(5);
      signup.classList.remove('success');
      void signup.offsetWidth;
      signup.classList.add('success');
    } catch {
      setStatus('No hemos podido confirmar el envío. Comprueba tu conexión e inténtalo de nuevo en unos minutos.', true);
    } finally {
      pending = false;
      submit.disabled = false;
      submitLabel.textContent = defaultLabel;
    }
  })();
});

/* ───────── Optional gameplay background ───────── */
const posterUrl = import.meta.env['VITE_BETA_POSTER_URL']?.trim();
const videoUrl = import.meta.env['VITE_BETA_VIDEO_URL']?.trim();
const poster = document.querySelector<HTMLImageElement>('#background-poster')!;
const video = document.querySelector<HTMLVideoElement>('#background-video')!;
const toggle = document.querySelector<HTMLButtonElement>('#video-toggle')!;
if (posterUrl) {
  poster.src = posterUrl;
  poster.addEventListener('load', () => { poster.hidden = false; });
  video.poster = posterUrl;
}

const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
// Keep the still image on reduced-motion and data-saving devices.
if (videoUrl && !reducedMotion.matches && !connection?.saveData) {
  video.src = videoUrl;
  video.muted = true;
  video.addEventListener('playing', () => {
    video.hidden = false;
    toggle.hidden = false;
    toggle.textContent = 'Pausar fondo';
  });
  video.addEventListener('pause', () => { toggle.textContent = 'Reproducir fondo'; });
  video.addEventListener('error', () => { video.hidden = true; toggle.hidden = true; });
  toggle.addEventListener('click', () => {
    if (video.paused) void video.play().catch(() => { /* Retain the still background. */ });
    else video.pause();
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) video.pause(); });
  // Autoplay can be blocked by the Instagram browser; the poster remains visible.
  void video.play().catch(() => { toggle.hidden = false; toggle.textContent = 'Reproducir fondo'; });
}

/* ───────── Background music ───────── */
// Music is on by default. Browsers block audio with sound until the visitor interacts, so if the
// immediate attempt is refused it starts on the first gesture. The choice is remembered across visits.
// The icon always mirrors what the audio element is really doing, never just the stored preference.
const music = document.querySelector<HTMLAudioElement>('#bg-music')!;
const musicToggle = document.querySelector<HTMLButtonElement>('#music-toggle')!;
const MUSIC_KEY = 'zeroed-music-v2';
const MUSIC_VOLUME = 0.35;
let musicWanted = true;
try { musicWanted = localStorage.getItem(MUSIC_KEY) !== 'off'; } catch { /* Storage can be blocked. */ }
let musicFade = 0;

function fadeMusic(target: number, onDone?: () => void) {
  window.clearInterval(musicFade);
  musicFade = window.setInterval(() => {
    const before = music.volume;
    const step = (target - before) / 6;
    music.volume = Math.abs(step) < 0.01 ? target : Math.min(1, Math.max(0, before + step));
    // iOS ignores volume changes from script, so finish at once instead of fading forever.
    if (music.volume === target || music.volume === before) { window.clearInterval(musicFade); onDone?.(); }
  }, 60);
}
function musicIsOn() { return musicWanted && !music.paused; }
function renderMusic() {
  const on = musicIsOn();
  musicToggle.setAttribute('aria-pressed', String(on));
  musicToggle.setAttribute('aria-label', on ? 'Silenciar música de fondo' : 'Activar música de fondo');
}
function playMusic() {
  if (music.paused) music.volume = 0;
  return music.play().then(() => { fadeMusic(MUSIC_VOLUME); renderMusic(); }).catch(() => renderMusic());
}
function stopMusic() {
  fadeMusic(0, () => { music.pause(); renderMusic(); });
}
function rememberMusic(on: boolean) {
  musicWanted = on;
  renderMusic();
  try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch { /* Ignore. */ }
}

music.addEventListener('error', () => { musicToggle.hidden = true; });
['play', 'playing', 'pause', 'ended', 'emptied'].forEach((name) => music.addEventListener(name, renderMusic));
musicToggle.hidden = false;
renderMusic();
musicToggle.addEventListener('click', () => {
  if (musicIsOn()) { rememberMusic(false); stopMusic(); return; }
  rememberMusic(true);
  void playMusic();
});
if (musicWanted) {
  // Try to start immediately; if the browser blocks it, the first accepted gesture starts it instead.
  void playMusic();
  const gestures = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchend'] as const;
  const unlock = (event: Event) => {
    // The toggle's own click handler deals with gestures on it.
    if (event.target instanceof Node && musicToggle.contains(event.target)) return;
    if (!musicWanted) { gestures.forEach((name) => window.removeEventListener(name, unlock)); return; }
    if (!music.paused) return;
    // Keep listening until playback really starts: not every event counts as a gesture for the browser.
    void playMusic().then(() => {
      if (!music.paused) gestures.forEach((name) => window.removeEventListener(name, unlock));
    });
  };
  gestures.forEach((name) => window.addEventListener(name, unlock));
}

/* ───────── Entry gate ───────── */
// The click on the gate is the gesture that lets the music start with sound. Visitors who muted it
// from the header toggle skip the gate, since there is nothing to unlock.
const gate = document.getElementById('gate')!;
const gateEnter = document.getElementById('gate-enter')!;
const behindGate = document.querySelectorAll<HTMLElement>('.header, main, footer');
function openGate() {
  behindGate.forEach((el) => { el.inert = false; });
  body.classList.remove('is-gated');
  enter();
}
if (musicWanted) {
  behindGate.forEach((el) => { el.inert = true; });
  gateEnter.focus({ preventScroll: true });
  gateEnter.addEventListener('click', () => {
    rememberMusic(true);
    void playMusic();
    openGate();
  });
} else {
  gate.hidden = true;
  openGate();
}
// Don't keep playing in a background tab.
let resumeMusic = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resumeMusic = !music.paused;
    music.pause();
  } else if (resumeMusic) {
    resumeMusic = false;
    void playMusic();
  }
});
