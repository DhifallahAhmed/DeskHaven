import {
  t, resolveLang, getSettings, setSettings, getAlarms, setAlarms, allStations, getLocation,
  fetchWeather, computeAlerts, describeAlert, weatherAdvice, wmoKey, fmtTime,
  getPrayerDay, tunisDateStr, tunisTime, nextTime, nextRing, startSleep, cancelSleep,
  getTimers, addTimer, removeTimer, startPomodoro, stopPomodoro, POMO, PRAYERS,
  STATIONS, getStationCache, refreshStationCache, mergeStations,
} from './shared.js';

// Curated seed + the live Radio Browser directory (cached) + the user's own additions.
async function getCatalog(settings) {
  const cache = await getStationCache();
  return mergeStations(STATIONS, cache ? cache.list : [], settings.customStations || []);
}

const ICON = 'icons/icon128.png';

/* ------------------------------------------------------------------ */
/* Lifecycle                                                          */
/* ------------------------------------------------------------------ */

chrome.runtime.onInstalled.addListener(async () => {
  await setupMenus();
  await ensurePeriodic();
  await scheduleAll();
  await refreshWeather();
});
chrome.runtime.onStartup.addListener(async () => {
  await setupMenus();
  await ensurePeriodic();
  await scheduleAll();
  await refreshWeather();
});

async function ensurePeriodic() {
  const a = await chrome.alarms.get('refresh');
  if (!a) await chrome.alarms.create('refresh', { periodInMinutes: 30 });
  const b = await chrome.alarms.get('stations-refresh');
  if (!b) await chrome.alarms.create('stations-refresh', { periodInMinutes: 720, delayInMinutes: 1 });
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync') {
    if (changes.alarms) await scheduleAll();
    if (changes.settings) {
      const o = changes.settings.oldValue || {}, n = changes.settings.newValue || {};
      const changed = (k) => JSON.stringify(o[k]) !== JSON.stringify(n[k]);
      if (changed('lang') || changed('favorites') || changed('customStations')) await setupMenus();
      if (changed('govId') || changed('customLoc') || changed('badge') || changed('lang')) await refreshWeather();
      if (changed('govId') || changed('customLoc') || changed('prayerNotify') || changed('pauseRadioAtPrayer')) await scheduleAll();
    }
  }
});

/* ------------------------------------------------------------------ */
/* Scheduling                                                         */
/* ------------------------------------------------------------------ */

let chain = Promise.resolve();
function scheduleAll() {
  chain = chain.then(doSchedule).catch((e) => console.warn('schedule failed', e));
  return chain;
}

async function doSchedule() {
  const [settings, alarms] = await Promise.all([getSettings(), getAlarms()]);
  const loc = getLocation(settings);

  for (const a of await chrome.alarms.getAll()) {
    if (/^alarm:[^:]+$/.test(a.name) || a.name.startsWith('prayer|')) await chrome.alarms.clear(a.name);
  }

  for (const al of alarms) {
    if (!al.enabled) continue;
    const when = await nextRing(al, loc);
    if (when) await chrome.alarms.create('alarm:' + al.id, { when: when.getTime() });
  }

  if (settings.prayerNotify || settings.pauseRadioAtPrayer) {
    for (let i = 0; i < 2; i++) {
      const ds = tunisDateStr(new Date(Date.now() + i * 864e5));
      try {
        const day = await getPrayerDay(ds, loc);
        for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
          if (!day[name]) continue;
          const when = tunisTime(ds, day[name]).getTime();
          if (when > Date.now() + 1000) await chrome.alarms.create(`prayer|${name}|${when}`, { when });
        }
      } catch { /* offline: try again on the next refresh */ }
    }
  }
}

