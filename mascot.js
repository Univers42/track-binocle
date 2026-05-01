const anchor = document.querySelector('#mascot-anchor');
const reduceMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

const mascot = document.createElement('button');
mascot.className = 'binocle';
mascot.type = 'button';
mascot.dataset.mood = 'curious';
mascot.setAttribute('aria-label', 'Open the Prismatica mascot portal');
mascot.innerHTML = `
  <svg class="binocle__svg" viewBox="0 0 184 118" role="img" aria-labelledby="binocle-title binocle-desc">
    <title id="binocle-title">Prismatica mascot</title>
    <desc id="binocle-desc">Living binocular mascot with tracking pupils, expressive brows and an animated mouth.</desc>
    <defs>
      <filter id="handDrawn" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence id="mascotTurbulence" baseFrequency="0.028 0.07" numOctaves="3" seed="14" type="fractalNoise" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
      </filter>
    </defs>
    <g class="svg-body-group" filter="url(#handDrawn) url(#pencil-texture)">
      <path class="svg-arm left" d="M49 31 C39 18, 25 18, 19 32" />
      <path class="svg-arm right" d="M135 31 C147 18, 161 19, 166 33" />
      <g class="svg-volume">
        <path class="svg-shell left" d="M15 34 C26 20, 51 16, 69 27 C80 34, 87 48, 86 62 C85 78, 73 90, 55 94 C34 98, 14 90, 7 75 C1 61, 4 45, 15 34Z" />
        <path class="svg-shell right" d="M115 27 C134 16, 158 20, 169 34 C180 49, 183 65, 177 78 C170 92, 150 98, 129 94 C111 90, 99 78, 98 62 C97 48, 104 34, 115 27Z" />
        <ellipse class="svg-back" cx="51" cy="61" rx="39" ry="34" />
        <ellipse class="svg-back" cx="145" cy="61" rx="39" ry="34" />
      </g>
      <path class="svg-barrel left" d="M20 39 C29 28, 47 25, 62 32 C50 29, 33 32, 24 43 C16 54, 16 67, 24 77 C12 69, 9 51, 20 39Z" />
      <path class="svg-barrel right" d="M122 32 C136 25, 154 28, 164 39 C175 51, 172 69, 160 77 C168 67, 168 54, 160 43 C151 32, 134 29, 122 32Z" />
      <ellipse class="svg-frame left-frame" cx="43" cy="57" rx="39" ry="34" />
      <ellipse class="svg-frame right-frame" cx="141" cy="57" rx="39" ry="34" />
      <ellipse class="svg-inner-rim" cx="43" cy="57" rx="28" ry="24" />
      <ellipse class="svg-inner-rim" cx="141" cy="57" rx="28" ry="24" />
      <ellipse class="svg-rim" cx="38" cy="53" rx="24" ry="20" />
      <ellipse class="svg-rim" cx="136" cy="53" rx="24" ry="20" />
      <path class="svg-center-band" d="M84 53 C88 48, 96 48, 100 53" />
      <path class="svg-center-band" d="M86 67 C90 71, 95 71, 99 67" />
      <path class="svg-bridge-shadow" d="M99 62 C103 54, 110 54, 114 62" />
      <path class="svg-bridge" d="M80 61 C84 51, 91 48, 97 52 C101 55, 104 59, 108 62 C110 63, 112 63, 114 62" />
      <path class="svg-detail" d="M16 55 C20 34, 36 24, 56 28" />
      <path class="svg-detail" d="M19 62 C21 76, 35 86, 52 85" />
      <path class="svg-detail" d="M118 28 C139 23, 158 34, 164 55" />
      <path class="svg-detail" d="M162 63 C159 78, 145 86, 129 84" />
      <path class="svg-stitch" d="M28 80 C40 86, 57 85, 67 77" />
      <path class="svg-stitch" d="M123 77 C134 86, 152 85, 162 78" />
      <path class="svg-brow left" d="M22 20 C34 14, 54 14, 66 21" />
      <path class="svg-brow right" d="M118 21 C130 14, 151 14, 163 20" />
      <g class="svg-eye left"><circle class="svg-pupil" cx="43" cy="57" r="11.4" /><circle class="svg-pupil-shine" cx="38.8" cy="52.8" r="2.7" /></g>
      <g class="svg-eye right"><circle class="svg-pupil" cx="141" cy="57" r="11.4" /><circle class="svg-pupil-shine" cx="136.8" cy="52.8" r="2.7" /></g>
      <ellipse class="svg-mouth-pad" cx="92" cy="96" rx="23" ry="15" />
      <path class="svg-mouth smile" d="M76 93 C83 105, 101 105, 108 93" />
      <path class="svg-mouth ajar" d="M78 94 C84 102, 100 102, 106 94 C101 99, 84 99, 78 94Z" />
      <path class="svg-mouth open" d="M77 93 C77 80, 86 73, 93 73 C102 73, 111 81, 110 94 C109 108, 99 115, 91 115 C83 115, 77 107, 77 93Z" />
      <path class="svg-mouth-core" d="M83 95 C83 85, 88 80, 93 80 C100 80, 105 86, 104 96 C103 106, 96 110, 91 110 C85 110, 83 104, 83 95Z" />
      <ellipse class="svg-mouth-shine" cx="88" cy="88" rx="3" ry="2.2" />
      <path class="svg-mouth flat" d="M81 96 C87 98, 98 98, 103 96" />
      <path class="svg-spark" d="M164 20 L164 29 M159.5 24.5 L168.5 24.5" />
    </g>
  </svg>
`;
anchor?.append(mascot);

