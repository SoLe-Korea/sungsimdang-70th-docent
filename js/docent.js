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
    if (!('speechSynthesis' in window)) {
      showVoiceNotice(true);
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
    showVoiceNotice(!hasMatch);
  }

  function showVoiceNotice(show) {
    if (!noticeEl) return;
    noticeEl.textContent = VOICE_LIMITED_NOTICE;
    noticeEl.hidden = !show;
  }

  function speakContent(lang, text) {
    if (!('speechSynthesis' in window)) {
      showVoiceNotice(true);
      return;
    }
    window.speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BCP47[lang] || 'ko-KR';

    var voices = window.speechSynthesis.getVoices();
    var match = null;
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang === utterance.lang) {
        match = voices[i];
        break;
      }
    }
    if (!match) {
      for (var j = 0; j < voices.length; j++) {
        if (voices[j].lang.indexOf(lang) === 0) {
          match = voices[j];
          break;
        }
      }
    }
    if (match) utterance.voice = match;

    utterance.onstart = function () {
      speaking = true;
      paused = false;
      updatePlaybackUI();
    };
    utterance.onend = function () {
      speaking = false;
      paused = false;
      updatePlaybackUI();
    };
    utterance.onerror = function () {
      speaking = false;
      paused = false;
      updatePlaybackUI();
    };

    window.speechSynthesis.speak(utterance);
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
