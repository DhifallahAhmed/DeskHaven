import { t, LANGS, getSettings, resolveLang } from './shared.js';

const $ = (s) => document.querySelector(s);
let lang = 'en', ringing = null, a = 0, b = 0, spoken = '';

function newProblem() {
  a = 12 + Math.floor(Math.random() * 38);
  b = 12 + Math.floor(Math.random() * 38);
  $('#ring-question').textContent = t(lang, 'solvePrompt', { a, b });
  $('#ring-answer').value = '';
}

function speak(text) {
  if (!text || text === spoken || !('speechSynthesis' in window)) return;
  spoken = text;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS[lang].speech;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* speech is optional */ }
}

function render() {
  $('#ring-time').textContent = ringing.time;
  $('#ring-title').textContent = ringing.title;
  $('#ring-msg').textContent = ringing.message || '';
  $('#ring-msg').hidden = !ringing.message;
  $('#btn-snooze').textContent = t(lang, 'snooze', { n: ringing.snoozeMin });
  $('#btn-dismiss').textContent = t(lang, 'dismiss');
  document.title = ringing.title;
  const ch = $('#challenge');
  const first = ch.hidden && ringing.challenge;
  ch.hidden = !ringing.challenge;
  if (first) { newProblem(); }
  if (ringing.message) speak(ringing.message);
}

async function send(type) {
  try { await chrome.runtime.sendMessage({ target: 'background', type }); } catch { /* worker restarting */ }
}

async function init() {
  const settings = await getSettings();
  lang = resolveLang(settings);
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir;
  if (settings.theme !== 'system') document.documentElement.dataset.theme = settings.theme;

  const { ringing: r } = await chrome.storage.session.get('ringing');
  if (!r) { window.close(); return; }
  ringing = r;
  render();
  (ringing.challenge ? $('#ring-answer') : $('#btn-dismiss')).focus();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'session' || !changes.ringing) return;
    if (!changes.ringing.newValue) { window.close(); return; }
    ringing = changes.ringing.newValue;
    render();
  });

  $('#ring-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (ringing.challenge) {
      const raw = $('#ring-answer').value.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
      if (Number(raw) !== a + b || raw === '') {
        $('#ring-error').textContent = t(lang, 'wrongAnswer');
        newProblem();
        $('#ring-answer').focus();
        return;
      }
    }
    speechSynthesis && speechSynthesis.cancel();
    await send('alarm:dismiss');
    window.close();
  });

  $('#btn-snooze').addEventListener('click', async () => {
    speechSynthesis && speechSynthesis.cancel();
    await send('alarm:snooze');
    window.close();
  });
}

init();
