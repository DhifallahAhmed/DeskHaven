import * as S from './shared.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let settings, lang;
const T = (k, p) => S.t(lang, k, p);

function say(msg) {
  const el = $('#live');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 60);
}
function sayAlert(msg) {
  const el = $('#live-alert');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 60);
}
async function bg(type, extra = {}) {
  try { return await chrome.runtime.sendMessage({ target: 'background', type, ...extra }); } catch { return null; }
}
const stationName = (s) => (lang === 'ar' && s.ar ? s.ar : s.name);
const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

/* ------------------------------------------------------------------ */
/* Language, theme, tabs                                              */
/* ------------------------------------------------------------------ */

function applyStatic() {
  lang = S.resolveLang(settings);
  const root = document.documentElement;
  root.lang = lang;
  root.dir = S.LANGS[lang].dir;
  if (settings.theme === 'light' || settings.theme === 'dark') root.dataset.theme = settings.theme; else delete root.dataset.theme;
  $$('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', T(el.dataset.i18nAria)));
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.dataset.i18nPh); });
  document.title = T('appName');
}

const tabs = () => $$('[role="tab"]');
function selectTab(tab, focus) {
  tabs().forEach((x) => {
    const on = x === tab;
    x.setAttribute('aria-selected', String(on));
    x.tabIndex = on ? 0 : -1;
    $('#' + x.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
  chrome.storage.session.set({ lastTab: tab.dataset.tab });
  if (tab.dataset.tab === 'weather') loadWeather();
  if (tab.dataset.tab === 'prayer') loadPrayer();
  if (tab.dataset.tab === 'more') loadRates();
}
function setupTabs() {
  const list = tabs();
  list.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const rtl = document.documentElement.dir === 'rtl';
      let n = null;
      if (e.key === 'ArrowRight') n = rtl ? i - 1 : i + 1;
      else if (e.key === 'ArrowLeft') n = rtl ? i + 1 : i - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = list.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(list[(n + list.length) % list.length], true); }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.shiftKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); selectTab(list[Number(e.key) - 1], true); }
  });
}

/* ------------------------------------------------------------------ */
/* Radio                                                              */
/* ------------------------------------------------------------------ */

let radio = { status: 'idle' };
let dynamicStations = [];
let stationsMeta = { ts: 0 };

function fullStations() {
  return S.mergeStations(S.STATIONS, dynamicStations, settings.customStations || []);
}
let sleepEnd = null;
const ACTIVE = ['playing', 'connecting', 'reconnecting'];

function currentStation() {
  const list = fullStations();
  return list.find((s) => s.id === (radio.stationId || settings.lastStation)) || list[0];
}

