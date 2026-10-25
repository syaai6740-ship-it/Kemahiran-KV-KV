"use strict";

/*
  PENGEMBARAAN DUNIA KATA!
  Bahasa Melayu Pemulihan Khas Tahun 2
  Fokus: suku kata KV + KV

  Nota:
  - Rekod disimpan dalam pelayar/peranti semasa.
  - Kata laluan guru dalam kod ini untuk demonstrasi sahaja.
  - Rakaman mikrofon memerlukan kebenaran pengguna dan HTTPS.
*/

const TEACHER_PASSWORD = "1234";
const RECORDS_KEY = "pengembaraanDuniaKataRecordsV1";
const THEME_KEY = "pengembaraanDuniaKataThemeV1";

const WORDS = {
  baju: {
    word: "baju",
    syllables: ["ba", "ju"],
    emoji: "👕",
    meaning: "pakaian"
  },
  buku: {
    word: "buku",
    syllables: ["bu", "ku"],
    emoji: "📘",
    meaning: "bahan bacaan"
  },
  gigi: {
    word: "gigi",
    syllables: ["gi", "gi"],
    emoji: "🦷",
    meaning: "digunakan untuk mengunyah makanan"
  },
  sapu: {
    word: "sapu",
    syllables: ["sa", "pu"],
    emoji: "🧹",
    meaning: "alat untuk menyapu"
  },
  kuku: {
    word: "kuku",
    syllables: ["ku", "ku"],
    emoji: "💅",
    meaning: "bahagian keras pada hujung jari"
  },
  mata: {
    word: "mata",
    syllables: ["ma", "ta"],
    emoji: "👀",
    meaning: "digunakan untuk melihat"
  },
  topi: {
    word: "topi",
    syllables: ["to", "pi"],
    emoji: "🧢",
    meaning: "dipakai pada kepala"
  },
  meja: {
    word: "meja",
    syllables: ["me", "ja"],
    emoji: "🪑",
    meaning: "perabot untuk meletakkan barang"
  },
  roti: {
    word: "roti",
    syllables: ["ro", "ti"],
    emoji: "🍞",
    meaning: "makanan"
  },
  susu: {
    word: "susu",
    syllables: ["su", "su"],
    emoji: "🥛",
    meaning: "minuman"
  }
};

const MISSION_WORDS = {
  1: ["baju", "buku", "gigi", "sapu", "kuku"],
  2: ["baju", "buku", "gigi", "sapu", "kuku"],
  3: ["mata", "topi", "roti", "buku", "susu"],
  4: ["meja", "mata", "topi", "roti", "susu"]
};

const MISSIONS = {
  1: { title: "Kenal dan Baca", total: 5 },
  2: { title: "Cantum dan Baca", total: 5 },
  3: { title: "Baca dan Faham", total: 5 },
  4: { title: "Cabaran Baca Sendiri", total: 5 }
};

const PASSAGES = [
  {
    text: "Ali memakai topi. Ali makan roti.",
    question: "Apakah yang dipakai oleh Ali?",
    options: ["topi", "baju", "sapu"],
    answer: "topi"
  },
  {
    text: "Mira minum susu. Mira membaca buku.",
    question: "Apakah yang diminum oleh Mira?",
    options: ["roti", "susu", "buku"],
    answer: "susu"
  },
  {
    text: "Ibu membeli baju. Baju itu untuk adik.",
    question: "Apakah yang dibeli oleh ibu?",
    options: ["baju", "meja", "topi"],
    answer: "baju"
  },
  {
    text: "Amin melihat mata patung. Amin memegang buku.",
    question: "Apakah yang dipegang oleh Amin?",
    options: ["susu", "buku", "roti"],
    answer: "buku"
  },
  {
    text: "Siti makan roti. Siti minum susu.",
    question: "Apakah makanan yang dimakan oleh Siti?",
    options: ["roti", "sapu", "meja"],
    answer: "roti"
  }
];

