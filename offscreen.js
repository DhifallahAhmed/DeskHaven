// Runs in an offscreen document so audio keeps playing when the popup is closed.
// Only chrome.runtime is available here, so state is reported to the service worker by message.

/* ------------------------------------------------------------------ */
/* Radio                                                              */
/* ------------------------------------------------------------------ */

const radio = new Audio();
radio.preload = 'none';

let cur = null; // { station, urlIndex, attempts, want, np }
let state = { status: 'idle', stationId: null, name: null, nowPlaying: null };
let userVolume = 0.8;
let stallTimer = null, retryTimer = null, npTimer = null, fadeTimer = null;
let npMisses = 0, lastFail = 0, internalPause = false;

function sendState(patch) {
  state = { ...state, ...patch };
  chrome.runtime.sendMessage({ target: 'background', type: 'radio:state', state }).catch(() => {});
  updateMediaSession();
}

function clearTimers() {
  clearTimeout(stallTimer); clearTimeout(retryTimer); clearInterval(npTimer); clearInterval(fadeTimer);
  stallTimer = retryTimer = npTimer = fadeTimer = null;
}

function startStation(station, volume, np) {
  clearTimers();
  if (typeof volume === 'number') userVolume = volume;
  radio.volume = userVolume;
  cur = { station, urlIndex: 0, attempts: 0, want: true, np: !!np };
  npMisses = 0;
  sendState({ status: 'connecting', stationId: station.id, name: station.name, nowPlaying: null });
  tryUrl();
}

function tryUrl() {
  if (!cur || !cur.want) return;
  clearTimeout(stallTimer);
  internalPause = true;
  radio.src = cur.station.urls[cur.urlIndex];
  internalPause = false;
  radio.volume = fadeTimer ? radio.volume : userVolume;
  const p = radio.play();
  if (p && p.catch) p.catch((e) => { if (e && e.name !== 'AbortError') onFail(); });
  stallTimer = setTimeout(() => {
    if (cur && cur.want && (radio.paused || radio.readyState < 3)) onFail();
  }, 12000);
}

function onFail() {
  const now = Date.now();
  if (now - lastFail < 500) return;
  lastFail = now;
  if (!cur || !cur.want) return;
  clearTimeout(stallTimer);
  if (cur.urlIndex < cur.station.urls.length - 1) {
    cur.urlIndex++;
    sendState({ status: 'connecting' });
    tryUrl();
    return;
  }
  cur.urlIndex = 0;
  cur.attempts++;
  if (cur.attempts > 6) {
    cur.want = false;
    hardStop();
    sendState({ status: 'error', nowPlaying: null });
    return;
  }
  sendState({ status: 'reconnecting' });
  clearTimeout(retryTimer);
  retryTimer = setTimeout(tryUrl, Math.min(30000, 1500 * 2 ** cur.attempts));
}

function hardStop() {
  internalPause = true;
  radio.pause();
  radio.removeAttribute('src');
  radio.load();
  internalPause = false;
  radio.volume = userVolume;
}

function stopStation() {
  clearTimers();
  if (cur) cur.want = false;
  hardStop();
  sendState({ status: 'paused', nowPlaying: null });
}

function fadeStop(seconds) {
  if (!cur || !cur.want) return;
  clearInterval(fadeTimer);
  const startVol = radio.volume, steps = Math.max(1, Math.round(seconds * 10));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    radio.volume = Math.max(0, startVol * (1 - i / steps));
    if (i >= steps) { clearInterval(fadeTimer); fadeTimer = null; stopStation(); }
  }, 100);
}

radio.addEventListener('playing', () => {
  clearTimeout(stallTimer);
  if (!cur || !cur.want) return;
  cur.attempts = 0;
  sendState({ status: 'playing' });
  startNowPlaying();
});
radio.addEventListener('error', () => { if (cur && cur.want) onFail(); });
radio.addEventListener('ended', () => { if (cur && cur.want) onFail(); });
radio.addEventListener('waiting', () => {
  if (!cur || !cur.want) return;
  clearTimeout(stallTimer);
  stallTimer = setTimeout(() => { if (cur && cur.want && radio.readyState < 3) onFail(); }, 15000);
});
radio.addEventListener('pause', () => {
  if (internalPause || !cur || !cur.want) return;
  // paused from outside (media key or system controls)
  stopStation();
});

/* ---- track title from Icecast/Shoutcast metadata (needs the optional permission) ---- */