function renderRadioStatus(announce) {
  const st = currentStation();
  const active = ACTIVE.includes(radio.status);
  const key = { idle: 'sIdle', connecting: 'sConnecting', playing: 'sPlaying', paused: 'sPaused', reconnecting: 'sReconnecting', error: 'sError' }[radio.status] || 'sIdle';
  $('#np-station').textContent = st ? stationName(st) : T('noStation');
  $('#np-status').textContent = T(key);
  $('#np-track').textContent = radio.status === 'playing' && radio.nowPlaying ? T('nowPlaying', { t: radio.nowPlaying }) : '';
  $('#btn-play').setAttribute('aria-label', active ? T('pause') : T('play'));
  $('#play-ico').textContent = active ? '⏸' : '▶';
  $('#btn-prev').setAttribute('aria-label', T('prev'));
  $('#btn-next').setAttribute('aria-label', T('next'));
  $('#eq').classList.toggle('on', radio.status === 'playing');
  $('.deck-art')?.classList.toggle('live', active);
  $$('.stations li[data-id]').forEach((li) => {
    const cur = st && li.dataset.id === st.id && radio.status !== 'idle';
    li.classList.toggle('cur', !!cur);
    const b = $('.st-play', li);
    if (!b) return;
    const name = li.dataset.name;
    if (cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    b.setAttribute('aria-label', cur && active ? T('stationPlaying', { name }) : T('playStation', { name }));
  });
  if (announce && st) {
    const msg = `${stationName(st)}: ${T(key)}`;
    if (radio.status === 'error') sayAlert(msg); else say(msg);
  }
}

function stationItem(s, isFav) {
  const name = stationName(s);
  return `<li data-id="${esc(s.id)}" data-name="${esc(name)}">
    <button class="st-play" data-id="${esc(s.id)}"><span class="dot" aria-hidden="true"></span><span>${esc(name)}</span></button>
    <button class="st-side st-fav" data-id="${esc(s.id)}" aria-pressed="${isFav}" aria-label="${esc(T(isFav ? 'removeFav' : 'addFav', { name }))}"><span aria-hidden="true">${isFav ? '★' : '☆'}</span></button>
    ${s.custom ? `<button class="st-side st-del" data-id="${esc(s.id)}" aria-label="${esc(T('removeStation', { name }))}"><span aria-hidden="true">✕</span></button>` : ''}
  </li>`;
}

function renderLists() {
  const list = fullStations();
  const favIds = settings.favorites || [];
  const favs = favIds.map((id) => list.find((s) => s.id === id)).filter(Boolean);
  $('#fav-list').innerHTML = favs.map((s) => stationItem(s, true)).join('');
  $('#fav-empty').hidden = favs.length > 0;
  $('#station-list').innerHTML = list.map((s) => stationItem(s, favIds.includes(s.id))).join('');
  renderRadioStatus(false);
}

function renderSleep() {
  const sel = $('#sleep-sel'), info = $('#sleep-info');
  const running = $('option[value="running"]', sel);
  if (sleepEnd && sleepEnd > Date.now()) {
    const txt = T('sleepLeft', { t: S.fmtDur(lang, sleepEnd - Date.now()) });
    running.hidden = false; running.textContent = txt; info.textContent = txt;
    if (document.activeElement !== sel) sel.value = 'running';
  } else {
    running.hidden = true; info.textContent = '';
    if (sel.value === 'running') sel.value = '0';
  }
}
function buildSleepOptions() {
  const sel = $('#sleep-sel');
  const keep = sel.value;
  sel.innerHTML = `<option value="0">${esc(T('sleepOff'))}</option><option value="running" hidden></option>` +
    [15, 30, 45, 60, 90].map((n) => `<option value="${n}">${esc(T('min', { n }))}</option>`).join('');
  sel.value = keep && $(`option[value="${keep}"]`, sel) ? keep : '0';
  renderSleep();
}

const saveVolume = debounce((v) => S.setSettings({ volume: v }), 600);

function focusAfterRender(selectors) {
  for (const s of selectors) { const el = $(s); if (el) { el.focus(); return; } }
}

async function initRadio() {
  const r = await bg('radio:sync');
  radio = (r && r.state) || { status: 'idle' };
  const { sleepEnd: se } = await chrome.storage.session.get('sleepEnd');
  sleepEnd = se || null;

  $('#vol').value = Math.round(settings.volume * 100);
  $('#vol').setAttribute('aria-valuetext', T('volumeText', { n: Math.round(settings.volume * 100) }));
  $('#np-toggle').checked = !!settings.nowPlayingEnabled;
  buildSleepOptions();
  renderLists();
  renderRadioStatus(false);

  $('#btn-play').addEventListener('click', () => bg('radio:toggle'));
  $('#btn-prev').addEventListener('click', () => bg('radio:step', { dir: -1 }));
  $('#btn-next').addEventListener('click', () => bg('radio:step', { dir: 1 }));

  $('#vol').addEventListener('input', (e) => {
    const n = Number(e.target.value), v = n / 100;
    e.target.setAttribute('aria-valuetext', T('volumeText', { n }));
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'radio:volume', volume: v }).catch(() => {});
    saveVolume(v);
  });

  $('#sleep-sel').addEventListener('change', async (e) => {
    if (e.target.value === 'running') return;
    const n = Number(e.target.value);
    if (n > 0) { await S.startSleep(n); say(T('sleepSet', { n })); }
    else { await S.cancelSleep(); say(T('sleepCancelled')); }
  });

  const listClick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const inFav = !!btn.closest('#fav-list');
    if (btn.classList.contains('st-play')) {
      if (id === (radio.stationId || settings.lastStation) && ACTIVE.includes(radio.status)) await bg('radio:pause');
      else await bg('radio:play', { id });
    } else if (btn.classList.contains('st-fav')) {
      const favs = new Set(settings.favorites || []);
      const st = fullStations().find((s) => s.id === id);
      const name = st ? stationName(st) : id;
      if (favs.has(id)) { favs.delete(id); say(T('favRemoved', { name })); } else { favs.add(id); say(T('favAdded', { name })); }
      settings = await S.setSettings({ favorites: [...favs] });
      renderLists();
      focusAfterRender(inFav
        ? [`#fav-list .st-fav[data-id="${id}"]`, `#station-list .st-fav[data-id="${id}"]`, '#fav-list .st-play']
        : [`#station-list .st-fav[data-id="${id}"]`]);
    } else if (btn.classList.contains('st-del')) {
      const st = fullStations().find((s) => s.id === id);
      settings = await S.setSettings({
        customStations: settings.customStations.filter((s) => s.id !== id),
        favorites: (settings.favorites || []).filter((f) => f !== id),
      });
      renderLists();
      say(T('stationRemoved', { name: st ? stationName(st) : '' }));
      focusAfterRender(['#station-list .st-play']);
    }
  };
  $('#fav-list').addEventListener('click', listClick);
  $('#station-list').addEventListener('click', listClick);

  $('#np-toggle').addEventListener('change', async (e) => {
    if (e.target.checked) {
      let ok = false;
      try { ok = await chrome.permissions.request({ origins: ['*://*/*'] }); } catch { ok = false; }
      if (!ok) { e.target.checked = false; sayAlert(T('trackDenied')); return; }
    }
    settings = await S.setSettings({ nowPlayingEnabled: e.target.checked });
  });

  initFinder();
  await initStationDirectory();
}

async function renderStationsStatus() {
  const el = $('#stations-status');
  if (!stationsMeta.ts) { el.textContent = ''; return; }
  el.textContent = stationsMeta.error
    ? T('stationsOffline', { t: S.fmtTime(lang, new Date(stationsMeta.ts)) })
    : T('stationsUpdated', { t: S.fmtTime(lang, new Date(stationsMeta.ts)) });
}

