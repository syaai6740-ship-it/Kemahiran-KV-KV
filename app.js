"use strict";

/*
 * JOM KENAL: PENGEMBARAAN DUNIA KATA
 * BBM Digital Pendidikan Pemulihan Khas
 *
 * Nota:
 * - Markah disimpan pada peranti yang digunakan.
 * - Rakaman suara disimpan dalam IndexedDB pada peranti tersebut.
 * - Penyimpanan merentas peranti memerlukan pangkalan data dalam talian.
 */

const TEACHER_PASSWORD = "1234";
const RECORDS_KEY = "jomKenalRecordsV2";
const PLAYER_KEY = "jomKenalPlayerV2";

const DB_NAME = "JomKenalAudioDB";
const DB_VERSION = 1;
const DB_STORE = "recordings";

const $ = (id) => document.getElementById(id);

const missions = [
  {
    title: "Kenal dan Baca",
    badge: "🔎 MISI 1",
    instruction:
      "Baca perkataan yang dipaparkan. Kemudian pilih gambar yang sepadan.",
    type: "picture",
    questions: [
      {
        word: "baju",
        syllables: ["ba", "ju"],
        image: "👕",
        choices: [
          { image: "👕", label: "baju" },
          { image: "📚", label: "buku" },
          { image: "🍞", label: "roti" }
        ]
      },
      {
        word: "buku",
        syllables: ["bu", "ku"],
        image: "📚",
        choices: [
          { image: "🥄", label: "sudu" },
          { image: "📚", label: "buku" },
          { image: "⚽", label: "bola" }
        ]
      },
      {
        word: "guli",
        syllables: ["gu", "li"],
        image: "🔵",
        choices: [
          { image: "🐴", label: "kuda" },
          { image: "🔵", label: "guli" },
          { image: "👀", label: "mata" }
        ]
      },
      {
        word: "jari",
        syllables: ["ja", "ri"],
        image: "☝️",
        choices: [
          { image: "🍞", label: "roti" },
          { image: "🚲", label: "roda" },
          { image: "☝️", label: "jari" }
        ]
      },
      {
        word: "mata",
        syllables: ["ma", "ta"],
        image: "👀",
        choices: [
          { image: "👀", label: "mata" },
          { image: "👕", label: "baju" },
          { image: "🦷", label: "gigi" }
        ]
      }
    ]
  },

  {
    title: "Cantum dan Baca",
    badge: "🧩 MISI 2",
    instruction:
      "Baca suku kata, tekan mengikut urutan yang betul dan cantumkannya menjadi perkataan.",
    type: "syllables",
    questions: [
      {
        word: "roda",
        syllables: ["ro", "da"],
        image: "🛞"
      },
      {
        word: "roti",
        syllables: ["ro", "ti"],
        image: "🍞"
      },
      {
        word: "kuda",
        syllables: ["ku", "da"],
        image: "🐴"
      },
      {
        word: "bola",
        syllables: ["bo", "la"],
        image: "⚽"
      },
      {
        word: "susu",
        syllables: ["su", "su"],
        image: "🥛"
      }
    ]
  },

  {
    title: "Baca dan Faham",
    badge: "💡 MISI 3",
    instruction:
      "Baca perkataan dan pilih gambar yang menunjukkan maksudnya.",
    type: "comprehension",
    questions: [
      {
        word: "roti",
        image: "🍞",
        question: "Yang manakah makanan?",
        choices: [
          { image: "🍞", label: "roti" },
          { image: "🛞", label: "roda" },
          { image: "👕", label: "baju" }
        ]
      },
      {
        word: "mata",
        image: "👀",
        question: "Apakah anggota badan yang digunakan untuk melihat?",
        choices: [
          { image: "🦷", label: "gigi" },
          { image: "👀", label: "mata" },
          { image: "☝️", label: "jari" }
        ]
      },
      {
        word: "sudu",
        image: "🥄",
        question: "Apakah alat yang boleh digunakan untuk menyuap makanan?",
        choices: [
          { image: "📚", label: "buku" },
          { image: "🥄", label: "sudu" },
          { image: "⚽", label: "bola" }
        ]
      },
      {
        word: "buku",
        image: "📚",
        question: "Apakah benda yang boleh dibaca?",
        choices: [
          { image: "📚", label: "buku" },
          { image: "🍞", label: "roti" },
          { image: "🛞", label: "roda" }
        ]
      },
      {
        word: "gigi",
        image: "🦷",
        question: "Apakah anggota badan yang membantu kita mengunyah makanan?",
        choices: [
          { image: "👀", label: "mata" },
          { image: "🦷", label: "gigi" },
          { image: "👕", label: "baju" }
        ]
      }
    ]
  },

  {
    title: "Cabaran Baca Sendiri",
    badge: "🏆 MISI 4",
    instruction:
      "Baca perkataan sendiri dan pilih gambar yang sepadan. Audio hanya digunakan jika kamu memerlukannya.",
    type: "independent",
    questions: [
      {
        word: "baju",
        image: "👕",
        choices: [
          { image: "👕", label: "baju" },
          { image: "📚", label: "buku" },
          { image: "🥛", label: "susu" }
        ]
      },
      {
        word: "roda",
        image: "🛞",
        choices: [
          { image: "🍞", label: "roti" },
          { image: "🛞", label: "roda" },
          { image: "🐴", label: "kuda" }
        ]
      },
      {
        word: "jari",
        image: "☝️",
        choices: [
          { image: "👀", label: "mata" },
          { image: "🦷", label: "gigi" },
          { image: "☝️", label: "jari" }
        ]
      },
      {
        word: "kuda",
        image: "🐴",
        choices: [
          { image: "🐴", label: "kuda" },
          { image: "⚽", label: "bola" },
          { image: "🔵", label: "guli" }
        ]
      },
      {
        word: "susu",
        image: "🥛",
        choices: [
          { image: "🍞", label: "roti" },
          { image: "🥛", label: "susu" },
          { image: "🥄", label: "sudu" }
        ]
      }
    ]
  }
];