const state = {
  targetX: 0,
  targetY: 0,
  eyeX: 0,
  eyeY: 0,
  lastMove: Date.now(),
  lockedUntil: 0,
  idleMoodShown: false,
  lastScrollMood: 0,
  moodTimer: null,
  portalOpen: false,
};

const turbulence = mascot.querySelector('#mascotTurbulence');
let shimmerTimer;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setMood(mood, duration = 0, options = {}) {
  globalThis.clearTimeout(state.moodTimer);
  mascot.dataset.mood = mood;

  if (options.lock) {
    state.lockedUntil = Date.now() + duration;
  }

  if (duration) {
    state.moodTimer = globalThis.setTimeout(() => setMood('curious'), duration);
  }
}

function liftBrows(duration = 680) {
  mascot.classList.remove('is-brow-pop');
  mascot.getBoundingClientRect();
  mascot.classList.add('is-brow-pop');
  globalThis.setTimeout(() => mascot.classList.remove('is-brow-pop'), duration);
}

function createPing() {
  const ping = document.createElement('span');
  ping.className = 'binocle__ping';
  ping.style.left = `${48 + Math.random() * 32}%`;
  ping.style.top = `${30 + Math.random() * 30}%`;
  mascot.append(ping);
  ping.addEventListener('animationend', () => ping.remove(), { once: true });
}

function showSellerCue(duration = 1150) {
  setMood('seller', duration, { lock: true });
  liftBrows(520);
}

function updateTarget(pointerX, pointerY) {
  if (state.portalOpen) return;

  const rect = mascot.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = pointerX - centerX;
  const dy = pointerY - centerY;
  const distance = Math.hypot(dx, dy);

  state.targetX = clamp(dx / 36, -7, 7);
  state.targetY = clamp(dy / 42, -4.8, 4.8);
  state.lastMove = Date.now();
  state.idleMoodShown = false;
  mascot.style.setProperty('--tilt', `${clamp(dx / 140, -3, 3)}deg`);
  mascot.style.setProperty('--lean-x', `${clamp(dx / 84, -6, 6)}deg`);
  mascot.style.setProperty('--lean-y', `${clamp(-dy / 86, -6, 6)}deg`);
  mascot.style.setProperty('--body-x', `${clamp(dx / 120, -3.5, 3.5)}px`);
  mascot.style.setProperty('--body-y', `${clamp(dy / 135, -2.5, 3.5)}px`);
  mascot.style.setProperty('--body-roll', `${clamp(dx / 190, -2.2, 2.2)}deg`);
  mascot.style.setProperty('--depth-x', `${5 - clamp(dx / 85, -4, 4)}px`);
  mascot.style.setProperty('--depth-y', `${4 - clamp(dy / 95, -3, 4)}px`);

  if (Date.now() < state.lockedUntil) return;

  if (distance < 92) setMood('close');
  else if (distance < 170) setMood('gentle');
  else if (distance < 280) setMood('happy');
  else if (mascot.dataset.mood !== 'bye') setMood('curious');
}