async function initStationDirectory() {
  const r = await bg('stations:list');
  if (r && r.list) { dynamicStations = r.list; stationsMeta = { ts: r.ts, error: false }; }
  renderLists(); buildStationSelect(); renderStationsStatus();

  $('#stations-refresh').addEventListener('click', async () => {
    const btn = $('#stations-refresh');
    btn.disabled = true;
    $('#stations-status').textContent = T('stationsRefreshing');
    const r2 = await bg('stations:refresh');
    btn.disabled = false;
    if (r2 && r2.list) {
      dynamicStations = r2.list; stationsMeta = { ts: r2.ts, error: !!r2.error };
      renderLists(); buildStationSelect(); renderStationsStatus();
      say(r2.error ? T('stationsOffline', { t: S.fmtTime(lang, new Date(r2.ts)) }) : T('stationsUpdated', { t: S.fmtTime(lang, new Date(r2.ts)) }));
    }
  });
}

/* ---- finding and adding stations ---- */

let findResults = [];
function hashId(url) { let h = 0; for (const c of url) h = (h * 31 + c.charCodeAt(0)) | 0; return 'c' + (h >>> 0).toString(36); }

async function searchDirectory(q) {
  const params = new URLSearchParams({ countrycode: 'TN', hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: '30' });
  if (q) params.set('name', q);
  let last;
  for (const h of ['de1', 'nl1', 'at1']) {
    try { return await S.fetchJson(`https://${h}.api.radio-browser.info/json/stations/search?${params}`, 8000); } catch (e) { last = e; }
  }
  throw last;
}

function renderFindResults() {
  $('#find-results').innerHTML = findResults.map((r, i) => `<li>
    <span class="grow">${esc(r.name)}${r.codec ? ` <span class="muted small">${esc(r.codec)}${r.bitrate ? ' ' + esc(r.bitrate) + 'k' : ''}</span>` : ''}</span>
    <button class="st-add" data-i="${i}" aria-label="${esc(T('addStation', { name: r.name }))}">${esc(T('add'))}</button></li>`).join('');
}

function initFinder() {
  $('#find-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#find-status').textContent = T('searching');
    try {
      const raw = await searchDirectory($('#find-q').value.trim());
      const have = new Set(fullStations().flatMap((s) => s.urls));
      const seen = new Set();
      findResults = raw
        .filter((r) => r.url_resolved && !r.hls && !/\.m3u8?(\?|$)/i.test(r.url_resolved) && /^https?:/i.test(r.url_resolved))
        .filter((r) => { if (have.has(r.url_resolved) || seen.has(r.url_resolved)) return false; seen.add(r.url_resolved); return true; })
        .map((r) => ({ name: (r.name || '').trim() || r.url_resolved, urls: [...new Set([r.url_resolved, r.url].filter(Boolean))], codec: r.codec, bitrate: r.bitrate }));
      renderFindResults();
      $('#find-status').textContent = findResults.length ? '' : T('noResults');
    } catch {
      findResults = []; renderFindResults();
      $('#find-status').textContent = T('searchError');
    }
  });

  $('#find-results').addEventListener('click', async (e) => {
    const b = e.target.closest('.st-add');
    if (!b) return;
    const r = findResults[Number(b.dataset.i)];
    if (!r) return;
    const st = { id: hashId(r.urls[0]), name: r.name, urls: r.urls, custom: true };
    settings = await S.setSettings({ customStations: [...(settings.customStations || []), st] });
    findResults.splice(Number(b.dataset.i), 1);
    renderFindResults(); renderLists();
    say(T('stationAdded', { name: r.name }));
    focusAfterRender(['#find-results .st-add', '#find-q']);
  });

  $('#custom-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#cs-name').value.trim(), url = $('#cs-url').value.trim();
    let ok = name && /^https?:\/\//i.test(url);
    try { if (ok) new URL(url); } catch { ok = false; }
    if (!ok) { sayAlert(T('badUrl')); return; }
    const st = { id: hashId(url), name, urls: [url], custom: true };
    if (!fullStations().some((s) => s.id === st.id)) settings = await S.setSettings({ customStations: [...(settings.customStations || []), st] });
    $('#custom-form').reset();
    renderLists();
    say(T('stationAdded', { name }));
    $('#cs-name').focus();
  });
}

/* ------------------------------------------------------------------ */
/* Weather                                                            */
/* ------------------------------------------------------------------ */

let wxData = null, wxBusy = false, wxOffline = false;

function fillGov() {
  const sel = $('#gov');
  const items = [...S.GOVERNORATES].sort((a, b) => a[lang].localeCompare(b[lang], S.LANGS[lang].locale));
  let html = items.map((g) => `<option value="${g.id}">${esc(g[lang])}</option>`).join('');
  const g = S.GOVERNORATES.find((x) => x.id === settings.govId) || S.GOVERNORATES[0];
  if (settings.customLoc) html = `<option value="custom">${esc(T('customLocation', { name: g[lang] }))}</option>` + html;
  sel.innerHTML = html;
  sel.value = settings.customLoc ? 'custom' : settings.govId;
}

function locMatches(w) {
  const l = S.getLocation(settings, lang);
  return w && Math.abs(w.lat - l.lat) < 0.01 && Math.abs(w.lon - l.lon) < 0.01;
}

async function loadWeather() {
  if (wxBusy) return;
  wxBusy = true;
  if (!wxData) $('#wx-body').innerHTML = `<p class="muted">${esc(T('loading'))}</p>`;
  const r = await bg('wx:refresh');
  wxBusy = false;
  if (r && r.weather && locMatches(r.weather)) { wxData = r.weather; wxOffline = !!r.error; renderWeather(); }
  else if (!wxData) { $('#wx-body').innerHTML = `<p class="error" role="alert">${esc(T('wxError'))}</p>`; $('#wx-alerts').innerHTML = ''; }
  else { wxOffline = true; renderWeather(); }
}

