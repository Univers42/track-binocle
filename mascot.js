const anchor = document.querySelector('#mascot-anchor');

const mascot = document.createElement('button');
mascot.className = 'binocle';
mascot.type = 'button';
mascot.dataset.mood = 'curious';
mascot.setAttribute('aria-label', 'Binocle, mascotte SVG vivante et expressive');
mascot.innerHTML = `
  <svg class="binocle__svg" viewBox="0 0 184 104" role="img" aria-labelledby="binocle-title binocle-desc">
    <title id="binocle-title">Binocle</title>
    <desc id="binocle-desc">Mascotte en forme de jumelles scribble, avec grandes pupilles, bouche expressive et petites mains.</desc>
    <defs>
      <filter id="handDrawn" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence baseFrequency="0.023" numOctaves="2" seed="14" type="fractalNoise" />
        <feDisplacementMap in="SourceGraphic" scale="0.75" />
      </filter>
    </defs>

    <g filter="url(#handDrawn)">
      <path class="svg-arm left" d="M55 31 C45 18, 30 18, 24 32" />
      <path class="svg-arm right" d="M129 31 C141 18, 155 19, 160 33" />

      <ellipse class="svg-frame" cx="54" cy="57" rx="39" ry="34" />
      <ellipse class="svg-frame" cx="130" cy="57" rx="39" ry="34" />
      <path class="svg-bridge" d="M91 56 C94 48, 99 48, 102 56" />

      <path class="svg-detail" d="M23 55 C27 34, 43 24, 63 28" />
      <path class="svg-detail" d="M26 62 C28 76, 42 86, 59 85" />
      <path class="svg-detail" d="M111 28 C132 23, 151 34, 157 55" />
      <path class="svg-detail" d="M155 63 C152 78, 138 86, 122 84" />
      <path class="svg-stitch" d="M35 80 C47 86, 64 85, 74 77" />
      <path class="svg-stitch" d="M116 77 C127 86, 145 85, 155 78" />

      <path class="svg-brow left" d="M35 22 C45 17, 62 17, 72 23" />
      <path class="svg-brow right" d="M112 23 C123 17, 141 17, 151 22" />

      <g class="svg-eye left">
        <circle class="svg-pupil" cx="54" cy="57" r="11.4" />
        <circle class="svg-pupil-shine" cx="49.8" cy="52.8" r="2.7" />
      </g>
      <g class="svg-eye right">
        <circle class="svg-pupil" cx="130" cy="57" r="11.4" />
        <circle class="svg-pupil-shine" cx="125.8" cy="52.8" r="2.7" />
      </g>

      <path class="svg-mouth smile" d="M77 75 C83 85, 101 85, 107 75" />
      <ellipse class="svg-mouth open" cx="92" cy="76" rx="8" ry="9" />
      <path class="svg-mouth flat" d="M82 76 C87 78, 97 78, 102 76" />
      <path class="svg-spark" d="M164 20 L164 29 M159.5 24.5 L168.5 24.5" />
    </g>
  </svg>
`;
anchor.append(mascot);

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
};

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

function updateTarget(pointerX, pointerY) {
  const rect = mascot.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = pointerX - centerX;
  const dy = pointerY - centerY;
  const distance = Math.hypot(dx, dy);

  state.targetX = clamp(dx / 38, -6.2, 6.2);
  state.targetY = clamp(dy / 44, -4.2, 4.2);
  state.lastMove = Date.now();
  state.idleMoodShown = false;
  mascot.style.setProperty('--tilt', `${clamp(dx / 120, -3.4, 3.4)}deg`);

  if (Date.now() < state.lockedUntil) {
    return;
  }

  if (distance < 118) {
    setMood('close');
  } else if (distance < 280) {
    setMood('happy');
  } else if (mascot.dataset.mood !== 'bye') {
    setMood('curious');
  }
}

function animateEyes() {
  state.eyeX += (state.targetX - state.eyeX) * 0.14;
  state.eyeY += (state.targetY - state.eyeY) * 0.14;

  mascot.style.setProperty('--look-x', `${state.eyeX.toFixed(2)}px`);
  mascot.style.setProperty('--look-y', `${state.eyeY.toFixed(2)}px`);

  if (Date.now() - state.lastMove > 3600 && mascot.dataset.mood !== 'bye') {
    state.targetX = Math.sin(Date.now() / 1000) * 1.7;
    state.targetY = Math.cos(Date.now() / 1200) * 1.1;
    mascot.style.setProperty('--tilt', '0deg');
  }

  if (Date.now() - state.lastMove > 6200 && !state.idleMoodShown && Date.now() > state.lockedUntil) {
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
    mascot.style.setProperty('--tilt', '0deg');
    if (mascot.dataset.mood === 'bye') {
      setMood('curious');
    }
  }, delay);
}

function createPing() {
  const ping = document.createElement('span');
  ping.className = 'binocle__ping';
  ping.style.left = `${52 + Math.random() * 26}%`;
  ping.style.top = `${34 + Math.random() * 24}%`;
  mascot.append(ping);
  ping.addEventListener('animationend', () => ping.remove(), { once: true });
}

globalThis.addEventListener('pointermove', (event) => updateTarget(event.clientX, event.clientY), {
  passive: true,
});

globalThis.addEventListener(
  'scroll',
  () => {
    const now = Date.now();

    if (now - state.lastScrollMood > 900 && now > state.lockedUntil) {
      state.lastScrollMood = now;
      setMood('listening', 650, { lock: true });
      liftBrows(520);
    }
  },
  { passive: true }
);

globalThis.addEventListener('pointerleave', () => {
  state.targetX = 0;
  state.targetY = -1.4;
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1200, { lock: true });
  liftBrows(500);
  resetPose(1250);
});

globalThis.addEventListener('pointerenter', () => {
  resetPose(0);
});

globalThis.addEventListener('blur', () => {
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1000, { lock: true });
  resetPose(1100);
});

globalThis.addEventListener('focus', () => resetPose(0));

mascot.addEventListener('click', () => {
  setMood('surprised', 1450, { lock: true });
  liftBrows(780);
  createPing();
  mascot.animate(
    [
      { transform: 'translateY(0) rotate(0deg) scale(1)' },
      { transform: 'translateY(-6px) rotate(-4deg) scale(1.035)' },
      { transform: 'translateY(0) rotate(2deg) scale(1)' },
    ],
    { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' }
  );
});

mascot.addEventListener('pointerenter', () => setMood('happy'));
mascot.addEventListener('pointerleave', () => setMood('curious', 250));

setMood('curious');
blink();
animateEyes();