function startNowPlaying() {
  clearInterval(npTimer);
  if (!cur || !cur.np) return;
  npMisses = 0;
  pollNowPlaying();
  npTimer = setInterval(pollNowPlaying, 25000);
}

async function pollNowPlaying() {
  if (!cur || !cur.want) return;
  const url = cur.station.urls[cur.urlIndex];
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await readIcy(url, ctl.signal);
    if (!r.supported) { if (++npMisses >= 2) clearInterval(npTimer); }
    else if (r.title && r.title !== state.nowPlaying) sendState({ nowPlaying: r.title });
  } catch {
    if (++npMisses >= 4) clearInterval(npTimer);
  } finally {
    clearTimeout(to);
  }
}

async function readIcy(url, signal) {
  const res = await fetch(url, { headers: { 'Icy-MetaData': '1' }, signal, cache: 'no-store' });
  const metaint = parseInt(res.headers.get('icy-metaint') || '0', 10);
  if (!metaint || !res.body) { try { res.body && res.body.cancel(); } catch {} return { supported: false }; }
  const reader = res.body.getReader();
  let buf = new Uint8Array(0);
  const ready = () => buf.length > metaint && buf.length >= metaint + 1 + buf[metaint] * 16;
  while (!ready()) {
    const { value, done } = await reader.read();
    if (done) break;
    const nb = new Uint8Array(buf.length + value.length);
    nb.set(buf); nb.set(value, buf.length);
    buf = nb;
    if (buf.length > metaint + 5000) break;
  }
  try { reader.cancel(); } catch {}
  if (!ready()) return { supported: true, title: null };
  const len = buf[metaint] * 16;
  const text = new TextDecoder('utf-8').decode(buf.slice(metaint + 1, metaint + 1 + len));
  const m = /StreamTitle='(.*?)';/s.exec(text);
  const title = m ? m[1].trim() : null;
  return { supported: true, title: title || null };
}

/* ---- media keys / system controls ---- */

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch {} };
  set('play', () => {
    if (!cur) return;
    cur.want = true; cur.attempts = 0; cur.urlIndex = 0;
    sendState({ status: 'connecting' });
    tryUrl();
  });
  set('pause', () => stopStation());
  set('stop', () => stopStation());
  set('previoustrack', () => chrome.runtime.sendMessage({ target: 'background', type: 'radio:step', dir: -1 }).catch(() => {}));
  set('nexttrack', () => chrome.runtime.sendMessage({ target: 'background', type: 'radio:step', dir: 1 }).catch(() => {}));
}
function updateMediaSession() {
  if (!('mediaSession' in navigator) || !state.name) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: state.nowPlaying || state.name, artist: state.name, album: 'DeskHaven' });
    navigator.mediaSession.playbackState = state.status === 'playing' ? 'playing' : 'paused';
  } catch {}
}
setupMediaSession();

/* ------------------------------------------------------------------ */
/* Alarm sound and chimes                                             */
/* ------------------------------------------------------------------ */

const alarmAudio = new Audio();
const chimeAudio = new Audio();
let alarmToken = 0, alarmRamp = null, beepUrl = null, chimeUrl = null;

function wavUrl(samples, rate) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, samples[i], true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function makeBeep() {
  const rate = 22050, pcm = new Int16Array(Math.floor(rate * 1.8));
  for (const start of [0, 0.2, 0.4, 0.6]) {
    const s = Math.floor(start * rate), len = Math.floor(0.12 * rate);
    for (let i = 0; i < len; i++) {
      const env = Math.min(1, i / 200, (len - i) / 200);
      pcm[s + i] = Math.sin((2 * Math.PI * 1000 * i) / rate) * env * 0.6 * 32767;
    }
  }
  return wavUrl(pcm, rate);
}
function makeChime() {
  const rate = 22050, pcm = new Int16Array(Math.floor(rate * 1.4));
  [[660, 0], [880, 0.35]].forEach(([f, start]) => {
    const s = Math.floor(start * rate), len = Math.floor(0.9 * rate);
    for (let i = 0; i < len && s + i < pcm.length; i++) {
      const env = Math.min(1, i / 300) * Math.exp(-3 * (i / len));
      pcm[s + i] += Math.sin((2 * Math.PI * f * i) / rate) * env * 0.5 * 32767;
    }
  });
  return wavUrl(pcm, rate);
}