function renderWeather() {
  const w = wxData;
  if (!w) return;
  const loc = S.getLocation(settings, lang);
  const cur = w.current, cond = T(S.wmoKey(cur.code));
  const tz = 'Africa/Tunis';
  const alerts = S.computeAlerts(w);

  $('#wx-alerts').innerHTML = alerts.length
    ? `<div class="alerts"><h2 id="wx-alerts-h">${esc(T('alertsTitle'))}</h2><ul>${alerts.map((a) => `<li>${esc(S.describeAlert(lang, a))}</li>`).join('')}</ul></div>`
    : `<h2 id="wx-alerts-h" class="sr-only">${esc(T('alertsTitle'))}</h2><p class="muted">${esc(T('noAlerts'))}</p>`;

  const temp = Math.round(cur.temp);
  const key = S.wmoKey(cur.code);
  const tint = !cur.day ? 'night' : ['c61','c51','c80','c95'].includes(key) ? 'rain' : ['c3','c45'].includes(key) ? 'cloud' : 'sun';
  let html = `<div class="wx-now" data-tint="${tint}">
    <span class="wx-ico" aria-hidden="true">${S.wmoIcon(cur.code, cur.day)}</span>
    <span class="wx-temp" aria-hidden="true">${temp}°</span>
    <div class="wx-meta">
      <h2 class="city">${esc(loc.name)}</h2>
      <p><span class="sr-only">${temp}°, </span>${esc(cond)}, ${esc(T('feelsLike', { n: Math.round(cur.feels) }))}</p>
      <p class="muted">${esc(T('humidity', { n: Math.round(cur.humidity) }))}, ${esc(T('wind', { n: Math.round(cur.wind) }))}, ${esc(T('gusts', { n: Math.round(cur.gust) }))}</p>
    </div></div>`;

  html += `<h3>${esc(T('hourly'))}</h3><ul class="hscroll" tabindex="0" aria-label="${esc(T('hourly'))}">` +
    w.hourly.filter((_, i) => i % 2 === 0).map((h, i) => {
      const time = i === 0 ? T('now') : S.fmtTime(lang, new Date(h.time + ':00+01:00'), tz);
      const c = T(S.wmoKey(h.code)), ht = Math.round(h.temp);
      return `<li><span class="sr-only">${esc(time)}: ${ht}°, ${esc(c)}, ${esc(T('rainChance', { n: h.pop ?? 0 }))}</span>
        <span aria-hidden="true">${esc(time)}</span><span aria-hidden="true">${S.wmoIcon(h.code, h.day)}</span>
        <span aria-hidden="true"><b>${ht}°</b></span><span aria-hidden="true" class="muted">${h.pop ?? 0}%</span></li>`;
    }).join('') + '</ul>';

  html += `<h3>${esc(T('daily'))}</h3><ul class="daily">` + w.daily.map((d, i) => {
    const date = new Date(d.date + 'T12:00:00+01:00');
    const label = i === 0 ? T('today') : i === 1 ? T('tomorrow') : S.fmtWeekday(lang, date);
    const c = T(S.wmoKey(d.code));
    return `<li><span class="sr-only">${esc(label)}: ${esc(c)}, ${esc(T('high'))} ${Math.round(d.max)}°, ${esc(T('low'))} ${Math.round(d.min)}°, ${esc(T('rainChance', { n: d.pop ?? 0 }))}</span>
      <span aria-hidden="true"><b>${esc(label)}</b> ${S.wmoIcon(d.code, 1)}</span>
      <span aria-hidden="true">${Math.round(d.max)}° / ${Math.round(d.min)}°</span>
      <span aria-hidden="true" class="muted">${d.pop ?? 0}%</span></li>`;
  }).join('') + '</ul>';

  const facts = [];
  const uv = w.air && w.air.uv != null ? w.air.uv : w.daily[0].uv;
  if (uv != null) facts.push([T('uvIndex'), fmt(uv, 0)]);
  if (w.air && w.air.aqi != null) facts.push([T('airQuality'), `${T('aq' + S.aqiLevel(w.air.aqi))} (${Math.round(w.air.aqi)})`]);
  html += `<h3>${esc(T('airQuality'))}</h3><dl class="facts">` + facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  html += `<h3>${esc(T('seaTitle'))}</h3>`;
  html += w.sea
    ? `<dl class="facts"><dt>${esc(T('waves'))}</dt><dd>${fmt(w.sea.wave, 1)} m</dd>${w.sea.temp != null ? `<dt>${esc(T('seaTemp'))}</dt><dd>${fmt(w.sea.temp, 0)}°</dd>` : ''}</dl>`
    : `<p class="muted">${esc(T('noSea'))}</p>`;
  $('#wx-body').innerHTML = html;

  const when = S.fmtTime(lang, new Date(w.fetchedAt));
  $('#wx-updated').textContent = wxOffline ? T('cachedOffline', { t: when }) : T('updated', { t: when });
}
const fmt = (n, d) => S.fmtNum(lang, n, d);