function animateEyes() {
  state.eyeX += (state.targetX - state.eyeX) * 0.075;
  state.eyeY += (state.targetY - state.eyeY) * 0.075;
  mascot.style.setProperty('--look-x', `${state.eyeX.toFixed(2)}px`);
  mascot.style.setProperty('--look-y', `${state.eyeY.toFixed(2)}px`);

  if (Date.now() - state.lastMove > 3600 && mascot.dataset.mood !== 'bye' && !state.portalOpen) {
    state.targetX = Math.sin(Date.now() / 1200) * 2.2;
    state.targetY = Math.cos(Date.now() / 1450) * 1.4;
    mascot.style.setProperty('--tilt', '0deg');
    mascot.style.setProperty('--lean-x', '0deg');
    mascot.style.setProperty('--lean-y', '0deg');
    mascot.style.setProperty('--body-x', '0px');
    mascot.style.setProperty('--body-y', '0px');
    mascot.style.setProperty('--body-roll', '0deg');
    mascot.style.setProperty('--depth-x', '5px');
    mascot.style.setProperty('--depth-y', '4px');
  }

  if (Date.now() - state.lastMove > 6200 && !state.idleMoodShown && Date.now() > state.lockedUntil && !state.portalOpen) {
    state.idleMoodShown = true;
    setMood('thinking', 1900, { lock: true });
    liftBrows();
  }

  requestAnimationFrame(animateEyes);
}

function blink() {
  mascot.style.setProperty('--blink', '0.08');
  globalThis.setTimeout(() => mascot.style.setProperty('--blink', '1'), 105);
  globalThis.setTimeout(blink, 2600 + Math.random() * 3200);
}

function resetPose(delay = 900) {
  globalThis.setTimeout(() => {
    state.targetX = 0;
    state.targetY = 0;
    ['--tilt', '--lean-x', '--lean-y', '--body-roll'].forEach((name) => mascot.style.setProperty(name, '0deg'));
    mascot.style.setProperty('--body-x', '0px');
    mascot.style.setProperty('--body-y', '0px');
    mascot.style.setProperty('--depth-x', '5px');
    mascot.style.setProperty('--depth-y', '4px');
    if (mascot.dataset.mood === 'bye') setMood('curious');
  }, delay);
}

function startShimmer() {
  if (reduceMotion || shimmerTimer || !turbulence) return;
  let seed = Number(turbulence.getAttribute('seed')) || 14;
  shimmerTimer = globalThis.setInterval(() => {
    seed = seed >= 34 ? 14 : seed + 1;
    turbulence.setAttribute('seed', String(seed));
  }, 120);
}

function stopShimmer() {
  globalThis.clearInterval(shimmerTimer);
  shimmerTimer = undefined;
  turbulence?.setAttribute('seed', '14');
}

function renderPaperGrain(canvas) {
  const ctx = canvas?.getContext('2d', { willReadFrequently: false });
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.48) * 22;
    img.data[i] = 128 + n;
    img.data[i + 1] = 128 + n;
    img.data[i + 2] = 128 + n;
    img.data[i + 3] = Math.random() * 12 + 3;
  }
  ctx.putImageData(img, 0, 0);
}

function animateSketchPaths() {
  if (reduceMotion) return;
  document.querySelectorAll('.sketch-bg path, .sketch-bg circle').forEach((shape, index) => {
    try {
      const len = shape.getTotalLength();
      shape.style.strokeDasharray = len;
      shape.style.strokeDashoffset = len;
      shape.style.animation = `draw-in ${1.8 + Math.random() * 3}s cubic-bezier(0.25, 0, 0.3, 1) ${index * 0.12 + Math.random() * 0.8}s forwards`;
    } catch {
      // Some SVG elements may not expose length consistently in older browsers.
    }
  });
}

