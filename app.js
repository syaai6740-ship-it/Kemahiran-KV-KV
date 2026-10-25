/* ==========================================
   JOM KENAL! — LOGIK PERMAINAN
   Bahasa Melayu Pemulihan Khas Tahun 1
   ========================================== */

"use strict";

const TEACHER_PASSWORD = "1234";
const RECORDS_KEY = "jomKenalRecordsV1";
const PLAYER_KEY = "jomKenalPlayerV1";

const games = [
  {
    title: "Kenal Perkataan",
    instruction: "Pilih gambar yang sepadan dengan perkataan.",
    words: [
      { word: "baju", image: "👕", choices: ["👕", "📚", "⚽"] },
      { word: "buku", image: "📚", choices: ["🍞", "📚", "🧹"] },
      { word: "guli", image: "🔵", choices: ["🔵", "👟", "🐟"] },
      { word: "jari", image: "☝️", choices: ["🍎", "☝️", "🚲"] },
      { word: "mata", image: "👀", choices: ["👀", "🎩", "🍞"] }
    ]
  },
  {
    title: "Cantum Suku Kata",
    instruction: "Dengar suku kata, kemudian cantumkannya menjadi perkataan.",
    words: [
      { word: "sapu", syllables: ["sa", "pu"], image: "🧹" },
      { word: "susu", syllables: ["su", "su"], image: "🥛" },
      { word: "topi", syllables: ["to", "pi"], image: "🎩" },
      { word: "roda", syllables: ["ro", "da"], image: "🛞" },
      { word: "roti", syllables: ["ro", "ti"], image: "🍞" }
    ]
  },
  {
    title: "Jom Baca!",
    instruction: "Dengar contoh sebutan, kemudian baca perkataan.",
    words: [
      { word: "kuda", image: "🐴" },
      { word: "mata", image: "👀" },
      { word: "bola", image: "⚽" },
      { word: "baju", image: "👕" },
      { word: "pipi", image: "😊" }
    ]
  }
];

const $ = (id) => document.getElementById(id);

let studentName = "";
let selectedTheme = "fantasy";
let gameIndex = 0;
let questionIndex = 0;
let score = 0;
let correctAnswers = 0;
let selectedPicture = null;
let chosenSyllables = [];
let answered = false;
let teacherLoggedIn = false;

let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordedBlob = null;
let recordingStarted = false;
let recordingStopped = false;
let recordingPromise = null;
let activeRecordId = null;
let recordingMimeType = "";

const DB_NAME = "JomKenalAudioDB";
const DB_VERSION = 1;
const DB_STORE = "recordings";

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const isActive = screen.id === screenId;
    screen.hidden = !isActive;
    screen.classList.toggle("active", isActive);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function safeText(value) {
  return String(value ?? "");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    setMessage("gameMessage", "Audio sebutan tidak disokong oleh pelayar ini.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ms-MY";
  utterance.rate = 0.78;
  utterance.pitch = 1.05;

  window.speechSynthesis.speak(utterance);
}

function loadRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
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

function openAudioDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Pelayar tidak menyokong simpanan rakaman."));
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
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readonly")
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

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "jk-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function savePlayer() {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({
      name: studentName,
      theme: selectedTheme
    }));
  } catch {
    // Permainan masih boleh diteruskan jika simpanan tidak tersedia.
  }
}

function restorePlayer() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYER_KEY) || "null");

    if (saved && typeof saved === "object") {
      if (typeof saved.name === "string") {
        $("studentName").value = saved.name;
      }

      if (["fantasy", "space", "garden", "underwater"].includes(saved.theme)) {
        selectedTheme = saved.theme;
      }
    }
  } catch {
    // Abaikan data lama yang tidak dapat dibaca.
  }

  applyTheme(selectedTheme);
}