async function initWeather() {
  fillGov();
  const { weather } = await chrome.storage.local.get('weather');
  if (weather && locMatches(weather)) { wxData = weather; renderWeather(); }

  $('#gov').addEventListener('change', async (e) => {
    if (e.target.value === 'custom') return;
    settings = await S.setSettings({ govId: e.target.value, customLoc: null });
    const g = S.GOVERNORATES.find((x) => x.id === settings.govId);
    fillGov(); wxData = null; say(T('detectedAs', { name: g[lang] }));
    loadWeather();
  });

  $('#btn-detect').addEventListener('click', () => {
    const btn = $('#btn-detect');
    btn.disabled = true; say(T('detecting'));
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const g = S.nearestGovernorate(la, lo);
      settings = await S.setSettings({ govId: g.id, customLoc: { lat: +la.toFixed(3), lon: +lo.toFixed(3) } });
      fillGov(); wxData = null; btn.disabled = false;
      say(T('detectedAs', { name: g[lang] }));
      loadWeather();
    }, () => { btn.disabled = false; sayAlert(T('detectFail')); }, { timeout: 10000, maximumAge: 600000 });
  });

  $('#wx-refresh').addEventListener('click', async () => { say(T('loading')); await loadWeather(); say($('#wx-updated').textContent); });
}

/* ------------------------------------------------------------------ */
/* Alarms, timers, Pomodoro                                           */
/* ------------------------------------------------------------------ */

let alarms = [], editingId = null, lastFocus = null, pomo = null;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function dayName(d, style) { return S.fmtWeekday(lang, new Date(2024, 0, 7 + d), style); }

function buildDayChips() {
  $('#al-days').innerHTML = DAY_ORDER.map((d) => `<button type="button" class="day" data-d="${d}" aria-pressed="false" aria-label="${esc(dayName(d, 'long'))}">${esc(dayName(d, 'short'))}</button>`).join('') +
    `<button type="button" class="preset" data-p="every">${esc(T('rEvery'))}</button>` +
    `<button type="button" class="preset" data-p="week">${esc(T('rWeek'))}</button>` +
    `<button type="button" class="preset" data-p="weekend">${esc(T('rWeekend'))}</button>`;
}
function setDays(days) { $$('#al-days .day').forEach((b) => b.setAttribute('aria-pressed', String(days.includes(Number(b.dataset.d))))); }
function getDays() { return $$('#al-days .day').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => Number(b.dataset.d)); }

function buildStationSelect() {
  const keep = $('#al-station').value;
  $('#al-station').innerHTML = fullStations().map((s) => `<option value="${esc(s.id)}">${esc(stationName(s))}</option>`).join('');
  if (keep) $('#al-station').value = keep;
}

function renderAlarms() {
  $('#alarm-list').innerHTML = alarms.map((a) => {
    const d = S.describeAlarm(lang, a);
    const main = a.kind === 'suhoor' ? `<span>${esc(T('suhoorSummary', { n: a.offset ?? 30 }))}</span>` : `<span class="alarm-time">${esc(a.time)}</span>`;
    const sub = a.kind === 'suhoor' ? [a.label, T('ramadanOnly')] : [a.label, S.repeatSummary(lang, a)];
    return `<li data-id="${esc(a.id)}">
      <label class="switch"><input type="checkbox" role="switch" class="al-toggle" data-id="${esc(a.id)}" ${a.enabled ? 'checked' : ''}>
        <span class="desc">${main}<span class="sub">${esc(sub.filter(Boolean).join(', '))}</span></span></label>
      <button class="al-edit" data-id="${esc(a.id)}" aria-label="${esc(T('editSpecific', { d }))}">${esc(T('edit'))}</button></li>`;
  }).join('');
  $('#alarm-empty').hidden = alarms.length > 0;
  renderNextAlarm();
}

function renderNextAlarm() {
  let best = null;
  for (const a of alarms) {
    if (!a.enabled || a.kind === 'suhoor') continue;
    const n = S.nextTime(a);
    if (n && (!best || n < best)) best = n;
  }
  $('#alarm-next').textContent = best ? T('nextAlarm', { t: S.fmtDur(lang, best - Date.now()) }) : '';
}

function openAlarmDialog(id, trigger) {
  editingId = id; lastFocus = trigger || document.activeElement;
  const a = id ? alarms.find((x) => x.id === id) : { time: '07:00', label: '', kind: 'time', days: [], sound: 'beep', station: settings.lastStation, gradual: true, challenge: false, weatherMsg: true, snoozeMin: 9, offset: 30 };
  $('#alarm-dialog-title').textContent = T(id ? 'editAlarm' : 'newAlarm');
  $('#al-time').value = a.time;
  $('#al-label').value = a.label || '';
  $('#al-kind').value = a.kind || 'time';
  $('#al-offset').value = a.offset ?? 30;
  setDays(a.days || []);
  $('#al-sound').value = a.sound || 'beep';
  buildStationSelect();
  $('#al-station').value = a.station || settings.lastStation;
  $('#al-gradual').checked = !!a.gradual;
  $('#al-challenge').checked = !!a.challenge;
  $('#al-weather').checked = !!a.weatherMsg;
  $('#al-snooze').value = a.snoozeMin || 9;
  $('#al-delete').hidden = !id;
  syncAlarmForm();
  $('#alarm-dialog').showModal();
  ($('#al-kind').value === 'suhoor' ? $('#al-label') : $('#al-time')).focus();
}
function syncAlarmForm() {
  const suhoor = $('#al-kind').value === 'suhoor';
  $('#al-time').closest('.field').hidden = suhoor;
  $('#al-time').required = !suhoor;
  $('#al-offset-wrap').hidden = !suhoor;
  $('#al-days-wrap').hidden = suhoor;
  $('#al-station-wrap').hidden = $('#al-sound').value !== 'radio';
}
function closeAlarmDialog(focusId) {
  $('#alarm-dialog').close();
  const target = (focusId && $(`.al-edit[data-id="${focusId}"]`)) || lastFocus || $('#btn-add-alarm');
  if (target && document.contains(target)) target.focus(); else $('#btn-add-alarm').focus();
}

