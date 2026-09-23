// Shared code used by the popup, the background service worker and the alarm window.

/* ------------------------------------------------------------------ */
/* Languages and strings                                              */
/* ------------------------------------------------------------------ */

export const LANGS = {
  ar: { name: 'العربية', dir: 'rtl', locale: 'ar-TN', speech: 'ar' },
  fr: { name: 'Français', dir: 'ltr', locale: 'fr-TN', speech: 'fr-FR' },
  en: { name: 'English', dir: 'ltr', locale: 'en-GB', speech: 'en-GB' },
};

const STRINGS = {
  en: {
    appName: 'DeskHaven', skip: 'Skip to content', tabsLabel: 'Sections',
    tabRadio: 'Radio', tabWeather: 'Weather', tabAlarm: 'Alarms', tabPrayer: 'Prayer', tabMore: 'More',
    loading: 'Loading…', retry: 'Try again', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', remove: 'Remove',
    min: '{n} min', hr: '{n} h', sec: '{n} s',
    // radio
    play: 'Play', pause: 'Pause', prev: 'Previous station', next: 'Next station', volume: 'Volume', volumeText: '{n} percent',
    sIdle: 'Stopped', sConnecting: 'Connecting…', sPlaying: 'Playing', sPaused: 'Paused',
    sReconnecting: 'Connection lost. Reconnecting…', sError: 'This station cannot be played right now. Try another one.',
    nowPlaying: 'Now playing: {t}', noStation: 'No station selected',
    favorites: 'Favorites', noFavorites: 'No favorites yet. Use the star button next to a station.', allStations: 'All stations',
    playStation: 'Play {name}', stationPlaying: '{name}, playing', addFav: 'Add {name} to favorites', removeFav: 'Remove {name} from favorites',
    favAdded: '{name} added to favorites', favRemoved: '{name} removed from favorites',
    sleepTimer: 'Sleep timer', sleepOff: 'Off', sleepSet: 'Sleep timer set for {n} minutes', sleepCancelled: 'Sleep timer cancelled', sleepLeft: 'Radio stops in {t}',
    findStations: 'Find or add stations', searchStations: 'Search Tunisian stations by name', search: 'Search', searching: 'Searching…',
    noResults: 'No stations found.', searchError: 'Could not reach the station directory.', addStation: 'Add {name}', stationAdded: '{name} added to your stations',
    customHeading: 'Add a station by address', customName: 'Station name', customUrl: 'Stream address (http or https)', addCustom: 'Add station',
    badUrl: 'Enter a name and a valid stream address.', removeStation: 'Remove {name} from my stations', stationRemoved: '{name} removed',
    trackInfo: 'Show the track title (asks for extra permission)', trackDenied: 'Permission was not granted.',
    // weather
    governorate: 'Governorate', detect: 'Use my location', detecting: 'Finding your location…', detectedAs: 'Location set to {name}', detectFail: 'Could not get your location.',
    customLocation: 'My location ({name})',
    feelsLike: 'feels like {n}°', humidity: 'humidity {n}%', wind: 'wind {n} km/h', gusts: 'gusts up to {n} km/h',
    hourly: 'Next hours', daily: 'Forecast for 7 days', today: 'Today', tomorrow: 'Tomorrow', now: 'Now',
    alertsTitle: 'Weather alerts', noAlerts: 'No weather alerts for the next 3 days.',
    alertHeat: 'Heat: up to {v}°C {day}', alertSirocco: 'Sirocco, a hot southern wind, expected {day} (gusts {v} km/h)',
    alertStorm: 'Thunderstorms expected {day}', alertRain: 'Heavy rain {day}: about {v} mm', alertWind: 'Strong wind {day}: gusts up to {v} km/h',
    alertUv: 'Very high UV {day}: index {v}',
    dToday: 'today', dTomorrow: 'tomorrow',
    airQuality: 'Air quality', aq0: 'good', aq1: 'fair', aq2: 'moderate', aq3: 'poor', aq4: 'very poor', aq5: 'extremely poor',
    uvIndex: 'UV index', seaTitle: 'Sea', waves: 'Wave height', seaTemp: 'Sea temperature', noSea: 'Not available for inland locations',
    high: 'high', low: 'low', rainChance: 'rain chance {n}%',
    updated: 'Updated {t}', cachedOffline: 'Could not refresh. Showing saved weather from {t}.', wxError: 'Could not load the weather. Check your connection.', refresh: 'Refresh weather',
    c0: 'clear sky', c1: 'mostly clear', c2: 'partly cloudy', c3: 'overcast', c45: 'fog', c51: 'drizzle', c61: 'rain', c71: 'snow', c80: 'rain showers', c95: 'thunderstorm',
    // alarms
    alarms: 'Alarms', addAlarm: 'Add alarm', editAlarm: 'Edit alarm', newAlarm: 'New alarm', noAlarms: 'No alarms yet.',
    alarmLabel: 'Name (optional)', alarmTime: 'Time', alarmType: 'Type', typeTime: 'At a set time', typeSuhoor: 'Suhoor (Ramadan only)',
    offsetBefore: 'Minutes before Fajr', repeat: 'Repeat on', repeatNone: 'No day selected means the alarm rings once.',
    rOnce: 'once', rEvery: 'every day', rWeek: 'weekdays', rWeekend: 'weekends',
    sound: 'Sound', soundBeep: 'Beep', soundRadio: 'Radio station', alarmStation: 'Station',
    gradual: 'Increase the volume gradually', challenge: 'Solve a math problem to dismiss', weatherMsg: 'Read the weather when it rings', snoozeMin: 'Snooze length in minutes',
    alarmOn: '{d}: on', alarmOff: '{d}: off', alarmSaved: 'Alarm saved', alarmDeleted: 'Alarm deleted', editSpecific: 'Edit alarm {d}',
    nextAlarm: 'Next alarm in {t}', suhoorSummary: 'Suhoor alarm, {n} min before Fajr', ramadanOnly: 'Ramadan only',
    // timers
    timers: 'Timers', timerMinutes: 'Minutes', startTimer: 'Start timer', timerLeft: '{label}: {t} left', cancelTimer: 'Cancel timer {label}',
    timerSet: 'Timer set for {n} minutes', timerDone: 'Timer finished', noTimers: 'No timers running.', timerCancelled: 'Timer cancelled',
    pomodoro: 'Pomodoro', pomoStart: 'Start focus session', pomoStop: 'Stop Pomodoro', pomoIdle: 'Not running. 25 minutes of focus, then a 5 minute break.',
    pomoFocus: 'Focus', pomoShort: 'Short break', pomoLong: 'Long break', pomoStatus: '{phase}, {t} left (session {n})',
    pomoFocusEnd: 'Focus session finished. Time for a break.', pomoBreakEnd: 'Break over. Back to focus.', pomoStarted: 'Pomodoro started', pomoStopped: 'Pomodoro stopped',
    // ringing window
    ringingTitle: 'Alarm', dismiss: 'Dismiss', snooze: 'Snooze {n} min', solvePrompt: 'To dismiss, solve: what is {a} + {b}?', answer: 'Your answer',
    wrongAnswer: 'Not correct. Try this one.', dismissed: 'Alarm dismissed', snoozedFor: 'Snoozed for {n} minutes',
    msgWx: '{city}: between {min} and {max} degrees, {cond}.', msgRain: 'Rain is expected today. Leave early and take an umbrella.',
    msgHot: 'It will be very hot today. Drink water and avoid the midday sun.', msgCold: 'It is cold this morning. Dress warmly.',
    msgStorm: 'Thunderstorms are expected today. Be careful outside.', msgWind: 'Strong winds today. Secure loose items.',
    // prayer
    prayerTitle: 'Prayer times', hijri: '{d} {m} {y} AH', pFajr: 'Fajr', pSunrise: 'Sunrise', pDhuhr: 'Dhuhr', pAsr: 'Asr', pMaghrib: 'Maghrib', pIsha: 'Isha', pImsak: 'Imsak',
    nextPrayer: 'Next prayer: {name} at {t}, in {left}', ramadanMode: 'Ramadan mode', suhoorEnds: 'Suhoor ends (Imsak) at {t}, in {left}', iftarAt: 'Iftar (Maghrib) at {t}, in {left}',
    notifyPrayer: 'Notify me at prayer times', pauseAtPrayer: 'Pause the radio during Adhan and resume after', prayerNotifBody: 'It is time for {name}.',
    prayerError: 'Could not load prayer times. Check your connection.',
    prayerNote: 'Times use the Tunisian Ministry of Religious Affairs method. Ramadan mode follows the calculated calendar, which can differ by one day from the official announcement.',
    // more
    moreLanguage: 'Language', moreTheme: 'Theme', themeSystem: 'Match my system', themeLight: 'Light', themeDark: 'Dark', langAuto: 'Automatic',
    badge: 'Show the temperature on the toolbar icon', notifyAlerts: 'Notify me about severe weather',
    rates: 'Tunisian dinar exchange rates', rateLine: '1 {cur} = {v} TND', converter: 'Convert to dinars', amount: 'Amount', currency: 'Currency', converted: '{a} {cur} = {v} TND',
    ratesError: 'Could not load exchange rates.', ratesUpdated: 'Rates updated {t}',
    shortcuts: 'Keyboard shortcuts', shortcutsHelp: 'Alt+Shift+P play or pause. Alt+Shift+N next station. Alt+Shift+B previous station. Alt+Shift+R open this popup. Inside the popup, Alt+1 to Alt+5 switch sections and the arrow keys move between tabs.',
    openShortcuts: 'Change shortcuts in Chrome',
    stationsUpdated: 'Station directory updated {t}', stationsRefresh: 'Refresh station directory', stationsRefreshing: 'Refreshing…', stationsOffline: 'Could not refresh. Showing stations saved from {t}.',
    adhanTitle: 'Adhan', adhanBuiltIn: 'One built-in Adhan plays automatically with prayer notifications. No setup or internet connection is needed.',
    adhanPreview: 'Play built-in Adhan', adhanStop: 'Stop Adhan',
    adhanPlaying: 'Playing the built-in Adhan', adhanStopped: 'Adhan stopped',
    // context menu and notifications
    cmToggle: 'Play or pause radio', cmNext: 'Next station', cmPrev: 'Previous station', cmSleep: 'Sleep timer', cmSleepOff: 'Cancel sleep timer',
    cmTimer: 'Quick timer', cmPomo: 'Start Pomodoro', cmMinutes: '{n} minutes',
  },

  fr: {
    appName: 'DeskHaven', skip: 'Aller au contenu', tabsLabel: 'Sections',
    tabRadio: 'Radio', tabWeather: 'Météo', tabAlarm: 'Alarmes', tabPrayer: 'Prière', tabMore: 'Plus',
    loading: 'Chargement…', retry: 'Réessayer', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', add: 'Ajouter', remove: 'Retirer',
    min: '{n} min', hr: '{n} h', sec: '{n} s',
    play: 'Lecture', pause: 'Pause', prev: 'Station précédente', next: 'Station suivante', volume: 'Volume', volumeText: '{n} pour cent',
    sIdle: 'Arrêtée', sConnecting: 'Connexion…', sPlaying: 'En lecture', sPaused: 'En pause',
    sReconnecting: 'Connexion perdue. Reconnexion…', sError: 'Cette station est indisponible pour le moment. Essayez-en une autre.',
    nowPlaying: 'En cours : {t}', noStation: 'Aucune station sélectionnée',
    favorites: 'Favoris', noFavorites: 'Pas encore de favoris. Utilisez le bouton étoile à côté d’une station.', allStations: 'Toutes les stations',
    playStation: 'Écouter {name}', stationPlaying: '{name}, en lecture', addFav: 'Ajouter {name} aux favoris', removeFav: 'Retirer {name} des favoris',
    favAdded: '{name} ajoutée aux favoris', favRemoved: '{name} retirée des favoris',
    sleepTimer: 'Minuteur de sommeil', sleepOff: 'Désactivé', sleepSet: 'Minuteur de sommeil réglé sur {n} minutes', sleepCancelled: 'Minuteur de sommeil annulé', sleepLeft: 'La radio s’arrête dans {t}',
    findStations: 'Trouver ou ajouter des stations', searchStations: 'Rechercher une station tunisienne par nom', search: 'Rechercher', searching: 'Recherche…',
    noResults: 'Aucune station trouvée.', searchError: 'Impossible de joindre l’annuaire des stations.', addStation: 'Ajouter {name}', stationAdded: '{name} ajoutée à vos stations',
    customHeading: 'Ajouter une station par adresse', customName: 'Nom de la station', customUrl: 'Adresse du flux (http ou https)', addCustom: 'Ajouter la station',
    badUrl: 'Saisissez un nom et une adresse de flux valide.', removeStation: 'Retirer {name} de mes stations', stationRemoved: '{name} retirée',
    trackInfo: 'Afficher le titre du morceau (demande une autorisation supplémentaire)', trackDenied: 'L’autorisation n’a pas été accordée.',
    governorate: 'Gouvernorat', detect: 'Utiliser ma position', detecting: 'Recherche de votre position…', detectedAs: 'Position réglée sur {name}', detectFail: 'Impossible d’obtenir votre position.',
    customLocation: 'Ma position ({name})',
    feelsLike: 'ressenti {n}°', humidity: 'humidité {n} %', wind: 'vent {n} km/h', gusts: 'rafales jusqu’à {n} km/h',
    hourly: 'Prochaines heures', daily: 'Prévisions sur 7 jours', today: 'Aujourd’hui', tomorrow: 'Demain', now: 'Maintenant',
    alertsTitle: 'Alertes météo', noAlerts: 'Aucune alerte météo pour les 3 prochains jours.',
    alertHeat: 'Chaleur : jusqu’à {v} °C {day}', alertSirocco: 'Sirocco, vent chaud du sud, attendu {day} (rafales {v} km/h)',
    alertStorm: 'Orages attendus {day}', alertRain: 'Fortes pluies {day} : environ {v} mm', alertWind: 'Vent fort {day} : rafales jusqu’à {v} km/h',
    alertUv: 'UV très élevés {day} : indice {v}',
    dToday: 'aujourd’hui', dTomorrow: 'demain',
    airQuality: 'Qualité de l’air', aq0: 'bonne', aq1: 'correcte', aq2: 'moyenne', aq3: 'mauvaise', aq4: 'très mauvaise', aq5: 'extrêmement mauvaise',
    uvIndex: 'Indice UV', seaTitle: 'Mer', waves: 'Hauteur des vagues', seaTemp: 'Température de la mer', noSea: 'Non disponible pour l’intérieur des terres',
    high: 'max', low: 'min', rainChance: 'risque de pluie {n} %',
    updated: 'Mis à jour {t}', cachedOffline: 'Actualisation impossible. Météo enregistrée à {t}.', wxError: 'Impossible de charger la météo. Vérifiez votre connexion.', refresh: 'Actualiser la météo',
    c0: 'ciel dégagé', c1: 'plutôt dégagé', c2: 'partiellement nuageux', c3: 'couvert', c45: 'brouillard', c51: 'bruine', c61: 'pluie', c71: 'neige', c80: 'averses', c95: 'orage',
    alarms: 'Alarmes', addAlarm: 'Ajouter une alarme', editAlarm: 'Modifier l’alarme', newAlarm: 'Nouvelle alarme', noAlarms: 'Aucune alarme pour le moment.',
    alarmLabel: 'Nom (facultatif)', alarmTime: 'Heure', alarmType: 'Type', typeTime: 'À une heure précise', typeSuhoor: 'Souhour (Ramadan uniquement)',
    offsetBefore: 'Minutes avant le Fajr', repeat: 'Répéter le', repeatNone: 'Sans jour sélectionné, l’alarme sonne une seule fois.',
    rOnce: 'une fois', rEvery: 'tous les jours', rWeek: 'en semaine', rWeekend: 'le week-end',
    sound: 'Son', soundBeep: 'Bip', soundRadio: 'Station de radio', alarmStation: 'Station',
    gradual: 'Augmenter le volume progressivement', challenge: 'Résoudre un calcul pour arrêter', weatherMsg: 'Lire la météo quand elle sonne', snoozeMin: 'Durée du report en minutes',
    alarmOn: '{d} : activée', alarmOff: '{d} : désactivée', alarmSaved: 'Alarme enregistrée', alarmDeleted: 'Alarme supprimée', editSpecific: 'Modifier l’alarme {d}',
    nextAlarm: 'Prochaine alarme dans {t}', suhoorSummary: 'Alarme souhour, {n} min avant le Fajr', ramadanOnly: 'Ramadan uniquement',
    timers: 'Minuteurs', timerMinutes: 'Minutes', startTimer: 'Lancer le minuteur', timerLeft: '{label} : {t} restantes', cancelTimer: 'Annuler le minuteur {label}',
    timerSet: 'Minuteur réglé sur {n} minutes', timerDone: 'Minuteur terminé', noTimers: 'Aucun minuteur en cours.', timerCancelled: 'Minuteur annulé',
    pomodoro: 'Pomodoro', pomoStart: 'Démarrer une session', pomoStop: 'Arrêter le Pomodoro', pomoIdle: 'À l’arrêt. 25 minutes de concentration, puis 5 minutes de pause.',
    pomoFocus: 'Concentration', pomoShort: 'Courte pause', pomoLong: 'Longue pause', pomoStatus: '{phase}, {t} restantes (session {n})',
    pomoFocusEnd: 'Session terminée. C’est l’heure de la pause.', pomoBreakEnd: 'Pause terminée. On reprend.', pomoStarted: 'Pomodoro démarré', pomoStopped: 'Pomodoro arrêté',
    ringingTitle: 'Alarme', dismiss: 'Arrêter', snooze: 'Reporter de {n} min', solvePrompt: 'Pour arrêter, résolvez : combien font {a} + {b} ?', answer: 'Votre réponse',
    wrongAnswer: 'Incorrect. Essayez celui-ci.', dismissed: 'Alarme arrêtée', snoozedFor: 'Reportée de {n} minutes',
    msgWx: '{city} : entre {min} et {max} degrés, {cond}.', msgRain: 'De la pluie est prévue aujourd’hui. Partez plus tôt et prenez un parapluie.',
    msgHot: 'Il fera très chaud aujourd’hui. Buvez de l’eau et évitez le soleil de midi.', msgCold: 'Il fait froid ce matin. Habillez-vous chaudement.',
    msgStorm: 'Des orages sont prévus aujourd’hui. Soyez prudent dehors.', msgWind: 'Vent fort aujourd’hui. Fixez les objets légers.',
    prayerTitle: 'Horaires de prière', hijri: '{d} {m} {y} H', pFajr: 'Fajr', pSunrise: 'Lever du soleil', pDhuhr: 'Dhouhr', pAsr: 'Asr', pMaghrib: 'Maghrib', pIsha: 'Icha', pImsak: 'Imsak',
    nextPrayer: 'Prochaine prière : {name} à {t}, dans {left}', ramadanMode: 'Mode Ramadan', suhoorEnds: 'Fin du souhour (Imsak) à {t}, dans {left}', iftarAt: 'Iftar (Maghrib) à {t}, dans {left}',
    notifyPrayer: 'Me notifier aux heures de prière', pauseAtPrayer: 'Mettre la radio en pause pendant l’Adhan et reprendre ensuite', prayerNotifBody: 'C’est l’heure de {name}.',
    prayerError: 'Impossible de charger les horaires. Vérifiez votre connexion.',
    prayerNote: 'Horaires selon la méthode du ministère tunisien des Affaires religieuses. Le mode Ramadan suit le calendrier calculé, qui peut différer d’un jour de l’annonce officielle.',
    moreLanguage: 'Langue', moreTheme: 'Thème', themeSystem: 'Suivre mon système', themeLight: 'Clair', themeDark: 'Sombre', langAuto: 'Automatique',
    badge: 'Afficher la température sur l’icône de la barre d’outils', notifyAlerts: 'Me notifier en cas de météo sévère',
    rates: 'Taux de change du dinar tunisien', rateLine: '1 {cur} = {v} TND', converter: 'Convertir en dinars', amount: 'Montant', currency: 'Devise', converted: '{a} {cur} = {v} TND',
    ratesError: 'Impossible de charger les taux de change.', ratesUpdated: 'Taux mis à jour {t}',
    shortcuts: 'Raccourcis clavier', shortcutsHelp: 'Alt+Maj+P lecture ou pause. Alt+Maj+N station suivante. Alt+Maj+B station précédente. Alt+Maj+R ouvre cette fenêtre. Dans la fenêtre, Alt+1 à Alt+5 changent de section et les flèches déplacent entre les onglets.',
    openShortcuts: 'Modifier les raccourcis dans Chrome',
    stationsUpdated: 'Annuaire des stations mis à jour {t}', stationsRefresh: 'Actualiser l’annuaire des stations', stationsRefreshing: 'Actualisation…', stationsOffline: 'Actualisation impossible. Stations enregistrées à {t}.',
    adhanTitle: 'Adhan', adhanBuiltIn: 'Un seul Adhan intégré est joué automatiquement avec les notifications de prière, sans réglage ni connexion.',
    adhanPreview: 'Écouter l’Adhan intégré', adhanStop: 'Arrêter l’Adhan',
    adhanPlaying: 'Lecture de l’Adhan intégré', adhanStopped: 'Adhan arrêté',
    cmToggle: 'Lecture ou pause de la radio', cmNext: 'Station suivante', cmPrev: 'Station précédente', cmSleep: 'Minuteur de sommeil', cmSleepOff: 'Annuler le minuteur de sommeil',
    cmTimer: 'Minuteur rapide', cmPomo: 'Démarrer un Pomodoro', cmMinutes: '{n} minutes',
  },

  ar: {
    appName: 'DeskHaven', skip: 'انتقل إلى المحتوى', tabsLabel: 'الأقسام',
    tabRadio: 'الراديو', tabWeather: 'الطقس', tabAlarm: 'المنبّهات', tabPrayer: 'الصلاة', tabMore: 'المزيد',
    loading: 'جارٍ التحميل…', retry: 'حاول مرة أخرى', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', remove: 'إزالة',
    min: '{n} دقيقة', hr: '{n} ساعة', sec: '{n} ثانية',
    play: 'تشغيل', pause: 'إيقاف مؤقت', prev: 'المحطة السابقة', next: 'المحطة التالية', volume: 'مستوى الصوت', volumeText: '{n} بالمئة',
    sIdle: 'متوقفة', sConnecting: 'جارٍ الاتصال…', sPlaying: 'قيد التشغيل', sPaused: 'متوقفة مؤقتًا',
    sReconnecting: 'انقطع الاتصال. جارٍ إعادة الاتصال…', sError: 'تعذّر تشغيل هذه المحطة الآن. جرّب محطة أخرى.',
    nowPlaying: 'يُبث الآن: {t}', noStation: 'لم تُختر أي محطة',
    favorites: 'المفضلة', noFavorites: 'لا توجد مفضلة بعد. استعمل زر النجمة بجانب المحطة.', allStations: 'كل المحطات',
    playStation: 'شغّل {name}', stationPlaying: '{name}، قيد التشغيل', addFav: 'أضف {name} إلى المفضلة', removeFav: 'أزل {name} من المفضلة',
    favAdded: 'أُضيفت {name} إلى المفضلة', favRemoved: 'أُزيلت {name} من المفضلة',
    sleepTimer: 'مؤقّت النوم', sleepOff: 'متوقف', sleepSet: 'تم ضبط مؤقّت النوم على {n} دقيقة', sleepCancelled: 'أُلغي مؤقّت النوم', sleepLeft: 'يتوقف الراديو بعد {t}',
    findStations: 'ابحث عن محطات أو أضفها', searchStations: 'ابحث عن محطة تونسية بالاسم', search: 'بحث', searching: 'جارٍ البحث…',
    noResults: 'لم يتم العثور على محطات.', searchError: 'تعذّر الوصول إلى دليل المحطات.', addStation: 'أضف {name}', stationAdded: 'أُضيفت {name} إلى محطاتك',
    customHeading: 'أضف محطة بواسطة العنوان', customName: 'اسم المحطة', customUrl: 'عنوان البث (http أو https)', addCustom: 'أضف المحطة',
    badUrl: 'أدخل اسمًا وعنوان بث صحيحًا.', removeStation: 'أزل {name} من محطاتي', stationRemoved: 'أُزيلت {name}',
    trackInfo: 'إظهار عنوان المقطع (يطلب إذنًا إضافيًا)', trackDenied: 'لم يتم منح الإذن.',
    governorate: 'الولاية', detect: 'استعمل موقعي', detecting: 'جارٍ تحديد موقعك…', detectedAs: 'تم ضبط الموقع على {name}', detectFail: 'تعذّر تحديد موقعك.',
    customLocation: 'موقعي ({name})',
    feelsLike: 'الإحساس {n}°', humidity: 'الرطوبة {n}٪', wind: 'الرياح {n} كم/س', gusts: 'هبات تصل إلى {n} كم/س',
    hourly: 'الساعات القادمة', daily: 'توقعات 7 أيام', today: 'اليوم', tomorrow: 'غدًا', now: 'الآن',
    alertsTitle: 'تنبيهات الطقس', noAlerts: 'لا توجد تنبيهات طقس للأيام الثلاثة القادمة.',
    alertHeat: 'حرارة مرتفعة: حتى {v}° {day}', alertSirocco: 'رياح الشهيلي، رياح جنوبية حارة، متوقعة {day} (هبات {v} كم/س)',
    alertStorm: 'عواصف رعدية متوقعة {day}', alertRain: 'أمطار غزيرة {day}: نحو {v} ملم', alertWind: 'رياح قوية {day}: هبات تصل إلى {v} كم/س',
    alertUv: 'أشعة فوق بنفسجية شديدة {day}: المؤشر {v}',
    dToday: 'اليوم', dTomorrow: 'غدًا',
    airQuality: 'جودة الهواء', aq0: 'جيدة', aq1: 'مقبولة', aq2: 'متوسطة', aq3: 'سيئة', aq4: 'سيئة جدًا', aq5: 'سيئة للغاية',
    uvIndex: 'مؤشر الأشعة فوق البنفسجية', seaTitle: 'البحر', waves: 'ارتفاع الأمواج', seaTemp: 'حرارة البحر', noSea: 'غير متاح للمناطق الداخلية',
    high: 'العظمى', low: 'الصغرى', rainChance: 'احتمال المطر {n}٪',
    updated: 'آخر تحديث {t}', cachedOffline: 'تعذّر التحديث. يتم عرض الطقس المحفوظ من {t}.', wxError: 'تعذّر تحميل الطقس. تحقق من الاتصال.', refresh: 'تحديث الطقس',
    c0: 'سماء صافية', c1: 'صافية في الغالب', c2: 'غائمة جزئيًا', c3: 'غائمة', c45: 'ضباب', c51: 'رذاذ', c61: 'مطر', c71: 'ثلج', c80: 'زخات مطر', c95: 'عاصفة رعدية',
    alarms: 'المنبّهات', addAlarm: 'أضف منبّهًا', editAlarm: 'تعديل المنبّه', newAlarm: 'منبّه جديد', noAlarms: 'لا توجد منبّهات بعد.',
    alarmLabel: 'الاسم (اختياري)', alarmTime: 'الوقت', alarmType: 'النوع', typeTime: 'في وقت محدد', typeSuhoor: 'السحور (في رمضان فقط)',
    offsetBefore: 'دقائق قبل الفجر', repeat: 'التكرار في', repeatNone: 'إذا لم تختر أي يوم يرن المنبّه مرة واحدة.',
    rOnce: 'مرة واحدة', rEvery: 'كل يوم', rWeek: 'أيام الأسبوع', rWeekend: 'عطلة نهاية الأسبوع',
    sound: 'الصوت', soundBeep: 'صفير', soundRadio: 'محطة راديو', alarmStation: 'المحطة',
    gradual: 'ارفع الصوت تدريجيًا', challenge: 'حلّ مسألة حسابية للإيقاف', weatherMsg: 'اقرأ حالة الطقس عند الرنين', snoozeMin: 'مدة الغفوة بالدقائق',
    alarmOn: '{d}: مفعّل', alarmOff: '{d}: معطّل', alarmSaved: 'تم حفظ المنبّه', alarmDeleted: 'تم حذف المنبّه', editSpecific: 'تعديل المنبّه {d}',
    nextAlarm: 'المنبّه القادم بعد {t}', suhoorSummary: 'منبّه السحور، قبل الفجر بـ {n} دقيقة', ramadanOnly: 'في رمضان فقط',
    timers: 'المؤقّتات', timerMinutes: 'الدقائق', startTimer: 'ابدأ المؤقّت', timerLeft: '{label}: متبقي {t}', cancelTimer: 'ألغِ المؤقّت {label}',
    timerSet: 'تم ضبط المؤقّت على {n} دقيقة', timerDone: 'انتهى المؤقّت', noTimers: 'لا توجد مؤقّتات قيد التشغيل.', timerCancelled: 'أُلغي المؤقّت',
    pomodoro: 'بومودورو', pomoStart: 'ابدأ جلسة تركيز', pomoStop: 'أوقف بومودورو', pomoIdle: 'غير مفعّل. 25 دقيقة تركيز ثم 5 دقائق راحة.',
    pomoFocus: 'تركيز', pomoShort: 'راحة قصيرة', pomoLong: 'راحة طويلة', pomoStatus: '{phase}، متبقي {t} (الجلسة {n})',
    pomoFocusEnd: 'انتهت جلسة التركيز. حان وقت الراحة.', pomoBreakEnd: 'انتهت الراحة. لنعد إلى التركيز.', pomoStarted: 'بدأ بومودورو', pomoStopped: 'توقف بومودورو',
    ringingTitle: 'المنبّه', dismiss: 'إيقاف', snooze: 'غفوة {n} دقيقة', solvePrompt: 'للإيقاف، احسب: كم يساوي {a} + {b}؟', answer: 'إجابتك',
    wrongAnswer: 'إجابة خاطئة. جرّب هذه المسألة.', dismissed: 'تم إيقاف المنبّه', snoozedFor: 'غفوة لمدة {n} دقيقة',
    msgWx: '{city}: بين {min} و{max} درجة، {cond}.', msgRain: 'من المتوقع سقوط أمطار اليوم. اخرج مبكرًا وخذ مظلة.',
    msgHot: 'الطقس شديد الحرارة اليوم. اشرب الماء وتجنب شمس الظهيرة.', msgCold: 'الطقس بارد هذا الصباح. ارتدِ ملابس دافئة.',
    msgStorm: 'من المتوقع حدوث عواصف رعدية اليوم. احذر في الخارج.', msgWind: 'رياح قوية اليوم. ثبّت الأغراض الخفيفة.',
    prayerTitle: 'أوقات الصلاة', hijri: '{d} {m} {y} هـ', pFajr: 'الفجر', pSunrise: 'الشروق', pDhuhr: 'الظهر', pAsr: 'العصر', pMaghrib: 'المغرب', pIsha: 'العشاء', pImsak: 'الإمساك',
    nextPrayer: 'الصلاة القادمة: {name} عند {t}، بعد {left}', ramadanMode: 'وضع رمضان', suhoorEnds: 'ينتهي السحور (الإمساك) عند {t}، بعد {left}', iftarAt: 'الإفطار (المغرب) عند {t}، بعد {left}',
    notifyPrayer: 'نبّهني عند أوقات الصلاة', pauseAtPrayer: 'أوقف الراديو مؤقتًا أثناء الأذان واستأنف بعده', prayerNotifBody: 'حان وقت {name}.',
    prayerError: 'تعذّر تحميل أوقات الصلاة. تحقق من الاتصال.',
    prayerNote: 'الأوقات حسب طريقة وزارة الشؤون الدينية التونسية. وضع رمضان يتبع التقويم المحسوب وقد يختلف بيوم عن الإعلان الرسمي.',
    moreLanguage: 'اللغة', moreTheme: 'المظهر', themeSystem: 'حسب النظام', themeLight: 'فاتح', themeDark: 'داكن', langAuto: 'تلقائي',
    badge: 'إظهار درجة الحرارة على أيقونة شريط الأدوات', notifyAlerts: 'نبّهني عند الطقس القاسي',
    rates: 'أسعار صرف الدينار التونسي', rateLine: '1 {cur} = {v} دينار', converter: 'التحويل إلى الدينار', amount: 'المبلغ', currency: 'العملة', converted: '{a} {cur} = {v} دينار',
    ratesError: 'تعذّر تحميل أسعار الصرف.', ratesUpdated: 'آخر تحديث للأسعار {t}',
    shortcuts: 'اختصارات لوحة المفاتيح', shortcutsHelp: 'Alt+Shift+P للتشغيل أو الإيقاف المؤقت. Alt+Shift+N للمحطة التالية. Alt+Shift+B للمحطة السابقة. Alt+Shift+R لفتح هذه النافذة. داخل النافذة، Alt+1 إلى Alt+5 للتنقل بين الأقسام، والأسهم للتنقل بين التبويبات.',
    openShortcuts: 'غيّر الاختصارات في Chrome',
    stationsUpdated: 'تم تحديث دليل المحطات {t}', stationsRefresh: 'تحديث دليل المحطات', stationsRefreshing: 'جارٍ التحديث…', stationsOffline: 'تعذّر التحديث. المحطات المحفوظة من {t}.',
    adhanTitle: 'الأذان', adhanBuiltIn: 'يُشغَّل أذان واحد مدمج تلقائيًا مع تنبيهات الصلاة دون إعداد أو اتصال بالإنترنت.',
    adhanPreview: 'تشغيل الأذان المدمج', adhanStop: 'إيقاف الأذان',
    adhanPlaying: 'يتم تشغيل الأذان المدمج', adhanStopped: 'تم إيقاف الأذان',
    cmToggle: 'تشغيل أو إيقاف الراديو مؤقتًا', cmNext: 'المحطة التالية', cmPrev: 'المحطة السابقة', cmSleep: 'مؤقّت النوم', cmSleepOff: 'إلغاء مؤقّت النوم',
    cmTimer: 'مؤقّت سريع', cmPomo: 'ابدأ بومودورو', cmMinutes: '{n} دقيقة',
  },
};

