"use strict";

/* PENGEMBARAAN DUNIA KATA
   Bahasa Melayu Pemulihan Khas Tahun 2
   Fokus: suku kata KV + KV
*/

const PASSWORD = "1234";
const RECORDS_KEY = "pengembaraanDuniaKataRecordsV2";
const THEME_KEY = "pengembaraanDuniaKataThemeV2";

const WORDS = {
  baju: { word: "baju", syllables: ["ba", "ju"], emoji: "👕" },
  buku: { word: "buku", syllables: ["bu", "ku"], emoji: "📘" },
  gigi: { word: "gigi", syllables: ["gi", "gi"], emoji: "🦷" },
  sapu: { word: "sapu", syllables: ["sa", "pu"], emoji: "🧹" },
  kuku: { word: "kuku", syllables: ["ku", "ku"], emoji: "💅" },
  mata: { word: "mata", syllables: ["ma", "ta"], emoji: "👀" },
  topi: { word: "topi", syllables: ["to", "pi"], emoji: "🧢" },
  meja: { word: "meja", syllables: ["me", "ja"], emoji: "🪑" },
  roti: { word: "roti", syllables: ["ro", "ti"], emoji: "🍞" },
  susu: { word: "susu", syllables: ["su", "su"], emoji: "🥛" }
};

const MISSION_WORDS = {
  1: ["baju", "buku", "gigi", "sapu", "kuku"],
  2: ["baju", "buku", "gigi", "sapu", "kuku"],
  3: ["mata", "topi", "roti", "buku", "susu"],
  4: ["meja", "mata", "topi", "roti", "susu"]
};

const MISSIONS = {
  1: "Kenal dan Baca",
  2: "Cantum dan Baca",
  3: "Baca dan Faham",
  4: "Cabaran Baca Sendiri"
};

const PASSAGES = [
  { text: "Ali memakai topi. Ali makan roti.", question: "Apakah yang dipakai oleh Ali?", options: ["topi", "baju", "sapu"], answer: "topi" },
  { text: "Mira minum susu. Mira membaca buku.", question: "Apakah yang diminum oleh Mira?", options: ["roti", "susu", "buku"], answer: "susu" },
  { text: "Ibu membeli baju. Baju itu untuk adik.", question: "Apakah yang dibeli oleh ibu?", options: ["baju", "meja", "topi"], answer: "baju" },
  { text: "Amin memegang buku. Buku itu baharu.", question: "Apakah yang dipegang oleh Amin?", options: ["susu", "buku", "roti"], answer: "buku" },
  { text: "Siti makan roti. Siti minum susu.", question: "Apakah makanan yang dimakan oleh Siti?", options: ["roti", "sapu", "meja"], answer: "roti" }
];

const $ = (selector) => document.querySelector(selector);

const state = {
  studentName: "",
  mission: 1,
  questionIndex: 0,
  score: 0,
  answered: false,
  selectedSyllables: [],
  completedMissions: {},
  missionResults: [],
  teacherLoggedIn: false,
  recorder: null,
  mediaStream: null,
  audioChunks: [],
  audioBlob: null,
  audioUrl: null,
  recording: false,
  recordingSaved: false
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("Gagal membaca rekod:", error);
    return [];
  }
}