chrome.alarms.onAlarm.addListener(async (al) => {
  const n = al.name;
  try {
    if (n === 'refresh') { await refreshWeather(); await scheduleAll(); }
    else if (n === 'stations-refresh') { await refreshStationCache(); }
    else if (n === 'sleep') await sleepFinished();
    else if (n.startsWith('alarm:')) { const p = n.split(':'); await ringAlarm(p[1], p[2] === 'snooze'); }
    else if (n.startsWith('prayer|')) await prayerFired(n.split('|')[1]);
    else if (n.startsWith('timer:')) await timerFired(n.slice(6));
    else if (n === 'pomo') await pomoFired();
    else if (n === 'ring-timeout') await stopRinging(true);
  } catch (e) { console.warn('alarm handler failed', n, e); }
});

/* ------------------------------------------------------------------ */
/* Offscreen audio                                                    */
/* ------------------------------------------------------------------ */

let creatingOffscreen = null;
async function hasOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  return ctx.length > 0;
}
async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play radio streams and alarm sounds while the popup is closed.',
    }).finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}
async function toOffscreen(msg) {
  await ensureOffscreen();
  try { return await chrome.runtime.sendMessage({ target: 'offscreen', ...msg }); } catch (e) { console.warn('offscreen msg failed', e); }
}

/* ------------------------------------------------------------------ */
/* Radio                                                              */
/* ------------------------------------------------------------------ */

async function getRadioState() {
  const { radioState } = await chrome.storage.session.get('radioState');
  if (!(await hasOffscreen())) {
    if (radioState && radioState.status !== 'idle') {
      const idle = { ...radioState, status: 'idle', nowPlaying: null };
      await chrome.storage.session.set({ radioState: idle });
      return idle;
    }
  }
  return radioState || { status: 'idle' };
}

async function hasTrackPermission() {
  try { return await chrome.permissions.contains({ origins: ['*://*/*'] }); } catch { return false; }
}

async function playStation(id) {
  const settings = await getSettings();
  const list = await getCatalog(settings);
  const st = list.find((s) => s.id === id) || list[0];
  if (!st) return;
  await setSettings({ lastStation: st.id });
  const nowPlaying = settings.nowPlayingEnabled && (await hasTrackPermission());
  await toOffscreen({ type: 'radio:play', station: { id: st.id, name: st.name, urls: st.urls }, volume: settings.volume, nowPlaying });
}
async function pauseRadio() {
  if (await hasOffscreen()) await toOffscreen({ type: 'radio:stop' });
}
async function toggleRadio() {
  const st = await getRadioState();
  if (['playing', 'connecting', 'reconnecting'].includes(st.status)) await pauseRadio();
  else await playStation((await getSettings()).lastStation);
}
async function stepStation(dir) {
  const settings = await getSettings();
  const list = await getCatalog(settings);
  const favs = (settings.favorites || []).map((id) => list.find((s) => s.id === id)).filter(Boolean);
  const pool = favs.length > 1 ? favs : list;
  const cur = pool.findIndex((s) => s.id === settings.lastStation);
  const next = pool[(cur + dir + pool.length) % pool.length];
  await playStation(next.id);
}
async function sleepFinished() {
  await chrome.storage.session.remove('sleepEnd');
  if (await hasOffscreen()) await toOffscreen({ type: 'radio:fadeStop', seconds: 20 });
}

/* ------------------------------------------------------------------ */
/* Weather, badge and alerts                                          */
/* ------------------------------------------------------------------ */

async function refreshWeather() {
  const settings = await getSettings();
  const lang = resolveLang(settings);
  const loc = getLocation(settings, lang);
  let w = null, error = null;
  try {
    w = await fetchWeather(loc.lat, loc.lon);
    await chrome.storage.local.set({ weather: w });
  } catch (e) {
    error = String(e);
    const { weather } = await chrome.storage.local.get('weather');
    if (weather && Math.abs(weather.lat - loc.lat) < 0.01 && Math.abs(weather.lon - loc.lon) < 0.01) w = weather;
  }
  await updateBadge(w, settings, lang, loc);
  if (w && !error) await notifyAlerts(w, settings, lang);
  return { weather: w, error };
}