export function t(lang, key, params) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  if (params) for (const k in params) s = s.split('{' + k + '}').join(String(params[k]));
  return s;
}

export function resolveLang(settings) {
  if (settings && LANGS[settings.lang]) return settings.lang;
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase();
  if (nav.startsWith('ar')) return 'ar';
  if (nav.startsWith('fr')) return 'fr';
  return 'en';
}

export const STRING_KEYS = STRINGS; // used by tests

/* ------------------------------------------------------------------ */
/* Static data                                                        */
/* ------------------------------------------------------------------ */

// id, French, English, Arabic, latitude, longitude
const GOV_RAW = [
  ['tunis', 'Tunis', 'Tunis', 'تونس', 36.8065, 10.1815],
  ['ariana', 'Ariana', 'Ariana', 'أريانة', 36.8665, 10.1647],
  ['benarous', 'Ben Arous', 'Ben Arous', 'بن عروس', 36.7533, 10.2189],
  ['manouba', 'La Manouba', 'Manouba', 'منوبة', 36.8101, 10.0863],
  ['nabeul', 'Nabeul', 'Nabeul', 'نابل', 36.4561, 10.7376],
  ['zaghouan', 'Zaghouan', 'Zaghouan', 'زغوان', 36.4029, 10.1429],
  ['bizerte', 'Bizerte', 'Bizerte', 'بنزرت', 37.2744, 9.8739],
  ['beja', 'Béja', 'Beja', 'باجة', 36.7256, 9.1817],
  ['jendouba', 'Jendouba', 'Jendouba', 'جندوبة', 36.5011, 8.7802],
  ['kef', 'Le Kef', 'El Kef', 'الكاف', 36.1826, 8.7148],
  ['siliana', 'Siliana', 'Siliana', 'سليانة', 36.085, 9.3708],
  ['sousse', 'Sousse', 'Sousse', 'سوسة', 35.8256, 10.6084],
  ['monastir', 'Monastir', 'Monastir', 'المنستير', 35.7643, 10.8113],
  ['mahdia', 'Mahdia', 'Mahdia', 'المهدية', 35.5047, 11.0622],
  ['sfax', 'Sfax', 'Sfax', 'صفاقس', 34.7406, 10.7603],
  ['kairouan', 'Kairouan', 'Kairouan', 'القيروان', 35.6781, 10.0963],
  ['kasserine', 'Kasserine', 'Kasserine', 'القصرين', 35.1676, 8.8365],
  ['sidibouzid', 'Sidi Bouzid', 'Sidi Bouzid', 'سيدي بوزيد', 35.0382, 9.4849],
  ['gabes', 'Gabès', 'Gabes', 'قابس', 33.8815, 10.0982],
  ['medenine', 'Médenine', 'Medenine', 'مدنين', 33.3549, 10.5055],
  ['tataouine', 'Tataouine', 'Tataouine', 'تطاوين', 32.9297, 10.4518],
  ['gafsa', 'Gafsa', 'Gafsa', 'قفصة', 34.425, 8.7842],
  ['tozeur', 'Tozeur', 'Tozeur', 'توزر', 33.9197, 8.1335],
  ['kebili', 'Kébili', 'Kebili', 'قبلي', 33.7044, 8.969],
];
export const GOVERNORATES = GOV_RAW.map(([id, fr, en, ar, lat, lon]) => ({ id, fr, en, ar, lat, lon }));