const state = {
  studentName: "",
  mission: 1,
  questionIndex: 0,
  score: 0,
  answered: false,
  selectedSyllables: [],
  completedMissions: {},
  currentSession: null,
  recorder: null,
  mediaStream: null,
  audioChunks: [],
  audioBlob: null,
  audioUrl: null,
  recording: false,
  recordingStartedAt: null,
  teacherLoggedIn: false,
  questionScore: 0
};

const $ = (selector) => document.querySelector(selector);

const homeScreen = $("#homeScreen");
const missionScreen = $("#missionScreen");
const teacherScreen = $("#teacherScreen");
const missionContent = $("#missionContent");
const missionFeedback = $("#missionFeedback");
const nextQuestionButton = $("#nextQuestionButton");
const progressBar = $("#progressBar");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function showScreen(screen) {
  [homeScreen, missionScreen, teacherScreen].forEach((item) => {
    item.classList.remove("active");
    item.hidden = true;
  });

  screen.hidden = false;
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("Rekod tidak dapat dibaca:", error);
    return [];
  }
}

function saveRecord(record) {
  const records = getRecords();
  records.push(record);

  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Rekod tidak dapat disimpan:", error);
    showToast("Storan penuh atau tidak tersedia. Eksport rekod dan semak rakaman.");
  }
}

function updateTheme(theme) {
  const allowedThemes = ["garden", "forest", "space", "ocean"];
  const selectedTheme = allowedThemes.includes(theme) ? theme : "garden";

  document.body.classList.remove(
    "theme-garden",
    "theme-forest",
    "theme-space",
    "theme-ocean"
  );

  document.body.classList.add(`theme-${selectedTheme}`);

  try {
    localStorage.setItem(THEME_KEY, selectedTheme);
  } catch (_) {
    // Tema masih boleh digunakan walaupun storan tidak tersedia.
  }

  const select = $("#themeSelect");
  if (select) select.value = selectedTheme;
}

function showHomeMessage(message, isError = true) {
  const element = $("#homeMessage");
  element.textContent = message;
  element.style.color = isError ? "var(--error)" : "var(--success)";
}

function startJourney() {
  const name = $("#studentName").value.trim();

  if (!name) {
    showHomeMessage("Masukkan nama kamu dahulu sebelum memulakan pengembaraan.");
    $("#studentName").focus();
    return;
  }

  state.studentName = name;
  state.completedMissions = {};
  state.currentSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentName: name,
    startedAt: new Date().toISOString(),
    theme: $("#themeSelect").value,
    missionResults: [],
    recordings: []
  };

  $("#activeStudent").textContent = name;
  showHomeMessage("Hebat! Pengembaraan kamu bermula sekarang.", false);
  showToast(`Selamat datang, ${name}!`);
  showScreen(homeScreen);
}

function openMission(missionNumber) {
  if (!state.studentName || !state.currentSession) {
    showHomeMessage("Masukkan nama murid dan tekan Jom Mula dahulu.");
    showScreen(homeScreen);
    $("#studentName").focus();
    return;
  }

  if (state.recording) {
    showToast("Hentikan rakaman dahulu sebelum menukar misi.");
    return;
  }

  state.mission = Number(missionNumber);
  state.questionIndex = 0;
  state.score = 0;
  state.answered = false;
  state.selectedSyllables = [];
  state.questionScore = 0;

  $("#missionTitle").textContent = MISSIONS[state.mission].title;
  $("#missionNumber").textContent = `MISI ${state.mission}`;
  $("#scoreDisplay").textContent = "0";
  $("#missionFeedback").textContent = "";
  $("#missionFeedback").className = "feedback";

  showScreen(missionScreen);
  renderQuestion();
}

function updateProgress() {
  const total = MISSIONS[state.mission].total;
  const percent = ((state.questionIndex + (state.answered ? 1 : 0)) / total) * 100;
  progressBar.style.width = `${Math.min(100, percent)}%`;
}

function getCurrentWord() {
  const list = MISSION_WORDS[state.mission];
  return WORDS[list[state.questionIndex]];
}