function characterMarkup(type) {
  const common = `filter="url(#roughen)"`;
  if (type === 'student') {
    return `
      <svg class="character-svg student-svg" viewBox="0 0 190 220" aria-hidden="true">
        <g ${common}>
          <g class="bulb"><circle cx="126" cy="18" r="12" /><path d="M120 18 C124 11, 130 13, 132 18 M121 31 L132 31 M123 36 L130 36" /></g>
          <path class="limb" d="M83 145 C79 164, 78 181, 75 196" /><path class="limb" d="M108 145 C116 163, 121 181, 124 196" />
          <ellipse cx="73" cy="199" rx="11" ry="4" /><ellipse cx="126" cy="199" rx="11" ry="4" />
          <g transform="rotate(4 95 112)"><path class="body" d="M70 80 C82 75, 109 75, 120 82 C124 103, 123 129, 118 145 C103 151, 84 150, 70 144 C66 123, 66 99, 70 80Z" /></g>
          <path class="limb" d="M73 87 C55 76, 49 58, 53 43 C55 37, 59 34, 63 31" /><path d="M61 31 L64 21" />
          <path class="limb" d="M117 88 C130 99, 133 116, 127 130" />
          <path class="note" d="M121 120 C134 117, 146 120, 151 126 C150 139, 147 150, 142 156 C128 158, 118 154, 113 148 C113 136, 116 126, 121 120Z" />
          <path d="M123 131 L144 132 M122 139 L143 141 M121 147 L137 149" />
          <path d="M88 72 C92 78, 101 78, 105 72 L105 82 C100 86, 92 86, 87 82Z" />
          <ellipse cx="95" cy="44" rx="17.5" ry="19" />
          <path class="hair" d="M78 38 L86 24 L91 34 L99 23 L103 35 L113 29 L110 47 C100 38, 91 35, 78 38Z" />
          <circle class="eye-fill" cx="89" cy="45" r="2.8" /><circle class="eye-fill" cx="102" cy="45" r="2.8" />
          <path d="M88 56 C93 59, 99 59, 104 55" />
        </g>
      </svg>`;
  }

  if (type === 'chatter') {
    return `
      <svg class="character-svg chatter-svg" viewBox="0 0 190 220" aria-hidden="true">
        <g ${common}>
          <path class="bubble" d="M119 20 C150 10, 174 23, 169 49 C166 67, 139 70, 124 59 L108 68 L114 53 C105 43, 106 27, 119 20Z" />
          <path d="M130 39 L155 39 M131 49 L149 49" />
          <path class="limb" d="M82 145 C77 162, 73 180, 69 196" /><path class="limb" d="M108 145 C116 163, 122 180, 128 196" />
          <ellipse cx="67" cy="199" rx="11" ry="4" /><ellipse cx="131" cy="199" rx="11" ry="4" />
          <path class="body" d="M70 80 C83 75, 108 75, 120 82 C124 104, 123 128, 118 145 C103 151, 84 150, 70 144 C66 123, 66 99, 70 80Z" />
          <path class="limb" d="M73 88 C55 96, 49 111, 47 126" /><ellipse cx="46" cy="130" rx="5" ry="4" />
          <path class="limb" d="M117 86 C133 75, 139 58, 135 42" /><ellipse cx="134" cy="37" rx="5" ry="4" />
          <path d="M88 72 C92 78, 101 78, 105 72 L105 82 C100 86, 92 86, 87 82Z" />
          <ellipse cx="95" cy="44" rx="17.5" ry="19" />
          <path class="hair" d="M78 36 C83 25, 101 20, 113 34 C103 32, 90 34, 78 36Z" />
          <path d="M85 45 C88 42, 91 42, 94 45 M99 45 C102 42, 105 42, 108 45" />
          <path d="M86 56 C92 64, 102 64, 109 56" />
          <circle class="cheek-fill" cx="82" cy="52" r="2" opacity="0.3" /><circle class="cheek-fill" cx="110" cy="52" r="2" opacity="0.3" />
        </g>
      </svg>`;
  }

  return `
    <svg class="character-svg reader-svg" viewBox="0 0 190 220" aria-hidden="true">
      <g ${common}>
        <path class="limb" d="M82 145 C70 160, 62 177, 55 194" /><path class="limb" d="M108 145 C121 159, 131 176, 139 194" />
        <ellipse cx="53" cy="198" rx="11" ry="4" /><ellipse cx="141" cy="198" rx="11" ry="4" />
        <g transform="rotate(-8 95 112)"><path class="body" d="M70 80 C82 75, 109 75, 120 82 C124 103, 123 129, 118 145 C103 151, 84 150, 70 144 C66 123, 66 99, 70 80Z" /></g>
        <path class="limb" d="M73 88 C61 98, 57 113, 61 127" /><path class="limb" d="M117 88 C129 98, 133 113, 129 127" />
        <path class="book" d="M52 111 C70 104, 85 106, 96 116 L95 158 C82 149, 67 147, 51 153Z" />
        <path class="book" d="M96 116 C110 106, 127 104, 143 111 L144 153 C127 147, 111 149, 95 158Z" />
        <path d="M96 116 L95 158 M65 122 L86 126 M65 133 L88 137 M109 126 L132 122 M107 137 L132 134" />
        <ellipse cx="60" cy="127" rx="5" ry="4" /><ellipse cx="130" cy="127" rx="5" ry="4" />
        <path d="M88 72 C92 78, 101 78, 105 72 L105 82 C100 86, 92 86, 87 82Z" />
        <g transform="rotate(12 95 44)">
          <ellipse cx="95" cy="44" rx="17.5" ry="19" />
          <path class="hair" d="M78 39 C82 28, 100 22, 113 35 C102 34, 91 36, 78 39Z" />
          <ellipse cx="88" cy="45" rx="5" ry="4" /><ellipse cx="103" cy="45" rx="5" ry="4" /><path d="M93 45 L98 45" />
          <path d="M84 47 C87 44, 90 44, 93 47 M99 47 C102 44, 105 44, 108 47" />
          <path d="M88 57 C93 61, 100 61, 105 57" />
        </g>
      </g>
    </svg>`;
}