function saveRecord(record) {
  try {
    const records = getRecords();
    records.push(record);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan rekod:", error);
    showToast("Storan penuh atau tidak tersedia. Eksport rekod jika boleh.");
    return false;
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function showScreen(screen) {
  ["#homeScreen", "#missionScreen", "#teacherScreen"].forEach(selector => {
    const element = $(selector);
    element.hidden = true;
    element.classList.remove("active");
  });
  screen.hidden = false;
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHomeMessage(message, error = false) {
  const element = $("#homeMessage");
  element.textContent = message;
  element.style.color = error ? "var(--error)" : "var(--success)";
}

function updateTheme(theme) {
  const allowed = ["garden", "forest", "space", "ocean"];
  const selected = allowed.includes(theme) ? theme : "garden";

  document.body.classList.remove(
    "theme-garden", "theme-forest", "theme-space", "theme-ocean"
  );
  document.body.classList.add(`theme-${selected}`);

  const selector = $("#themeSelect");
  if (selector) selector.value = selected;

  try {
    localStorage.setItem(THEME_KEY, selected);
  } catch (error) {
    console.warn("Tema tidak dapat disimpan.", error);
  }
}

function getCurrentWord() {
  const words = MISSION_WORDS[state.mission];
  return WORDS[words[state.questionIndex]];
}

function startJourney() {
  const name = $("#studentName").value.trim();

  if (!name) {
    showHomeMessage("Sila masukkan nama kamu dahulu.", true);
    $("#studentName").focus();
    return;
  }

  state.studentName = name;
  state.completedMissions = {};
  state.missionResults = [];

  $("#activeStudent").textContent = name;
  showHomeMessage(`Selamat datang, ${name}! Pengembaraan bermula.`, false);

  openMission(1);
}

function openMission(number) {
  if (!state.studentName) {
    showHomeMessage("Masukkan nama kamu dahulu sebelum bermula.", true);
    $("#studentName").focus();
    showScreen($("#homeScreen"));
    return;
  }

  if (state.recording) {
    showToast("Hentikan rakaman sebelum menukar paparan.");
    return;
  }

  state.mission = Number(number);
  state.questionIndex = 0;
  state.score = 0;
  state.answered = false;
  state.selectedSyllables = [];

  $("#missionTitle").textContent = MISSIONS[state.mission];
  $("#missionNumber").textContent = `MISI ${state.mission}`;
  $("#scoreDisplay").textContent = "0";
  $("#missionFeedback").textContent = "";
  $("#missionFeedback").className = "feedback";

  showScreen($("#missionScreen"));
  renderQuestion();
}

function updateProgress() {
  const percent = Math.min(
    100,
    ((state.questionIndex + (state.answered ? 1 : 0)) / 5) * 100
  );
  $("#progressBar").style.width = `${percent}%`;
}

function renderQuestion() {
  state.answered = false;
  state.selectedSyllables = [];
  $("#missionFeedback").textContent = "";
  $("#missionFeedback").className = "feedback";
  $("#nextQuestionButton").hidden = true;

  if (state.questionIndex >= 5) {
    finishMission();
    return;
  }

  updateProgress();

  if (state.mission === 1) renderMissionOne();
  else if (state.mission === 2) renderMissionTwo();
  else if (state.mission === 3) renderMissionThree();
  else renderMissionFour();
}

function renderMissionOne() {
  const current = getCurrentWord();
  const distractors = shuffle(
    Object.keys(WORDS).filter(word => word !== current.word)
  ).slice(0, 3);
  const choices = shuffle([current.word, ...distractors]);

  $("#missionContent").innerHTML = `
    <p class="instruction">Baca perkataan dan pilih gambar yang betul.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${escapeHTML(current.word)}</div>
    <p class="text-center">Gambar manakah yang sepadan?</p>
    <div class="picture-grid">
      ${choices.map(word => `
        <button class="picture-option" type="button"
          data-answer="${word}" aria-label="Pilih gambar ${word}">
          ${WORDS[word].emoji}
        </button>`).join("")}
    </div>
    <div class="action-row">
      <button id="speakWordButton" class="secondary-button" type="button">🔊 Dengar perkataan</button>
    </div>`;

  $("#missionContent").querySelectorAll(".picture-option").forEach(button => {
    button.addEventListener("click", () => {
      $("#missionContent").querySelectorAll(".picture-option").forEach(item => item.disabled = true);
      checkAnswer(button.dataset.answer === current.word, current.word, "Kenal gambar", button);
    });
  });

  $("#speakWordButton").addEventListener("click", () => speakText(current.word));
}

function renderMissionTwo() {
  const current = getCurrentWord();
  const pool = ["ba", "ju", "bu", "ku", "gi", "sa", "pu", "ma", "ta", "to", "pi", "ro", "ti", "su", "me", "ja"];
  const choices = shuffle([...current.syllables, ...pool]).slice(0, 10);

  // Pastikan jawapan sentiasa ada, termasuk perkataan dengan suku kata berulang.
  current.syllables.forEach(syllable => {
    if (choices.filter(item => item === syllable).length <
        current.syllables.filter(item => item === syllable).length) {
      choices.push(syllable);
    }
  });

  $("#missionContent").innerHTML = `
    <p class="instruction">Cantumkan dua suku kata untuk membentuk perkataan.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${current.emoji}</div>
    <p class="text-center">Pilih suku kata mengikut turutan.</p>
    <div id="syllableAnswer" class="syllable-display">
      <span class="syllable-choice">?</span><span>+</span><span class="syllable-choice">?</span>
    </div>
    <p id="syllableHint" class="text-center">Pilih dua suku kata.</p>
    <div class="picture-grid">
      ${choices.map((syllable, index) => `
        <button class="syllable-choice syllable-option" type="button"
          data-syllable="${syllable}" data-index="${index}">${syllable}</button>
      `).join("")}
    </div>
    <div class="action-row">
      <button id="resetSyllables" class="secondary-button" type="button">↩ Pilih semula</button>
      <button id="checkSyllables" class="primary-button" type="button">Semak jawapan</button>
      <button id="speakTargetButton" class="secondary-button" type="button">🔊 Dengar perkataan</button>
    </div>`;

  $("#missionContent").querySelectorAll(".syllable-option").forEach(button => {
    button.addEventListener("click", () => {
      if (state.answered || state.selectedSyllables.length >= 2) return;
      state.selectedSyllables.push({
        syllable: button.dataset.syllable,
        index: button.dataset.index
      });
      button.disabled = true;
      button.classList.add("selected");
      updateSyllableAnswer();
    });
  });

  $("#resetSyllables").addEventListener("click", () => {
    if (state.answered) return;
    state.selectedSyllables = [];
    $("#missionContent").querySelectorAll(".syllable-option").forEach(button => {
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
    const answer = state.selectedSyllables.map(item => item.syllable).join("");
    $("#missionContent").querySelectorAll(".syllable-option").forEach(button => button.disabled = true);
    checkAnswer(answer === current.word, current.word, "Cantum suku kata");
  });

  $("#speakTargetButton").addEventListener("click", () => speakText(current.word));
}

function updateSyllableAnswer() {
  const chosen = state.selectedSyllables.map(item => item.syllable);
  $("#syllableAnswer").innerHTML = `
    <span class="syllable-choice">${escapeHTML(chosen[0] || "?")}</span>
    <span>+</span>
    <span class="syllable-choice">${escapeHTML(chosen[1] || "?")}</span>`;
  $("#syllableHint").textContent = chosen.length
    ? `Pilihan kamu: ${chosen.join(" + ")}`
    : "Pilih dua suku kata.";
}

function renderMissionThree() {
  const passage = PASSAGES[state.questionIndex];

  $("#missionContent").innerHTML = `
    <p class="instruction">Baca petikan dan jawab soalan pemahaman.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <h3>📖 Baca petikan pendek ini</h3>
    <div class="reading-passage">${escapeHTML(passage.text)}</div>
    <div class="recording-panel">
      <h3>🎤 Rakaman bacaan kamu</h3>
      <p>Baca petikan dengan suara yang jelas, kemudian dengar semula.</p>
      ${recordingControlsHTML()}
    </div>
    <hr>
    <h3>💡 Soalan pemahaman</h3>
    <p class="text-center">${escapeHTML(passage.question)}</p>
    <div>
      ${passage.options.map(option => `
        <button class="question-option" type="button" data-answer="${option}">
          ${WORDS[option] ? WORDS[option].emoji + " " : ""}${escapeHTML(option)}
        </button>`).join("")}
    </div>`;

  bindRecordingControls();

  $("#missionContent").querySelectorAll(".question-option").forEach(button => {
    button.addEventListener("click", () => {
      if (state.answered) return;
      $("#missionContent").querySelectorAll(".question-option").forEach(item => item.disabled = true);
      checkAnswer(
        button.dataset.answer === passage.answer,
        passage.answer,
        "Pemahaman",
        button
      );
    });
  });
}

function recordingControlsHTML() {
  return `
    <div class="action-row">
      <button id="startRecording" class="primary-button" type="button">🔴 Mula rakam</button>
      <button id="stopRecording" class="secondary-button" type="button" disabled>⏹ Henti rakaman</button>
      <button id="playSpeech" class="secondary-button" type="button" disabled>▶ Dengar semula</button>
    </div>
    <p id="recordingStatus" class="recording-status" role="status">Belum ada rakaman.</p>
    <audio id="audioPlayback" controls hidden></audio>
    <button id="saveRecording" class="secondary-button" type="button" disabled>💾 Simpan rakaman untuk guru</button>`;
}

function renderMissionFour() {
  const current = getCurrentWord();

  $("#missionContent").innerHTML = `
    <p class="instruction">Baca perkataan sendiri dan rakam suara kamu.</p>
    <p class="eyebrow">SOALAN ${state.questionIndex + 1} DARIPADA 5</p>
    <div class="word-display">${escapeHTML(current.word)}</div>
    <p class="text-center">Dengar contoh sebutan, kemudian baca dengan jelas.</p>
    <div class="action-row">
      <button id="modelWordButton" class="secondary-button" type="button">🔊 Dengar contoh</button>
    </div>
    <div class="recording-panel">
      <h3>🎤 Rakam bacaan kamu</h3>
      ${recordingControlsHTML()}
    </div>
    <div class="action-row">
      <button id="selfCheckButton" class="primary-button" type="button">✅ Saya sudah membaca</button>
    </div>`;

  $("#modelWordButton").addEventListener("click", () => speakText(current.word));
  bindRecordingControls();

  $("#selfCheckButton").addEventListener("click", () => {
    if (state.answered) return;
    checkAnswer(true, current.word, "Bacaan kendiri");
  });
}

function checkAnswer(correct, word, activity, selectedButton = null) {
  if (state.answered) return;
  state.answered = true;

  const points = correct ? 1 : 0;
  state.score += points;
  $("#scoreDisplay").textContent = String(state.score);

  if (selectedButton) {
    selectedButton.style.borderColor = correct ? "#18794e" : "#b42318";
  }

  showFeedback(
    correct ? "Syabas! Jawapan kamu betul! ⭐" :
      "Belum tepat. Teruskan mencuba! 💪",
    correct
  );

  state.missionResults.push({
    mission: state.mission,
    question: state.questionIndex + 1,
    word,
    activity,
    points,
    date: new Date().toISOString()
  });

  $("#nextQuestionButton").hidden = false;
  updateProgress();
}

function showFeedback(message, correct) {
  $("#missionFeedback").textContent = message;
  $("#missionFeedback").className = `feedback ${correct ? "correct" : "incorrect"}`;
}

function nextQuestion() {
  if (!state.answered) return;
  if (state.recording) {
    showToast("Hentikan rakaman dahulu.");
    return;
  }
  state.questionIndex++;
  renderQuestion();
}

function finishMission() {
  const mission = state.mission;
  const results = state.missionResults.filter(item => item.mission === mission);
  const totalPoints = results.reduce((sum, item) => sum + item.points, 0);

  state.completedMissions[mission] = true;

  const record = {
    type: "session",
    studentName: state.studentName,
    mission,
    missionTitle: MISSIONS[mission],
    score: totalPoints,
    total: 5,
    percent: Math.round((totalPoints / 5) * 100),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    results: [...results]
  };

  saveRecord(record);
  updateHomeProgress();

  $("#missionContent").innerHTML = `
    <div class="text-center">
      <div class="welcome-illustration">🎉 🏆 🌟</div>
      <h2>Tahniah, Pengembara Kata!</h2>
      <p>Kamu telah menyelesaikan <strong>${escapeHTML(MISSIONS[mission])}</strong>.</p>
      <div class="word-display">${totalPoints} / 5</div>
      <p>Markah kamu untuk misi ini.</p>
      <p>Peratus pencapaian: <strong>${Math.round(totalPoints / 5 * 100)}%</strong></p>
      <p>Teruskan berlatih membaca dengan yakin!</p>
      <div class="action-row">
        <button id="retryMissionButton" class="secondary-button" type="button">🔁 Cuba lagi</button>
        <button id="finishMissionButton" class="primary-button" type="button">🏡 Kembali ke halaman utama</button>
      </div>
      <p class="small-note">Markah ini berdasarkan jawapan dan pengesahan murid. Suara tidak dinilai secara automatik.</p>
    </div>`;

  $("#missionFeedback").textContent = "";
  $("#nextQuestionButton").hidden = true;
  $("#progressBar").style.width = "100%";

  $("#retryMissionButton").addEventListener("click", () => openMission(mission));
  $("#finishMissionButton").addEventListener("click", () => {
    showScreen($("#homeScreen"));
    updateHomeProgress();
  });
}

function updateHomeProgress() {
  const records = getRecords().filter(record =>
    record.type === "session" &&
    record.studentName.toLowerCase() === state.studentName.toLowerCase()
  );
  const completed = new Set(records.map(record => record.mission)).size;
  $("#homeProgressText").textContent = `Misi selesai: ${completed} daripada 4`;
  $("#homeProgressBar").style.width = `${completed / 4 * 100}%`;
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    showToast("Audio contoh tidak disokong oleh pelayar ini.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ms-MY";
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

function bindRecordingControls() {
  const start = $("#startRecording");
  const stop = $("#stopRecording");
  const play = $("#playSpeech");
  const save = $("#saveRecording");
  const status = $("#recordingStatus");
  const audio = $("#audioPlayback");

  if (!start || !stop || !play || !save || !status || !audio) return;

  state.audioBlob = null;
  state.recordingSaved = false;
  audio.hidden = true;
  play.disabled = true;
  save.disabled = true;

  start.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      status.textContent = "Rakaman memerlukan pelayar terkini dan laman HTTPS.";
      return;
    }

    try {
      state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      state.recorder = new MediaRecorder(
        state.mediaStream,
        mime ? { mimeType: mime } : undefined
      );

      state.recorder.ondataavailable = event => {
        if (event.data?.size) state.audioChunks.push(event.data);
      };

      state.recorder.onstop = () => {
        state.audioBlob = new Blob(state.audioChunks, {
          type: state.recorder.mimeType || "audio/webm"
        });

        if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
        state.audioUrl = URL.createObjectURL(state.audioBlob);
        audio.src = state.audioUrl;
        audio.hidden = false;
        play.disabled = false;
        save.disabled = false;
        start.disabled = false;
        stop.disabled = true;
        state.recording = false;
        status.textContent = "Rakaman selesai. Dengar semula sebelum menyimpan.";

        state.mediaStream?.getTracks().forEach(track => track.stop());
        state.mediaStream = null;
      };

      state.recorder.start();
      state.recording = true;
      start.disabled = true;
      stop.disabled = false;
      play.disabled = true;
      save.disabled = true;
      status.textContent = "🔴 Sedang merakam... Baca dengan jelas.";
    } catch (error) {
      console.error(error);
      status.textContent = "Mikrofon tidak dapat digunakan. Benarkan akses mikrofon.";
    }
  });

  stop.addEventListener("click", () => {
    if (state.recorder && state.recorder.state !== "inactive") {
      state.recorder.stop();
    }
  });

  play.addEventListener("click", () => {
    if (audio.src) audio.play().catch(() => {
      status.textContent = "Tekan butang main pada pemain audio.";
    });
  });

  save.addEventListener("click", async () => {
    if (!state.audioBlob || state.recordingSaved) return;

    if (state.audioBlob.size > 2 * 1024 * 1024) {
      status.textContent = "Rakaman melebihi 2 MB. Rakam semula dengan lebih ringkas.";
      return;
    }

    try {
      const audioData = await blobToDataURL(state.audioBlob);
      const current = getCurrentWord();

      const recording = {
        type: "recording",
        studentName: state.studentName,
        mission: state.mission,
        question: state.questionIndex + 1,
        word: current?.word || "",
        createdAt: new Date().toISOString(),
        audioData
      };

      const success = saveRecord(recording);
      if (success) {
        state.recordingSaved = true;
        save.disabled = true;
        status.textContent = "Rakaman disimpan pada peranti ini untuk semakan guru.";
        showToast("Rakaman berjaya disimpan.");
      } else {
        status.textContent = "Rakaman tidak dapat disimpan. Storan mungkin penuh.";
      }
    } catch (error) {
      console.error(error);
      status.textContent = "Rakaman tidak dapat diproses.";
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
    showToast("Hentikan rakaman dahulu.");
    return;
  }
  $("#teacherPassword").value = "";
  $("#loginMessage").textContent = "";
  $("#teacherLogin").hidden = false;
  $("#teacherDashboard").hidden = true;
  showScreen($("#teacherScreen"));
}

function teacherLogin() {
  if ($("#teacherPassword").value !== PASSWORD) {
    $("#loginMessage").textContent = "Kata laluan tidak tepat. Cuba lagi.";
    return;
  }
  state.teacherLoggedIn = true;
  $("#teacherLogin").hidden = true;
  $("#teacherDashboard").hidden = false;
  renderTeacherDashboard();
}

function teacherLogout() {
  state.teacherLoggedIn = false;
  $("#teacherLogin").hidden = false;
  $("#teacherDashboard").hidden = true;
  $("#teacherPassword").value = "";
  showScreen($("#homeScreen"));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" });
}

function renderTeacherDashboard() {
  if (!state.teacherLoggedIn) return;

  const records = getRecords();
  const sessions = records.filter(record => record.type === "session");
  const recordings = records.filter(record => record.type === "recording");
  const students = new Set(records.map(record => record.studentName).filter(Boolean));
  const average = sessions.length
    ? Math.round(sessions.reduce((sum, record) => sum + Number(record.percent || 0), 0) / sessions.length)
    : 0;

  $("#totalRecords").textContent = String(sessions.length);
  $("#totalStudents").textContent = String(students.size);
  $("#averagePercent").textContent = `${average}%`;
  $("#totalRecordings").textContent = String(recordings.length);

  const container = $("#teacherRecords");

  if (!records.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🌱</span><h3>Belum ada rekod</h3>
        <p>Rekod akan dipaparkan selepas murid menyelesaikan misi atau menyimpan rakaman.</p>
      </div>`;
    return;
  }

  container.innerHTML = records.slice().reverse().map(record => {
    if (record.type === "recording") {
      return `
        <article class="record-card">
          <h4>🎤 Rakaman bacaan — ${escapeHTML(record.studentName || "Murid")}</h4>
          <p><strong>Misi:</strong> ${escapeHTML(MISSIONS[record.mission] || String(record.mission))}</p>
          <p><strong>Soalan:</strong> ${escapeHTML(String(record.question || "-"))}</p>
          <p><strong>Perkataan:</strong> ${escapeHTML(record.word || "-")}</p>
          <p><strong>Tarikh:</strong> ${escapeHTML(formatDate(record.createdAt))}</p>
          ${record.audioData
            ? `<audio controls preload="none" src="${record.audioData}"></audio>`
            : "<p>Fail audio tiada.</p>"}
        </article>`;
    }

    const results = record.results || [];
    return `
      <article class="record-card">
        <h3>📘 ${escapeHTML(record.studentName || "Murid")}</h3>
        <p><strong>Misi:</strong> ${escapeHTML(record.missionTitle || MISSIONS[record.mission] || "-")}</p>
        <p><strong>Markah:</strong> ${Number(record.score || 0)} / ${Number(record.total || 5)}</p>
        <p><strong>Peratus:</strong> ${Number(record.percent || 0)}%</p>
        <p><strong>Tarikh:</strong> ${escapeHTML(formatDate(record.completedAt))}</p>
        <details>
          <summary>Lihat butiran jawapan</summary>
          ${results.length ? `<ul>${results.map(item => `
            <li>Misi ${escapeHTML(String(item.mission))}, soalan ${escapeHTML(String(item.question))} —
            ${escapeHTML(item.word || "-")}: ${Number(item.points) ? "Betul" : "Perlu bimbingan"}</li>
          `).join("")}</ul>` : "<p>Tiada butiran jawapan.</p>"}
        </details>
      </article>`;
  }).join("");
}

function exportRecords() {
  if (!state.teacherLoggedIn) {
    showToast("Log masuk sebagai guru dahulu.");
    return;
  }

  const records = getRecords();
  if (!records.length) {
    showToast("Belum ada rekod untuk dieksport.");
    return;
  }

  const rows = [[
    "Jenis rekod", "Nama murid", "Tarikh", "Misi",
    "Soalan", "Perkataan", "Aktiviti", "Markah", "Peratus"
  ]];

  records.forEach(record => {
    if (record.type === "recording") {
      rows.push([
        "Rakaman suara", record.studentName || "",
        formatDate(record.createdAt), MISSIONS[record.mission] || record.mission,
        record.question || "", record.word || "", "Rakaman bacaan", "", ""
      ]);
    } else {
      (record.results || []).forEach(item => {
        rows.push([
          "Pencapaian", record.studentName || "",
          formatDate(item.date), MISSIONS[item.mission] || item.mission,
          item.question, item.word || "", item.activity || "", item.points,
          record.percent
        ]);
      });
    }
  });

  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rekod-pengembaraan-dunia-kata.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearRecords() {
  if (!state.teacherLoggedIn) return;
  if (!confirm("Padam semua rekod dan rakaman pada peranti ini? Tindakan ini tidak boleh dibatalkan.")) return;

  try {
    localStorage.removeItem(RECORDS_KEY);
    renderTeacherDashboard();
    updateHomeProgress();
    showToast("Rekod telah dipadam.");
  } catch (error) {
    showToast("Rekod tidak dapat dipadam.");
  }
}

function attachEvents() {
  $("#startButton").addEventListener("click", startJourney);
  $("#studentName").addEventListener("keydown", event => {
    if (event.key === "Enter") startJourney();
  });

  $("#themeSelect").addEventListener("change", event => updateTheme(event.target.value));

  $("#brandHome").addEventListener("click", event => {
    event.preventDefault();
    showScreen($("#homeScreen"));
  });

  $("#backToMissions").addEventListener("click", () => {
    if (!state.recording) showScreen($("#homeScreen"));
    else showToast("Hentikan rakaman dahulu.");
  });

  $("#homeButton").addEventListener("click", () => {
    if (!state.recording) showScreen($("#homeScreen"));
    else showToast("Hentikan rakaman dahulu.");
  });

  $("#nextQuestionButton").addEventListener("click", nextQuestion);
  $("#teacherButton").addEventListener("click", openTeacherArea);
  $("#teacherHomeButton").addEventListener("click", () => showScreen($("#homeScreen")));
  $("#loginButton").addEventListener("click", teacherLogin);
  $("#teacherPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") teacherLogin();
  });
  $("#teacherLogoutButton").addEventListener("click", teacherLogout);
  $("#refreshButton").addEventListener("click", renderTeacherDashboard);
  $("#exportButton").addEventListener("click", exportRecords);
  $("#clearRecordsButton").addEventListener("click", clearRecords);
}

function initialise() {
  attachEvents();

  let savedTheme = "garden";
  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "garden";
  } catch (error) {
    console.warn("Tema lalai digunakan.", error);
  }

  updateTheme(savedTheme);
  showScreen($("#homeScreen"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