function renderQuestion() {
  state.answered = false;
  state.selectedSyllables = [];
  state.questionScore = 0;

  missionFeedback.textContent = "";
  missionFeedback.className = "feedback";
  nextQuestionButton.hidden = true;
  nextQuestionButton.textContent = "Soalan seterusnya →";

  const total = MISSIONS[state.mission].total;

  if (state.questionIndex >= total) {
    finishMission();
    return;
  }

  updateProgress();

  if (state.mission === 1) renderMissionOne();
  if (state.mission === 2) renderMissionTwo();
  if (state.mission === 3) renderMissionThree();
  if (state.mission === 4) renderMissionFour();
}

function renderMissionOne() {
  const current = getCurrentWord();
  const distractors = shuffle(
    Object.keys(WORDS).filter((key) => key !== current.word)
  ).slice(0, 3);

  const choices = shuffle([current.word, ...distractors]);

  missionContent.innerHTML = `
    <p class="instruction">Baca perkataan ini. Kemudian, pilih gambar yang betul.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${escapeHTML(current.word)}</div>
    <p class="text-center">Pilih gambar yang sepadan dengan perkataan.</p>
    <div class="picture-grid">
      ${choices.map((key) => `
        <button
          class="picture-option"
          type="button"
          data-answer="${escapeHTML(key)}"
          aria-label="Pilih gambar"
        >${WORDS[key].emoji}</button>
      `).join("")}
    </div>
    <div class="action-row">
      <button id="speakWordButton" class="secondary-button" type="button">
        🔊 Dengar perkataan
      </button>
    </div>
  `;

  missionContent.querySelectorAll(".picture-option").forEach((button) => {
    button.addEventListener("click", () => {
      checkAnswer(button.dataset.answer === current.word, button);
    });
  });

  $("#speakWordButton").addEventListener("click", () => speakText(current.word));
}

function renderMissionTwo() {
  const current = getCurrentWord();
  const syllablePool = ["ba", "ju", "bu", "ku", "gi", "sa", "pu", "ma", "ta", "to", "pi", "ro", "ti", "su", "me", "ja"];
  const choices = shuffle([...new Set([...current.syllables, ...syllablePool])]).slice(0, 8);

  // Pastikan kedua-dua suku kata jawapan sentiasa dipaparkan.
  current.syllables.forEach((syllable) => {
    if (!choices.includes(syllable)) choices.push(syllable);
  });

  missionContent.innerHTML = `
    <p class="instruction">Pilih suku kata untuk membentuk perkataan.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${current.emoji}</div>
    <p class="text-center">Cantumkan suku kata untuk membentuk perkataan.</p>
    <p class="text-center">Pilih suku kata mengikut turutan.</p>
    <div id="syllableAnswer" class="syllable-display" aria-live="polite">
      <span class="syllable-choice">?</span>
      <span class="syllable-choice">?</span>
    </div>
    <p id="syllableHint" class="text-center">Suku kata yang dipilih akan muncul di sini.</p>
    <div class="picture-grid">
      ${choices.map((syllable, index) => `
        <button
          class="syllable-choice syllable-option"
          type="button"
          data-syllable="${escapeHTML(syllable)}"
          data-index="${index}"
        >${escapeHTML(syllable)}</button>
      `).join("")}
    </div>
    <div class="action-row">
      <button id="resetSyllables" class="secondary-button" type="button">↩️ Pilih semula</button>
      <button id="checkSyllables" class="primary-button" type="button">Semak jawapan</button>
      <button id="speakTargetButton" class="secondary-button" type="button">🔊 Dengar perkataan</button>
    </div>
  `;

  missionContent.querySelectorAll(".syllable-option").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.answered || state.selectedSyllables.length >= 2) return;

      state.selectedSyllables.push({
        syllable: button.dataset.syllable,
        element: button
      });

      button.disabled = true;
      button.classList.add("selected");
      updateSyllableAnswer();
    });
  });

  $("#resetSyllables").addEventListener("click", () => {
    if (state.answered) return;
    state.selectedSyllables = [];
    missionContent.querySelectorAll(".syllable-option").forEach((button) => {
      button.disabled = false;
      button.classList.remove("selected");
    });
    updateSyllableAnswer();
  });

  $("#checkSyllables").addEventListener("click", () => {
    if (state.selectedSyllables.length !== 2) {
      showFeedback("Pilih dua suku kata dahulu.", false);
      return;
    }

    const answer = state.selectedSyllables.map((item) => item.syllable).join("");
    checkAnswer(answer === current.word);
  });

  $("#speakTargetButton").addEventListener("click", () => speakText(current.word));
  updateSyllableAnswer();
}