// Built-in stations. Stream addresses change from time to time; every station can list
// several addresses and the player tries them in order. Users can also search for
// stations and add their own from the Radio tab.
export const STATIONS = [
  { id: 'mosaique', name: 'Mosaïque FM', ar: 'موزاييك أف أم', urls: ['https://radio.mosaiquefm.net/mosalive', 'http://radio.mosaiquefm.net:8000/mosalive'] },
  { id: 'shems', name: 'Shems FM', ar: 'شمس أف أم', urls: ['https://stream6.tanitweb.com/shems'] },
  { id: 'jawhara', name: 'Jawhara FM', ar: 'جوهرة أف أم', urls: ['https://streaming2.toutech.net/jawharafm'] },
  { id: 'express', name: 'Express FM', ar: 'إكسبراس أف أم', urls: ['https://expressfm.ice.infomaniak.ch/expressfm-64.mp3', 'http://expressfm.ice.infomaniak.ch/expressfm-64.mp3'] },
  { id: 'ifm', name: 'IFM', ar: 'آي أف أم', urls: ['https://live.ifm.tn/radio/8000/ifmlive'] },
  { id: 'nationale', name: 'Radio Tunisienne Nationale', ar: 'الإذاعة الوطنية التونسية', urls: ['http://rtstream.tanitweb.com/nationale'] },
  { id: 'capfm', name: 'Cap FM', ar: 'كاب أف أم', urls: ['http://stream8.tanitweb.com/capfm'] },
  { id: 'zitouna', name: 'Zitouna FM', ar: 'إذاعة الزيتونة', urls: ['https://stream.tun-radio.com/radio/8050/live.mp3'] },
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD', 'CHF', 'SAR', 'AED', 'DZD', 'LYD', 'MAD', 'TRY', 'EGP'];

export const POMO = { focus: 25, short: 5, long: 15 };

/* ------------------------------------------------------------------ */
/* Dynamic station directory (Radio Browser, cached)                  */
/* ------------------------------------------------------------------ */

export const RADIO_BROWSER_HOSTS = ['de1', 'nl1', 'at1'];

export function hashStationId(url) {
  let h = 0;
  for (const c of url) h = (h * 31 + c.charCodeAt(0)) | 0;
  return 'r' + (h >>> 0).toString(36);
}

export async function fetchStationsByCountry(country = 'Tunisia', limit = 60) {
  const params = new URLSearchParams({ hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: String(limit) });
  let last;
  for (const h of RADIO_BROWSER_HOSTS) {
    try {
      const raw = await fetchJson(`https://${h}.api.radio-browser.info/json/stations/bycountry/${encodeURIComponent(country)}?${params}`, 9000);
      const seen = new Set();
      return raw
        .filter((r) => r.url_resolved && /^https?:/i.test(r.url_resolved) && !r.hls && !/\.m3u8?(\?|$)/i.test(r.url_resolved))
        .filter((r) => { if (seen.has(r.url_resolved)) return false; seen.add(r.url_resolved); return true; })
        .map((r) => ({ id: hashStationId(r.url_resolved), name: (r.name || '').trim() || r.url_resolved, urls: [...new Set([r.url_resolved, r.url].filter(Boolean))], dynamic: true }));
    } catch (e) { last = e; }
  }
  throw last;
}

export async function getStationCache() {
  const { stationCache } = await chrome.storage.local.get('stationCache');
  return stationCache || null;
}

export async function refreshStationCache() {
  try {
    const list = await fetchStationsByCountry('Tunisia');
    const cache = { ts: Date.now(), list };
    await chrome.storage.local.set({ stationCache: cache });
    return cache;
  } catch {
    const cache = await getStationCache();
    return cache ? { ...cache, stale: true } : { ts: 0, list: [], error: true };
  }
}

// Curated seed + directory results (deduped, dynamic first since it reflects live availability) + the user's own additions.
export function mergeStations(seed, dynamic, custom) {
  const seen = new Set(); const out = [];
  for (const s of [...(dynamic || []), ...seed, ...(custom || [])]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id); out.push(s);
  }
  return out;
}


