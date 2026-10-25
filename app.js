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
  roti: { word: "roti", syllables: ["ro", "ti"], emoji: "🍞" },
  susu: { word: "susu", syllables: ["su", "su"], emoji: "🥛" },
  kuda: { word: "kuda", syllables: ["ku", "da"], emoji: "🐴" }
};

const MISSION_WORDS = {
  1: ["baju", "buku", "gigi", "sapu", "kuku"],
  2: ["baju", "buku", "gigi", "sapu", "kuku"],
  3: ["buku", "baju", "roti", "susu", "kuda"],
  4: ["kuda", "mata", "topi", "roti", "susu"]
};

const MISSIONS = {
  1: "Kenal dan Baca",
  2: "Cantum dan Baca",
  3: "Lengkapkan Ayat Bergambar",
  4: "Cabaran Baca Sendiri"
};

/* SOALAN MISI 3: LENGKAPKAN AYAT BERGAMBAR */

const SENTENCE_QUESTIONS = [
  {
    word: "buku",
    sentence: "Ini ialah ____.",
    image: "📘",
    question: "Pilih perkataan yang melengkapkan ayat.",
    options: ["baju", "buku", "kuda"]
  },
  {
    word: "baju",
    sentence: "Ali memakai ____.",
    image: "👕",
    question: "Pilih perkataan yang melengkapkan ayat.",
    options: ["baju", "susu", "roti"]
  },
  {
    word: "roti",
    sentence: "Ibu membeli ____.",
    image: "🍞",
    question: "Pilih perkataan yang melengkapkan ayat.",
    options: ["buku", "roti", "topi"]
  },
  {
    word: "susu",
    sentence: "Adik minum ____.",
    image: "🥛",
    question: "Pilih perkataan yang melengkapkan ayat.",
    options: ["susu", "kuda", "baju"]
  },
  {
    word: "kuda",
    sentence: "Ini seekor ____.",
    image: "🐴",
    question: "Pilih perkataan yang melengkapkan ayat.",
    options: ["mata", "kuda", "roti"]
  }
];

const $ = selector => document.querySelector(selector);

const state = {
  studentName: "",
  mission: 1,
  questionIndex: 0,
  score: 0,
  answered: false,
  selectedSyllables: [],
  completedMissions: {},
  questionResults: [],
  teacherLoggedIn: false,
  recorder: null,
  mediaStream: null,
  audioChunks: [],
  audioBlob: null,
  audioUrl: null,
  recording: false,
  recordingSaved: false
};

let missionTransitionTimer = null;

