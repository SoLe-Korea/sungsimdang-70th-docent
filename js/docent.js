/**
 * docent.js
 * Shared script for the museum QR docent floor pages (floor1/, floor2/, floor3/).
 * Loaded by each floor's index.html. Reads document.body[data-floor] to know
 * which data/floor{N}.json file to fetch, then renders language chips,
 * exhibition title/content, and audio playback controls.
 *
 * Data file shape (data/floorN.json):
 * {
 *   "title":   { "ko": "...", "en": "...", "zh": "...", "ja": "...", "es": "...", "vi": "..." },
 *   "content": { "ko": "...", "en": "...", "zh": "...", "ja": "...", "es": "...", "vi": "..." }
 * }
 *
 * OPTIONAL extensibility field (NOT present in the shipped data files):
 *   "audioUrl": { "ko": "audio/floor1-ko.mp3", "en": "audio/floor1-en.mp3", ... }
 * This is a top-level object parallel to "title"/"content", keyed by the same
 * language codes. If data.audioUrl[lang] exists for the selected language,
 * playback uses an <audio> element pointed at that URL. If it is absent
 * (the default / current state of all shipped data files), playback falls
 * back to window.speechSynthesis reading data.content[lang] aloud. Either
 * way the same play/pause/stop UI controls whichever mechanism is active.
 * This lets exhibition text (and later, real narration audio) be updated
 * purely by editing the JSON files -- no HTML/CSS/JS changes required.
 */
