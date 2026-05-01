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

    <g class="svg-body-group" filter="url(#handDrawn)">
      <path class="svg-arm left" d="M55 31 C45 18, 30 18, 24 32" />
      <path class="svg-arm right" d="M129 31 C141 18, 155 19, 160 33" />

      <g class="svg-volume">
        <path class="svg-shell left" d="M25 34 C35 20, 59 16, 77 27 C88 34, 95 48, 94 62 C93 78, 81 90, 63 94 C42 98, 22 90, 15 75 C9 61, 13 45, 25 34Z" />
        <path class="svg-shell right" d="M107 27 C126 16, 149 20, 160 34 C172 49, 175 65, 169 78 C162 92, 142 98, 121 94 C103 90, 91 78, 90 62 C89 48, 96 34, 107 27Z" />
        <ellipse class="svg-back" cx="60" cy="61" rx="39" ry="34" />
        <ellipse class="svg-back" cx="136" cy="61" rx="39" ry="34" />
      </g>

      <path class="svg-barrel left" d="M29 39 C38 28, 56 25, 70 32 C58 29, 41 32, 32 43 C24 54, 24 67, 32 77 C20 69, 18 51, 29 39Z" />
      <path class="svg-barrel right" d="M114 32 C128 25, 146 28, 155 39 C166 51, 164 69, 152 77 C160 67, 160 54, 152 43 C143 32, 126 29, 114 32Z" />
      <ellipse class="svg-frame" cx="54" cy="57" rx="39" ry="34" />
      <ellipse class="svg-frame" cx="130" cy="57" rx="39" ry="34" />
      <ellipse class="svg-inner-rim" cx="54" cy="57" rx="28" ry="24" />
      <ellipse class="svg-inner-rim" cx="130" cy="57" rx="28" ry="24" />
      <ellipse class="svg-rim" cx="49" cy="53" rx="24" ry="20" />
      <ellipse class="svg-rim" cx="125" cy="53" rx="24" ry="20" />
      <path class="svg-center-band" d="M86 49 C90 45, 95 45, 99 49 C98 55, 98 61, 99 66 C95 69, 90 69, 86 66 C87 61, 87 55, 86 49Z" />
      <path class="svg-bridge-shadow" d="M97 61 C100 53, 105 53, 108 61" />
      <path class="svg-bridge" d="M88 58 C90 50, 96 47, 101 50 C104 52, 105 56, 105 60" />

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

      <path class="svg-mouth smile" d="M77 80 C83 89, 101 89, 107 80" />
      <path class="svg-mouth ajar" d="M79 80 C84 86, 100 86, 105 80 C101 84, 84 84, 79 80Z" />
      <path class="svg-mouth open" d="M78 79 C78 67, 87 61, 93 61 C101 61, 109 68, 108 80 C107 93, 98 99, 91 99 C84 99, 78 91, 78 79Z" />
      <path class="svg-mouth-core" d="M83 81 C83 72, 88 68, 93 68 C99 68, 104 73, 103 82 C102 91, 96 94, 91 94 C86 94, 83 89, 83 81Z" />
      <ellipse class="svg-mouth-shine" cx="88" cy="75" rx="3" ry="2.2" />
      <path class="svg-mouth flat" d="M82 81 C87 83, 97 83, 102 81" />
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
  state.eyeX += (state.targetX - state.eyeX) * 0.075;
  state.eyeY += (state.targetY - state.eyeY) * 0.075;

  mascot.style.setProperty('--look-x', `${state.eyeX.toFixed(2)}px`);
  mascot.style.setProperty('--look-y', `${state.eyeY.toFixed(2)}px`);

  if (Date.now() - state.lastMove > 3600 && mascot.dataset.mood !== 'bye') {
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
    mascot.style.setProperty('--lean-x', '0deg');
    mascot.style.setProperty('--lean-y', '0deg');
    mascot.style.setProperty('--body-x', '0px');
    mascot.style.setProperty('--body-y', '0px');
    mascot.style.setProperty('--body-roll', '0deg');
    mascot.style.setProperty('--depth-x', '5px');
    mascot.style.setProperty('--depth-y', '4px');
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