function applyTheme(theme) {
  selectedTheme = theme;
  document.body.dataset.theme = theme;

  document.querySelectorAll(".theme-option").forEach((button) => {
    const isSelected = button.dataset.theme === theme;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function startMission() {
  const name = $("studentName").value.trim();

  if (!name) {
    setMessage("homeMessage", "Masukkan nama kamu dahulu ya! 😊");
    $("studentName").focus();
    return;
  }

  studentName = name;
  savePlayer();

  gameIndex = 0;
  questionIndex = 0;
  score = 0;
  correctAnswers = 0;
  activeRecordId = makeId();
  recordedBlob = null;
  recordingStarted = false;
  recordingStopped = false;

  $("playerLabel").textContent = "🌟 " + studentName;
  $("scoreValue").textContent = "0";

  showScreen("gameScreen");
  renderQuestion();
}

function renderQuestion() {
  const game = games[gameIndex];
  const item = game.words[questionIndex];

  selectedPicture = null;
  chosenSyllables = [];
  answered = false;

  $("gameTitle").textContent = game.title;
  $("gameInstruction").textContent = game.instruction;
  $("gameStage").textContent = `MISI ${gameIndex + 1} DARIPADA ${games.length}`;
  $("questionValue").textContent = `${questionIndex + 1}/${game.words.length}`;
  $("scoreValue").textContent = score;
  $("progressBar").style.width =
    `${((gameIndex * game.words.length + questionIndex) /
      (games.length * game.words.length)) * 100}%`;

  $("gameContent").replaceChildren();
  setMessage("gameMessage", "");

  $("checkAnswerBtn").hidden = false;
  $("checkAnswerBtn").disabled = false;
  $("nextQuestionBtn").hidden = true;

  if (gameIndex === 0) renderPictureQuestion(item);
  if (gameIndex === 1) renderSyllableQuestion(item);
  if (gameIndex === 2) renderReadingQuestion(item);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function renderPictureQuestion(item) {
  const container = $("gameContent");

  const prompt = createElement("div", "activity-prompt");
  prompt.style.textAlign = "center";

  const picture = createElement("div", "target-picture", "🔎");
  picture.style.fontSize = "3rem";

  const wordButton = createElement("button", "primary-button", "🔊 Dengar perkataan: " + item.word);
  wordButton.type = "button";
  wordButton.addEventListener("click", () => speak(item.word));

  prompt.append(picture, wordButton);
  container.append(prompt);

  const choices = createElement("div", "picture-choices");
  choices.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:14px;margin-top:24px;";

  item.choices.forEach((emoji) => {
    const button = createElement("button", "picture-choice", emoji);
    button.type = "button";
    button.style.cssText =
      "min-height:115px;font-size:3rem;border:3px solid #e5dcf8;border-radius:20px;background:#fff8fd;";

    button.setAttribute("aria-label", "Pilih gambar " + emoji);

    button.addEventListener("click", () => {
      if (answered) return;

      selectedPicture = emoji;

      choices.querySelectorAll("button").forEach((choice) => {
        choice.style.borderColor = "#e5dcf8";
        choice.style.background = "#fff8fd";
      });

      button.style.borderColor = "#8054df";
      button.style.background = "#eee5ff";
    });

    choices.append(button);
  });

  container.append(choices);
}

function renderSyllableQuestion(item) {
  const container = $("gameContent");

  const image = createElement("div", "target-picture", item.image);
  image.style.cssText = "font-size:4rem;text-align:center;margin-bottom:10px;";
  container.append(image);

  const instruction = createElement(
    "p",
    "",
    "Tekan setiap suku kata untuk mendengar bunyinya. Pilih mengikut urutan."
  );
  instruction.style.cssText = "text-align:center;line-height:1.6;";
  container.append(instruction);

  const syllableButtons = createElement("div", "syllable-buttons");
  syllableButtons.style.cssText =
    "display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:22px 0;";

  const shuffled = [...item.syllables].sort(() => Math.random() - 0.5);

  shuffled.forEach((syllable, index) => {
    const button = createElement("button", "syllable-button", syllable);
    button.type = "button";
    button.style.cssText =
      "min-width:90px;min-height:75px;border:3px solid #d8c7ff;border-radius:18px;background:#f5f0ff;color:#352653;font-size:1.6rem;font-weight:900;";

    button.addEventListener("click", () => {
      speak(syllable);

      if (answered || chosenSyllables.length >= item.syllables.length) return;

      chosenSyllables.push(syllable);
      button.disabled = true;
      button.style.background = "#dff8e8";
      updateJoinedWord();
    });

    syllableButtons.append(button);
  });

  container.append(syllableButtons);

  const joined = createElement("div", "joined-word", "Perkataan kamu: —");
  joined.id = "joinedWord";
  joined.style.cssText =
    "text-align:center;font-size:1.35rem;font-weight:900;padding:15px;background:#fff2c9;border-radius:16px;";

  container.append(joined);

  const actions = createElement("div", "syllable-actions");
  actions.style.cssText =
    "display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:15px;";

  const listenButton = createElement("button", "secondary-button", "🔊 Dengar perkataan penuh");
  listenButton.type = "button";
  listenButton.addEventListener("click", () => speak(item.word));

  const resetButton = createElement("button", "secondary-button", "↺ Cuba semula");
  resetButton.type = "button";
  resetButton.addEventListener("click", () => renderQuestion());

  actions.append(listenButton, resetButton);
  container.append(actions);
}

function updateJoinedWord() {
  const element = $("joinedWord");

  if (element) {
    element.textContent = "Perkataan kamu: " +
      (chosenSyllables.length ? chosenSyllables.join("") : "—");
  }
}

function renderReadingQuestion(item) {
  const container = $("gameContent");

  const image = createElement("div", "target-picture", item.image);
  image.style.cssText = "font-size:5rem;text-align:center;margin:10px 0;";
  container.append(image);

  const word = createElement("div", "reading-word", item.word);
  word.style.cssText =
    "font-size:2.7rem;font-weight:900;text-align:center;letter-spacing:2px;margin:18px 0;";
  container.append(word);

  const listen = createElement("button", "secondary-button", "🔊 Dengar contoh sebutan");
  listen.type = "button";
  listen.style.display = "block";
  listen.style.margin = "12px auto";
  listen.addEventListener("click", () => speak(item.word));
  container.append(listen);

  const note = createElement(
    "p",
    "",
    "Baca perkataan ini dengan jelas. Kemudian tekan “Saya sudah membaca”."
  );
  note.style.cssText = "text-align:center;line-height:1.6;";
  container.append(note);

  const readButton = createElement("button", "primary-button", "📖 Saya sudah membaca");
  readButton.type = "button";
  readButton.addEventListener("click", () => {
    if (answered) return;

    answered = true;
    score += 1;
    correctAnswers += 1;
    $("scoreValue").textContent = score;
    setMessage("gameMessage", "Bagus! Kamu telah mencuba membaca. ⭐");
    speak("Bagus! " + item.word);
    showNextButton();
  });

  container.append(readButton);
}

function checkAnswer() {
  if (answered) return;

  const item = games[gameIndex].words[questionIndex];
  let isCorrect = false;

  if (gameIndex === 0) {
    if (selectedPicture === null) {
      setMessage("gameMessage", "Pilih satu gambar dahulu ya. 😊");
      return;
    }

    isCorrect = selectedPicture === item.image;
  } else if (gameIndex === 1) {
    if (chosenSyllables.length !== item.syllables.length) {
      setMessage("gameMessage", "Tekan semua suku kata mengikut urutan. 😊");
      return;
    }

    isCorrect = chosenSyllables.join("") === item.word;
  }

  answered = true;

  if (isCorrect) {
    score += 1;
    correctAnswers += 1;
    setMessage("gameMessage", "Betul! Syabas, hebatnya kamu! ⭐");
    speak("Betul! " + item.word);
  } else {
    setMessage("gameMessage", "Belum tepat. Dengar sebutan dan cuba ingat perkataan ini.");
    speak(item.word);
  }

  $("scoreValue").textContent = score;
  $("checkAnswerBtn").disabled = true;
  showNextButton();
}

function showNextButton() {
  $("checkAnswerBtn").hidden = true;
  $("nextQuestionBtn").hidden = false;

  const isLastQuestion = questionIndex === games[gameIndex].words.length - 1;
  const isLastGame = gameIndex === games.length - 1;

  $("nextQuestionBtn").textContent = isLastQuestion
    ? (isLastGame ? "Lihat Keputusan 🏆" : "Misi Seterusnya →")
    : "Soalan Seterusnya →";
}

function nextQuestion() {
  if (questionIndex < games[gameIndex].words.length - 1) {
    questionIndex += 1;
    renderQuestion();
    return;
  }

  if (gameIndex < games.length - 1) {
    gameIndex += 1;
    questionIndex = 0;
    renderQuestion();
    return;
  }

  finishMission();
}

function finishMission() {
  $("resultStudentName").textContent = "Syabas, " + studentName + "!";
  $("finalScore").textContent = score + " / 15";

  showScreen("resultScreen");
  setMessage("recordingMessage", "Rakaman suara pilihan. Benarkan akses mikrofon apabila diminta.");

  savePlayer();
}

function openTeacherArea() {
  teacherLoggedIn = false;
  $("teacherPassword").value = "";
  $("teacherLoginPanel").hidden = false;
  $("teacherDashboard").hidden = true;
  setMessage("teacherLoginMessage", "");
  showScreen("teacherScreen");
}

function teacherLogin() {
  if ($("teacherPassword").value !== TEACHER_PASSWORD) {
    setMessage("teacherLoginMessage", "Kata laluan tidak tepat.");
    return;
  }

  teacherLoggedIn = true;
  $("teacherLoginPanel").hidden = true;
  $("teacherDashboard").hidden = false;
  renderTeacherRecords();
}

function logoutTeacher() {
  teacherLoggedIn = false;
  $("teacherDashboard").hidden = true;
  $("teacherLoginPanel").hidden = false;
  $("teacherPassword").value = "";
  showScreen("homeScreen");
}

async function renderTeacherRecords() {
  if (!teacherLoggedIn) return;

  const records = loadRecords().sort((a, b) => b.score - a.score);
  const list = $("studentRecords");
  list.replaceChildren();

  $("totalRecords").textContent = records.length;

  $("highestScore").textContent = records.length
    ? `${records[0].score}/15`
    : "—";

  $("lowestScore").textContent = records.length
    ? `${records[records.length - 1].score}/15`
    : "—";

  if (!records.length) {
    list.append(createElement("p", "", "Belum ada rekod murid pada pelayar ini."));
    return;
  }

  for (const record of records) {
    const card = createElement("article", "student-record");
    const details = createElement("div", "student-record-details");
    const heading = createElement("h3", "", record.name);
    const date = record.date
      ? new Date(record.date).toLocaleString("ms-MY")
      : "Tarikh tidak tersedia";

    const info = createElement(
      "p",
      "",
      `${date} · Skor: ${record.score}/15 · Jawapan betul: ${record.correctAnswers}/15`
    );

    details.append(heading, info);

    if (record.audioId) {
      const audioLabel = createElement("p", "", "🎤 Rakaman bacaan:");
      details.append(audioLabel);

      try {
        const blob = await getAudio(record.audioId);

        if (blob) {
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.preload = "none";
          audio.src = URL.createObjectURL(blob);
          details.append(audio);
        } else {
          details.append(createElement("p", "", "Rakaman tidak ditemui pada peranti ini."));
        }
      } catch {
        details.append(createElement("p", "", "Rakaman tidak dapat dibuka."));
      }
    } else {
      details.append(createElement("p", "", "Tiada rakaman suara disimpan."));
    }

    const scoreBadge = createElement("div", "record-score", `${record.score}/15`);
    card.append(details, scoreBadge);
    list.append(card);
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ||
      !window.MediaRecorder) {
    setMessage(
      "recordingMessage",
      "Rakaman tidak disokong. Cuba pelayar terkini melalui laman HTTPS."
    );
    return;
  }

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    recordedBlob = null;
    recordingStarted = true;
    recordingStopped = false;

    const options = {};

    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      options.mimeType = "audio/webm;codecs=opus";
    }

    mediaRecorder = new MediaRecorder(recordingStream, options);
    recordingMimeType = mediaRecorder.mimeType || "audio/webm";

    recordingPromise = new Promise((resolve) => {
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        recordedBlob = new Blob(recordingChunks, {
          type: recordingMimeType
        });

        recordingStopped = true;
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;

        try {
          await saveAudio(activeRecordId, recordedBlob);
          setMessage(
            "recordingMessage",
            "Rakaman disimpan pada peranti ini. Tekan butang Seterusnya untuk menamatkan."
          );
        } catch {
          setMessage(
            "recordingMessage",
            "Rakaman selesai tetapi tidak dapat disimpan. Ruang simpanan mungkin tidak tersedia."
          );
        }

        resolve(recordedBlob);
      });
    });

    mediaRecorder.start();

    $("recordBtn").disabled = true;
    $("stopRecordBtn").disabled = false;
    setMessage("recordingMessage", "Sedang merakam. Baca perkataan yang dipaparkan dengan jelas.");
  } catch {
    setMessage(
      "recordingMessage",
      "Mikrofon tidak dapat diakses. Semak kebenaran mikrofon pada pelayar."
    );
  }
}

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    $("stopRecordBtn").disabled = true;

    if (recordingPromise) {
      await recordingPromise;
    }

    $("recordBtn").disabled = false;
  }
}