async function saveAlarms(list) { alarms = list; await S.setAlarms(list); renderAlarms(); }

function initAlarms() {
  buildDayChips();
  buildStationSelect();
  renderAlarms();
  renderTimerPresets();
  renderTimers();

  $('#btn-add-alarm').addEventListener('click', (e) => openAlarmDialog(null, e.currentTarget));
  $('#alarm-list').addEventListener('click', (e) => { const b = e.target.closest('.al-edit'); if (b) openAlarmDialog(b.dataset.id, b); });
  $('#alarm-list').addEventListener('change', async (e) => {
    const c = e.target.closest('.al-toggle');
    if (!c) return;
    const list = alarms.map((a) => (a.id === c.dataset.id ? { ...a, enabled: c.checked } : a));
    const a = list.find((x) => x.id === c.dataset.id);
    await saveAlarms(list);
    say(T(c.checked ? 'alarmOn' : 'alarmOff', { d: S.describeAlarm(lang, a) }));
  });

  $('#al-kind').addEventListener('change', syncAlarmForm);
  $('#al-sound').addEventListener('change', syncAlarmForm);
  $('#al-days').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('day')) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    else setDays({ every: [0, 1, 2, 3, 4, 5, 6], week: [1, 2, 3, 4, 5], weekend: [6, 0] }[b.dataset.p]);
  });
  $('#al-cancel').addEventListener('click', () => closeAlarmDialog());
  $('#alarm-dialog').addEventListener('cancel', () => setTimeout(() => { if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }, 0));

  $('#al-delete').addEventListener('click', async () => {
    await saveAlarms(alarms.filter((a) => a.id !== editingId));
    closeAlarmDialog(); say(T('alarmDeleted'));
  });

  $('#alarm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = $('#al-kind').value;
    const a = {
      id: editingId || Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
      time: kind === 'suhoor' ? '00:00' : $('#al-time').value,
      label: $('#al-label').value.trim(), kind, offset: Math.min(180, Math.max(0, Number($('#al-offset').value) || 30)),
      days: kind === 'suhoor' ? [] : getDays(),
      sound: $('#al-sound').value, station: $('#al-station').value,
      gradual: $('#al-gradual').checked, challenge: $('#al-challenge').checked, weatherMsg: $('#al-weather').checked,
      snoozeMin: Math.min(60, Math.max(1, Number($('#al-snooze').value) || 9)), enabled: true,
    };
    const list = editingId ? alarms.map((x) => (x.id === editingId ? { ...a, enabled: x.enabled } : x)) : [...alarms, a];
    await saveAlarms(list);
    closeAlarmDialog(a.id); say(T('alarmSaved'));
  });

  $('#timer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await startTimer(Number($('#timer-min').value));
  });
  $('#timer-presets').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) startTimer(Number(b.dataset.n)); });
  $('#timer-list').addEventListener('click', async (e) => {
    const b = e.target.closest('.tm-cancel');
    if (!b) return;
    await S.removeTimer(b.dataset.id); say(T('timerCancelled'));
    renderTimers(); $('#timer-min').focus();
  });

  $('#pomo-start').addEventListener('click', async () => { await S.startPomodoro(); say(T('pomoStarted')); $('#pomo-stop').focus(); });
  $('#pomo-stop').addEventListener('click', async () => { await S.stopPomodoro(); say(T('pomoStopped')); $('#pomo-start').focus(); });
  chrome.storage.local.get('pomodoro').then((r) => { pomo = r.pomodoro || null; renderPomodoro(); });
}

async function startTimer(n) {
  if (!Number.isFinite(n) || n < 1 || n > 999) { $('#timer-min').focus(); return; }
  n = Math.round(n);
  await S.addTimer(n, T('min', { n }));
  say(T('timerSet', { n }));
  renderTimers();
}
function renderTimerPresets() {
  $('#timer-presets').innerHTML = [5, 10, 15, 25, 45].map((n) => `<button type="button" data-n="${n}">${esc(T('min', { n }))}</button>`).join('');
}
async function renderTimers() {
  const timers = await S.getTimers();
  $('#timer-list').innerHTML = timers.map((tm) => `<li data-id="${esc(tm.id)}">
    <span class="grow timer-text" data-end="${tm.endTs}" data-label="${esc(tm.label)}"></span>
    <button class="tm-cancel" data-id="${esc(tm.id)}" aria-label="${esc(T('cancelTimer', { label: tm.label }))}"><span aria-hidden="true">✕</span></button></li>`).join('');
  $('#timer-empty').hidden = timers.length > 0;
  tickTimers();
}
function tickTimers() {
  $$('.timer-text').forEach((el) => {
    el.textContent = T('timerLeft', { label: el.dataset.label, t: S.fmtDur(lang, Number(el.dataset.end) - Date.now(), true) });
  });
}
function renderPomodoro() {
  const st = $('#pomo-status');
  if (pomo && pomo.endTs > Date.now() - 2000) {
    const phase = T({ focus: 'pomoFocus', short: 'pomoShort', long: 'pomoLong' }[pomo.phase]);
    st.textContent = T('pomoStatus', { phase, t: S.fmtDur(lang, pomo.endTs - Date.now(), true), n: ((pomo.cycle - 1) % 4) + 1 });
    $('#pomo-start').disabled = true; $('#pomo-stop').disabled = false;
  } else {
    st.textContent = T('pomoIdle');
    $('#pomo-start').disabled = false; $('#pomo-stop').disabled = true;
  }
}

