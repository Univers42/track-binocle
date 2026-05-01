const anchor = document.querySelector('#mascot-anchor');

const mascot = document.createElement('button');
mascot.className = 'binocle';
mascot.type = 'button';
mascot.dataset.mood = 'curious';
mascot.setAttribute('aria-label', 'Binocle, mascotte SVG vivante et expressive');
mascot.innerHTML = `
  <svg class="binocle__svg" viewBox="0 0 184 104" role="img" aria-labelledby="binocle-title binocle-desc">
    <title id="binocle-title">Binocle</title>
    <desc id="binocle-desc">Mascotte en forme de jumelles avec yeux griffonnés, sourcils et petites mains.</desc>
    <defs>
      <linearGradient id="brassGradient" x1="28" x2="154" y1="24" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff2cb" />
        <stop offset="0.48" stop-color="#dba04a" />
        <stop offset="1" stop-color="#a9632c" />
      </linearGradient>
      <filter id="handDrawn" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence baseFrequency="0.021" numOctaves="2" seed="9" type="fractalNoise" />
        <feDisplacementMap in="SourceGraphic" scale="0.8" />
      </filter>
    </defs>

    <g filter="url(#handDrawn)">
      <path class="svg-arm left" d="M62 30 C49 11, 33 12, 25 29" />
      <path class="svg-arm right" d="M122 30 C137 10, 154 12, 160 29" />

      <path class="svg-body" d="M12 58 C12 34, 27 22, 50 22 C74 22, 85 37, 88 55 C91 37, 103 22, 128 22 C151 22, 168 35, 169 58 C170 80, 154 92, 130 91 C108 90, 96 78, 92 65 C88 78, 76 90, 54 91 C29 92, 12 80, 12 58Z" />
      <path class="svg-body" d="M80 56 C82 46, 88 42, 92 42 C97 42, 102 47, 104 56" fill="none" />
      <path class="svg-lens-shine" d="M31 35 C43 28, 60 29, 68 40 C54 36, 44 37, 31 45Z" />
      <path class="svg-lens-shine" d="M112 35 C125 28, 143 30, 151 42 C136 37, 126 37, 112 46Z" />

      <path class="svg-scribble" d="M28 74 C39 83, 62 83, 73 71" />
      <path class="svg-scribble" d="M113 74 C125 83, 147 82, 157 70" />
      <path class="svg-scribble" d="M26 52 C31 36, 45 30, 62 35" />
      <path class="svg-scribble" d="M111 53 C118 36, 135 30, 150 36" />

      <path class="svg-brow left" d="M37 42 C45 36, 55 36, 63 42" />
      <path class="svg-brow right" d="M120 42 C129 36, 140 36, 148 42" />

      <g class="svg-eye left">
        <path d="M43 55 C48 48, 58 49, 62 56 C57 63, 48 63, 43 55Z" />
        <path d="M45 54 C50 60, 57 59, 61 55" />
        <circle class="svg-pupil" cx="53" cy="55" r="3.4" />
      </g>
      <g class="svg-eye right">
        <path d="M122 55 C128 48, 139 49, 143 56 C138 63, 128 63, 122 55Z" />
        <path d="M124 54 C130 60, 138 59, 142 55" />
        <circle class="svg-pupil" cx="133" cy="55" r="3.4" />
      </g>

      <path class="svg-mouth" d="M76 72 C83 79, 101 79, 108 72" />
      <path class="svg-spark" d="M159 18 L159 28 M154 23 L164 23" />
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
  moodTimer: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setMood(mood, duration = 0) {
  globalThis.clearTimeout(state.moodTimer);
  mascot.dataset.mood = mood;

  if (duration) {
    state.moodTimer = globalThis.setTimeout(() => setMood('curious'), duration);
  }
}

function updateTarget(pointerX, pointerY) {
  const rect = mascot.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = pointerX - centerX;
  const dy = pointerY - centerY;
  const distance = Math.hypot(dx, dy);

  state.targetX = clamp(dx / 42, -4.4, 4.4);
  state.targetY = clamp(dy / 48, -3.2, 3.2);
  state.lastMove = Date.now();
  mascot.style.setProperty('--tilt', `${clamp(dx / 120, -3.4, 3.4)}deg`);

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

globalThis.addEventListener('pointerleave', () => {
  state.targetX = 0;
  state.targetY = -1.4;
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1200);
  resetPose(1250);
});

globalThis.addEventListener('pointerenter', () => {
  resetPose(0);
});

globalThis.addEventListener('blur', () => {
  mascot.style.setProperty('--tilt', '0deg');
  setMood('bye', 1000);
  resetPose(1100);
});

globalThis.addEventListener('focus', () => resetPose(0));

mascot.addEventListener('click', () => {
  setMood('surprised', 900);
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