async function saveFinalRecord() {
  if (recordingStarted && !recordingStopped && mediaRecorder &&
      mediaRecorder.state !== "inactive") {
    await stopRecording();
  }

  const records = loadRecords();

  const record = {
    id: activeRecordId || makeId(),
    name: studentName,
    score,
    correctAnswers,
    date: new Date().toISOString(),
    theme: selectedTheme,
    audioId: recordedBlob ? activeRecordId : null
  };

  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  if (!saveRecords(records)) {
    setMessage(
      "recordingMessage",
      "Rekod tidak dapat disimpan. Semak ruang simpanan pelayar."
    );
  }
}

function returnHome() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    stopRecording();
  }

  showScreen("homeScreen");
}

function bindEvents() {
  $("startMissionBtn").addEventListener("click", startMission);
  $("teacherOpenBtn").addEventListener("click", openTeacherArea);
  $("teacherLoginBtn").addEventListener("click", teacherLogin);
  $("logoutTeacherBtn").addEventListener("click", logoutTeacher);
  $("teacherBackBtn").addEventListener("click", () => showScreen("homeScreen"));
  $("homeBtn").addEventListener("click", returnHome);

  $("checkAnswerBtn").addEventListener("click", checkAnswer);
  $("nextQuestionBtn").addEventListener("click", nextQuestion);

  $("finishMissionBtn").addEventListener("click", async () => {
    await saveFinalRecord();
    $("recordBtn").disabled = false;
    $("stopRecordBtn").disabled = true;
    showScreen("homeScreen");
  });

  $("recordBtn").addEventListener("click", startRecording);
  $("stopRecordBtn").addEventListener("click", stopRecording);

  $("refreshRecordsBtn").addEventListener("click", renderTeacherRecords);

  $("teacherPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") teacherLogin();
  });

  document.querySelectorAll(".theme-option").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
      savePlayer();
    });
  });
}

function initialise() {
  bindEvents();
  restorePlayer();
}

document.addEventListener("DOMContentLoaded", initialise);