(function () {
  'use strict';

  var LANG_STORAGE_KEY = 'docentSelectedLang';
  var DEFAULT_LANG = 'ko';

  var LANGUAGES = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'es', label: 'Español' },
    { code: 'vi', label: 'Tiếng Việt' }
  ];

  var BCP47 = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
    ja: 'ja-JP',
    es: 'es-ES',
    vi: 'vi-VN'
  };

  var VOICE_LIMITED_NOTICE = '이 기기에서는 음성 지원이 제한적일 수 있습니다.';
  var VOICE_NO_MATCH_NOTICE =
    '이 언어의 음성이 설치되어 있지 않습니다. (Android: 설정 > 일반 > 언어 및 입력 > ' +
    '텍스트 음성 변환에서 언어를 추가해주세요)';
  var VOICE_SILENT_FAIL_NOTICE =
    '이 기기에서는 선택한 언어의 음성이 재생되지 않았습니다. ' +
    '언어팩이 설치되어 있는지 확인하거나, 카카오톡 등 메신저 브라우저 대신 ' +
    'Chrome/Safari로 열어 다시 시도해주세요.';
  var INAPP_BROWSER_NOTICE =
    '카카오톡/네이버 등 인앱 브라우저에서는 음성 기능이 제한될 수 있습니다. ' +
    '우측 상단 메뉴에서 "다른 브라우저로 열기"를 선택해주세요.';
  var TTS_START_TIMEOUT_MS = 1500;

  function isInAppBrowser() {
    var ua = navigator.userAgent || '';
    return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua);
  }

  var floorNumber = document.body.getAttribute('data-floor') || '1';

  var chipsContainer = document.getElementById('lang-chips');
  var titleEl = document.getElementById('title');
  var contentEl = document.getElementById('content');
  var noticeEl = document.getElementById('voice-notice');
  var playPauseBtn = document.getElementById('btn-playpause');
  var stopBtn = document.getElementById('btn-stop');

  var docentData = null;
  var currentLang = DEFAULT_LANG;
  var utterance = null;
  var speaking = false;
  var paused = false;
  var audioEl = null; // lazily created, used only when audioUrl is present

  function getStoredLang() {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      /* ignore (private browsing, storage disabled, quota, etc.) */
    }
  }

  function stopPlayback() {
    clearTtsStartTimer();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    speaking = false;
    paused = false;
    updatePlaybackUI();
  }

  function updatePlaybackUI() {
    if (!playPauseBtn) return;
    if (speaking && !paused) {
      playPauseBtn.textContent = '⏸ 일시정지';
      playPauseBtn.setAttribute('aria-pressed', 'true');
      playPauseBtn.classList.add('is-playing');
    } else if (speaking && paused) {
      playPauseBtn.textContent = '▶ 재생';
      playPauseBtn.setAttribute('aria-pressed', 'false');
      playPauseBtn.classList.remove('is-playing');
    } else {
      playPauseBtn.textContent = '▶ 음성으로 듣기';
      playPauseBtn.setAttribute('aria-pressed', 'false');
      playPauseBtn.classList.remove('is-playing');
    }
    if (stopBtn) {
      stopBtn.disabled = !speaking;
    }
  }

  function getAudioUrlForLang(lang) {
    return docentData && docentData.audioUrl && docentData.audioUrl[lang]
      ? docentData.audioUrl[lang]
      : null;
  }

  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = document.createElement('audio');
    audioEl.setAttribute('hidden', '');
    audioEl.addEventListener('ended', function () {
      speaking = false;
      paused = false;
      updatePlaybackUI();
    });
    audioEl.addEventListener('pause', function () {
      if (speaking) {
        paused = true;
        updatePlaybackUI();
      }
    });
    audioEl.addEventListener('play', function () {
      speaking = true;
      paused = false;
      updatePlaybackUI();
    });
    document.body.appendChild(audioEl);
    return audioEl;
  }

  function checkVoiceAvailability(lang) {
    if (isInAppBrowser()) {
      showVoiceNotice(true, INAPP_BROWSER_NOTICE);
      return;
    }
    if (!('speechSynthesis' in window)) {
      showVoiceNotice(true, VOICE_LIMITED_NOTICE);
      return;
    }
    // If audioUrl is available for this language, speechSynthesis voice
    // availability is irrelevant -- pre-recorded audio will be used instead.
    if (getAudioUrlForLang(lang)) {
      showVoiceNotice(false);
      return;
    }
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      // Voices may not have loaded yet (async in some browsers).
      // Wait for the voiceschanged event to re-check; don't warn yet.
      return;
    }
    var target = BCP47[lang];
    var hasMatch = voices.some(function (v) {
      return v.lang === target || v.lang.indexOf(lang) === 0;
    });
    showVoiceNotice(!hasMatch, VOICE_NO_MATCH_NOTICE);
  }

  function showVoiceNotice(show, message) {
    if (!noticeEl) return;
    noticeEl.textContent = message || VOICE_LIMITED_NOTICE;
    noticeEl.hidden = !show;
  }

  var ttsStartTimer = null;
  var preSpeakTimer = null;

  function clearTtsStartTimer() {
    if (ttsStartTimer) {
      clearTimeout(ttsStartTimer);
      ttsStartTimer = null;
    }
    if (preSpeakTimer) {
      clearTimeout(preSpeakTimer);
      preSpeakTimer = null;
    }
  }

  // Ranks candidate voices for a language and returns the best one.
  // Local (on-device) voices are preferred over remote/network voices --
  // remote voices need a live connection to synthesize speech and fail
  // completely silently (no error, no sound) on a weak signal, which is a
  // realistic condition inside the exhibition hall. Exact BCP-47 match beats
  // a bare-language-code prefix match (Android/Samsung sometimes reports
  // voice.lang with underscores, e.g. "en_US", so the prefix check is kept
  // as a fallback for that too).
  function findVoiceForLang(lang, target) {
    var voices = window.speechSynthesis.getVoices();
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var isExact = v.lang === target;
      var isPrefix = v.lang.indexOf(lang) === 0;
      if (!isExact && !isPrefix) continue;
      var score = (isExact ? 2 : 1) + (v.localService ? 2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  function speakContent(lang, text) {
    if (!('speechSynthesis' in window)) {
      showVoiceNotice(true, VOICE_LIMITED_NOTICE);
      return;
    }
    window.speechSynthesis.cancel();
    clearTtsStartTimer();

    var targetLang = BCP47[lang] || 'ko-KR';
    var match = findVoiceForLang(lang, targetLang);

    // Android/Chrome has a known race condition where speak() called
    // immediately after cancel() is silently dropped (the previous queue
    // hasn't finished clearing yet). A short delay avoids it; it's
    // imperceptible to the user.
    preSpeakTimer = setTimeout(function () {
      preSpeakTimer = null;
      startUtterance(text, targetLang, match);
    }, 50);
  }

  function startUtterance(text, targetLang, match) {
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    // Slightly slower than default reduces the choppy, rushed feel of
    // browser TTS without sounding unnaturally slow.
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    if (match) utterance.voice = match;

    utterance.onstart = function () {
      clearTtsStartTimer();
      speaking = true;
      paused = false;
      showVoiceNotice(false);
      updatePlaybackUI();
    };
    utterance.onend = function () {
      clearTtsStartTimer();
      speaking = false;
      paused = false;
      updatePlaybackUI();
    };
    utterance.onerror = function () {
      clearTtsStartTimer();
      speaking = false;
      paused = false;
      showVoiceNotice(true, VOICE_SILENT_FAIL_NOTICE);
      updatePlaybackUI();
    };

    window.speechSynthesis.speak(utterance);

    // Android TTS engines routinely list a language in getVoices() even when
    // its voice data was never downloaded -- speak() then fails silently
    // (no onerror, no onstart, no sound). Detect that by watching for
    // onstart within a short window; if it never fires, treat as failed.
    clearTtsStartTimer();
    ttsStartTimer = setTimeout(function () {
      ttsStartTimer = null;
      if (!speaking) {
        window.speechSynthesis.cancel();
        showVoiceNotice(true, VOICE_SILENT_FAIL_NOTICE);
      }
    }, TTS_START_TIMEOUT_MS);
  }

  function handlePlayPause() {
    var audioUrl = getAudioUrlForLang(currentLang);

    if (audioUrl) {
      var el = ensureAudioEl();
      if (el.getAttribute('src') !== audioUrl) {
        el.src = audioUrl;
      }
      if (speaking && !paused) {
        el.pause();
      } else {
        el.play();
      }
      return;
    }

    // speechSynthesis fallback
    if (!('speechSynthesis' in window)) {
      showVoiceNotice(true);
      return;
    }
    if (speaking && !paused) {
      window.speechSynthesis.pause();
      paused = true;
      updatePlaybackUI();
    } else if (speaking && paused) {
      window.speechSynthesis.resume();
      paused = false;
      updatePlaybackUI();
    } else {
      var text = docentData && docentData.content && docentData.content[currentLang];
      if (text) speakContent(currentLang, text);
    }
  }

  function handleStop() {
    stopPlayback();
  }

  function renderLanguageChips() {
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';
    LANGUAGES.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-chip';
      btn.textContent = lang.label;
      btn.setAttribute('data-lang', lang.code);
      btn.setAttribute('aria-pressed', lang.code === currentLang ? 'true' : 'false');
      if (lang.code === currentLang) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        selectLanguage(lang.code);
      });
      chipsContainer.appendChild(btn);
    });
  }

  function updateChipActiveState() {
    if (!chipsContainer) return;
    var chips = chipsContainer.querySelectorAll('.lang-chip');
    for (var i = 0; i < chips.length; i++) {
      var chip = chips[i];
      var isActive = chip.getAttribute('data-lang') === currentLang;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
  }

  function renderContent() {
    if (!docentData) return;
    var title = docentData.title && docentData.title[currentLang];
    var content = docentData.content && docentData.content[currentLang];
    if (titleEl) titleEl.textContent = title || '';
    if (contentEl) contentEl.textContent = content || '';
    document.documentElement.setAttribute('lang', currentLang);
    checkVoiceAvailability(currentLang);
  }

  function selectLanguage(lang) {
    if (lang === currentLang) return;
    stopPlayback();
    currentLang = lang;
    storeLang(lang);
    updateChipActiveState();
    renderContent();
  }

  function loadData() {
    // Same-origin relative fetch of a local static JSON file (no external API calls).
    fetch('../data/floor' + floorNumber + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load floor data: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        docentData = data;
        var stored = getStoredLang();
        currentLang = (stored && BCP47[stored]) ? stored : DEFAULT_LANG;
        renderLanguageChips();
        renderContent();
      })
      .catch(function (err) {
        if (contentEl) contentEl.textContent = '전시 정보를 불러오지 못했습니다.';
        console.error(err);
      });
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', handlePlayPause);
  if (stopBtn) stopBtn.addEventListener('click', handleStop);

  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', function () {
      checkVoiceAvailability(currentLang);
    });
  }

  window.addEventListener('beforeunload', stopPlayback);
  window.addEventListener('pagehide', stopPlayback);

  loadData();
})();