/* ------------------------------------------------------------------ */
/* Storage helpers                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULTS = {
  lang: null,            // null = automatic
  theme: 'system',
  govId: 'tunis',
  customLoc: null,       // { lat, lon } when the user chose "use my location"
  volume: 0.8,
  lastStation: 'mosaique',
  favorites: [],
  customStations: [],
  nowPlayingEnabled: false,
  badge: true,
  alertsNotify: true,
  prayerNotify: true,
  pauseRadioAtPrayer: false,
};

export async function getSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  return { ...DEFAULTS, ...(settings || {}) };
}
export async function setSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.sync.set({ settings: next });
  return next;
}
export async function getAlarms() {
  const { alarms } = await chrome.storage.sync.get('alarms');
  return Array.isArray(alarms) ? alarms : [];
}
export async function setAlarms(list) {
  await chrome.storage.sync.set({ alarms: list });
}
export function allStations(settings) {
  return [...STATIONS, ...(settings.customStations || [])];
}
export function getLocation(settings, lang = 'en') {
  const g = GOVERNORATES.find((x) => x.id === settings.govId) || GOVERNORATES[0];
  const c = settings.customLoc;
  return { lat: c ? c.lat : g.lat, lon: c ? c.lon : g.lon, name: g[lang] || g.en, gov: g };
}
export function nearestGovernorate(lat, lon) {
  let best = GOVERNORATES[0], bd = Infinity;
  for (const g of GOVERNORATES) {
    const dx = (g.lat - lat), dy = (g.lon - lon) * Math.cos((lat * Math.PI) / 180);
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Formatting and dates                                               */
/* ------------------------------------------------------------------ */