function updateSyllableAnswer() {
  const answerBox = $("#syllableAnswer");
  const chosen = state.selectedSyllables.map((item) => item.syllable);

  answerBox.innerHTML = `
    <span class="syllable-choice">${escapeHTML(chosen[0] || "?")}</span>
    <span aria-hidden="true">+</span>
    <span class="syllable-choice">${escapeHTML(chosen[1] || "?")}</span>
  `;

  const hint = $("#syllableHint");
  if (hint) {
    hint.textContent = chosen.length
      ? `Suku kata dipilih: ${chosen.join(" + ")}`
      : "Suku kata yang dipilih akan muncul di sini.";
  }
}

function renderMissionThree() {
  const passage = PASSAGES[state.questionIndex];

  missionContent.innerHTML = `
    <p class="instruction">Baca petikan, rakam suara dan jawab soalan pemahaman.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <h3>📖 Baca petikan pendek ini</h3>
    <div class="reading-passage">${highlightKnownWords(passage.text)}</div>
    <div class="recording-panel">
      <h3>🎤 Rakaman bacaan kamu</h3>
      <p>Baca petikan dengan suara yang jelas. Kemudian, dengar semula rakaman kamu.</p>
      <div class="action-row">
        <button id="startRecording" class="primary-button" type="button">🔴 Mula rakam</button>
        <button id="stopRecording" class="secondary-button" type="button" disabled>⏹️ Henti rakaman</button>
        <button id="playSpeech" class="secondary-button" type="button" disabled>▶️ Dengar rakaman</button>
      </div>
      <p id="recordingStatus" class="recording-status" role="status">Belum ada rakaman.</p>
      <audio id="audioPlayback" controls hidden></audio>
      <button id="saveRecording" class="secondary-button" type="button" disabled>💾 Simpan rakaman untuk guru</button>
    </div>
    <hr>
    <h3>💡 Soalan pemahaman</h3>
    <p>${escapeHTML(passage.question)}</p>
    <div id="comprehensionOptions">
      ${passage.options.map((option) => `
        <button class="question-option" type="button" data-answer="${escapeHTML(option)}">
          ${WORDS[option] ? WORDS[option].emoji + " " : ""}${escapeHTML(option)}
        </button>
      `).join("")}
    </div>
  `;

  bindComprehension(passage.answer);
  bindRecordingControls();
}

function highlightKnownWords(text) {
  return escapeHTML(text).replace(
    /\b(topi|roti|susu|buku|baju|Mira|Ali|Amin|Siti|Siti|Mira|Amin)\b/gi,
    "<strong>$1</strong>"
  );
}