let studentName = "";
let selectedTheme = "hutan";

let missionIndex = 0;
let questionIndex = 0;

let score = 0;
let correctAnswers = 0;
let totalAnswered = 0;

let selectedChoice = null;
let chosenSyllables = [];
let answered = false;

let activeRecordId = null;
let wordAudioIds = {};

let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingWord = null;
let recordingMimeType = "";

let teacherLoggedIn = false;
let recordingURLs = [];


/* --------------------------------------------------
   UTILITI ASAS
-------------------------------------------------- */

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function setMessage(id, message, type = "") {
  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.classList.remove("success", "error");

  if (type) {
    element.classList.add(type);
  }
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === screenId;

    screen.hidden = !active;
    screen.classList.toggle("active", active);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function makeId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "jk-" + Date.now() + "-" +
    Math.random().toString(36).slice(2);
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}


/* --------------------------------------------------
   AUDIO SEBUTAN
-------------------------------------------------- */

function speak(text) {
  if (!("speechSynthesis" in window)) {
    setMessage(
      "gameMessage",
      "Audio tidak disokong oleh pelayar ini. Teruskan membaca perkataan pada skrin."
    );

    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "ms-MY";
  utterance.rate = 0.78;
  utterance.pitch = 1.05;

  window.speechSynthesis.speak(utterance);
}


/* --------------------------------------------------
   REKOD MURID PADA PERANTI
-------------------------------------------------- */

function loadRecords() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(RECORDS_KEY) || "[]"
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function saveCurrentRecord() {
  if (!activeRecordId) return;

  const records = loadRecords();

  let record = records.find(
    (item) => item.id === activeRecordId
  );

  const updatedRecord = {
    id: activeRecordId,
    name: studentName,
    score,
    correctAnswers,
    totalAnswered,
    totalQuestions: 20,
    date: new Date().toISOString(),
    theme: selectedTheme,
    wordRecordings: { ...wordAudioIds }
  };

  if (record) {
    Object.assign(record, updatedRecord);
  } else {
    records.push(updatedRecord);
  }

  saveRecords(records);
}

function savePlayer() {
  try {
    localStorage.setItem(
      PLAYER_KEY,
      JSON.stringify({
        name: studentName,
        theme: selectedTheme
      })
    );
  } catch {
    // Permainan boleh diteruskan jika simpanan gagal.
  }
}

function restorePlayer() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PLAYER_KEY) || "null"
    );

    if (saved && typeof saved === "object") {
      if (typeof saved.name === "string" && $("studentName")) {
        $("studentName").value = saved.name;
      }

      const validThemes = [
        "hutan",
        "space",
        "garden",
        "underwater"
      ];

      if (validThemes.includes(saved.theme)) {
        selectedTheme = saved.theme;
      }
    }
  } catch {
    // Abaikan data yang tidak dapat dibaca.
  }

  applyTheme(selectedTheme);
}


