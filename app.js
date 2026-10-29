(() => {
  const $ = id => document.getElementById(id);
  const screens = { home: $('screen-home'), categories: $('screen-categories'), comp: $('screen-comp'), quiz: $('screen-quiz'), complete: $('screen-complete'), repaso: $('screen-repaso'), digalo: $('screen-digalo') };
  const CATEGORY_NAMES = { hora_silenciosa: 'Hora Silenciosa', discipulado: 'Discipulado', versiculos: 'Memorización', lecciones: 'Lecciones', todas: 'Todas las Categorías', repasar_errores: 'Preguntas para Repasar', competencia: 'Competencia IBCJ', comp_repasar: 'Preguntas para Repasar' };

  // Secciones: Jóvenes Involucrados (ji) y Competencia IBCJ (comp)
  const SECTION_DATA = { ji: QUESTIONS, comp: COMP_QUESTIONS };
  const ERRORS_CAT = { ji: 'repasar_errores', comp: 'comp_repasar' };
  const MENU_SCREEN = { ji: 'categories', comp: 'comp' };
  const MENU_SCREENS = ['home', 'categories', 'comp'];
  let currentSection = 'ji';
  const sectionData = () => SECTION_DATA[currentSection];
  const isErrorsCat = cat => cat === 'repasar_errores' || cat === 'comp_repasar';

  let currentCategory = '';
  let state = {
    shuffled: [],
    currentIndex: 0,
    correctCount: 0,
    incorrectCount: 0,
    answers: []
  };

  // Configuration
  let settings = {
    sound: localStorage.getItem('ji2026_sound') !== 'false',
    vibration: localStorage.getItem('ji2026_vibration') !== 'false'
  };

  // --- SOUND MANAGER (Web Audio API) ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // force: suena aunque los efectos estén apagados (cronómetro de Dígalo)
  function playTone(freq, type, duration, vol=0.1, force=false) {
    if ((!settings.sound && !force) || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playDing() {
    if (!settings.sound) return;
    resumeAudio();
    playTone(800, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(1200, 'sine', 0.2, 0.1), 100);
  }

  function playBloop() {
    if (!settings.sound) return;
    resumeAudio();
    playTone(300, 'square', 0.15, 0.05);
    setTimeout(() => playTone(200, 'square', 0.2, 0.05), 100);
  }

  function playTada() {
    if (!settings.sound) return;
    resumeAudio();
    playTone(523.25, 'sine', 0.1, 0.1); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.1, 0.1), 200); // G5
    setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.1), 300); // C6
  }

  function playTick() {
    resumeAudio();
    playTone(1000, 'sine', 0.08, 0.15, true);
  }

  function playAlarm() {
    resumeAudio();
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playTone(880, 'square', 0.18, 0.2, true), i * 450);
      setTimeout(() => playTone(1175, 'square', 0.22, 0.2, true), i * 450 + 200);
    }
  }

  function resumeAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  let deferredPrompt;
  const btnInstall = $('btn-install');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
    });
  }

  // PWA Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.classList.remove('hidden');
  });

  btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') btnInstall.classList.add('hidden');
      deferredPrompt = null;
    }
  });

  window.addEventListener('appinstalled', () => {
    btnInstall.classList.add('hidden');
    deferredPrompt = null;
  });

  function initHome() {
    updateStreak();
  }

  function initMenu() {
    const data = sectionData();
    const errCat = ERRORS_CAT[currentSection];
    const repasarList = getRepasarErrores(errCat);
    const clearBtn = $('btn-clear-' + errCat);
    $('count-' + errCat).textContent = `${repasarList.length} preguntas`;
    if (repasarList.length > 0) {
      data[errCat] = repasarList;
      updateProgressUI(errCat, repasarList.length);
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      delete data[errCat];
      const progEl = $('prog-' + errCat);
      if (progEl) progEl.style.width = '0%';
      if (clearBtn) clearBtn.classList.add('hidden');
    }

    let totalAll = 0;
    Object.keys(data).forEach(k => {
      if (isErrorsCat(k)) return;
      const count = data[k].length;
      totalAll += count;
      const elCount = $('count-' + k);
      if (elCount) elCount.textContent = count + ' preguntas';
      updateProgressUI(k, count);
    });

    if (currentSection === 'ji') {
      $('count-todas').textContent = totalAll + ' preguntas';
      updateProgressUI('todas', totalAll);
    } else {
      $('count-digalo').textContent = DIGALO_TOPICS.length + ' temas';
    }
  }

  function updateStreak() {
    const lastVisit = localStorage.getItem('ji2026_last_visit');
    let streak = parseInt(localStorage.getItem('ji2026_streak') || '0');
    const todayStr = new Date().toDateString();

    if (lastVisit !== todayStr) {
      if (lastVisit) {
        // Reset to 00:00:00 to calculate purely by days
        const lastDate = new Date(lastVisit);
        const today = new Date(todayStr);
        const diffTime = today - lastDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak++;
        else if (diffDays > 1) streak = 1;
      } else {
        streak = 1;
      }
      localStorage.setItem('ji2026_last_visit', todayStr);
      localStorage.setItem('ji2026_streak', streak);
    }

    const badge = $('streak-badge');
    const count = $('streak-count');
    if(badge && count) {
      if(streak > 0) {
        badge.classList.remove('hidden');
        count.textContent = streak;
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  function updateProgressUI(cat, total) {
    const saved = loadProgress(cat);
    const progEl = $('prog-' + cat);
    if (!progEl) return;

    if (saved && saved.shuffled && saved.shuffled.length > 0) {
      const pct = (saved.currentIndex / saved.shuffled.length) * 100;
      progEl.style.width = pct + '%';
    } else {
      progEl.style.width = '0%';
    }
  }

  function saveProgress() {
    if (!currentCategory || isErrorsCat(currentCategory)) return;
    localStorage.setItem('ji2026_state_' + currentCategory, JSON.stringify(state));
    updateProgressUI(currentCategory, state.shuffled.length);
  }

  function loadProgress(cat) {
    if (isErrorsCat(cat)) return null;
    const saved = localStorage.getItem('ji2026_state_' + cat);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Error parsing state for', cat, e);
      clearProgress(cat);
      return null;
    }
  }

  function clearProgress(cat) {
    if (isErrorsCat(cat)) return;
    localStorage.removeItem('ji2026_state_' + cat);
    updateProgressUI(cat, 0);
  }

  // Repasar Errores Helpers (una lista por sección: ji2026_repasar_errores / ji2026_comp_repasar)
  function getRepasarErrores(cat) {
    const saved = localStorage.getItem('ji2026_' + cat);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Error parsing', cat, e);
      clearRepasarErrores(cat);
      return [];
    }
  }

  function saveToRepasarErrores(cat, q) {
    let list = getRepasarErrores(cat);
    if (!list.some(item => item.q === q.q)) {
      list.push(q);
      localStorage.setItem('ji2026_' + cat, JSON.stringify(list));
    }
  }

  function removeFromRepasarErrores(cat, questionText) {
    let list = getRepasarErrores(cat);
    list = list.filter(item => item.q !== questionText);
    localStorage.setItem('ji2026_' + cat, JSON.stringify(list));
  }

  function clearRepasarErrores(cat) {
    localStorage.removeItem('ji2026_' + cat);
  }

  function vibrate(pattern) {
    if (!settings.vibration) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch(e) {}
    }
  }

  // Historial para botón físico 'Atrás' en móviles
  history.replaceState({ screen: 'home' }, '');

  window.addEventListener('popstate', (e) => {
    stopTimer();
    renderScreen((e.state && e.state.screen) || 'home');
  });

  function refreshScreen(name) {
    if (name === 'home') initHome();
    else if (name === 'categories' || name === 'comp') {
      currentSection = name === 'comp' ? 'comp' : 'ji';
      initMenu();
    }
  }

  // Muestra una pantalla sin tocar el historial
  function renderScreen(name) {
    refreshScreen(name);
    const update = () => {
      Object.values(screens).forEach(s => s.classList.remove('active'));
      screens[name].classList.add('active');
    };
    if (document.startViewTransition) {
      document.startViewTransition(update).ready.catch(() => {});
    } else {
      update();
    }
  }

  function showScreen(name) {
    const activeName = Object.keys(screens).find(k => screens[k].classList.contains('active'));
    if (name !== activeName && MENU_SCREENS.includes(activeName)) {
      history.pushState({ screen: name }, '');
    }
    renderScreen(name);
  }

  // Vuelve una pantalla atrás (al menú de la sección, o al inicio desde un menú)
  function navBack(fallback) {
    vibrate(20);
    stopTimer();
    if (history.state && history.state.screen !== 'home') {
      history.back();
    } else {
      renderScreen(fallback);
    }
  }

  function goHome() {
    navBack(MENU_SCREEN[currentSection]);
  }

  let confirmAction = null;
  function showConfirmModal(title, text, confirmText, action) {
    const modal = $('modal-confirm');
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-text').textContent = text;
    $('btn-modal-confirm').textContent = confirmText;
    confirmAction = action;
    modal.classList.remove('hidden');
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildMetaTags(q, category) {
    let html = '';
    const tag = (cls, icon, text) => `<span class="meta-tag meta-tag--${cls}">${icon} ${text}</span>`;
    const srcCat = q._srcCat || category;

    // 1. Categoría
    const catName = CATEGORY_NAMES[srcCat] || 'Repaso';
    html += tag('carpeta', '🏷️', catName);

    // 2 y 3. Carpeta y Lección / Referencia
    if (srcCat === 'lecciones') {
      if (q.carpeta) html += tag('carpeta', '📂', q.carpeta);
      if (q.leccion) html += tag('leccion', '📝', q.leccion);
    } else if (srcCat === 'discipulado') {
      if (q.leccion_num) html += tag('lecnum', '📘', `Lección ${q.leccion_num}`);
      if (q.leccion_titulo) html += tag('leccion', '📝', q.leccion_titulo);
    } else if (srcCat === 'versiculos') {
      if (q.leccion) html += tag('leccion', '📝', q.leccion);
    }

    // 4. Número
    if (q.num) html += tag('num', '#', `Pregunta ${q.num}`);

    return html;
  }

  function startCategory(cat, forceRestart = false) {
    currentCategory = cat;
    const data = sectionData();
    const saved = loadProgress(cat);

    // Validate if saved state matches current database length
    let expectedLength = 0;
    if (cat === 'todas') {
      Object.keys(data).forEach(k => { if (!isErrorsCat(k)) expectedLength += data[k].length; });
    } else {
      expectedLength = (data[cat] || []).length;
    }

    if (saved && !forceRestart) {
      if (saved.shuffled && saved.shuffled.length === expectedLength) {
        state = saved;
        if (!state.answers) state.answers = [];
      } else {
        forceRestart = true; // Invalidate stale state
      }
    }

    if (!saved || forceRestart) {
      let questions = [];
      if (cat === 'todas') {
        Object.keys(data).forEach(k => {
          if (isErrorsCat(k)) return;
          data[k].forEach(q => questions.push({ ...q, _srcCat: k }));
        });
      } else {
        questions = data[cat] || [];
      }
      state = {
        shuffled: shuffle(questions),
        currentIndex: 0,
        correctCount: 0,
        incorrectCount: 0,
        answers: []
      };
      saveProgress();
    }

    $('quiz-category-title').textContent = CATEGORY_NAMES[cat];
    $('quiz-total').textContent = state.shuffled.length;
    showQuestion();
    showScreen('quiz');
  }

  function showQuestion() {
    if (state.currentIndex >= state.shuffled.length) {
      // Complete
      const total = state.shuffled.length;
      const pct = Math.round((state.correctCount / total) * 100) || 0;

      $('score-detail').textContent = `${state.correctCount} / ${total} correctas`;
      $('score-pct').textContent = '0%';
      $('score-ring-fill').style.strokeDashoffset = 327; // Reset ring

      showScreen('complete');
      clearProgress(currentCategory);

      if (isErrorsCat(currentCategory)) {
        $('btn-replay').classList.add('hidden');
        $('btn-clear-errores').classList.remove('hidden');
      } else {
        $('btn-replay').classList.remove('hidden');
        $('btn-clear-errores').classList.add('hidden');
      }

      // Animate score ring
      setTimeout(() => {
        const offset = 327 - (327 * pct / 100);
        const ring = $('score-ring-fill');
        ring.style.strokeDashoffset = offset;
        $('score-pct').textContent = pct + '%';
        if(pct >= 80) ring.style.stroke = '#34d399'; // Green
        else if (pct >= 50) ring.style.stroke = '#fbbf24'; // Yellow
        else ring.style.stroke = '#ef4444'; // Red
      }, 100);

      playTada();
      startConfetti();
      return;
    }

    const q = state.shuffled[state.currentIndex];
    $('quiz-current').textContent = state.currentIndex + 1;
    $('question-text').textContent = q.q;
    $('question-meta').innerHTML = buildMetaTags(q, currentCategory);
    $('answer-text').textContent = q.a;

    const citaEl = $('answer-cita');
    if (q.cita) {
      citaEl.textContent = '📖 ' + q.cita;
      citaEl.classList.remove('hidden');
    } else {
      citaEl.classList.add('hidden');
    }

    if (isErrorsCat(currentCategory)) {
      $('btn-delete-error').classList.remove('hidden');
    } else {
      $('btn-delete-error').classList.add('hidden');
    }

    $('answer-section').classList.add('hidden');
    $('btn-reveal').classList.remove('hidden');
    $('action-score').classList.add('hidden');
    $('review-result').classList.add('hidden');
    $('btn-next-review').classList.add('hidden');

    // Check if this question was already answered (review mode)
    const alreadyAnswered = state.answers[state.currentIndex] !== undefined;
    if (alreadyAnswered) {
      const wasCorrect = state.answers[state.currentIndex];
      $('answer-section').classList.remove('hidden');
      $('btn-reveal').classList.add('hidden');
      $('action-score').classList.add('hidden');
      $('btn-next-review').classList.remove('hidden');

      const resultEl = $('review-result');
      resultEl.classList.remove('hidden', 'review-result--correct', 'review-result--wrong');
      resultEl.classList.add(wasCorrect ? 'review-result--correct' : 'review-result--wrong');
      $('review-result-icon').textContent = wasCorrect ? '✓' : '✗';
      $('review-result-text').textContent = wasCorrect ? 'Lo sabías' : 'No lo sabías';
    }

    let anim = 'slideUp .4s ease';
    if (typeof window.lastQuestionIndex !== 'undefined' && window.lastQuestionCategory === currentCategory) {
       if (state.currentIndex > window.lastQuestionIndex) anim = 'slideInRight .35s ease';
       else if (state.currentIndex < window.lastQuestionIndex) anim = 'slideInLeft .35s ease';
    }
    window.lastQuestionIndex = state.currentIndex;
    window.lastQuestionCategory = currentCategory;

    const qCard = $('question-card');
    const aSec = $('answer-section');
    const rRes = $('review-result');

    qCard.style.animation = 'none';
    aSec.style.animation = 'none';
    rRes.style.animation = 'none';

    // Forzar reflow para reiniciar la animación sin saltos visuales
    void qCard.offsetWidth;

    qCard.style.animation = anim;
    if (alreadyAnswered) {
      aSec.style.animation = anim;
      rRes.style.animation = anim;
    } else {
      aSec.style.animation = '';
      rRes.style.animation = '';
    }

    $('progress-bar').style.width = ((state.currentIndex) / state.shuffled.length) * 100 + '%';

    // Show/hide previous button
    const btnPrev = $('btn-prev');
    if (btnPrev) {
      if (state.currentIndex > 0) btnPrev.classList.remove('hidden');
      else btnPrev.classList.add('hidden');
    }
  }

  function handleScore(isCorrect) {
    const q = state.shuffled[state.currentIndex];

    if (isCorrect) {
      state.correctCount++;
      vibrate(50);
      playDing();
    } else {
      state.incorrectCount++;
      vibrate([50, 50, 50]);
      playBloop();
      if (!isErrorsCat(currentCategory)) {
        saveToRepasarErrores(ERRORS_CAT[currentSection], { ...q, _srcCat: q._srcCat || currentCategory });
      }
    }

    state.answers[state.currentIndex] = isCorrect;
    state.currentIndex++;
    saveProgress();
    showQuestion();
  }

  function goBack() {
    if (state.currentIndex <= 0) return;
    state.currentIndex--;
    saveProgress();
    showQuestion();
  }

  // CONFETTI
  let confettiCtx = null;
  let particles = [];
  function startConfetti() {
    const canvas = $('confetti-canvas');
    if (!canvas) return;
    confettiCtx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    for(let i=0; i<80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        c: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 4 + 2,
        r: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
      });
    }
    requestAnimationFrame(updateConfetti);
  }
  function updateConfetti() {
    if(!confettiCtx || !particles.length) return;
    confettiCtx.clearRect(0,0,confettiCtx.canvas.width, confettiCtx.canvas.height);
    let active = false;
    particles.forEach(p => {
      p.y += p.vy;
      p.r += p.vr;
      if (p.y < confettiCtx.canvas.height) active = true;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.r * Math.PI / 180);
      confettiCtx.fillStyle = p.c;
      confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      confettiCtx.restore();
    });
    if(active) requestAnimationFrame(updateConfetti);
  }

  // REPASO MODE
  let allRepasoQuestions = [];
  let currentRepasoCategory = 'todas';

  function initRepaso() {
    const data = sectionData();
    allRepasoQuestions = [];
    Object.keys(data).forEach(k => {
      data[k].forEach(q => allRepasoQuestions.push({ ...q, _srcCat: q._srcCat || k, isRepaso: isErrorsCat(k) }));
    });

    const tabsContainer = $('repaso-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      // En Competencia solo hay un grupo de preguntas: 'Todas' + lista de repaso
      const catKeys = ['todas', ...Object.keys(data).filter(k => currentSection === 'ji' || isErrorsCat(k))];
      catKeys.forEach(k => {
        const btn = document.createElement('button');
        btn.className = `repaso-tab ${k === currentRepasoCategory ? 'active' : ''}`;
        btn.textContent = CATEGORY_NAMES[k] || k;
        btn.addEventListener('click', () => {
          currentRepasoCategory = k;
          document.querySelectorAll('.repaso-tab').forEach(t => t.classList.remove('active'));
          btn.classList.add('active');
          filterRepaso();
        });
        tabsContainer.appendChild(btn);
      });
    }

    $('repaso-search').value = '';
    currentRepasoCategory = 'todas';
    if (tabsContainer) {
       document.querySelectorAll('.repaso-tab').forEach(t => t.classList.remove('active'));
       if (tabsContainer.firstChild) tabsContainer.firstChild.classList.add('active');
    }

    filterRepaso();
  }

  function renderRepaso(questions) {
    const list = $('repaso-list');
    list.innerHTML = '';

    if (questions.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding: 2rem; opacity: .5;">No se encontraron preguntas.</div>`;
      return;
    }

    questions.forEach((q, i) => {
      const item = document.createElement('div');
      item.className = 'repaso-item';

      const meta = buildMetaTags(q, 'repaso');

      item.innerHTML = `
        <div class="repaso-question">
          <div>
            <div class="question-meta" style="margin-bottom: 0.5rem;">${meta}</div>
            ${q.q}
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="repaso-answer">${q.a}${q.cita ? `<div class="answer-cita">📖 ${q.cita}</div>` : ''}</div>
      `;

      item.querySelector('.repaso-question').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.repaso-item').forEach(el => el.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });

      list.appendChild(item);
    });
  }

  function filterRepaso() {
    const term = $('repaso-search').value.toLowerCase();
    let filtered = allRepasoQuestions;

    if (isErrorsCat(currentRepasoCategory)) {
      filtered = filtered.filter(q => q.isRepaso);
    } else if (currentRepasoCategory !== 'todas') {
      filtered = filtered.filter(q => q._srcCat === currentRepasoCategory && !q.isRepaso);
    } else {
      filtered = filtered.filter(q => !q.isRepaso);
    }

    if (term) {
      filtered = filtered.filter(q =>
        q.q.toLowerCase().includes(term) ||
        q.a.toLowerCase().includes(term) ||
        (q.leccion && q.leccion.toLowerCase().includes(term)) ||
        (q.leccion_titulo && q.leccion_titulo.toLowerCase().includes(term)) ||
        (q.cita && q.cita.toLowerCase().includes(term))
      );
    }
    renderRepaso(filtered);
  }

  $('repaso-search').addEventListener('input', filterRepaso);

  // DÍGALO COMO PUEDA
  const DIGALO_CATS = { personajes: ['👤', 'Personaje'], lugares: ['📍', 'Lugar'], objetos: ['🏺', 'Objeto'] };
  const RING_LENGTH = 327; // 2 * PI * r (52)
  const DIGALO_DURATIONS = [30, 45, 60, 90];
  const savedDuration = parseInt(localStorage.getItem('ji2026_digalo_time'));
  const digalo = {
    duration: DIGALO_DURATIONS.includes(savedDuration) ? savedDuration : 60,
    remaining: 0,
    endTime: 0,
    running: false,
    finished: false,
    interval: null,
    lastSecond: null,
    deck: null
  };
  let wakeLock = null;

  // Mazo barajado: no se repite un tema hasta haber salido todos
  function newDeck() {
    return { order: shuffle(DIGALO_TOPICS.map((_, i) => i)), index: 0 };
  }

  function loadDeck() {
    let deck = null;
    try { deck = JSON.parse(localStorage.getItem('ji2026_digalo_deck')); } catch (e) {}
    if (!deck || !Array.isArray(deck.order) || deck.order.length !== DIGALO_TOPICS.length) deck = newDeck();
    return deck;
  }

  function openDigalo() {
    digalo.deck = loadDeck();
    showTopic();
    resetTimer();
    showScreen('digalo');
  }

  function showTopic() {
    if (digalo.deck.index >= digalo.deck.order.length) digalo.deck = newDeck();
    localStorage.setItem('ji2026_digalo_deck', JSON.stringify(digalo.deck));

    const topic = DIGALO_TOPICS[digalo.deck.order[digalo.deck.index]];
    const [icon, label] = DIGALO_CATS[topic.cat];
    $('digalo-cat').innerHTML = `<span class="meta-tag meta-tag--carpeta">${icon} ${label}</span>`;
    $('digalo-topic').textContent = topic.t;
    $('digalo-context').textContent = topic.c;
    $('digalo-progress').textContent = `Tema ${digalo.deck.index + 1} / ${digalo.deck.order.length}`;

    const card = $('digalo-card');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'slideInRight .35s ease';
  }

  function nextTopic() {
    vibrate(20);
    digalo.deck.index++;
    showTopic();
    resetTimer();
  }

  function resetTimer() {
    stopTimer();
    digalo.remaining = digalo.duration * 1000;
    digalo.finished = false;
    $('digalo-body').classList.remove('time-up');
    updateTimerUI();
  }

  function startTimer() {
    resumeAudio();
    vibrate(20);
    digalo.endTime = Date.now() + digalo.remaining;
    digalo.running = true;
    digalo.lastSecond = Math.ceil(digalo.remaining / 1000);
    digalo.interval = setInterval(tickTimer, 100);
    requestWakeLock();
    updateTimerUI();
  }

  function pauseTimer() {
    vibrate(20);
    digalo.remaining = Math.max(0, digalo.endTime - Date.now());
    stopTimer();
    updateTimerUI();
  }

  function stopTimer() {
    clearInterval(digalo.interval);
    digalo.interval = null;
    digalo.running = false;
    releaseWakeLock();
  }

  function tickTimer() {
    // Se calcula contra la hora de fin para no desfasarse si el teléfono se bloquea
    digalo.remaining = Math.max(0, digalo.endTime - Date.now());
    const secs = Math.ceil(digalo.remaining / 1000);
    if (secs !== digalo.lastSecond) {
      digalo.lastSecond = secs;
      if (secs > 0 && secs <= 5) { playTick(); vibrate(30); }
    }
    if (digalo.remaining <= 0) {
      finishTimer();
      return;
    }
    updateTimerUI();
  }

  function finishTimer() {
    stopTimer();
    digalo.remaining = 0;
    digalo.finished = true;
    playAlarm();
    vibrate([400, 150, 400, 150, 600]);
    $('digalo-body').classList.remove('time-up');
    void $('digalo-body').offsetWidth;
    $('digalo-body').classList.add('time-up');
    updateTimerUI();
  }

  function updateTimerUI() {
    const secs = Math.ceil(digalo.remaining / 1000);
    $('digalo-time').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    $('digalo-ring').style.strokeDashoffset = RING_LENGTH * (1 - digalo.remaining / (digalo.duration * 1000));
    $('digalo-timer').classList.toggle('timer--warning', secs <= 5);

    const btnStart = $('btn-digalo-start');
    if (digalo.finished) btnStart.textContent = 'Siguiente tema';
    else if (digalo.running) btnStart.textContent = 'Pausar';
    else if (digalo.remaining < digalo.duration * 1000) btnStart.textContent = 'Reanudar';
    else btnStart.textContent = 'Iniciar';

    document.querySelectorAll('.duration-chip').forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.sec) === digalo.duration);
      chip.disabled = digalo.running;
    });
  }

  // Evita que la pantalla se apague mientras corre el cronómetro
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  document.querySelectorAll('.duration-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (digalo.running) return;
      vibrate(20);
      digalo.duration = parseInt(chip.dataset.sec);
      localStorage.setItem('ji2026_digalo_time', digalo.duration);
      resetTimer();
    });
  });

  $('btn-digalo-start').addEventListener('click', () => {
    if (digalo.finished) nextTopic();
    else if (digalo.running) pauseTimer();
    else startTimer();
  });
  $('btn-digalo-reset').addEventListener('click', () => { vibrate(20); resetTimer(); });
  $('btn-digalo-next').addEventListener('click', nextTopic);
  $('btn-back-digalo').addEventListener('click', () => navBack('comp'));
  $('card-digalo').addEventListener('click', openDigalo);

  // Events
  $('card-home-ji').addEventListener('click', () => { vibrate(20); currentSection = 'ji'; showScreen('categories'); });
  $('card-home-comp').addEventListener('click', () => { vibrate(20); currentSection = 'comp'; showScreen('comp'); });
  $('btn-back-ji').addEventListener('click', () => navBack('home'));
  $('btn-back-comp').addEventListener('click', () => navBack('home'));

  document.querySelectorAll('.category-card[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (isErrorsCat(cat) && getRepasarErrores(cat).length === 0) {
        showConfirmModal('Lista Vacía', 'Aquí podrás repasar las preguntas que no te sepas. Se guardarán automáticamente cuando te equivoques en otras categorías.', 'Entendido', null);
        return;
      }
      startCategory(cat);
    });
  });

  $('btn-reveal').addEventListener('click', () => {
    vibrate(20);
    $('answer-section').classList.remove('hidden');
    $('btn-reveal').classList.add('hidden');
    $('action-score').classList.remove('hidden');
  });

  $('btn-correct').addEventListener('click', () => handleScore(true));
  $('btn-wrong').addEventListener('click', () => handleScore(false));

  $('btn-back').addEventListener('click', goHome);
  $('btn-restart').addEventListener('click', () => {
    vibrate(20);
    showConfirmModal('¿Reiniciar Categoría?', 'Se perderá tu progreso actual y volverás a empezar desde cero.', 'Sí, reiniciar', () => {
      startCategory(currentCategory, true);
    });
  });

  $('btn-modal-cancel').addEventListener('click', () => {
    vibrate(20);
    $('modal-confirm').classList.add('hidden');
  });

  $('btn-modal-confirm').addEventListener('click', () => {
    vibrate(20);
    $('modal-confirm').classList.add('hidden');
    if (confirmAction) confirmAction();
  });
  $('btn-prev').addEventListener('click', () => { vibrate(20); goBack(); });
  $('btn-next-review').addEventListener('click', () => {
    vibrate(20);
    state.currentIndex++;
    saveProgress();
    showQuestion();
  });
  $('btn-replay').addEventListener('click', () => { vibrate(20); startCategory(currentCategory, true); });
  $('btn-clear-errores').addEventListener('click', () => {
    vibrate(20);
    showConfirmModal('¿Vaciar Lista?', 'Se eliminarán todas las preguntas que has guardado para repasar. Esta acción no se puede deshacer.', 'Sí, vaciar lista', () => {
      clearRepasarErrores(currentCategory);
      goHome();
    });
  });
  $('btn-delete-error').addEventListener('click', () => {
    vibrate(20);
    showConfirmModal('¿Eliminar pregunta?', 'Esta pregunta se quitará de tu lista de repaso.', 'Sí, eliminar', () => {
      const q = state.shuffled[state.currentIndex];
      removeFromRepasarErrores(currentCategory, q.q);

      state.shuffled.splice(state.currentIndex, 1);
      state.answers.splice(state.currentIndex, 1);
      $('quiz-total').textContent = state.shuffled.length;

      if (state.shuffled.length === 0) {
        goHome();
      } else {
        if (state.currentIndex >= state.shuffled.length) {
           state.currentIndex = state.shuffled.length - 1;
        }
        showQuestion();
      }
    });
  });
  $('btn-home').addEventListener('click', goHome);

  ['btn-repaso', 'btn-repaso-comp'].forEach(id => {
    $(id).addEventListener('click', () => {
      vibrate(20);
      initRepaso();
      $('repaso-search').value = '';
      showScreen('repaso');
    });
  });
  $('btn-back-repaso').addEventListener('click', goHome);

  Object.values(ERRORS_CAT).forEach(cat => {
    $('btn-clear-' + cat).addEventListener('click', () => {
      vibrate(20);
      showConfirmModal('¿Vaciar Lista?', 'Se eliminarán todas las preguntas que has guardado para repasar. Esta acción no se puede deshacer.', 'Sí, vaciar lista', () => {
        clearRepasarErrores(cat);
        initMenu();
      });
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (screens.digalo.classList.contains('active')) {
      if (e.code === 'Space') {
        e.preventDefault();
        $('btn-digalo-start').click();
      } else if (e.code === 'ArrowRight') {
        $('btn-digalo-next').click();
      } else if (e.code === 'Escape') {
        $('btn-back-digalo').click();
      }
    } else if (screens.quiz.classList.contains('active')) {
      if (e.code === 'Space' && !$('btn-reveal').classList.contains('hidden')) {
        e.preventDefault();
        $('btn-reveal').click();
      } else if (e.code === 'Space' && !$('btn-next-review').classList.contains('hidden')) {
        e.preventDefault();
        $('btn-next-review').click();
      } else if (e.code === 'ArrowRight' && !$('btn-reveal').classList.contains('hidden')) {
        $('btn-reveal').click();
      } else if (e.code === 'ArrowRight' && !$('btn-next-review').classList.contains('hidden')) {
        $('btn-next-review').click();
      } else if (e.code === 'ArrowRight' && !$('action-score').classList.contains('hidden')) {
        $('btn-correct').click();
      } else if (e.code === 'ArrowLeft' && !$('action-score').classList.contains('hidden')) {
        $('btn-wrong').click();
      } else if (e.code === 'ArrowLeft' && state.currentIndex > 0 && $('action-score').classList.contains('hidden')) {
        vibrate(20);
        goBack();
      } else if (e.code === 'Escape') {
        $('btn-back').click();
      }
    }
  });

  // Touch Swipe navigation
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  screens.quiz.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  screens.quiz.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Si el movimiento fue mayormente vertical (scroll), lo ignoramos
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    if (Math.abs(diffX) < swipeThreshold) return; // not a significant swipe

    if (diffX > 0) {
      // Swiped Right (pulling from left) -> Go Back or "Lo sabía"
      if (!$('action-score').classList.contains('hidden')) {
        $('btn-correct').click();
      } else if (state.currentIndex > 0 && $('action-score').classList.contains('hidden')) {
        vibrate(20);
        goBack();
      }
    } else {
      // Swiped Left (pulling from right)
      if (!$('btn-reveal').classList.contains('hidden')) {
        // No hacer nada en la pregunta actual para evitar revelar por accidente
        return;
      } else if (!$('btn-next-review').classList.contains('hidden')) {
        $('btn-next-review').click();
      } else if (!$('action-score').classList.contains('hidden')) {
        $('btn-wrong').click();
      }
    }
  }

  // Config UI Setup
  const toggleSound = $('toggle-sound');
  const toggleVibration = $('toggle-vibration');
  if (toggleSound) toggleSound.checked = settings.sound;
  if (toggleVibration) toggleVibration.checked = settings.vibration;

  toggleSound?.addEventListener('change', (e) => {
    settings.sound = e.target.checked;
    localStorage.setItem('ji2026_sound', settings.sound);
    if (settings.sound) resumeAudio();
  });

  toggleVibration?.addEventListener('change', (e) => {
    settings.vibration = e.target.checked;
    localStorage.setItem('ji2026_vibration', settings.vibration);
    if (settings.vibration) vibrate(20);
  });

  const toggleTheme = $('toggle-theme');
  if (toggleTheme) toggleTheme.checked = document.documentElement.dataset.theme === 'light';

  toggleTheme?.addEventListener('change', (e) => {
    const light = e.target.checked;
    if (light) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]').content = light ? '#f4f5fb' : '#0a0a1a';
    localStorage.setItem('ji2026_theme', light ? 'light' : 'dark');
    vibrate(20);
  });

  $('btn-settings')?.addEventListener('click', () => {
    vibrate(20);
    $('modal-settings').classList.remove('hidden');
  });

  $('btn-close-settings')?.addEventListener('click', () => {
    vibrate(20);
    $('modal-settings').classList.add('hidden');
  });

  // Init
  initHome();
  const footerYearEl = $('footer-year');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
})();