/* ------------------------------------------------------------------ */
/* Prayer times and Ramadan mode                                      */
/* ------------------------------------------------------------------ */

let prayer = { today: null, tomorrow: null };

async function loadPrayer() {
  const loc = S.getLocation(settings, lang);
  const ds = S.tunisDateStr(new Date()), ds2 = S.tunisDateStr(new Date(Date.now() + 864e5));
  try {
    prayer.today = await S.getPrayerDay(ds, loc);
    prayer.tomorrow = await S.getPrayerDay(ds2, loc).catch(() => null);
    $('#pr-error').textContent = '';
    renderPrayer();
  } catch {
    if (!prayer.today) $('#pr-error').textContent = T('prayerError');
  }
}

function prayerNext(now = Date.now()) {
  const td = prayer.today; if (!td) return null;
  for (const name of S.PRAYERS) {
    const when = S.tunisTime(td.date, td[name]);
    if (when.getTime() > now) return { name, when, time: td[name] };
  }
  const tm = prayer.tomorrow;
  return tm ? { name: 'Fajr', when: S.tunisTime(tm.date, tm.Fajr), time: tm.Fajr } : null;
}

function renderPrayer() {
  const td = prayer.today; if (!td) return;
  const nx = prayerNext();
  $('#pr-hijri').textContent = T('hijri', { d: td.hijri.day, m: lang === 'ar' ? td.hijri.monthAr : td.hijri.monthEn, y: td.hijri.year });
  $('#pr-list').innerHTML = S.PRAYERS.map((n) => {
    const isNext = !!nx && nx.name === n && S.tunisDateStr(nx.when) === td.date;
    return `<li class="${isNext ? 'next-one' : ''}" ${isNext ? 'aria-current="true"' : ''}><span>${esc(T('p' + n))}</span><span class="t">${esc(td[n])}</span></li>`;
  }).join('');
  const ram = td.hijri.monthNum === 9;
  const box = $('#pr-ramadan');
  box.hidden = !ram;
  if (ram) {
    box.innerHTML = `<h3>${esc(T('ramadanMode'))}</h3><p id="ram-suhoor"></p><p id="ram-iftar"></p>`;
  }
  tickPrayer();
}

const RING_C = 2 * Math.PI * 52;
function setRing(frac) {
  const el = $('#pr-ring');
  if (!el) return;
  const f = Math.max(0, Math.min(1, frac));
  el.style.strokeDasharray = `${RING_C}`;
  el.style.strokeDashoffset = `${RING_C * (1 - f)}`;
}

function tickPrayer() {
  const td = prayer.today; if (!td) return;
  const now = Date.now();
  const nx = prayerNext(now);
  if (nx) {
    $('#pr-next').textContent = T('nextPrayer', { name: T('p' + nx.name), t: nx.time, left: S.fmtDur(lang, nx.when - now, true) });
    const idx = S.PRAYERS.indexOf(nx.name);
    const prevTime = idx > 0 ? S.tunisTime(td.date, td[S.PRAYERS[idx - 1]]).getTime() : nx.when.getTime() - 6 * 3600000;
    const span = nx.when.getTime() - prevTime;
    setRing(span > 0 ? (now - prevTime) / span : 0);
  }
  if (td.hijri.monthNum === 9 && $('#ram-suhoor')) {
    const tm = prayer.tomorrow;
    const pick = (key) => {
      const a = S.tunisTime(td.date, td[key]);
      if (a.getTime() > now) return { when: a, time: td[key] };
      return tm ? { when: S.tunisTime(tm.date, tm[key]), time: tm[key] } : null;
    };
    const su = pick('Imsak'), if_ = pick('Maghrib');
    if (su) $('#ram-suhoor').textContent = T('suhoorEnds', { t: su.time, left: S.fmtDur(lang, su.when - now, true) });
    if (if_) $('#ram-iftar').textContent = T('iftarAt', { t: if_.time, left: S.fmtDur(lang, if_.when - now, true) });
  }
}

function initPrayer() {
  $('#pr-notify').checked = !!settings.prayerNotify;
  $('#pr-pause').checked = !!settings.pauseRadioAtPrayer;
  $('#pr-notify').addEventListener('change', async (e) => { settings = await S.setSettings({ prayerNotify: e.target.checked }); });
  $('#pr-pause').addEventListener('change', async (e) => { settings = await S.setSettings({ pauseRadioAtPrayer: e.target.checked }); });
}

/* ------------------------------------------------------------------ */
/* More: settings, exchange rates                                     */
/* ------------------------------------------------------------------ */

let ratesData = null;