async function updateBadge(w, settings, lang, loc) {
  if (!settings.badge || !w) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: t(lang, 'appName') });
    return;
  }
  const temp = Math.round(w.current.temp);
  const color = temp <= 10 ? '#1D4E89' : temp <= 25 ? '#1B6B3A' : temp <= 34 ? '#8A4B00' : '#A50E24';
  await chrome.action.setBadgeText({ text: `${temp}°` });
  await chrome.action.setBadgeBackgroundColor({ color });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  const alerts = computeAlerts(w);
  const parts = [`${loc.name}: ${temp}°, ${t(lang, wmoKey(w.current.code))}`];
  if (alerts.length) parts.push(alerts.map((a) => describeAlert(lang, a)).join('. '));
  await chrome.action.setTitle({ title: parts.join('\n') });
}

async function notifyAlerts(w, settings, lang) {
  if (!settings.alertsNotify) return;
  const { notifiedAlerts = [] } = await chrome.storage.local.get('notifiedAlerts');
  const seen = new Set(notifiedAlerts);
  for (const a of computeAlerts(w)) {
    if (a.i > 1) continue;
    const key = `${a.kind}|${a.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chrome.notifications.create('wx-' + key, {
      type: 'basic', iconUrl: ICON, title: t(lang, 'alertsTitle'), message: describeAlert(lang, a), priority: 1,
    });
  }
  await chrome.storage.local.set({ notifiedAlerts: [...seen].slice(-40) });
}

/* ------------------------------------------------------------------ */
/* Alarm ringing                                                      */
/* ------------------------------------------------------------------ */

let ringWindowId = null;

async function ringAlarm(id, snoozed = false) {
  const alarms = await getAlarms();
  const al = alarms.find((x) => x.id === id);
  if (!al || (!al.enabled && !snoozed)) return;
  const settings = await getSettings();
  const lang = resolveLang(settings);
  const loc = getLocation(settings, lang);

  const stations = await getCatalog(settings);
  const st = stations.find((s) => s.id === al.station) || stations[0];
  const title = al.label || t(lang, 'ringingTitle');
  const ringing = { id: al.id, title, time: fmtTime(lang, new Date()), message: '', challenge: !!al.challenge, snoozeMin: al.snoozeMin || 9 };
  await chrome.storage.session.set({ ringing });

  // Start the sound and show the window first; the weather message follows a moment later.
  await toOffscreen({
    type: 'alarm:start', sound: al.sound, gradual: !!al.gradual,
    station: st ? { id: st.id, name: st.name, urls: st.urls } : null,
  });
  await openRingWindow();
  chrome.notifications.create('ringing', { type: 'basic', iconUrl: ICON, title, message: ringing.time, requireInteraction: true, priority: 2 });
  await chrome.alarms.create('ring-timeout', { delayInMinutes: 10 });

  if (!snoozed) {
    // one-time alarms switch themselves off; repeating ones are scheduled again
    const once = al.kind !== 'suhoor' && !(al.days && al.days.length);
    if (once) await setAlarms(alarms.map((x) => (x.id === al.id ? { ...x, enabled: false } : x)));
    else await scheduleAll();
  }

  if (al.weatherMsg) {
    let w = (await chrome.storage.local.get('weather')).weather || null;
    if (!w || Date.now() - w.fetchedAt > 3 * 3600 * 1000 || Math.abs(w.lat - loc.lat) > 0.01) {
      try { w = await fetchWeather(loc.lat, loc.lon); await chrome.storage.local.set({ weather: w }); } catch { /* keep cache */ }
    }
    const message = weatherAdvice(lang, w, loc.name);
    const { ringing: still } = await chrome.storage.session.get('ringing');
    if (still && still.id === al.id && message) await chrome.storage.session.set({ ringing: { ...still, message } });
  }
}

async function openRingWindow() {
  if (ringWindowId != null) {
    try { await chrome.windows.update(ringWindowId, { focused: true, drawAttention: true }); return; } catch { ringWindowId = null; }
  }
  const w = await chrome.windows.create({ url: 'alarm.html', type: 'popup', width: 440, height: 600, focused: true });
  ringWindowId = w.id;
}

chrome.windows.onRemoved.addListener(async (id) => {
  if (id !== ringWindowId) return;
  ringWindowId = null;
  const { ringing } = await chrome.storage.session.get('ringing');
  if (ringing && ringing.challenge) setTimeout(() => openRingWindow().catch(() => {}), 1200);
});
chrome.notifications.onClicked.addListener(async (nid) => {
  if (nid === 'ringing') {
    const { ringing } = await chrome.storage.session.get('ringing');
    if (ringing) await openRingWindow();
  }
});

async function stopRinging(timedOut = false) {
  await chrome.alarms.clear('ring-timeout');
  await chrome.storage.session.remove('ringing');
  chrome.notifications.clear('ringing');
  if (await hasOffscreen()) await toOffscreen({ type: 'alarm:stop' });
  if (ringWindowId != null) {
    const id = ringWindowId; ringWindowId = null;
    try { await chrome.windows.remove(id); } catch { /* already closed */ }
  }
}

async function snoozeRinging() {
  const { ringing } = await chrome.storage.session.get('ringing');
  if (!ringing) return;
  const alarmId = ringing.id, minutes = ringing.snoozeMin;
  await stopRinging();
  await chrome.alarms.create(`alarm:${alarmId}:snooze`, { delayInMinutes: minutes });
}

/* ------------------------------------------------------------------ */
/* Prayer, timers, Pomodoro                                           */
/* ------------------------------------------------------------------ */

async function prayerFired(name) {
  const settings = await getSettings();
  const lang = resolveLang(settings);
  const radio = await getRadioState();
  const playing = ['playing', 'connecting', 'reconnecting'].includes(radio.status);

  if (settings.pauseRadioAtPrayer && playing) {
    await chrome.storage.session.set({ resumeStation: radio.stationId });
    await toOffscreen({ type: 'radio:fadeStop', seconds: 2 });
  }
  if (settings.prayerNotify) {
    chrome.notifications.create('prayer-' + name + '-' + Date.now(), {
      type: 'basic', iconUrl: ICON, title: t(lang, 'p' + name), message: t(lang, 'prayerNotifBody', { name: t(lang, 'p' + name) }), priority: 1,
    });
  }
  if (settings.pauseRadioAtPrayer && playing) await new Promise((resolve) => setTimeout(resolve, 2500));
  await toOffscreen({ type: 'adhan:start' });
}

async function resumePausedRadio() {
  const { resumeStation } = await chrome.storage.session.get('resumeStation');
  if (!resumeStation) return;
  await chrome.storage.session.remove('resumeStation');
  await playStation(resumeStation);
}

async function timerFired(id) {
  const lang = resolveLang(await getSettings());
  const timers = await getTimers();
  const tm = timers.find((x) => x.id === id);
  await removeTimer(id);
  chrome.notifications.create('timer-' + id, { type: 'basic', iconUrl: ICON, title: t(lang, 'timerDone'), message: tm ? tm.label : '', priority: 2 });
  await toOffscreen({ type: 'chime' });
}

async function pomoFired() {
  const lang = resolveLang(await getSettings());
  const { pomodoro: p } = await chrome.storage.local.get('pomodoro');
  if (!p) return;
  let next;
  if (p.phase === 'focus') {
    const phase = p.cycle % 4 === 0 ? 'long' : 'short';
    next = { phase, cycle: p.cycle, endTs: Date.now() + POMO[phase] * 60000 };
    chrome.notifications.create('pomo-' + Date.now(), { type: 'basic', iconUrl: ICON, title: t(lang, 'pomodoro'), message: t(lang, 'pomoFocusEnd'), priority: 2 });
  } else {
    next = { phase: 'focus', cycle: p.cycle + 1, endTs: Date.now() + POMO.focus * 60000 };
    chrome.notifications.create('pomo-' + Date.now(), { type: 'basic', iconUrl: ICON, title: t(lang, 'pomodoro'), message: t(lang, 'pomoBreakEnd'), priority: 2 });
  }
  await chrome.storage.local.set({ pomodoro: next });
  await chrome.alarms.create('pomo', { when: next.endTs });
  await toOffscreen({ type: 'chime' });
}

/* ------------------------------------------------------------------ */
/* Context menu (right-click the toolbar icon)                        */
/* ------------------------------------------------------------------ */

async function setupMenus() {
  const lang = resolveLang(await getSettings());
  await chrome.contextMenus.removeAll();
  const c = { contexts: ['action'] };
  chrome.contextMenus.create({ id: 'toggle', title: t(lang, 'cmToggle'), ...c });
  chrome.contextMenus.create({ id: 'next', title: t(lang, 'cmNext'), ...c });
  chrome.contextMenus.create({ id: 'prev', title: t(lang, 'cmPrev'), ...c });
  chrome.contextMenus.create({ id: 'sleep', title: t(lang, 'cmSleep'), ...c });
  for (const n of [15, 30, 60, 90]) chrome.contextMenus.create({ id: 'sleep-' + n, parentId: 'sleep', title: t(lang, 'cmMinutes', { n }), ...c });
  chrome.contextMenus.create({ id: 'sleep-off', parentId: 'sleep', title: t(lang, 'cmSleepOff'), ...c });
  chrome.contextMenus.create({ id: 'timer', title: t(lang, 'cmTimer'), ...c });
  for (const n of [5, 10, 15, 25]) chrome.contextMenus.create({ id: 'timer-' + n, parentId: 'timer', title: t(lang, 'cmMinutes', { n }), ...c });
  chrome.contextMenus.create({ id: 'pomo', title: t(lang, 'cmPomo'), ...c });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const id = String(info.menuItemId);
  const lang = resolveLang(await getSettings());
  if (id === 'toggle') await toggleRadio();
  else if (id === 'next') await stepStation(1);
  else if (id === 'prev') await stepStation(-1);
  else if (id === 'sleep-off') await cancelSleep();
  else if (id.startsWith('sleep-')) await startSleep(Number(id.slice(6)));
  else if (id.startsWith('timer-')) {
    const n = Number(id.slice(6));
    await addTimer(n, t(lang, 'min', { n }));
  } else if (id === 'pomo') await startPomodoro();
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === 'toggle-radio') await toggleRadio();
  else if (cmd === 'next-station') await stepStation(1);
  else if (cmd === 'prev-station') await stepStation(-1);
});

/* ------------------------------------------------------------------ */
/* Messages from the popup, the alarm window and the offscreen page   */
/* ------------------------------------------------------------------ */

async function handle(msg) {
  switch (msg.type) {
    case 'radio:state':
      await chrome.storage.session.set({ radioState: msg.state });
      return { ok: true };
    case 'radio:sync': return { state: await getRadioState() };
    case 'radio:play': await playStation(msg.id); return { ok: true };
    case 'radio:toggle': await toggleRadio(); return { ok: true };
    case 'radio:pause': await pauseRadio(); return { ok: true };
    case 'radio:step': await stepStation(msg.dir); return { ok: true };
    case 'wx:refresh': return await refreshWeather();
    case 'alarms:changed': await scheduleAll(); return { ok: true };
    case 'alarm:dismiss': await stopRinging(); return { ok: true };
    case 'alarm:snooze': await snoozeRinging(); return { ok: true };
    case 'menus:rebuild': await setupMenus(); return { ok: true };
    case 'stations:list': { const c = await getStationCache(); return { list: c ? c.list : [], ts: c ? c.ts : 0 }; }
    case 'stations:refresh': { const c = await refreshStationCache(); return { list: c.list, ts: c.ts, error: !!c.error }; }
    case 'adhan:preview': await toOffscreen({ type: 'adhan:start' }); return { ok: true };
    case 'adhan:stop': await toOffscreen({ type: 'adhan:stop' }); await resumePausedRadio(); return { ok: true };
    case 'adhan:ended': await resumePausedRadio(); return { ok: true };
    default: return { error: 'unknown message' };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== 'background') return;
  handle(msg).then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true;
});

// Make sure the periodic refresh exists every time the worker starts.
ensurePeriodic();
