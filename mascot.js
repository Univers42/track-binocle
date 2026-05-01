const anchor = document.querySelector('#mascot-anchor');

const mascot = document.createElement('button');
mascot.className = 'binocle';
mascot.type = 'button';
mascot.dataset.mood = 'curious';
mascot.setAttribute('aria-label', 'Binocle, mascotte SVG vivante et expressive');
mascot.innerHTML = `
  <svg class="binocle__svg" viewBox="0 0 184 118" role="img" aria-labelledby="binocle-title binocle-desc">
    <title id="binocle-title">Binocle</title>
    <desc id="binocle-desc">Mascotte en forme de jumelles scribble, avec grandes pupilles, bouche expressive et petites mains.</desc>
    <defs>
      <filter id="handDrawn" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence baseFrequency="0.023" numOctaves="2" seed="14" type="fractalNoise" />
        <feDisplacementMap in="SourceGraphic" scale="0.75" />
      </filter>
    </defs>

    <g class="svg-body-group" filter="url(#handDrawn)">
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
      <ellipse class="svg-frame" cx="43" cy="57" rx="39" ry="34" />
      <ellipse class="svg-frame" cx="141" cy="57" rx="39" ry="34" />
      <ellipse class="svg-inner-rim" cx="43" cy="57" rx="28" ry="24" />
      <ellipse class="svg-inner-rim" cx="141" cy="57" rx="28" ry="24" />
      <ellipse class="svg-rim" cx="38" cy="53" rx="24" ry="20" />
      <ellipse class="svg-rim" cx="136" cy="53" rx="24" ry="20" />
      <path class="svg-center-band" d="M86 51 C90 47, 94 47, 98 51 C97 57, 97 63, 98 68 C94 71, 90 71, 86 68 C87 63, 87 57, 86 51Z" />
      <path class="svg-bridge-shadow" d="M99 62 C103 54, 110 54, 114 62" />
      <path class="svg-bridge" d="M80 60 C84 51, 92 48, 98 51 C103 53, 107 57, 112 62" />

      <path class="svg-detail" d="M16 55 C20 34, 36 24, 56 28" />
      <path class="svg-detail" d="M19 62 C21 76, 35 86, 52 85" />
      <path class="svg-detail" d="M118 28 C139 23, 158 34, 164 55" />
      <path class="svg-detail" d="M162 63 C159 78, 145 86, 129 84" />
      <path class="svg-stitch" d="M28 80 C40 86, 57 85, 67 77" />
      <path class="svg-stitch" d="M123 77 C134 86, 152 85, 162 78" />

      <path class="svg-brow left" d="M22 20 C34 14, 54 14, 66 21" />
      <path class="svg-brow right" d="M118 21 C130 14, 151 14, 163 20" />

      <g class="svg-eye left">
        <circle class="svg-pupil" cx="43" cy="57" r="11.4" />
        <circle class="svg-pupil-shine" cx="38.8" cy="52.8" r="2.7" />
      </g>
      <g class="svg-eye right">
        <circle class="svg-pupil" cx="141" cy="57" r="11.4" />
        <circle class="svg-pupil-shine" cx="136.8" cy="52.8" r="2.7" />
      </g>

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

function showSellerCue(duration = 1150) {
  setMood('seller', duration, { lock: true });
  liftBrows(520);
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

  if (distance < 92) {
    setMood('close');
  } else if (distance < 170) {
    setMood('gentle');
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
  setMood('excited', 1250, { lock: true });
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

mascot.addEventListener('pointerenter', () => setMood('gentle'));
mascot.addEventListener('pointerleave', () => setMood('curious', 250));

document.querySelectorAll('.button, .nav-links a').forEach((interactiveElement) => {
  interactiveElement.addEventListener('pointerenter', () => showSellerCue());
  interactiveElement.addEventListener('focus', () => showSellerCue());
});

setMood('curious');
blink();
animateEyes();