function portalCardSvg(type) {
  if (type === 'universe') {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="23" cy="45" r="6" /><circle cx="54" cy="27" r="5" /><circle cx="75" cy="57" r="5" /><circle cx="96" cy="30" r="5" /><path d="M29 43 L50 30 M29 47 L70 56 M59 28 L91 31 M80 55 L97 34" /><text x="16" y="72">note → universe</text></svg>`;
  }
  if (type === 'team') {
    return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M18 20 L30 58 L38 44 L55 61" /><path d="M55 18 L66 55 L75 42 L92 59" /><path d="M83 12 L94 49 L103 36 L115 51" /><path d="M22 70 L100 70 M32 32 L72 32 M32 43 L88 43" /><text x="16" y="14">Ana</text><text x="57" y="14">Bo</text><text x="82" y="10">Cy</text></svg>`;
  }
  return `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M16 12 C47 8, 86 9, 104 14 C108 36, 106 62, 102 76 C72 82, 42 80, 17 76 C12 54, 12 31, 16 12Z" /><path d="M28 25 L56 25 L56 45 L28 45Z M65 25 L93 25 L93 45 L65 45Z M28 52 L56 52 L56 69 L28 69Z M65 52 L93 52 L93 69 L65 69Z" /><path d="M34 39 C39 31, 45 41, 50 30 M72 37 L87 37 M72 61 L86 61" /></svg>`;
}