/* =========================
   FUNGSI ASAS
========================= */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
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
    const records = JSON.parse(
      localStorage.getItem(RECORDS_KEY) || "[]"
    );

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

    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify(records)
    );

    return true;
  } catch (error) {
    console.error("Gagal menyimpan rekod:", error);
    showToast("Rekod tidak dapat disimpan. Storan mungkin penuh.");
    return false;
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function showScreen(screen) {
  if (!screen) return;

  ["#homeScreen", "#missionScreen", "#teacherScreen"].forEach(selector => {
    const element = $(selector);
    if (!element) return;

    element.hidden = true;
    element.classList.remove("active");
  });

  screen.hidden = false;
  screen.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function showHomeMessage(message, error = false) {
  const element = $("#homeMessage");
  if (!element) return;

  element.textContent = message;
  element.style.color = error
    ? "var(--error)"
    : "var(--success)";
}

function updateTheme(theme) {
  const allowed = ["garden", "forest", "space", "ocean"];
  const selected = allowed.includes(theme) ? theme : "garden";

  document.body.classList.remove(
    "theme-garden",
    "theme-forest",
    "theme-space",
    "theme-ocean"
  );

  document.body.classList.add(`theme-${selected}`);

  if ($("#themeSelect")) {
    $("#themeSelect").value = selected;
  }

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

/* =========================
   STATUS KEMAJUAN MISI
========================= */

function hasCompletedMission(missionNumber) {
  if (!state.studentName) return false;

  if (state.completedMissions[missionNumber]) return true;

  const student = state.studentName.trim().toLowerCase();

  return getRecords().some(record =>
    record.type === "session" &&
    String(record.studentName || "").trim().toLowerCase() === student &&
    Number(record.mission) === missionNumber
  );
}

/*
  Misi 1 sentiasa dibuka.
  Misi seterusnya dibuka apabila misi sebelumnya selesai dijawab.
  Markah tidak menentukan sama ada murid boleh meneruskan.
*/

function isMissionUnlocked(missionNumber) {
  if (missionNumber === 1) return true;
  if (!state.studentName) return false;

  return hasCompletedMission(missionNumber - 1);
}

function updateMissionCards() {
  document.querySelectorAll(".mission-card").forEach((card, index) => {
    const missionNumber = index + 1;
    const unlocked = isMissionUnlocked(missionNumber);
    const completed = hasCompletedMission(missionNumber);

    card.classList.toggle("locked", !unlocked);
    card.classList.toggle("unlocked", unlocked);
    card.classList.toggle("completed", completed);

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", unlocked ? "0" : "-1");
    card.setAttribute("aria-disabled", String(!unlocked));

    let status = card.querySelector(".mission-lock-status");

    if (!status) {
      status = document.createElement("p");
      status.className = "mission-lock-status";
      card.appendChild(status);
    }

    if (completed) {
      status.textContent = "✅ Misi selesai";
    } else if (unlocked) {
      status.textContent = "🔓 Tekan untuk mula";
    } else {
      status.textContent = "🔒 Selesaikan misi sebelumnya";
    }
  });

  updateHomeProgress();
}

function handleMissionCardClick(missionNumber) {
  const name = $("#studentName").value.trim();

  if (!state.studentName && name) {
    state.studentName = name;
    $("#activeStudent").textContent = name;
  }

  if (!state.studentName) {
    showHomeMessage("Masukkan nama pengembara dahulu.", true);
    $("#studentName").focus();
    return;
  }

  if (!isMissionUnlocked(missionNumber)) {
    showToast(
      `🔒 Selesaikan Misi ${missionNumber - 1} dahulu.`
    );

    return;
  }

  openMission(missionNumber);
}

function attachMissionCards() {
  document.querySelectorAll(".mission-card").forEach((card, index) => {
    const missionNumber = index + 1;

    card.addEventListener("click", () => {
      handleMissionCardClick(missionNumber);
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleMissionCardClick(missionNumber);
      }
    });
  });
}

/* =========================
   MULAKAN PENGEMBARAAN
========================= */

function startJourney() {
  const name = $("#studentName").value.trim();

  if (!name) {
    showHomeMessage("Sila masukkan nama kamu dahulu.", true);
    $("#studentName").focus();
    return;
  }

  state.studentName = name;
  $("#activeStudent").textContent = name;

  showHomeMessage(
    `Selamat datang, ${name}! Jom mulakan pengembaraan.`
  );

  updateMissionCards();

  // Pilih misi pertama yang belum selesai.
  let nextMission = 1;

  for (let i = 1; i <= 4; i++) {
    if (!hasCompletedMission(i)) {
      nextMission = i;
      break;
    }

    nextMission = 4;
  }

  // Jika semua misi selesai, murid boleh mengulang Misi 1.
  if ([1, 2, 3, 4].every(hasCompletedMission)) {
    nextMission = 1;
  }

  openMission(nextMission);
}

function openMission(number) {
  if (!state.studentName) {
    showHomeMessage(
      "Masukkan nama kamu dahulu sebelum bermula.",
      true
    );

    showScreen($("#homeScreen"));
    $("#studentName").focus();
    return;
  }

  if (state.recording) {
    showToast("Hentikan rakaman sebelum menukar misi.");
    return;
  }

  if (!isMissionUnlocked(number)) {
    showToast(`🔒 Selesaikan Misi ${number - 1} dahulu.`);
    return;
  }

  clearTimeout(missionTransitionTimer);

  state.mission = Number(number);
  state.questionIndex = 0;
  state.score = 0;
  state.answered = false;
  state.selectedSyllables = [];
  state.questionResults = [];

  $("#activeStudent").textContent = state.studentName;
  $("#missionTitle").textContent = MISSIONS[state.mission];
  $("#missionNumber").textContent = `MISI ${state.mission}`;
  $("#scoreDisplay").textContent = "0";
  $("#missionFeedback").textContent = "";
  $("#missionFeedback").className = "feedback";

  showScreen($("#missionScreen"));
  renderQuestion();
}

/* =========================
   PAPARAN SOALAN
========================= */

function updateProgress() {
  const completed =
    state.questionIndex + (state.answered ? 1 : 0);

  $("#progressBar").style.width =
    `${Math.min(100, completed / 5 * 100)}%`;
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
  if (state.mission === 2) renderMissionTwo();
  if (state.mission === 3) renderMissionThree();
  if (state.mission === 4) renderMissionFour();
}

/* =========================
   MISI 1: KENAL DAN BACA
   Baca perkataan dan pilih gambar.
   Pilihan jawapan memaparkan gambar sahaja.
========================= */

function renderMissionOne() {
  const current = getCurrentWord();

  const distractors = shuffle(
    Object.keys(WORDS).filter(word => word !== current.word)
  ).slice(0, 3);

  const choices = shuffle([current.word, ...distractors]);

  $("#missionContent").innerHTML = `
    <p class="instruction">
      Baca perkataan dan pilih gambar yang betul.
    </p>

    <p class="eyebrow">
      SOALAN ${state.questionIndex + 1} DARIPADA 5
    </p>

    <div class="word-display">
      ${escapeHTML(current.word)}
    </div>

    <p class="text-center">
      Gambar manakah yang sepadan?
    </p>

    <div class="picture-grid">
      ${choices.map(word => `
        <button
          class="picture-option"
          type="button"
          data-answer="${word}"
          aria-label="Pilih gambar ${word}"
        >
          <span class="picture-emoji">
            ${WORDS[word].emoji}
          </span>
        </button>
      `).join("")}
    </div>

    <div class="action-row">
      <button
        id="speakWordButton"
        class="secondary-button"
        type="button"
      >
        🔊 Dengar perkataan
      </button>
    </div>
  `;

  $("#missionContent").querySelectorAll(".picture-option")
    .forEach(button => {
      button.addEventListener("click", () => {
        if (state.answered) return;

        $("#missionContent")
          .querySelectorAll(".picture-option")
          .forEach(item => {
            item.disabled = true;
          });

        checkAnswer(
          button.dataset.answer === current.word,
          current.word,
          "Kenal gambar",
          button,
          button.dataset.answer
        );
      });
    });

  $("#speakWordButton").addEventListener("click", () => {
    speakText(current.word);
  });
}

/* =========================
   MISI 2: CANTUM DAN BACA
   Cantum suku kata KV + KV.
========================= */

function renderMissionTwo() {
  const current = getCurrentWord();

  const pool = [
    "ba", "ju", "bu", "ku", "gi", "sa", "pu", "ma",
    "ta", "to", "pi", "ro", "ti", "su", "me", "ja"
  ];

  const choices = shuffle([
    ...current.syllables,
    ...pool
  ]).slice(0, 10);

  current.syllables.forEach(syllable => {
    const required = current.syllables.filter(
      item => item === syllable
    ).length;

    const existing = choices.filter(
      item => item === syllable
    ).length;

    for (let i = existing; i < required; i++) {
      choices.push(syllable);
    }
  });

  $("#missionContent").innerHTML = `
    <p class="instruction">
      Cantumkan dua suku kata untuk membentuk perkataan.
    </p>

    <p class="eyebrow">
      SOALAN ${state.questionIndex + 1} DARIPADA 5
    </p>

    <div class="word-display">
      ${current.emoji}
    </div>

    <p class="text-center">
      Pilih suku kata mengikut turutan.
    </p>

    <div id="syllableAnswer" class="syllable-display">
      <span class="syllable-choice">?</span>
      <span>+</span>
      <span class="syllable-choice">?</span>
    </div>

    <p id="syllableHint" class="text-center">
      Pilih dua suku kata.
    </p>

    <div class="picture-grid">
      ${choices.map((syllable, index) => `
        <button
          class="syllable-choice syllable-option"
          type="button"
          data-syllable="${syllable}"
          data-index="${index}"
        >
          ${syllable}
        </button>
      `).join("")}
    </div>

    <div class="action-row">
      <button
        id="resetSyllables"
        class="secondary-button"
        type="button"
      >
        ↩ Pilih semula
      </button>

      <button
        id="checkSyllables"
        class="primary-button"
        type="button"
      >
        Semak jawapan
      </button>

      <button
        id="speakTargetButton"
        class="secondary-button"
        type="button"
      >
        🔊 Dengar perkataan
      </button>
    </div>
  `;

  $("#missionContent").querySelectorAll(".syllable-option")
    .forEach(button => {
      button.addEventListener("click", () => {
        if (
          state.answered ||
          state.selectedSyllables.length >= 2
        ) {
          return;
        }

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

    $("#missionContent")
      .querySelectorAll(".syllable-option")
      .forEach(button => {
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

    const answer = state.selectedSyllables
      .map(item => item.syllable)
      .join("");

    $("#missionContent")
      .querySelectorAll(".syllable-option")
      .forEach(button => {
        button.disabled = true;
      });

    checkAnswer(
      answer === current.word,
      current.word,
      "Cantum suku kata",
      null,
      answer
    );
  });

  $("#speakTargetButton").addEventListener("click", () => {
    speakText(current.word);
  });
}

function updateSyllableAnswer() {
  const chosen = state.selectedSyllables.map(
    item => item.syllable
  );

  $("#syllableAnswer").innerHTML = `
    <span class="syllable-choice">
      ${escapeHTML(chosen[0] || "?")}
    </span>

    <span>+</span>

    <span class="syllable-choice">
      ${escapeHTML(chosen[1] || "?")}
    </span>
  `;

  $("#syllableHint").textContent = chosen.length
    ? `Pilihan kamu: ${chosen.join(" + ")}`
    : "Pilih dua suku kata.";
}

/* =========================
   MISI 3: LENGKAPKAN AYAT BERGAMBAR
   Lihat gambar dan pilih perkataan
   yang melengkapkan ayat.
========================= */

function renderMissionThree() {
  const item = SENTENCE_QUESTIONS[state.questionIndex];

  $("#missionContent").innerHTML = `
    <p class="instruction">
      Perhatikan gambar dan pilih perkataan yang melengkapkan ayat.
    </p>

    <p class="eyebrow">
      SOALAN ${state.questionIndex + 1} DARIPADA 5
    </p>

    <h3 class="text-center">
      🖼️ Perhatikan gambar
    </h3>

    <div class="word-display" aria-label="Gambar petunjuk">
      ${item.image}
    </div>

    <div class="reading-passage">
      ${escapeHTML(item.sentence)}
    </div>

    <p class="text-center">
      ${escapeHTML(item.question)}
    </p>

    <div class="recording-panel">
      <h3>🎤 Rakaman bacaan kamu</h3>
      <p>
        Baca ayat dengan suara yang jelas, kemudian dengar semula.
      </p>
      ${recordingControlsHTML()}
    </div>

    <hr>

    <h3 class="text-center">
      💡 Pilih jawapan
    </h3>

    <div class="question-options">
      ${shuffle(item.options).map(option => `
        <button
          class="question-option"
          type="button"
          data-answer="${option}"
        >
          ${escapeHTML(option)}
        </button>
      `).join("")}
    </div>
  `;

  bindRecordingControls();

  $("#missionContent")
    .querySelectorAll(".question-option")
    .forEach(button => {
      button.addEventListener("click", () => {
        if (state.answered) return;

        $("#missionContent")
          .querySelectorAll(".question-option")
          .forEach(itemButton => {
            itemButton.disabled = true;
          });

        checkAnswer(
          button.dataset.answer === item.word,
          item.word,
          "Lengkapkan ayat bergambar",
          button,
          button.dataset.answer
        );
      });
    });
}

/* =========================
   MISI 4: CABARAN BACA SENDIRI
========================= */

function renderMissionFour() {
  const current = getCurrentWord();

  $("#missionContent").innerHTML = `
    <p class="instruction">
      Baca perkataan sendiri dan rakam suara kamu.
    </p>

    <p class="eyebrow">
      SOALAN ${state.questionIndex + 1} DARIPADA 5
    </p>

    <div class="word-display">
      ${escapeHTML(current.word)}
    </div>

    <p class="text-center">
      Dengar contoh sebutan, kemudian baca dengan jelas.
    </p>

    <div class="action-row">
      <button
        id="modelWordButton"
        class="secondary-button"
        type="button"
      >
        🔊 Dengar contoh
      </button>
    </div>

    <div class="recording-panel">
      <h3>🎤 Rakam bacaan kamu</h3>
      ${recordingControlsHTML()}
    </div>

    <div class="action-row">
      <button
        id="selfCheckButton"
        class="primary-button"
        type="button"
      >
        ✅ Saya sudah membaca
      </button>
    </div>
  `;

  $("#modelWordButton").addEventListener("click", () => {
    speakText(current.word);
  });

  bindRecordingControls();

  $("#selfCheckButton").addEventListener("click", () => {
    if (state.answered) return;

    checkAnswer(
      true,
      current.word,
      "Bacaan kendiri",
      null,
      "Murid menandakan bacaan selesai"
    );
  });
}

/* =========================
   SEMAKAN DAN REKOD JAWAPAN
========================= */

function checkAnswer(
  correct,
  word,
  activity,
  selectedButton = null,
  studentAnswer = ""
) {
  if (state.answered) return;

  state.answered = true;

  const points = correct ? 1 : 0;
  state.score += points;

  // Simpan jawapan setiap soalan untuk semakan guru.
  state.questionResults.push({
    question: state.questionIndex + 1,
    activity,
    studentAnswer: String(studentAnswer || ""),
    correctAnswer: String(word || ""),
    correct: Boolean(correct)
  });

  $("#scoreDisplay").textContent = String(state.score);

  if (selectedButton) {
    selectedButton.style.borderColor = correct
      ? "#18794e"
      : "#b42318";
  }

  showFeedback(
    correct
      ? "Syabas! Jawapan kamu betul! ⭐"
      : `Belum tepat. Jawapan yang betul ialah "${word}". Teruskan mencuba! 💪`,
    correct
  );

  $("#nextQuestionButton").hidden = false;

  $("#nextQuestionButton").textContent =
    state.questionIndex === 4
      ? "Lihat keputusan →"
      : "Soalan seterusnya →";

  updateProgress();
}

function showFeedback(message, correct) {
  $("#missionFeedback").textContent = message;

  $("#missionFeedback").className =
    `feedback ${correct ? "correct" : "incorrect"}`;
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

/* =========================
   SELESAI MISI
========================= */

function finishMission() {
  const mission = state.mission;
  const percent = Math.round((state.score / 5) * 100);

  const record = {
    type: "session",
    studentName: state.studentName,
    mission,
    missionTitle: MISSIONS[mission],
    score: state.score,
    total: 5,
    percent,
    questionResults: state.questionResults,
    completedAt: new Date().toISOString()
  };

  const saved = saveRecord(record);

  // Buka misi seterusnya walaupun terdapat jawapan yang salah.
  state.completedMissions[mission] = true;

  updateMissionCards();

  $("#missionContent").innerHTML = `
    <div class="text-center">
      <div class="welcome-illustration">🎉 🏆 🌟</div>

      <h2>Tahniah, Pengembara Kata!</h2>

      <p>
        Kamu telah menyelesaikan
        <strong>${escapeHTML(MISSIONS[mission])}</strong>.
      </p>

      <div class="word-display">
        ${state.score} / 5
      </div>

      <p>Markah kamu untuk misi ini.</p>

      <p>
        Peratus pencapaian:
        <strong>${percent}%</strong>
      </p>

      ${
        mission < 4
          ? `<p>🔓 Misi ${mission + 1} telah dibuka!</p>
             <p>Misi seterusnya akan dibuka secara automatik.</p>
             <button
               id="nextMissionButton"
               class="primary-button"
               type="button"
             >
               Teruskan ke Misi ${mission + 1} →
             </button>`
          : `<p>Hebat! Kamu telah menyelesaikan semua misi!</p>
             <button
               id="finishMissionButton"
               class="primary-button"
               type="button"
             >
               🏡 Kembali ke halaman utama
             </button>`
      }

      <button
        id="retryMissionButton"
        class="secondary-button"
        type="button"
      >
        🔁 Cuba lagi
      </button>

      <p class="small-note">
        ${
          saved
            ? "Markah dan jawapan telah disimpan untuk semakan guru."
            : "Rekod tidak dapat disimpan pada peranti ini."
        }
        Rakaman suara perlu dinilai oleh guru.
      </p>
    </div>
  `;

  $("#missionFeedback").textContent = "";
  $("#nextQuestionButton").hidden = true;
  $("#progressBar").style.width = "100%";

  if (mission < 4) {
    let movedToNextMission = false;

    function continueToNextMission() {
      if (movedToNextMission) return;

      movedToNextMission = true;

      clearTimeout(missionTransitionTimer);
      openMission(mission + 1);
    }

    $("#nextMissionButton").addEventListener(
      "click",
      continueToNextMission
    );

    missionTransitionTimer = setTimeout(() => {
      continueToNextMission();
    }, 2500);
  } else {
    $("#finishMissionButton").addEventListener("click", () => {
      showScreen($("#homeScreen"));
      updateMissionCards();
    });
  }

  $("#retryMissionButton").addEventListener("click", () => {
    clearTimeout(missionTransitionTimer);
    openMission(mission);
  });
}

function updateHomeProgress() {
  if (!$("#homeProgressText") || !$("#homeProgressBar")) return;

  const completed = [1, 2, 3, 4].filter(
    hasCompletedMission
  ).length;

  $("#homeProgressText").textContent =
    `Misi selesai: ${completed} daripada 4`;

  $("#homeProgressBar").style.width =
    `${completed / 4 * 100}%`;
}

/* =========================
   AUDIO CONTOH
========================= */

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

/* =========================
   RAKAMAN SUARA
========================= */

function recordingControlsHTML() {
  return `
    <div class="action-row">
      <button
        id="startRecording"
        class="primary-button"
        type="button"
      >
        🔴 Mula rakam
      </button>

      <button
        id="stopRecording"
        class="secondary-button"
        type="button"
        disabled
      >
        ⏹ Henti rakaman
      </button>

      <button
        id="playSpeech"
        class="secondary-button"
        type="button"
        disabled
      >
        ▶ Dengar semula
      </button>
    </div>

    <p id="recordingStatus" class="recording-status" role="status">
      Belum ada rakaman.
    </p>

    <audio id="audioPlayback" controls hidden></audio>

    <button
      id="saveRecording"
      class="secondary-button"
      type="button"
      disabled
    >
      💾 Simpan rakaman untuk guru
    </button>
  `;
}

function bindRecordingControls() {
  const start = $("#startRecording");
  const stop = $("#stopRecording");
  const play = $("#playSpeech");
  const save = $("#saveRecording");
  const status = $("#recordingStatus");
  const audio = $("#audioPlayback");

  if (!start || !stop || !play || !save || !status || !audio) {
    return;
  }

  state.audioBlob = null;
  state.recordingSaved = false;

  audio.hidden = true;
  play.disabled = true;
  save.disabled = true;

  start.addEventListener("click", async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      status.textContent =
        "Rakaman memerlukan pelayar terkini dan laman HTTPS.";
      return;
    }

    try {
      state.mediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      state.audioChunks = [];

      const mime = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : "";

      state.recorder = new MediaRecorder(
        state.mediaStream,
        mime ? { mimeType: mime } : undefined
      );

      state.recorder.ondataavailable = event => {
        if (event.data?.size) {
          state.audioChunks.push(event.data);
        }
      };

      state.recorder.onstop = () => {
        state.audioBlob = new Blob(state.audioChunks, {
          type: state.recorder.mimeType || "audio/webm"
        });

        if (state.audioUrl) {
          URL.revokeObjectURL(state.audioUrl);
        }

        state.audioUrl = URL.createObjectURL(state.audioBlob);

        audio.src = state.audioUrl;
        audio.hidden = false;

        play.disabled = false;
        save.disabled = false;
        start.disabled = false;
        stop.disabled = true;

        state.recording = false;

        status.textContent =
          "Rakaman selesai. Dengar semula sebelum menyimpan.";

        state.mediaStream?.getTracks().forEach(track => {
          track.stop();
        });

        state.mediaStream = null;
      };

      state.recorder.start();
      state.recording = true;

      start.disabled = true;
      stop.disabled = false;
      play.disabled = true;
      save.disabled = true;

      status.textContent =
        "🔴 Sedang merakam... Baca dengan jelas.";
    } catch (error) {
      console.error(error);

      status.textContent =
        "Mikrofon tidak dapat digunakan. Benarkan akses mikrofon.";
    }
  });

  stop.addEventListener("click", () => {
    if (
      state.recorder &&
      state.recorder.state !== "inactive"
    ) {
      state.recorder.stop();
    }
  });

  play.addEventListener("click", () => {
    if (audio.src) {
      audio.play().catch(() => {
        status.textContent =
          "Tekan butang main pada pemain audio.";
      });
    }
  });

  save.addEventListener("click", async () => {
    if (!state.audioBlob || state.recordingSaved) return;

    if (state.audioBlob.size > 2 * 1024 * 1024) {
      status.textContent =
        "Rakaman melebihi 2 MB. Rakam semula dengan lebih ringkas.";
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
        word: current.word,
        createdAt: new Date().toISOString(),
        audioData
      };

      if (saveRecord(recording)) {
        state.recordingSaved = true;
        save.disabled = true;

        status.textContent =
          "Rakaman disimpan pada peranti ini untuk semakan guru.";

        showToast("Rakaman berjaya disimpan.");
      } else {
        status.textContent =
          "Rakaman tidak dapat disimpan. Storan mungkin penuh.";
      }
    } catch (error) {
      console.error(error);

      status.textContent =
        "Rakaman tidak dapat diproses.";
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

/* =========================
   RUANG GURU
========================= */

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
    $("#loginMessage").textContent =
      "Kata laluan tidak tepat. Cuba lagi.";
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

  return date.toLocaleString("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderTeacherDashboard() {
  if (!state.teacherLoggedIn) return;

  const records = getRecords();

  const sessions = records.filter(
    record => record.type === "session"
  );

  const recordings = records.filter(
    record => record.type === "recording"
  );

  const students = new Set(
    records.map(record =>
      String(record.studentName || "").trim().toLowerCase()
    ).filter(Boolean)
  );

  const average = sessions.length
    ? Math.round(
        sessions.reduce((sum, record) =>
          sum + Number(record.percent || 0), 0
        ) / sessions.length
      )
    : 0;

  $("#totalRecords").textContent = String(sessions.length);
  $("#totalStudents").textContent = String(students.size);
  $("#averagePercent").textContent = `${average}%`;
  $("#totalRecordings").textContent = String(recordings.length);

  const container = $("#teacherRecords");

  if (!records.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🌱</span>
        <h3>Belum ada rekod</h3>
        <p>
          Rekod akan dipaparkan selepas murid menyelesaikan misi
          atau menyimpan rakaman.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = records.slice().reverse().map(record => {
    if (record.type === "recording") {
      return `
        <article class="record-card">
          <h3>
            🎤 Rakaman bacaan —
            ${escapeHTML(record.studentName || "Murid")}
          </h3>

          <p>
            <strong>Misi:</strong>
            ${escapeHTML(MISSIONS[record.mission] || "-")}
          </p>

          <p>
            <strong>Soalan:</strong>
            ${escapeHTML(String(record.question || "-"))}
          </p>

          <p>
            <strong>Perkataan:</strong>
            ${escapeHTML(record.word || "-")}
          </p>

          <p>
            <strong>Tarikh:</strong>
            ${escapeHTML(formatDate(record.createdAt))}
          </p>

          ${
            record.audioData
              ? `<audio controls preload="none" src="${record.audioData}"></audio>`
              : "<p>Fail audio tiada.</p>"
          }
        </article>
      `;
    }

    const details = Array.isArray(record.questionResults)
      ? record.questionResults.map(result => `
          <li>
            <strong>Soalan ${Number(result.question)}:</strong>
            ${escapeHTML(result.activity || "-")} —
            Jawapan murid:
            <strong>
              ${escapeHTML(result.studentAnswer || "(tiada jawapan)")}
            </strong>;
            jawapan betul:
            <strong>
              ${escapeHTML(result.correctAnswer || "-")}
            </strong>;
            <strong>
              ${result.correct ? "✅ Betul" : "❌ Salah"}
            </strong>
          </li>
        `).join("")
      : "<li>Butiran jawapan individu tiada untuk rekod lama ini.</li>";

    return `
      <article class="record-card">
        <h3>
          📘 ${escapeHTML(record.studentName || "Murid")}
        </h3>

        <p>
          <strong>Misi:</strong>
          ${escapeHTML(record.missionTitle || "-")}
        </p>

        <p>
          <strong>Markah:</strong>
          ${Number(record.score || 0)} /
          ${Number(record.total || 5)}
        </p>

        <p>
          <strong>Peratus:</strong>
          ${Number(record.percent || 0)}%
        </p>

        <p>
          <strong>Tarikh:</strong>
          ${escapeHTML(formatDate(record.completedAt))}
        </p>

        <details>
          <summary>Lihat jawapan setiap soalan</summary>
          <ol>${details}</ol>
        </details>
      </article>
    `;
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
    "Jenis rekod",
    "Nama murid",
    "Tarikh",
    "Misi",
    "Soalan",
    "Aktiviti",
    "Jawapan murid",
    "Jawapan betul",
    "Status jawapan",
    "Markah",
    "Jumlah",
    "Peratus"
  ]];

  records.forEach(record => {
    if (record.type === "recording") {
      rows.push([
        "Rakaman suara",
        record.studentName || "",
        formatDate(record.createdAt),
        MISSIONS[record.mission] || "",
        record.question || "",
        "Rakaman bacaan",
        "",
        record.word || "",
        "",
        "",
        "",
        ""
      ]);

      return;
    }

    const results = Array.isArray(record.questionResults)
      ? record.questionResults
      : [];

    if (!results.length) {
      rows.push([
        "Pencapaian",
        record.studentName || "",
        formatDate(record.completedAt),
        record.missionTitle || "",
        "",
        "",
        "",
        "",
        "",
        record.score ?? "",
        record.total ?? "",
        record.percent ?? ""
      ]);

      return;
    }

    results.forEach((result, index) => {
      rows.push([
        "Pencapaian",
        record.studentName || "",
        formatDate(record.completedAt),
        record.missionTitle || "",
        result.question || index + 1,
        result.activity || "",
        result.studentAnswer || "",
        result.correctAnswer || "",
        result.correct ? "Betul" : "Salah",
        index === 0 ? record.score : "",
        index === 0 ? record.total : "",
        index === 0 ? record.percent : ""
      ]);
    });
  });

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;"
  });

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

  const confirmed = confirm(
    "Padam semua rekod dan rakaman pada peranti ini? " +
    "Tindakan ini tidak boleh dibatalkan."
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(RECORDS_KEY);

    state.completedMissions = {};

    renderTeacherDashboard();
    updateMissionCards();

    showToast("Rekod telah dipadam.");
  } catch (error) {
    showToast("Rekod tidak dapat dipadam.");
  }
}

/* =========================
   BUTANG DAN PERMULAAN
========================= */

function attachEvents() {
  $("#startButton").addEventListener("click", startJourney);

  $("#studentName").addEventListener("keydown", event => {
    if (event.key === "Enter") startJourney();
  });

  $("#themeSelect").addEventListener("change", event => {
    updateTheme(event.target.value);
  });

  $("#brandHome").addEventListener("click", event => {
    event.preventDefault();

    showScreen($("#homeScreen"));
    updateMissionCards();
  });

  $("#backToMissions").addEventListener("click", () => {
    if (state.recording) {
      showToast("Hentikan rakaman dahulu.");
      return;
    }

    showScreen($("#homeScreen"));
    updateMissionCards();
  });

  $("#homeButton").addEventListener("click", () => {
    if (state.recording) {
      showToast("Hentikan rakaman dahulu.");
      return;
    }

    showScreen($("#homeScreen"));
    updateMissionCards();
  });

  $("#nextQuestionButton").addEventListener(
    "click",
    nextQuestion
  );

  $("#teacherButton").addEventListener(
    "click",
    openTeacherArea
  );

  $("#teacherHomeButton").addEventListener("click", () => {
    showScreen($("#homeScreen"));
    updateMissionCards();
  });

  $("#loginButton").addEventListener("click", teacherLogin);

  $("#teacherPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") teacherLogin();
  });

  $("#teacherLogoutButton").addEventListener(
    "click",
    teacherLogout
  );

  $("#refreshButton").addEventListener(
    "click",
    renderTeacherDashboard
  );

  $("#exportButton").addEventListener(
    "click",
    exportRecords
  );

  $("#clearRecordsButton").addEventListener(
    "click",
    clearRecords
  );
}

function initialise() {
  attachEvents();
  attachMissionCards();

  let savedTheme = "garden";

  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "garden";
  } catch (error) {
    console.warn("Tema lalai digunakan.", error);
  }

  updateTheme(savedTheme);
  showScreen($("#homeScreen"));
  updateMissionCards();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
