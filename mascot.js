const anchor = document.querySelector('#mascot-anchor');

const mascot = document.createElement('button');
mascot.className = 'binocle';
mascot.type = 'button';
mascot.dataset.mood = 'curious';
mascot.setAttribute('aria-label', 'Binocle, la mascotte vivante qui suit votre mouvement');
mascot.innerHTML = `
  <span class="binocle__strap" aria-hidden="true"></span>
  <span class="binocle__body" aria-hidden="true">
    <span class="lens left">
      <span class="brow"></span>
      <span class="eye"><span class="pupil"></span></span>
      <span class="cheek"></span>
    </span>
    <span class="binocle__bridge"></span>
    <span class="lens right">
      <span class="brow"></span>
      <span class="eye"><span class="pupil"></span></span>
      <span class="cheek"></span>
    </span>
    <span class="binocle__mouth"></span>
  </span>
  <span class="binocle__sparkle" aria-hidden="true"></span>
  <span class="binocle__speech">Coucou, je te vois.</span>
`;
anchor.append(mascot);

const speech = mascot.querySelector('.binocle__speech');
const state = {
  targetX: 0,
  targetY: 0,
  eyeX: 0,
  eyeY: 0,
  lastMove: Date.now(),
  moodTimer: null,
  speechTimer: null,
};

const messages = {
  curious: 'Je regarde où tu vas.',
  happy: 'Bienvenue dans la boutique.',
  shy: 'Oh, tu es tout près.',
  surprised: 'Pop! bien vu.',
  bye: 'Au revoir, reviens vite.'
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setMood(mood, duration = 0) {
  window.clearTimeout(state.moodTimer);
  mascot.dataset.mood = mood;
  speech.textContent = messages[mood] ?? messages.curious;

  if (duration) {
    state.moodTimer = window.setTimeout(() => setMood('curious'), duration);
  }
}

function say(message, duration = 1300) {
  window.clearTimeout(state.speechTimer);
  speech.textContent = message;
  mascot.classList.add('is-speaking');
  state.speechTimer = window.setTimeout(() => {
    mascot.classList.remove('is-speaking');
  }, duration);
}

function updateTarget(pointerX, pointerY) {
  const rect = mascot.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = pointerX - centerX;
  const dy = pointerY - centerY;
  const distance = Math.hypot(dx, dy);

  state.targetX = clamp(dx / 16, -13, 13);
  state.targetY = clamp(dy / 18, -9, 9);
  state.lastMove = Date.now();

  mascot.style.setProperty('--tilt', `${clamp(dx / 42, -9, 9)}deg`);

  if (distance < 115) {
    setMood('shy');
    say('Tu regardes mes verres?', 900);
  } else if (distance < 280) {
    setMood('happy');
  } else if (mascot.dataset.mood !== 'bye') {
    setMood('curious');
  }
}

function animateEyes() {
  state.eyeX += (state.targetX - state.eyeX) * 0.18;
  state.eyeY += (state.targetY - state.eyeY) * 0.18;

  mascot.style.setProperty('--eye-x', `${state.eyeX.toFixed(2)}px`);
  mascot.style.setProperty('--eye-y', `${state.eyeY.toFixed(2)}px`);

  if (Date.now() - state.lastMove > 3800 && mascot.dataset.mood !== 'bye') {
    state.targetX = Math.sin(Date.now() / 700) * 4;
    state.targetY = Math.cos(Date.now() / 900) * 2;
  }

  requestAnimationFrame(animateEyes);
}

function blink() {
  mascot.style.setProperty('--blink', '0.12');
  window.setTimeout(() => mascot.style.setProperty('--blink', '1'), 120);
  window.setTimeout(blink, 2400 + Math.random() * 2600);
}

window.addEventListener('pointermove', (event) => updateTarget(event.clientX, event.clientY), {
  passive: true,
});

window.addEventListener('pointerleave', () => {
  state.targetX = 0;
  state.targetY = -4;
  setMood('bye', 2200);
  say(messages.bye, 1800);
});

window.addEventListener('blur', () => {
  setMood('bye', 1800);
  say('Je garde ta place.', 1500);
});

mascot.addEventListener('click', () => {
  setMood('surprised', 1100);
  say('Hé hé, ça chatouille!', 1100);
  mascot.animate(
    [
      { transform: 'translateY(0) rotate(0deg) scale(1)' },
      { transform: 'translateY(-8px) rotate(-7deg) scale(1.06)' },
      { transform: 'translateY(0) rotate(5deg) scale(1)' },
    ],
    { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }
  );
});

mascot.addEventListener('pointerenter', () => {
  setMood('happy');
  say('Salut, explorateur.', 1000);
});

mascot.addEventListener('pointerleave', () => {
  setMood('curious', 500);
});

setMood('curious');
say('Coucou, je te vois.', 1500);
blink();
animateEyes();