function createPortalMarkup() {
  return `
    <div id="portal" class="portal" aria-modal="true" role="dialog" aria-label="Prismatica portal">
      <div class="portal__lens-left">
        <div class="portal-login-area">
          <p class="portal-note">Do you know what's the common point between you and future celebrities?<br />You've both started right here 😄<svg viewBox="0 0 150 80" aria-hidden="true"><path d="M16 12 C48 18, 75 34, 101 62" marker-end="url(#arrow)" /></svg></p>
          <form class="portal-login" novalidate>
            <div class="field"><label for="portal-email">Email</label><input id="portal-email" type="email" placeholder="you@example.com" autocomplete="email" required /></div>
            <div class="field"><label for="portal-password">Password</label><input id="portal-password" type="password" placeholder="············" autocomplete="current-password" required minlength="6" /></div>
            <button type="submit" class="portal-cta">Enter Prismatica →</button>
            <a class="portal-link" href="#top">Don't have an account? Create one</a>
            <output class="portal-error" aria-live="polite"></output>
          </form>
        </div>
        <svg class="night-desk" viewBox="0 0 100 80" aria-hidden="true"><path d="M29 34 C31 25, 45 25, 48 34 M42 34 C45 25, 59 25, 62 34 M55 34 C59 25, 71 25, 73 34" /><ellipse cx="51" cy="52" rx="24" ry="10" /><path d="M72 51 C87 47, 88 64, 72 62" /><path d="M19 67 C41 62, 66 65, 87 70 M25 73 C43 70, 64 72, 78 76" /></svg>
      </div>
      <div class="portal__lens-right">
        <div class="portal-demo-area">
          <div class="portal-brand"><svg viewBox="0 0 88 42" aria-hidden="true"><path d="M9 23 C12 9, 30 7, 42 18 C49 7, 70 8, 78 23 C84 36, 66 43, 51 34 C47 31, 45 27, 44 23 C42 31, 34 38, 23 38 C13 38, 5 32, 9 23Z" /><path d="M23 23 C28 17, 36 18, 39 24 M52 24 C56 17, 66 17, 70 24" /></svg><span>Prismatica</span></div>
          <div class="portal-cards">
            <article class="portal-card">${portalCardSvg('rules')}<h3>Your workspace, your rules</h3><p>A grid, a note, an app and a live dashboard can share the same page.</p></article>
            <article class="portal-card">${portalCardSvg('universe')}<h3>From a note to a universe</h3><p>Start with one node, then grow into databases, apps and business views.</p></article>
            <article class="portal-card">${portalCardSvg('team')}<h3>Invite your team, keep your sanity</h3><p>Multiple people can edit the same operational story without losing context.</p></article>
          </div>
          <p class="portal-quote">“The workspace that grows with you.”</p>
          <a class="portal-discover" href="#powers">Discover all features ↓</a>
        </div>
      </div>
      <div class="portal__mascot-shell"></div>
      <button class="portal__close" type="button" aria-label="Close portal"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="21" /><path d="M19 19 L35 35 M35 19 L19 35" /></svg></button>
    </div>`;
}