function renderMissionFour() {
  const current = getCurrentWord();

  missionContent.innerHTML = `
    <p class="instruction">Cabaran terakhir! Baca perkataan sendiri dan rakam suara kamu.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${escapeHTML(current.word)}</div>
    <p class="text-center">Sebut perkataan dengan jelas. Kamu boleh mendengar contoh sebutan dahulu.</p>
    <div class="action-row">
      <button id="modelWordButton" class="secondary-button" type="button">
        🔊 Dengar contoh
      </button>
    </div>
    <div class="recording-panel">
      <h3>🎤 Rakam bacaan kamu</h3>
      <div class="action-row">
        <button id="startRecording" class="primary-button" type="button">🔴 Mula rakam</button>
        <button id="stopRecording" class="secondary-button" type="button" disabled>⏹️ Henti rakaman</button>
        <button id="playSpeech" class="secondary-button" type="button" disabled>▶️ Dengar semula</button>
      </div>
      <p id="recordingStatus" class="recording-status" role="status">Belum ada rakaman.</p>
      <audio id="audioPlayback" controls hidden></audio>
      <button id="saveRecording" class="secondary-button" type="button" disabled>💾 Simpan rakaman untuk guru</button>
    </div>
    <div class="action-row">
      <button id="selfCheckButton" class="primary-button" type="button">
        ✅ Saya sudah membaca
      </button>
    </div>
  `;

  $("#modelWordButton").addEventListener("click", () => speakText(current.word));

  $("#selfCheckButton").addEventListener("click", () => {
    if (state.answered) return;

    state.answered = true;
    state.questionScore = 1;
    state.score += 1;
    $("#scoreDisplay").textContent = String(state.score);
    showFeedback("Bagus! Kamu telah mencuba membaca sendiri. 🌟", true);
    recordQuestionResult(current.word, "Bacaan kendiri", 1);
    nextQuestionButton.hidden = false;
    updateProgress();
  });

  bindRecordingControls();
}

function bindComprehension(correctAnswer) {
  missionContent.querySelectorAll(".question-option").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.answered) return;

      const correct = button.dataset.answer === correctAnswer;
      missionContent.querySelectorAll(".question-option").forEach((item) => {
        item.disabled = true;
      });

      checkAnswer(correct, button);
    });
  });
}

function checkAnswer(correct, selectedButton = null) {
  if (state.answered) return;

  state.answered = true;
  const current = getCurrentWord();
  const point = correct ? 1 : 0;

  state.questionScore = point;
  state.score += point;
  $("#scoreDisplay").textContent = String(state.score);

  if (selectedButton) {
    selectedButton.style.borderColor = correct ? "#18794e" : "#b42318";
  }

  showFeedback(
    correct
      ? "Syabas! Jawapan kamu betul! ⭐"
      : "Belum tepat. Cuba ingat semula dan teruskan usaha! 💪",
    correct
  );

  recordQuestionResult(
    current ? current.word : "",
    state.mission === 3 ? "Pemahaman" : state.mission === 2 ? "Cantum suku kata" : "Kenal gambar",
    point
  );

  nextQuestionButton.hidden = false;
  updateProgress();
}

function showFeedback(message, correct) {
  missionFeedback.textContent = message;
  missionFeedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
}

function recordQuestionResult(word, activity, points) {
  if (!state.currentSession) return;

  state.currentSession.missionResults.push({
    mission: state.mission,
    question: state.questionIndex + 1,
    word,
    activity,
    points,
    date: new Date().toISOString()
  });
}

function finishMission() {
  state.completedMissions[state.mission] = true;

  const total = MISSIONS[state.mission].total;
  const score = state.score;

  missionContent.innerHTML = `
    <div class="text-center">
      <div class="welcome-illustration">🎉 🏆 🌟</div>
      <h2>Tahniah, Pengembara Kata!</h2>
      <p>Kamu telah menyelesaikan <strong>${escapeHTML(MISSIONS[state.mission].title)}</strong>.</p>
      <div class="word-display">${score} / ${total}</div>
      <p>Markah kamu untuk misi ini.</p>
      <p>Teruskan berlatih membaca dengan yakin!</p>
      <div class="action-row">
        <button id="retryMissionButton" class="secondary-button" type="button">🔁 Cuba lagi</button>
        <button id="finishMissionButton" class="primary-button" type="button">🏡 Pilih misi lain</button>
      </div>
      <p class="message">Ingat: markah ini menilai jawapan aktiviti, bukan ketepatan suara secara automatik.</p>
    </div>
  `;

  missionFeedback.textContent = "";
  nextQuestionButton.hidden = true;
  progressBar.style.width = "100%";

  $("#retryMissionButton").addEventListener("click", () => openMission(state.mission));
  $("#finishMissionButton").addEventListener("click", () => {
    saveSession();
    showScreen(homeScreen);
  });
}