/* --------------------------------------------------
   TEMA
-------------------------------------------------- */

function applyTheme(theme) {
  const allowed = [
    "hutan",
    "space",
    "garden",
    "underwater"
  ];

  if (!allowed.includes(theme)) {
    theme = "hutan";
  }

  selectedTheme = theme;
  document.body.dataset.theme = theme;

  if ($("themeSelect")) {
    $("themeSelect").value = theme;
  }

  document.querySelectorAll(".theme-option").forEach((button) => {
    const selected = button.dataset.theme === theme;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  savePlayer();
}


/* --------------------------------------------------
   PANGKALAN DATA RAKAMAN AUDIO SETEMPAT
-------------------------------------------------- */

function openAudioDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Simpanan rakaman tidak disokong."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAudio(id, blob) {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");

    transaction.objectStore(DB_STORE).put({
      id,
      blob,
      savedAt: new Date().toISOString()
    });

    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getAudio(id) {
  if (!id) return null;

  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(DB_STORE, "readonly")
      .objectStore(DB_STORE)
      .get(id);

    request.onsuccess = () => {
      const result = request.result;

      db.close();
      resolve(result ? result.blob : null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}


/* --------------------------------------------------
   MEMULAKAN PERMAINAN
-------------------------------------------------- */

function startMission() {
  const name = $("studentName").value.trim();

  if (!name) {
    setMessage(
      "homeMessage",
      "Masukkan nama atau kod murid dahulu ya!",
      "error"
    );

    $("studentName").focus();
    return;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setMessage(
      "homeMessage",
      "Selesaikan rakaman yang sedang berjalan dahulu.",
      "error"
    );

    return;
  }

  studentName = name;

  missionIndex = 0;
  questionIndex = 0;

  score = 0;
  correctAnswers = 0;
  totalAnswered = 0;

  activeRecordId = makeId();
  wordAudioIds = {};

  savePlayer();
  saveCurrentRecord();

  $("playerLabel").textContent = "🌟 " + studentName;
  $("scoreValue").textContent = "0";

  setMessage("homeMessage", "");

  showScreen("gameScreen");
  renderQuestion();
}


/* --------------------------------------------------
   PAPARAN SOALAN
-------------------------------------------------- */

function renderQuestion() {
  const mission = missions[missionIndex];
  const item = mission.questions[questionIndex];

  selectedChoice = null;
  chosenSyllables = [];
  answered = false;

  $("gameTitle").textContent = mission.title;
  $("missionBadge").textContent = mission.badge;
  $("gameInstruction").textContent = mission.instruction;

  $("gameStage").textContent =
    `MISI ${missionIndex + 1} DARIPADA ${missions.length}`;

  $("questionValue").textContent =
    `${questionIndex + 1}/${mission.questions.length}`;

  $("scoreValue").textContent = String(score);

  const totalQuestions = missions.reduce(
    (sum, current) => sum + current.questions.length,
    0
  );

  const completedQuestions =
    missionIndex * 5 + questionIndex;

  $("progressBar").style.width =
    `${(completedQuestions / totalQuestions) * 100}%`;

  $("gameContent").replaceChildren();

  setMessage("gameMessage", "");

  $("checkAnswerBtn").hidden = false;
  $("checkAnswerBtn").disabled = false;

  $("nextQuestionBtn").hidden = true;

  if (mission.type === "picture") {
    renderPictureQuestion(item, false);
  } else if (mission.type === "syllables") {
    renderSyllableQuestion(item);
  } else if (mission.type === "comprehension") {
    renderPictureQuestion(item, true);
  } else if (mission.type === "independent") {
    renderPictureQuestion(item, false, true);
  }
}


/* --------------------------------------------------
   BANTUAN AUDIO
-------------------------------------------------- */

function createListenButton(text, label = "🔊 Dengar contoh sebutan") {
  const button = createElement(
    "button",
    "secondary-button",
    label
  );

  button.type = "button";

  button.addEventListener("click", () => speak(text));

  return button;
}


/* --------------------------------------------------
   MISI 1, 3 DAN 4: MEMBACA DAN MEMAHAMI
-------------------------------------------------- */

function renderPictureQuestion(item, isComprehension = false, independent = false) {
  const container = $("gameContent");

  if (isComprehension && item.question) {
    const question = createElement(
      "p",
      "question-prompt",
      item.question
    );

    question.style.textAlign = "center";
    question.style.fontWeight = "900";

    container.append(question);
  }

  const word = createElement(
    "div",
    "reading-word",
    item.word
  );

  word.setAttribute("aria-label", "Perkataan untuk dibaca");

  container.append(word);

  const helpText = createElement(
    "p",
    "small-note",
    independent
      ? "Cuba baca sendiri dahulu. Gunakan audio jika memerlukan bantuan."
      : "Baca perkataan dahulu. Kemudian pilih gambar yang betul."
  );

  helpText.style.textAlign = "center";
  container.append(helpText);

  const listen = createListenButton(
    item.word,
    "🔊 Dengar contoh sebutan"
  );

  listen.style.display = "flex";
  listen.style.margin = "12px auto";

  container.append(listen);

  const choices = createElement("div", "picture-choices");

  const shuffledChoices = shuffle(item.choices);

  shuffledChoices.forEach((choice) => {
    const button = createElement(
      "button",
      "picture-choice"
    );

    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Pilih gambar ${choice.label}`
    );

    const image = createElement(
      "span",
      "choice-image",
      choice.image
    );

    const label = createElement(
      "span",
      "choice-label",
      choice.label
    );

    button.append(image, label);

    button.addEventListener("click", () => {
      if (answered) return;

      selectedChoice = choice.label;

      choices.querySelectorAll("button").forEach((other) => {
        other.classList.remove("selected");
      });

      button.classList.add("selected");
    });

    choices.append(button);
  });

  container.append(choices);
}


/* --------------------------------------------------
   MISI 2: CANTUM SUKU KATA
-------------------------------------------------- */

function renderSyllableQuestion(item) {
  const container = $("gameContent");

  const image = createElement(
    "div",
    "target-picture",
    item.image
  );

  container.append(image);

  const word = createElement(
    "div",
    "reading-word",
    item.word
  );

  container.append(word);

  const instruction = createElement(
    "p",
    "small-note",
    "Baca suku kata pada butang. Tekan suku kata mengikut urutan untuk membentuk perkataan."
  );

  instruction.style.textAlign = "center";

  container.append(instruction);

  const syllableButtons = createElement(
    "div",
    "syllable-buttons"
  );

  const shuffled = shuffle(item.syllables);

  shuffled.forEach((syllable, index) => {
    const button = createElement(
      "button",
      "syllable-button",
      syllable
    );

    button.type = "button";

    button.addEventListener("click", () => {
      if (answered || button.disabled) return;

      chosenSyllables.push({
        syllable,
        button
      });

      button.disabled = true;
      button.classList.add("chosen");

      speak(syllable);

      updateJoinedWord();
    });

    syllableButtons.append(button);
  });

  container.append(syllableButtons);

  const joined = createElement(
    "div",
    "joined-word",
    "Perkataan kamu: —"
  );

  joined.id = "joinedWord";

  container.append(joined);

  const controls = createElement("div", "game-controls");

  const listenWord = createListenButton(
    item.word,
    "🔊 Dengar perkataan penuh"
  );

  const resetButton = createElement(
    "button",
    "secondary-button",
    "↺ Cuba semula"
  );

  resetButton.type = "button";

  resetButton.addEventListener("click", () => {
    if (answered) return;
    renderQuestion();
  });

  controls.append(listenWord, resetButton);

  container.append(controls);
}

function updateJoinedWord() {
  const joined = $("joinedWord");

  if (!joined) return;

  const word = chosenSyllables
    .map((item) => item.syllable)
    .join("");

  joined.textContent = "Perkataan kamu: " + (word || "—");
}


/* --------------------------------------------------
   SEMAK JAWAPAN
-------------------------------------------------- */

function checkAnswer() {
  if (answered) return;

  const mission = missions[missionIndex];
  const item = mission.questions[questionIndex];

  let correct = false;

  if (
    mission.type === "picture" ||
    mission.type === "comprehension" ||
    mission.type === "independent"
  ) {
    if (!selectedChoice) {
      setMessage(
        "gameMessage",
        "Pilih satu gambar dahulu ya.",
        "error"
      );

      return;
    }

    correct = selectedChoice === item.word;
  } else if (mission.type === "syllables") {
    if (chosenSyllables.length !== item.syllables.length) {
      setMessage(
        "gameMessage",
        "Baca dan pilih semua suku kata dahulu.",
        "error"
      );

      return;
    }

    const formedWord = chosenSyllables
      .map((entry) => entry.syllable)
      .join("");

    correct = formedWord === item.word;
  }

  answered = true;
  totalAnswered++;

  if (correct) {
    score++;
    correctAnswers++;

    setMessage(
      "gameMessage",
      "Betul! Syabas, kamu berjaya membaca dan memahami perkataan ini! ⭐",
      "success"
    );

    speak("Betul! " + item.word);
  } else {
    setMessage(
      "gameMessage",
      "Belum tepat. Perhatikan perkataan dan cuba lagi pada soalan seterusnya.",
      "error"
    );

    speak(item.word);
  }

  $("scoreValue").textContent = String(score);
  $("checkAnswerBtn").disabled = true;

  saveCurrentRecord();
  showNextButton();
}


/* --------------------------------------------------
   NAVIGASI SOALAN
-------------------------------------------------- */

function showNextButton() {
  $("checkAnswerBtn").hidden = true;
  $("nextQuestionBtn").hidden = false;

  const lastQuestion =
    questionIndex === missions[missionIndex].questions.length - 1;

  const lastMission =
    missionIndex === missions.length - 1;

  $("nextQuestionBtn").textContent = lastQuestion
    ? (lastMission ? "Lihat Keputusan 🏆" : "Misi Seterusnya →")
    : "Soalan Seterusnya →";
}

function nextQuestion() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setMessage(
      "gameMessage",
      "Hentikan rakaman suara dahulu sebelum meneruskan.",
      "error"
    );

    return;
  }

  if (
    questionIndex <
    missions[missionIndex].questions.length - 1
  ) {
    questionIndex++;
    renderQuestion();
    return;
  }

  if (missionIndex < missions.length - 1) {
    missionIndex++;
    questionIndex = 0;
    renderQuestion();
    return;
  }

  finishMission();
}


/* --------------------------------------------------
   KEPUTUSAN
-------------------------------------------------- */

function finishMission() {
  saveCurrentRecord();

  $("resultStudentName").textContent =
    "Syabas, " + studentName + "!";

  $("finalScore").textContent = score + " / 20";

  const feedback = score >= 17
    ? "Cemerlang! Kamu menunjukkan kemahiran membaca dan memahami perkataan dengan sangat baik."
    : score >= 12
      ? "Bagus! Teruskan latihan membaca supaya kamu semakin yakin."
      : "Terima kasih kerana mencuba. Kamu boleh berlatih semula dan meminta bantuan guru apabila perlu.";

  $("resultFeedback").textContent = feedback;

  showScreen("resultScreen");
}


/* --------------------------------------------------
   RAKAMAN SUARA MURID
-------------------------------------------------- */

async function startWordRecording(
  word,
  recordButton,
  stopButton,
  playButton,
  message
) {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    !window.MediaRecorder
  ) {
    message.textContent =
      "Rakaman tidak disokong. Gunakan pelayar terkini melalui laman HTTPS.";
    return;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    message.textContent =
      "Hentikan rakaman yang sedang berjalan dahulu.";
    return;
  }

  try {
    recordingStream =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    recordingChunks = [];
    recordingWord = word;

    const options = {};

    if (
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ) {
      options.mimeType = "audio/webm;codecs=opus";
    }

    mediaRecorder = new MediaRecorder(
      recordingStream,
      options
    );

    recordingMimeType =
      mediaRecorder.mimeType || "audio/webm";

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        recordingChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", async () => {
      const blob = new Blob(
        recordingChunks,
        { type: recordingMimeType }
      );

      const audioId =
        `${activeRecordId}::${recordingWord}`;

      try {
        await saveAudio(audioId, blob);

        wordAudioIds[recordingWord] = audioId;

        message.textContent =
          `Rakaman perkataan "${recordingWord}" telah disimpan pada peranti ini.`;

        playButton.disabled = false;

        saveCurrentRecord();
      } catch {
        message.textContent =
          "Rakaman selesai tetapi gagal disimpan.";
      }

      if (recordingStream) {
        recordingStream.getTracks().forEach(
          (track) => track.stop()
        );

        recordingStream = null;
      }

      recordButton.disabled = false;
      stopButton.disabled = true;
    });

    mediaRecorder.start();

    recordButton.disabled = true;
    stopButton.disabled = false;
    playButton.disabled = true;

    message.textContent =
      `Sedang merakam perkataan "${word}".`;
  } catch {
    message.textContent =
      "Mikrofon tidak dapat diakses. Semak kebenaran mikrofon pada pelayar.";
  }
}

function stopWordRecording(
  stopButton,
  recordButton,
  playButton,
  message
) {
  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {
    stopButton.disabled = true;
    message.textContent = "Sedang menyimpan rakaman...";
    mediaRecorder.stop();
  }
}

function createRecordingPanel(word) {
  const panel = createElement(
    "section",
    "recording-panel"
  );

  const label = createElement(
    "strong",
    "",
    "🎙️ Rakam bacaan: " + word
  );

  const recordButton = createElement(
    "button",
    "primary-button",
    "🔴 Mula Merakam"
  );

  const stopButton = createElement(
    "button",
    "secondary-button",
    "⏹️ Hentikan Rakaman"
  );

  const playButton = createElement(
    "button",
    "secondary-button",
    "▶️ Dengar Rakaman Saya"
  );

  const message = createElement("p", "");

  message.setAttribute("aria-live", "polite");

  stopButton.disabled = true;
  playButton.disabled = !wordAudioIds[word];

  recordButton.type = "button";
  stopButton.type = "button";
  playButton.type = "button";

  recordButton.addEventListener("click", () => {
    startWordRecording(
      word,
      recordButton,
      stopButton,
      playButton,
      message
    );
  });

  stopButton.addEventListener("click", () => {
    stopWordRecording(
      stopButton,
      recordButton,
      playButton,
      message
    );
  });

  playButton.addEventListener("click", async () => {
    const audioId = wordAudioIds[word];

    if (!audioId) return;

    try {
      const blob = await getAudio(audioId);

      if (!blob) {
        message.textContent =
          "Rakaman tidak ditemui pada peranti ini.";
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(url);
      });

      audio.play().catch(() => {
        message.textContent =
          "Rakaman tidak dapat dimainkan.";
      });
    } catch {
      message.textContent =
        "Rakaman tidak dapat dibuka.";
    }
  });

  panel.append(
    label,
    recordButton,
    stopButton,
    playButton,
    message
  );

  return panel;
}


/* --------------------------------------------------
   RUANG GURU
-------------------------------------------------- */

function openTeacherArea() {
  teacherLoggedIn = false;

  $("teacherPassword").value = "";

  $("teacherDashboard").hidden = true;

  setMessage("teacherLoginMessage", "");

  showScreen("teacherScreen");
}

function teacherLogin() {
  const password = $("teacherPassword").value;

  if (password !== TEACHER_PASSWORD) {
    setMessage(
      "teacherLoginMessage",
      "Kata laluan tidak tepat. Cuba lagi.",
      "error"
    );

    return;
  }

  teacherLoggedIn = true;

  $("teacherDashboard").hidden = false;

  setMessage(
    "teacherLoginMessage",
    "Log masuk berjaya.",
    "success"
  );

  renderTeacherRecords();
}

function teacherLogout() {
  teacherLoggedIn = false;

  $("teacherDashboard").hidden = true;
  $("teacherPassword").value = "";

  setMessage("teacherLoginMessage", "");

  showScreen("homeScreen");
}

function renderTeacherRecords() {
  if (!teacherLoggedIn) return;

  const records = loadRecords().sort((a, b) => {
    const scoreA = Number(a.score) || 0;
    const scoreB = Number(b.score) || 0;

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return new Date(b.date) - new Date(a.date);
  });

  const list = $("recordsList");
  list.replaceChildren();

  $("recordSummary").textContent =
    `Jumlah rekod yang disimpan pada peranti ini: ${records.length}`;

  if (records.length === 0) {
    list.append(
      createElement(
        "p",
        "small-note",
        "Belum ada rekod murid. Mainkan kit ini terlebih dahulu."
      )
    );

    return;
  }

  records.forEach((record, index) => {
    const card = createElement("article", "record-card");

    const title = createElement(
      "h3",
      "",
      `${index + 1}. ${record.name || "Murid"}`
    );

    const mark = createElement(
      "p",
      "",
      `Markah: ${record.score || 0} / ${record.totalQuestions || 20}`
    );

    const percentage = Math.round(
      ((Number(record.score) || 0) /
        (Number(record.totalQuestions) || 20)) * 100
    );

    const percentText = createElement(
      "p",
      "",
      `Pencapaian: ${percentage}%`
    );

    const answered = createElement(
      "p",
      "",
      `Jawapan betul: ${record.correctAnswers || 0}`
    );

    const date = createElement(
      "p",
      "small-note",
      "Tarikh: " + new Date(record.date).toLocaleString("ms-MY")
    );

    card.append(title, mark, percentText, answered, date);

    const audioEntries = Object.entries(
      record.wordRecordings || {}
    );

    if (audioEntries.length > 0) {
      const audioHeading = createElement(
        "strong",
        "",
        "🎙️ Rakaman bacaan"
      );

      card.append(audioHeading);

      audioEntries.forEach(([word, audioId]) => {
        const audioArea = createElement("div", "");

        const wordLabel = createElement(
          "p",
          "",
          "Perkataan: " + word
        );

        const playButton = createElement(
          "button",
          "secondary-button",
          "▶️ Mainkan Rakaman"
        );

        playButton.type = "button";

        playButton.addEventListener("click", async () => {
          try {
            const blob = await getAudio(audioId);

            if (!blob) {
              alert(
                "Rakaman tidak ditemui pada peranti ini."
              );
              return;
            }

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            audio.addEventListener("ended", () => {
              URL.revokeObjectURL(url);
            });

            await audio.play();
          } catch {
            alert("Rakaman tidak dapat dimainkan.");
          }
        });

        audioArea.append(wordLabel, playButton);
        card.append(audioArea);
      });
    } else {
      card.append(
        createElement(
          "p",
          "small-note",
          "Tiada rakaman bacaan disimpan untuk rekod ini."
        )
      );
    }

    list.append(card);
  });
}

function exportRecordsCSV() {
  if (!teacherLoggedIn) return;

  const records = loadRecords().sort(
    (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)
  );

  if (records.length === 0) {
    alert("Tiada rekod untuk dieksport.");
    return;
  }

  const rows = [
    [
      "Nama Murid",
      "Markah",
      "Jumlah Soalan",
      "Jawapan Betul",
      "Peratus",
      "Tarikh"
    ]
  ];

  records.forEach((record) => {
    const total = Number(record.totalQuestions) || 20;
    const mark = Number(record.score) || 0;

    rows.push([
      record.name || "",
      mark,
      total,
      Number(record.correctAnswers) || 0,
      Math.round((mark / total) * 100) + "%",
      new Date(record.date).toLocaleString("ms-MY")
    ]);
  });

  const csv = rows.map((row) =>
    row.map((cell) => {
      let value = String(cell);

      if (/^[=+\-@]/.test(value)) {
        value = "'" + value;
      }

      return '"' + value.replace(/"/g, '""') + '"';
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "rekod-jom-kenal.csv";

  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}


/* --------------------------------------------------
   BUTANG DAN PERMULAAN APLIKASI
-------------------------------------------------- */

function goHome() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    alert("Hentikan rakaman suara dahulu sebelum keluar.");
    return;
  }

  showScreen("homeScreen");
}

function replayMission() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    alert("Hentikan rakaman suara dahulu sebelum bermain semula.");
    return;
  }

  startMission();
}

function setupEvents() {
  $("startBtn").addEventListener("click", startMission);

  $("homeBtn").addEventListener("click", goHome);

  $("checkAnswerBtn").addEventListener("click", checkAnswer);

  $("nextQuestionBtn").addEventListener("click", nextQuestion);

  $("replayBtn").addEventListener("click", replayMission);

  $("resultHomeBtn").addEventListener("click", () => {
    showScreen("homeScreen");
  });

  $("teacherOpenBtn").addEventListener("click", openTeacherArea);

  $("teacherBackBtn").addEventListener("click", () => {
    showScreen("homeScreen");
  });

  $("teacherLoginBtn").addEventListener("click", teacherLogin);

  $("teacherPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      teacherLogin();
    }
  });

  $("refreshRecordsBtn").addEventListener(
    "click",
    renderTeacherRecords
  );

  $("exportRecordsBtn").addEventListener(
    "click",
    exportRecordsCSV
  );

  $("teacherLogoutBtn").addEventListener(
    "click",
    teacherLogout
  );

  $("themeSelect").addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });

  document.querySelectorAll(".theme-option").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
    });
  });

  $("studentName").addEventListener("input", () => {
    setMessage("homeMessage", "");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  restorePlayer();
});