export function fmtTime(lang, date, tz) {
  const opts = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  if (tz) opts.timeZone = tz;
  return new Intl.DateTimeFormat(LANGS[lang].locale, opts).format(date);
}
export function fmtWeekday(lang, date, style = 'long') {
  return new Intl.DateTimeFormat(LANGS[lang].locale, { weekday: style }).format(date);
}
export function fmtNum(lang, n, digits = 1) {
  return new Intl.NumberFormat(LANGS[lang].locale, { maximumFractionDigits: digits }).format(n);
}
export function fmtDur(lang, ms, withSeconds = false) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const parts = [];
  if (h) parts.push(t(lang, 'hr', { n: h }));
  if (m || (!h && !withSeconds)) parts.push(t(lang, 'min', { n: m }));
  if (withSeconds && !h) parts.push(t(lang, 'sec', { n: s }));
  return parts.join(' ') || t(lang, 'min', { n: 0 });
}
export function tunisDateStr(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
// Tunisia has used UTC+1 all year since 2009.
export function tunisTime(dateStr, hhmm) {
  return new Date(`${dateStr}T${hhmm}:00+01:00`);
}
export function dayWord(lang, index, dateStr) {
  if (index === 0) return t(lang, 'dToday');
  if (index === 1) return t(lang, 'dTomorrow');
  return fmtWeekday(lang, new Date(`${dateStr}T12:00:00+01:00`));
}

/* ------------------------------------------------------------------ */
/* Network                                                            */
/* ------------------------------------------------------------------ */

export async function fetchJson(url, ms = 10000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

/* ------------------------------------------------------------------ */
/* Weather                                                            */
/* ------------------------------------------------------------------ */

export function wmoKey(code) {
  if (code === 0) return 'c0';
  if (code === 1) return 'c1';
  if (code === 2) return 'c2';
  if (code === 3) return 'c3';
  if (code === 45 || code === 48) return 'c45';
  if (code >= 51 && code <= 57) return 'c51';
  if (code >= 61 && code <= 67) return 'c61';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'c71';
  if (code >= 80 && code <= 82) return 'c80';
  if (code >= 95) return 'c95';
  return 'c3';
}
const ICONS = { c0: ['☀️', '🌙'], c1: ['🌤️', '🌙'], c2: ['⛅', '☁️'], c3: ['☁️', '☁️'], c45: ['🌫️', '🌫️'], c51: ['🌦️', '🌧️'], c61: ['🌧️', '🌧️'], c71: ['❄️', '❄️'], c80: ['🌦️', '🌧️'], c95: ['⛈️', '⛈️'] };
export function wmoIcon(code, isDay = 1) {
  return ICONS[wmoKey(code)][isDay ? 0 : 1];
}

export async function fetchWeather(lat, lon) {
  const q = (o) => new URLSearchParams({ latitude: lat, longitude: lon, timezone: 'Africa/Tunis', ...o }).toString();
  const forecastUrl = 'https://api.open-meteo.com/v1/forecast?' + q({
    forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max',
  });
  const airUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?' + q({ current: 'european_aqi,pm10,pm2_5,uv_index' });
  const seaUrl = 'https://marine-api.open-meteo.com/v1/marine?' + q({ current: 'wave_height,sea_surface_temperature' });

  const [f, a, m] = await Promise.allSettled([fetchJson(forecastUrl), fetchJson(airUrl), fetchJson(seaUrl)]);
  if (f.status !== 'fulfilled') throw f.reason;
  const j = f.value;
  const c = j.current;

  // next 24 hours from the current hour
  const hourly = [];
  let start = j.hourly.time.findIndex((x) => x >= c.time.slice(0, 13) + ':00');
  if (start < 0) start = 0;
  for (let i = start; i < Math.min(start + 24, j.hourly.time.length); i++) {
    hourly.push({ time: j.hourly.time[i], temp: j.hourly.temperature_2m[i], pop: j.hourly.precipitation_probability[i], code: j.hourly.weather_code[i], day: j.hourly.is_day[i] });
  }
  const d = j.daily;
  const daily = d.time.map((date, i) => ({
    date, code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i],
    pop: d.precipitation_probability_max[i], precip: d.precipitation_sum[i], gust: d.wind_gusts_10m_max[i],
    dir: d.wind_direction_10m_dominant[i], uv: d.uv_index_max[i],
  }));

  let air = null;
  if (a.status === 'fulfilled' && a.value.current) {
    const ac = a.value.current;
    air = { aqi: ac.european_aqi, pm10: ac.pm10, pm25: ac.pm2_5, uv: ac.uv_index };
  }
  let sea = null;
  if (m.status === 'fulfilled' && m.value.current && m.value.current.wave_height != null) {
    const mc = m.value.current;
    sea = { wave: mc.wave_height, temp: mc.sea_surface_temperature };
  }

  return {
    fetchedAt: Date.now(), lat, lon,
    current: { temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m, code: c.weather_code, wind: c.wind_speed_10m, gust: c.wind_gusts_10m, day: c.is_day },
    hourly, daily, air, sea,
  };
}

export function computeAlerts(w) {
  const out = [];
  w.daily.slice(0, 3).forEach((d, i) => {
    const base = { i, date: d.date };
    if (d.max >= 38) out.push({ ...base, kind: 'Heat', v: Math.round(d.max) });
    if (d.max >= 34 && d.dir != null && d.dir >= 110 && d.dir <= 250 && d.gust >= 30) out.push({ ...base, kind: 'Sirocco', v: Math.round(d.gust) });
    if (d.code >= 95) out.push({ ...base, kind: 'Storm', v: 0 });
    if (d.precip >= 20) out.push({ ...base, kind: 'Rain', v: Math.round(d.precip) });
    if (d.gust >= 65) out.push({ ...base, kind: 'Wind', v: Math.round(d.gust) });
    if (i === 0 && d.uv >= 9) out.push({ ...base, kind: 'Uv', v: Math.round(d.uv) });
  });
  return out;
}
export function describeAlert(lang, a) {
  return t(lang, 'alert' + a.kind, { v: a.v, day: dayWord(lang, a.i, a.date) });
}
export function aqiLevel(aqi) {
  if (aqi == null) return null;
  if (aqi <= 20) return 0;
  if (aqi <= 40) return 1;
  if (aqi <= 60) return 2;
  if (aqi <= 80) return 3;
  if (aqi <= 100) return 4;
  return 5;
}

// Short spoken summary used by alarms that "read the weather".
export function weatherAdvice(lang, w, city) {
  if (!w || !w.daily || !w.daily[0]) return '';
  const d = w.daily[0];
  const parts = [t(lang, 'msgWx', { city, min: Math.round(d.min), max: Math.round(d.max), cond: t(lang, wmoKey(d.code)) })];
  if (d.code >= 95) parts.push(t(lang, 'msgStorm'));
  else if (d.precip >= 2 || d.pop >= 60) parts.push(t(lang, 'msgRain'));
  if (d.max >= 36) parts.push(t(lang, 'msgHot'));
  else if (d.min <= 6) parts.push(t(lang, 'msgCold'));
  if (d.gust >= 60) parts.push(t(lang, 'msgWind'));
  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/* Prayer times                                                       */
/* ------------------------------------------------------------------ */

export const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export async function getPrayerDay(ds, loc) {
  const key = `${ds}|${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;
  const { prayerCache = {} } = await chrome.storage.local.get('prayerCache');
  if (prayerCache[key]) return prayerCache[key];
  const [y, m, d] = ds.split('-');
  const j = await fetchJson(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${loc.lat}&longitude=${loc.lon}&method=18`);
  const tm = j.data.timings, hj = j.data.date.hijri;
  const hm = (k) => { const r = /(\d{1,2}):(\d{2})/.exec(tm[k] || ''); return r ? r[1].padStart(2, '0') + ':' + r[2] : null; };
  const day = {
    date: ds, Fajr: hm('Fajr'), Sunrise: hm('Sunrise'), Dhuhr: hm('Dhuhr'), Asr: hm('Asr'), Maghrib: hm('Maghrib'), Isha: hm('Isha'), Imsak: hm('Imsak') || hm('Fajr'),
    hijri: { day: hj.day, monthNum: Number(hj.month.number), monthEn: hj.month.en, monthAr: hj.month.ar, year: hj.year },
  };
  const keys = Object.keys(prayerCache).sort();
  while (keys.length > 8) delete prayerCache[keys.shift()];
  prayerCache[key] = day;
  await chrome.storage.local.set({ prayerCache });
  return day;
}

/* ------------------------------------------------------------------ */
/* Exchange rates                                                     */
/* ------------------------------------------------------------------ */

export async function getRates() {
  const { rates } = await chrome.storage.local.get('rates');
  if (rates && Date.now() - rates.ts < 6 * 3600 * 1000) return rates;
  try {
    const j = await fetchJson('https://open.er-api.com/v6/latest/TND');
    if (!j.rates) throw new Error('no rates');
    const fresh = { ts: Date.now(), rates: j.rates };
    await chrome.storage.local.set({ rates: fresh });
    return fresh;
  } catch (e) {
    if (rates) return { ...rates, stale: true };
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Alarm scheduling                                                   */
/* ------------------------------------------------------------------ */

export function nextTime(alarm, now = new Date()) {
  const [h, m] = alarm.time.split(':').map(Number);
  const days = alarm.days && alarm.days.length ? alarm.days : null;
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now.getTime() + 1000) continue;
    if (!days || days.includes(d.getDay())) return d;
  }
  return null;
}

export async function suhoorTime(alarm, loc, now = new Date()) {
  for (let i = 0; i < 3; i++) {
    const ds = tunisDateStr(new Date(now.getTime() + i * 864e5));
    let day;
    try { day = await getPrayerDay(ds, loc); } catch { continue; }
    if (day.hijri.monthNum !== 9) continue;
    const when = new Date(tunisTime(ds, day.Fajr).getTime() - (alarm.offset ?? 30) * 60000);
    if (when.getTime() > now.getTime() + 1000) return when;
  }
  return null;
}

export async function nextRing(alarm, loc) {
  return alarm.kind === 'suhoor' ? suhoorTime(alarm, loc) : nextTime(alarm);
}

export function repeatSummary(lang, alarm) {
  const days = alarm.days || [];
  if (alarm.kind === 'suhoor') return t(lang, 'ramadanOnly');
  if (!days.length) return t(lang, 'rOnce');
  const s = [...days].sort().join('');
  if (days.length === 7) return t(lang, 'rEvery');
  if (s === '12345') return t(lang, 'rWeek');
  if (s === '06') return t(lang, 'rWeekend');
  const base = new Date(2024, 0, 7); // a Sunday
  return [...days].sort().map((d) => fmtWeekday(lang, new Date(base.getTime() + d * 864e5), 'short')).join(', ');
}
export function describeAlarm(lang, alarm) {
  const time = alarm.kind === 'suhoor' ? t(lang, 'suhoorSummary', { n: alarm.offset ?? 30 }) : alarm.time;
  return [time, alarm.label, alarm.kind === 'suhoor' ? '' : repeatSummary(lang, alarm)].filter(Boolean).join(', ');
}

/* ------------------------------------------------------------------ */
/* Sleep timer, countdown timers, Pomodoro                            */
/* ------------------------------------------------------------------ */

export async function startSleep(minutes) {
  await chrome.alarms.create('sleep', { when: Date.now() + minutes * 60000 });
  await chrome.storage.session.set({ sleepEnd: Date.now() + minutes * 60000 });
}
export async function cancelSleep() {
  await chrome.alarms.clear('sleep');
  await chrome.storage.session.remove('sleepEnd');
}

export async function getTimers() {
  const { timers = [] } = await chrome.storage.local.get('timers');
  return timers;
}
export async function addTimer(minutes, label) {
  const timers = await getTimers();
  const id = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const endTs = Date.now() + minutes * 60000;
  timers.push({ id, label, endTs });
  await chrome.storage.local.set({ timers });
  await chrome.alarms.create('timer:' + id, { when: endTs });
  return id;
}
export async function removeTimer(id) {
  const timers = (await getTimers()).filter((x) => x.id !== id);
  await chrome.storage.local.set({ timers });
  await chrome.alarms.clear('timer:' + id);
}

export async function startPomodoro() {
  const endTs = Date.now() + POMO.focus * 60000;
  await chrome.storage.local.set({ pomodoro: { phase: 'focus', endTs, cycle: 1 } });
  await chrome.alarms.create('pomo', { when: endTs });
}
export async function stopPomodoro() {
  await chrome.storage.local.remove('pomodoro');
  await chrome.alarms.clear('pomo');
}