function fillSettingsSelects() {
  const ls = $('#set-lang');
  ls.innerHTML = `<option value="auto">${esc(T('langAuto'))}</option>` + Object.entries(S.LANGS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  ls.value = settings.lang && S.LANGS[settings.lang] ? settings.lang : 'auto';
  const th = $('#set-theme');
  th.innerHTML = [['system', 'themeSystem'], ['light', 'themeLight'], ['dark', 'themeDark']].map(([v, k]) => `<option value="${v}">${esc(T(k))}</option>`).join('');
  th.value = settings.theme;
  $('#set-badge').checked = !!settings.badge;
  $('#set-alerts').checked = !!settings.alertsNotify;
  const cs = $('#conv-cur'), keep = cs.value;
  cs.innerHTML = S.CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  cs.value = keep || 'EUR';
}

function rateDigits(v) { return v < 0.1 ? 4 : v < 10 ? 3 : 2; }

function renderRates() {
  if (!ratesData) return;
  const r = ratesData.rates;
  $('#rate-list').innerHTML = S.CURRENCIES.filter((c) => r[c]).map((c) => {
    const v = 1 / r[c];
    return `<li><span>${esc(T('rateLine', { cur: c, v: S.fmtNum(lang, v, rateDigits(v)) }))}</span></li>`;
  }).join('');
  $('#rate-updated').textContent = T('ratesUpdated', { t: S.fmtTime(lang, new Date(ratesData.ts)) });
  convert(false);
}
function convert(announce) {
  if (!ratesData) return;
  const out = $('#conv-out');
  const cur = $('#conv-cur').value, amt = Number($('#conv-amount').value);
  const rate = ratesData.rates[cur];
  out.setAttribute('aria-live', announce ? 'polite' : 'off');
  if (!rate || !Number.isFinite(amt)) { out.textContent = ''; return; }
  const v = amt / rate;
  out.textContent = T('converted', { a: S.fmtNum(lang, amt, 2), cur, v: S.fmtNum(lang, v, rateDigits(v)) });
}
async function loadRates() {
  try {
    ratesData = await S.getRates();
    $('#rate-error').textContent = '';
    renderRates();
  } catch {
    if (!ratesData) $('#rate-error').textContent = T('ratesError');
  }
}

function initMore() {
  fillSettingsSelects();
  $('#set-lang').addEventListener('change', async (e) => {
    settings = await S.setSettings({ lang: e.target.value === 'auto' ? null : e.target.value });
    applyStatic(); renderAll();
    bg('menus:rebuild');
    say(S.LANGS[lang].name);
  });
  $('#set-theme').addEventListener('change', async (e) => { settings = await S.setSettings({ theme: e.target.value }); applyStatic(); });
  $('#set-badge').addEventListener('change', async (e) => { settings = await S.setSettings({ badge: e.target.checked }); });
  $('#set-alerts').addEventListener('change', async (e) => { settings = await S.setSettings({ alertsNotify: e.target.checked }); });
  const conv = debounce(() => convert(true), 500);
  $('#conv-amount').addEventListener('input', conv);
  $('#conv-cur').addEventListener('change', () => convert(true));
  $('#btn-adhan-preview').addEventListener('click', async () => {
    await bg('adhan:preview');
    say(T('adhanPlaying'));
  });
  $('#btn-adhan-stop').addEventListener('click', async () => {
    await bg('adhan:stop');
    say(T('adhanStopped'));
  });
  $('#btn-shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
}

/* ------------------------------------------------------------------ */
/* Wiring                                                             */
/* ------------------------------------------------------------------ */

function renderAll() {
  buildSleepOptions();
  renderLists();
  fillGov();
  if (wxData) renderWeather();
  buildDayChips();
  buildStationSelect();
  renderAlarms();
  renderTimerPresets();
  renderTimers();
  renderPomodoro();
  renderPrayer();
  fillSettingsSelects();
  renderRates();
  $('#vol').setAttribute('aria-valuetext', T('volumeText', { n: Math.round(settings.volume * 100) }));
}

function tick() {
  $('#clock').textContent = S.fmtTime(lang, new Date(), 'Africa/Tunis');
  tickTimers();
  renderPomodoro();
  tickPrayer();
  const s = Math.floor(Date.now() / 1000);
  if (s % 15 === 0) { renderSleep(); renderNextAlarm(); }
}

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'session') {
    if (ch.radioState) {
      const prev = radio.status;
      radio = ch.radioState.newValue || { status: 'idle' };
      renderRadioStatus(prev !== radio.status && radio.status !== 'idle');
    }
    if (ch.sleepEnd) { sleepEnd = ch.sleepEnd.newValue || null; renderSleep(); }
  } else if (area === 'sync') {
    if (ch.settings) {
      const old = settings;
      settings = { ...S.DEFAULTS, ...(ch.settings.newValue || {}) };
      if (old.lang !== settings.lang || old.theme !== settings.theme) { applyStatic(); renderAll(); }
      else if (JSON.stringify(old.favorites) !== JSON.stringify(settings.favorites) || JSON.stringify(old.customStations) !== JSON.stringify(settings.customStations)) renderLists();
    }
    if (ch.alarms) { alarms = ch.alarms.newValue || []; renderAlarms(); }
  } else if (area === 'local') {
    if (ch.timers) renderTimers();
    if (ch.pomodoro) { pomo = ch.pomodoro.newValue || null; renderPomodoro(); }
  }
});

async function init() {
  settings = await S.getSettings();
  applyStatic();
  alarms = await S.getAlarms();
  setupTabs();
  await initRadio();
  await initWeather();
  initAlarms();
  initPrayer();
  initMore();
  const { lastTab } = await chrome.storage.session.get('lastTab');
  const tab = tabs().find((x) => x.dataset.tab === lastTab);
  if (tab && lastTab !== 'radio') selectTab(tab);
  tick();
  setInterval(tick, 1000);
  if (!tab || lastTab === 'radio') $('#btn-play').focus();
}

init();
