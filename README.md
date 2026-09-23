# DeskHaven — Radio, Weather & Alarms (Chrome extension)

## Install (developer mode)
1. Unzip this folder.
2. Open `chrome://extensions`, turn on **Developer mode**.
3. Click **Load unpacked** and pick the `DeskHaven` folder.
4. Pin the extension. Open it with **Alt+Shift+R**.

## Keyboard
- Alt+Shift+P play/pause, Alt+Shift+N next station, Alt+Shift+B previous station (rebind at `chrome://extensions/shortcuts`).
- In the popup: Alt+1…Alt+5 switch sections, arrow keys move between tabs.
- Right-click the toolbar icon: play/pause, next/previous, sleep timer, quick timers, Pomodoro.

## Features
Radio (favorites, sleep timer with fade-out, background playback, fallback stream URLs, auto-reconnect, media keys, optional track title, station search and custom stations), weather for all 24 governorates (current, hourly, 7 days, badge temperature, alerts, air quality, UV, sea), alarms (radio wake-up, gradual volume, snooze, repeat days, weather message read aloud, math dismiss, Ramadan suhoor alarm), countdown timers, Pomodoro, prayer times with a built-in offline Adhan, Ramadan mode, dinar exchange rates, Arabic/French/English with RTL, light/dark themes, sync across devices.

## What's new in this redesign
- **DeskHaven identity**: the name, toolbar icons, popup header, and media metadata now use the supplied `deskhaven.jpg` artwork.
- **Visual identity**: glassmorphism cards (frosted, blurred) over a Mediterranean teal/terracotta gradient, Space Grotesk headers, a turntable-style radio deck with a live equalizer, and a progress ring around the next-prayer countdown. Falls back to solid opaque cards automatically for `prefers-reduced-transparency` and browsers without `backdrop-filter`.
- **Live station directory**: the Radio tab now pulls Tunisia's station list from the Radio Browser API (`de1` → `nl1` → `at1` fallback) and caches it locally, refreshed automatically every 12 hours or on demand via **Refresh station directory**. The original curated list is kept as an offline fallback if the directory can't be reached.
- **Built-in Adhan audio**: one offline recording now plays automatically when prayer notifications fire. **More → Adhan** includes Play and Stop controls; there are no URLs or reciter settings. If **Pause the radio during Adhan and resume after** is on, the radio fades out first and resumes when the recording ends or is stopped.

## Things to know
- **Stream URLs**: the built-in station addresses come from a 2020 community list and Tunisian stations change them. Each station tries its addresses in order. If one is dead, use *Find or add stations* (searches the Radio Browser directory) or add an address yourself.
- Alarms only fire while Chrome is running (an alarm missed while Chrome was closed rings when it starts).
- Prayer times use Aladhan's Tunisia method. Ramadan mode follows the calculated calendar, which can differ by one day from the official announcement.
- Track titles need an extra permission that is requested only when you turn that option on.
- Built-in audio: `sounds/adhan.ogg`.
- Data sources: Open-Meteo (weather, air, sea), Aladhan (prayer), open.er-api.com (rates), Radio Browser (station search).