function playBeep() {
  alarmAudio.onerror = null; alarmAudio.onended = null;
  alarmAudio.loop = true;
  alarmAudio.src = beepUrl || (beepUrl = makeBeep());
  alarmAudio.play().catch(() => {});
}

function playAlarmUrls(urls, i, token) {
  if (token !== alarmToken) return;
  if (i >= urls.length) { playBeep(); return; }
  alarmAudio.loop = false;
  alarmAudio.onerror = null; alarmAudio.onended = null;
  alarmAudio.src = urls[i];
  let settled = false;
  const cleanup = () => { clearTimeout(timer); alarmAudio.removeEventListener('error', next); alarmAudio.removeEventListener('playing', ok); };
  const next = () => { if (settled || token !== alarmToken) return; settled = true; cleanup(); playAlarmUrls(urls, i + 1, token); };
  const ok = () => {
    settled = true; cleanup();
    const fallback = () => { if (token === alarmToken) playBeep(); };
    alarmAudio.onerror = fallback; alarmAudio.onended = fallback;
  };
  const timer = setTimeout(next, 10000);
  alarmAudio.addEventListener('error', next);
  alarmAudio.addEventListener('playing', ok);
  alarmAudio.play().catch(next);
}

function startRamp(gradual) {
  clearInterval(alarmRamp);
  if (!gradual) { alarmAudio.volume = 1; return; }
  let v = 0.08;
  alarmAudio.volume = v;
  alarmRamp = setInterval(() => {
    v = Math.min(1, v + 0.92 / 45);
    alarmAudio.volume = v;
    if (v >= 1) clearInterval(alarmRamp);
  }, 1000);
}

function alarmStop() {
  alarmToken++;
  clearInterval(alarmRamp);
  alarmAudio.onerror = null; alarmAudio.onended = null;
  alarmAudio.pause();
  alarmAudio.removeAttribute('src');
  alarmAudio.load();
  alarmAudio.loop = false;
  alarmAudio.volume = 1;
}

function alarmStart(m) {
  alarmStop();
  if (cur && cur.want) stopStation(); // the alarm takes over from the radio
  const token = alarmToken;
  const useRadio = m.sound === 'radio' && m.station && m.station.urls && m.station.urls.length;
  if (useRadio) playAlarmUrls(m.station.urls, 0, token); else playBeep();
  startRamp(m.gradual);
}

function chime() {
  chimeAudio.src = chimeUrl || (chimeUrl = makeChime());
  chimeAudio.volume = 0.9;
  chimeAudio.play().catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Adhan (full call to prayer, distinct from the alarm/chime channel) */
/* ------------------------------------------------------------------ */

const adhanAudio = new Audio();
let adhanToken = 0;

function adhanEndedMsg() {
  chrome.runtime.sendMessage({ target: 'background', type: 'adhan:ended' }).catch(() => {});
}

function adhanStart() {
  const token = ++adhanToken;
  adhanAudio.pause();
  adhanAudio.src = chrome.runtime.getURL('sounds/adhan.ogg');
  adhanAudio.loop = false;
  adhanAudio.volume = 1;
  adhanAudio.currentTime = 0;
  const done = () => {
    if (token !== adhanToken) return;
    adhanAudio.onerror = null;
    adhanAudio.onended = null;
    adhanEndedMsg();
  };
  adhanAudio.onerror = done;
  adhanAudio.onended = done;
  const p = adhanAudio.play();
  if (p && p.catch) p.catch(done);
}
function adhanStop() {
  adhanToken++;
  adhanAudio.pause();
  adhanAudio.onerror = null;
  adhanAudio.onended = null;
  adhanAudio.removeAttribute('src');
  adhanAudio.load();
}

/* ------------------------------------------------------------------ */
/* Messages                                                           */
/* ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((m, sender, sendResponse) => {
  if (!m || m.target !== 'offscreen') return;
  switch (m.type) {
    case 'radio:play': startStation(m.station, m.volume, m.nowPlaying); break;
    case 'radio:stop': stopStation(); break;
    case 'radio:fadeStop': fadeStop(m.seconds || 15); break;
    case 'radio:volume':
      userVolume = m.volume;
      if (!fadeTimer) radio.volume = userVolume;
      break;
    case 'alarm:start': alarmStart(m); break;
    case 'alarm:stop': alarmStop(); break;
    case 'chime': chime(); break;
    case 'adhan:start': adhanStart(); break;
    case 'adhan:stop': adhanStop(); break;
  }
  sendResponse({ ok: true });
});