function saveSession() {
  if (!state.currentSession) return;

  state.currentSession.completedAt = new Date().toISOString();
  state.currentSession.completedMissions = Object.keys(state.completedMissions)
    .map(Number);

  // Simpan satu rekod sesi tanpa memasukkan audio berulang kali.
  const session = {
    ...state.currentSession,
    recordings: state.currentSession.recordings.map((recording) => ({
      ...recording,
      audioData: undefined
    }))
  };

  saveRecord(session);
  state.currentSession = null;
}

function nextQuestion() {
  if (!state.answered) return;

  if (state.recording) {
    showToast("Hentikan rakaman dahulu.");
    return;
  }

  state.questionIndex += 1;
  renderQuestion();
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    showToast("Fungsi audio contoh tidak disokong oleh pelayar ini.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ms-MY";
  utterance.rate = 0.78;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

async function bindRecordingControls() {
  const startButton = $("#startRecording");
  const stopButton = $("#stopRecording");
  const playButton = $("#playSpeech");
  const saveButton = $("#saveRecording");
  const status = $("#recordingStatus");
  const audioElement = $("#audioPlayback");

  if (!startButton || !stopButton || !playButton || !saveButton || !status || !audioElement) {
    return;
  }

  startButton.addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ||
        typeof MediaRecorder === "undefined") {
      status.textContent = "Pelayar ini tidak menyokong rakaman suara. Cuba pelayar terkini melalui HTTPS.";
      return;
    }

    try {
      state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.audioBlob = null;

      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      state.recorder = preferredType
        ? new MediaRecorder(state.mediaStream, { mimeType: preferredType })
        : new MediaRecorder(state.mediaStream);

      state.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          state.audioChunks.push(event.data);
        }
      };

      state.recorder.onstop = () => {
        state.audioBlob = new Blob(state.audioChunks, {
          type: state.recorder.mimeType || "audio/webm"
        });

        if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
        state.audioUrl = URL.createObjectURL(state.audioBlob);
        audioElement.src = state.audioUrl;
        audioElement.hidden = false;

        playButton.disabled = false;
        saveButton.disabled = false;
        status.textContent = "Rakaman selesai. Dengar semula sebelum menyimpan.";

        if (state.mediaStream) {
          state.mediaStream.getTracks().forEach((track) => track.stop());
          state.mediaStream = null;
        }

        state.recording = false;
        startButton.disabled = false;
        stopButton.disabled = true;
      };

      state.recorder.start();
      state.recording = true;
      state.recordingStartedAt = Date.now();
      startButton.disabled = true;
      stopButton.disabled = false;
      playButton.disabled = true;
      saveButton.disabled = true;
      status.textContent = "🔴 Sedang merakam... Baca dengan jelas.";
    } catch (error) {
      console.error(error);
      status.textContent = "Rakaman tidak dapat dimulakan. Benarkan akses mikrofon pada pelayar.";
    }
  });

  stopButton.addEventListener("click", () => {
    if (state.recorder && state.recorder.state !== "inactive") {
      state.recorder.stop();
    }
  });

  playButton.addEventListener("click", () => {
    if (audioElement.src) {
      audioElement.play().catch(() => {
        status.textContent = "Tekan butang main pada pemain audio untuk mendengar rakaman.";
      });
    }
  });

  saveButton.addEventListener("click", async () => {
    if (!state.audioBlob || !state.currentSession) {
      status.textContent = "Tiada rakaman untuk disimpan.";
      return;
    }

    const current = getCurrentWord();
    const missionWord = current ? current.word : "";
    const audioSize = state.audioBlob.size;

    // Data URL membolehkan rakaman dimainkan semula pada peranti yang sama.
    // Saiz rakaman dihadkan untuk mengelakkan storan pelayar cepat penuh.
    if (audioSize > 2 * 1024 * 1024) {
      status.textContent = "Rakaman melebihi 2 MB. Padam atau rakam semula dengan lebih ringkas.";
      return;
    }

    try {
      const dataUrl = await blobToDataURL(state.audioBlob);

      const recording = {
        studentName: state.studentName,
        mission: state.mission,
        question: state.questionIndex + 1,
        word: missionWord,
        createdAt: new Date().toISOString(),
        audioData: dataUrl
      };

      // Simpan metadata rakaman bersama sesi aktif.
      state.currentSession.recordings.push(recording);

      // Simpan salinan khusus rakaman untuk dipaparkan dalam papan guru.
      saveRecord({
        type: "recording",
        studentName: recording.studentName,
        mission: recording.mission,
        question: recording.question,
        word: recording.word,
        createdAt: recording.createdAt,
        audioData: recording.audioData
      });

      status.textContent = "Rakaman disimpan pada peranti ini. Guru boleh menyemaknya melalui papan guru.";
      saveButton.disabled = true;
      showToast("Rakaman berjaya disimpan pada peranti ini.");
    } catch (error) {
      console.error(error);
      status.textContent = "Rakaman tidak dapat disimpan. Ruang storan mungkin tidak mencukupi.";
    }
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function openTeacherArea() {
  if (state.recording) {
    showToast("Hentikan rakaman dahulu sebelum membuka ruang guru.");
    return;
  }

  $("#teacherPassword").value = "";
  $("#loginMessage").textContent = "";
  $("#teacherLogin").hidden = false;
  $("#teacherDashboard").hidden = true;
  showScreen(teacherScreen);
}

function teacherLogin() {
  if ($("#teacherPassword").value !== TEACHER_PASSWORD) {
    $("#loginMessage").textContent = "Kata laluan tidak tepat. Sila cuba lagi.";
    return;
  }

  state.teacherLoggedIn = true;
  $("#teacherLogin").hidden = true;
  $("#teacherDashboard").hidden = false;
  renderTeacherDashboard();
}

function teacherLogout() {
  state.teacherLoggedIn = false;
  $("#teacherPassword").value = "";
  $("#teacherLogin").hidden = false;
  $("#teacherDashboard").hidden = true;
  showScreen(homeScreen);
}

function renderTeacherDashboard() {
  if (!state.teacherLoggedIn) return;

  const records = getRecords();
  const sessions = records.filter((record) => !record.type);
  const recordings = records.filter((record) => record.type === "recording");
  const uniqueStudents = new Set(records.map((record) => record.studentName).filter(Boolean));

  $("#totalStudents").textContent = String(uniqueStudents.size);
  $("#totalActivities").textContent = String(
    sessions.reduce((sum, session) => sum + (session.missionResults || []).length, 0)
  );
  $("#totalRecordings").textContent = String(recordings.length);

  const container = $("#teacherRecords");

  if (!records.length) {
    container.innerHTML = "<p>Belum ada rekod pada peranti ini.</p>";
    return;
  }

  container.innerHTML = records.slice().reverse().map((record, index) => {
    if (record.type === "recording") {
      return `
        <article class="record-card">
          <h4>🎤 Rakaman bacaan — ${escapeHTML(record.studentName || "Murid")}</h4>
          <p><strong>Misi:</strong> ${escapeHTML(String(record.mission))}</p>
          <p><strong>Perkataan:</strong> ${escapeHTML(record.word || "-")}</p>
          <p><strong>Tarikh:</strong> ${escapeHTML(formatDate(record.createdAt))}</p>
          ${
            record.audioData
              ? `<audio class="record-audio" controls preload="none" src="${record.audioData}"></audio>`
              : "<p>Fail audio tiada dalam rekod ini.</p>"
          }
        </article>
      `;
    }

    const results = record.missionResults || [];
    const totalPoints = results.reduce((sum, item) => sum + Number(item.points || 0), 0);

    return `
      <article class="record-card">
        <h4>📘 Rekod pembelajaran — ${escapeHTML(record.studentName || "Murid")}</h4>
        <p><strong>Tarikh:</strong> ${escapeHTML(formatDate(record.startedAt))}</p>
        <p><strong>Markah aktiviti yang direkodkan:</strong> ${totalPoints}</p>
        <p><strong>Aktiviti dijawab:</strong> ${results.length}</p>
        <p><strong>Misi selesai:</strong> ${escapeHTML((record.completedMissions || []).join(", ") || "-")}</p>
        <details>
          <summary>Lihat butiran jawapan</summary>
          ${
            results.length
              ? `<ul>${results.map((item) => `
                  <li>
                    Misi ${escapeHTML(String(item.mission))}, soalan
                    ${escapeHTML(String(item.question))} —
                    ${escapeHTML(item.word || "-")}:
                    ${Number(item.points) ? "Betul" : "Perlu bimbingan"}
                  </li>
                `).join("")}</ul>`
              : "<p>Tiada butiran jawapan.</p>"
          }
        </details>
      </article>
    `;
  }).join("");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function exportRecords() {
  if (!state.teacherLoggedIn) {
    showToast("Sila log masuk sebagai guru dahulu.");
    return;
  }

  const records = getRecords();

  if (!records.length) {
    showToast("Tiada rekod untuk dieksport.");
    return;
  }

  const rows = [
    ["Jenis rekod", "Nama murid", "Tarikh", "Misi", "Soalan", "Perkataan", "Aktiviti", "Markah"]
  ];

  records.forEach((record) => {
    if (record.type === "recording") {
      rows.push([
        "Rakaman suara",
        record.studentName || "",
        formatDate(record.createdAt),
        record.mission || "",
        record.question || "",
        record.word || "",
        "Rakaman bacaan",
        ""
      ]);
      return;
    }

    (record.missionResults || []).forEach((item) => {
      rows.push([
        "Aktiviti",
        record.studentName || "",
        formatDate(item.date),
        item.mission,
        item.question,
        item.word || "",
        item.activity || "",
        item.points
      ]);
    });
  });

  const csv = rows.map((row) =>
    row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rekod-pengembaraan-dunia-kata.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clearRecords() {
  if (!state.teacherLoggedIn) return;

  const confirmed = window.confirm(
    "Adakah anda pasti mahu memadam semua rekod dan rakaman pada peranti ini? Tindakan ini tidak boleh dibatalkan."
  );

  if (!confirmed) return;

  localStorage.removeItem(RECORDS_KEY);
  renderTeacherDashboard();
  showToast("Rekod pada peranti ini telah dipadam.");
}

function attachEvents() {
  $("#startButton").addEventListener("click", startJourney);
  $("#themeSelect").addEventListener("change", (event) => updateTheme(event.target.value));

  document.querySelectorAll(".mission-preview").forEach((button) => {
    button.addEventListener("click", () => openMission(button.dataset.mission));
  });

  $("#homeButton").addEventListener("click", () => {
    if (state.recording) {
      showToast("Hentikan rakaman dahulu.");
      return;
    }
    showScreen(homeScreen);
  });

  $("#backToMissions").addEventListener("click", () => {
    if (state.recording) {
      showToast("Hentikan rakaman dahulu.");
      return;
    }
    showScreen(homeScreen);
  });

  nextQuestionButton.addEventListener("click", nextQuestion);
  $("#teacherButton").addEventListener("click", openTeacherArea);
  $("#teacherHomeButton").addEventListener("click", () => showScreen(homeScreen));
  $("#loginButton").addEventListener("click", teacherLogin);
  $("#teacherPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") teacherLogin();
  });
  $("#teacherLogoutButton").addEventListener("click", teacherLogout);
  $("#exportButton").addEventListener("click", exportRecords);
  $("#clearRecordsButton").addEventListener("click", clearRecords);

  $("#studentName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") startJourney();
  });
}

function initialise() {
  attachEvents();

  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    updateTheme(savedTheme || "garden");
  } catch (_) {
    updateTheme("garden");
  }

  showScreen(homeScreen);
}

document.addEventListener("DOMContentLoaded", initialise);