function revealPortalLenses(portal, clone) {
  const leftPanel = portal.querySelector('.portal__lens-left');
  const rightPanel = portal.querySelector('.portal__lens-right');
  const leftLens = clone.querySelector('.svg-eye.left .svg-pupil');
  const rightLens = clone.querySelector('.svg-eye.right .svg-pupil');

  const makeClip = (panel, lens, fallbackX) => {
    const rect = lens?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth * fallbackX;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.5;
    const targetRadius = Math.max(window.innerWidth, window.innerHeight) * (window.innerWidth <= 768 ? 0.78 : 0.55);
    panel.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
    panel.animate(
      [{ clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${targetRadius}px at ${cx}px ${cy}px)` }],
      { duration: reduceMotion ? 300 : 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    );
  };

  makeClip(leftPanel, leftLens, 0.28);
  makeClip(rightPanel, rightLens, 0.72);
}

function closePortal() {
  const portal = document.querySelector('#portal');
  if (!portal) return;
  portal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }).addEventListener('finish', () => {
    portal.remove();
    document.body.classList.remove('portal-open');
    state.portalOpen = false;
    setMood('curious');
    resetPose(0);
  });
}

function openPortal() {
  if (state.portalOpen) return;
  state.portalOpen = true;
  document.body.classList.add('portal-open');
  setMood('excited', 600, { lock: true });
  liftBrows();
  [0, 120, 280].forEach((delay) => globalThis.setTimeout(createPing, delay));
  mascot.animate(
    [
      { transform: 'translateX(0) rotate(0deg) scale(1)' },
      { transform: 'translateX(-3px) rotate(-2deg) scale(1.04)' },
      { transform: 'translateX(3px) rotate(2deg) scale(1.06)' },
      { transform: 'translateX(-2px) rotate(-1deg) scale(1.08)' },
      { transform: 'translateX(2px) rotate(1deg) scale(1.1)' },
    ],
    { duration: reduceMotion ? 300 : 600, easing: 'ease-in-out' }
  );

  const portalWrapper = document.createElement('div');
  portalWrapper.innerHTML = createPortalMarkup();
  const portal = portalWrapper.firstElementChild;
  document.body.append(portal);

  const clone = mascot.cloneNode(true);
  clone.classList.add('portal-growing');
  clone.dataset.mood = 'excited';
  portal.querySelector('.portal__mascot-shell').append(clone);

  const revealDelay = reduceMotion ? 320 : 1600;
  globalThis.setTimeout(() => revealPortalLenses(portal, clone), revealDelay);

  portal.querySelector('.portal__close').addEventListener('click', closePortal);
  portal.querySelector('.portal-discover').addEventListener('click', closePortal);
  portal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePortal();
  });
  portal.querySelector('.portal-login').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const output = form.querySelector('.portal-error');
    const email = form.querySelector('input[type="email"]');
    const password = form.querySelector('input[type="password"]');

    if (!email.validity.valid) {
      output.textContent = 'Write a valid email to enter the sketch.';
      email.focus();
      return;
    }
    if (!password.validity.valid) {
      output.textContent = 'Use at least 6 characters for the password.';
      password.focus();
      return;
    }
    output.textContent = 'Welcome sketch saved — demo login accepted.';
    setMood('happy', 1100, { lock: true });
  });
  portal.querySelector('#portal-email')?.focus({ preventScroll: true });
}

document.querySelectorAll('[data-character]').forEach((slot) => {
  slot.innerHTML = characterMarkup(slot.dataset.character);
});

document.querySelectorAll('[data-open-portal]').forEach((trigger) => {
  trigger.addEventListener('click', openPortal);
  trigger.addEventListener('pointerenter', () => setMood('excited', 450));
  trigger.addEventListener('focus', () => setMood('excited', 450));
});

mascot.addEventListener('click', openPortal);
mascot.addEventListener('pointerenter', () => {
  setMood('gentle');
  startShimmer();
});
mascot.addEventListener('pointerleave', () => {
  setMood('curious', 250);
  stopShimmer();
});

document.querySelectorAll('.button, .nav-links a, .header-cta').forEach((interactiveElement) => {
  interactiveElement.addEventListener('pointerenter', () => showSellerCue());
  interactiveElement.addEventListener('focus', () => showSellerCue());
});

globalThis.addEventListener('pointermove', (event) => updateTarget(event.clientX, event.clientY), { passive: true });
globalThis.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - state.lastScrollMood > 900 && now > state.lockedUntil && !state.portalOpen) {
    state.lastScrollMood = now;
    setMood('listening', 650, { lock: true });
    liftBrows(520);
  }
}, { passive: true });
globalThis.addEventListener('pointerleave', () => {
  if (state.portalOpen) return;
  state.targetX = 0;
  state.targetY = -1.4;
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1200, { lock: true });
  liftBrows(500);
  resetPose(1250);
});
globalThis.addEventListener('pointerenter', () => resetPose(0));
globalThis.addEventListener('blur', () => {
  if (state.portalOpen) return;
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1000, { lock: true });
  resetPose(1100);
});
globalThis.addEventListener('focus', () => resetPose(0));

document.addEventListener('DOMContentLoaded', () => {
  renderPaperGrain(document.querySelector('#paper-grain'));
  animateSketchPaths();
});

setMood('curious');
blink();
animateEyes();
