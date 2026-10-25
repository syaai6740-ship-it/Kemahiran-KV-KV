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
      { word: "satu", syllables: ["sa", "tu"], image: "1️⃣" },
      { word: "sudu", syllables: ["su", "du"], image: "🥄" },
      { word: "susu", syllables: ["su", "su"], image: "🥛" },
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
      { word: "gigi", image: "🦷" }
    ]
  }
];

const $ = (id) => document.getElementById(id);

let studentName = "";
let selectedTheme = "hutan";
let gameIndex = 0;
let questionIndex = 0;
let score = 0;
let correctAnswers = 0;
let selectedPicture = null;
let chosenSyllables = [];
let answered = false;
let teacherLoggedIn = false;
let activeRecordId = null;

let mediaRecorder = null;
let recordingStream = null;
let recordingChunks = [];
let recordingWord = null;
let recordingMimeType = "";
let wordAudioIds = {};

const DB_NAME = "JomKenalAudioDB";
const DB_VERSION = 1;
const DB_STORE = "recordings";

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === screenId;
    screen.hidden = !active;
    screen.classList.toggle("active", active);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
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
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
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
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "jk-" + Date.now() + "-" +
    Math.random().toString(36).slice(2);
}

function savePlayer() {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({
      name: studentName,
      theme: selectedTheme
    }));
  } catch {
    // Permainan masih boleh diteruskan.
  }
}

function restorePlayer() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYER_KEY) || "null");

    if (saved && typeof saved === "object") {
      if (typeof saved.name === "string" && $("studentName")) {
        $("studentName").value = saved.name;
      }

      const validThemes = [
        "hutan", "space", "garden", "underwater", "fantasy"
      ];

      if (validThemes.includes(saved.theme)) {
        selectedTheme = saved.theme === "fantasy"
          ? "hutan"
          : saved.theme;
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
    const selected = button.dataset.theme === theme;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  savePlayer();
}

function startMission() {
  const name = $("studentName").value.trim();

  if (!name) {
    setMessage("homeMessage", "Masukkan nama kamu dahulu ya! 😊");
    $("studentName").focus();
    return;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setMessage("homeMessage", "Tunggu rakaman sebelumnya selesai dahulu.");
    return;
  }

  studentName = name;
  gameIndex = 0;
  questionIndex = 0;
  score = 0;
  correctAnswers = 0;
  activeRecordId = makeId();
  wordAudioIds = {};

  savePlayer();

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
    `${((gameIndex * 5 + questionIndex) / 15) * 100}%`;

  $("gameContent").replaceChildren();
  setMessage("gameMessage", "");

  $("checkAnswerBtn").hidden = false;
  $("checkAnswerBtn").disabled = false;
  $("nextQuestionBtn").hidden = true;

  if (gameIndex === 0) renderPictureQuestion(item);
  if (gameIndex === 1) renderSyllableQuestion(item);
  if (gameIndex === 2) renderReadingQuestion(item);
}

function renderPictureQuestion(item) {
  const container = $("gameContent");

  const prompt = createElement("div", "activity-prompt");
  prompt.style.textAlign = "center";

  const picture = createElement("div", "target-picture", "🔎");
  picture.style.fontSize = "3rem";

  const listen = createElement(
    "button", "primary-button", "🔊 Dengar perkataan: " + item.word
  );
  listen.type = "button";
  listen.addEventListener("click", () => speak(item.word));

  prompt.append(picture, listen);
  container.append(prompt);

  const choices = createElement("div", "picture-choices");
  choices.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:14px;margin-top:24px;";

  item.choices.forEach((emoji) => {
    const button = createElement("button", "picture-choice", emoji);
    button.type = "button";
    button.style.cssText =
      "min-height:115px;font-size:3rem;border:3px solid #e5dcf8;border-radius:20px;background:#fff8fd;";

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
  image.style.cssText =
    "font-size:4rem;text-align:center;margin-bottom:10px;";
  container.append(image);

  const instruction = createElement(
    "p",
    "",
    "Dengar suku kata, kemudian tekan mengikut urutan untuk membentuk perkataan."
  );
  instruction.style.cssText = "text-align:center;line-height:1.6;";
  container.append(instruction);

  const syllableButtons = createElement("div", "syllable-buttons");
  syllableButtons.style.cssText =
    "display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:22px 0;";

  const shuffled = [...item.syllables].sort(() => Math.random() - 0.5);

  shuffled.forEach((syllable) => {
    const button = createElement("button", "syllable-button", syllable);
    button.type = "button";
    button.style.cssText =
      "min-width:90px;min-height:75px;border:3px solid #d8c7ff;border-radius:18px;background:#f5f0ff;color:#352653;font-size:1.6rem;font-weight:900;";

    button.addEventListener("click", () => {
      if (answered || chosenSyllables.length >= item.syllables.length) return;

      speak(syllable);
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

  const listen = createElement(
    "button", "secondary-button", "🔊 Dengar perkataan penuh"
  );
  listen.type = "button";
  listen.addEventListener("click", () => speak(item.word));

  const reset = createElement("button", "secondary-button", "↺ Cuba semula");
  reset.type = "button";
  reset.addEventListener("click", renderQuestion);

  actions.append(listen, reset);
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
  image.style.cssText =
    "font-size:5rem;text-align:center;margin:10px 0;";
  container.append(image);

  const word = createElement("div", "reading-word", item.word);
  word.style.cssText =
    "font-size:2.7rem;font-weight:900;text-align:center;letter-spacing:2px;margin:18px 0;";
  container.append(word);

  const listen = createElement(
    "button", "secondary-button", "🔊 Dengar contoh sebutan"
  );
  listen.type = "button";
  listen.style.display = "block";
  listen.style.margin = "12px auto";
  listen.addEventListener("click", () => speak(item.word));
  container.append(listen);

  const note = createElement(
    "p", "",
    "Dengar perkataan, baca dengan jelas, kemudian rakam bacaan kamu."
  );
  note.style.cssText = "text-align:center;line-height:1.6;";
  container.append(note);

  const recordingPanel = createElement("section", "word-recording-panel");
  recordingPanel.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;margin:16px 0;border:2px solid #d8c7ff;border-radius:18px;";

  const label = createElement("strong", "", "🎙️ Rakaman perkataan: " + item.word);
  const recordButton = createElement("button", "primary-button", "🔴 Mula merakam");
  const stopButton = createElement("button", "secondary-button", "⏹️ Hentikan rakaman");
  const playButton = createElement("button", "secondary-button", "▶️ Dengar rakaman saya");
  const message = createElement("p", "", "");
  message.setAttribute("aria-live", "polite");

  recordButton.type = stopButton.type = playButton.type = "button";
  stopButton.disabled = true;
  playButton.disabled = !wordAudioIds[item.word];

  recordButton.addEventListener("click", () =>
    startWordRecording(item.word, recordButton, stopButton, playButton, message)
  );

  stopButton.addEventListener("click", () =>
    stopWordRecording(stopButton, recordButton, playButton, message)
  );

  playButton.addEventListener("click", async () => {
    const audioId = wordAudioIds[item.word];
    if (!audioId) return;

    try {
      const blob = await getAudio(audioId);

      if (!blob) {
        message.textContent = "Rakaman tidak ditemui pada peranti ini.";
        return;
      }

      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {
        message.textContent = "Rakaman tidak dapat dimainkan.";
      });
    } catch {
      message.textContent = "Rakaman tidak dapat dibuka.";
    }
  });

  recordingPanel.append(
    label, recordButton, stopButton, playButton, message
  );
  container.append(recordingPanel);

  const readButton = createElement(
    "button", "primary-button", "📖 Saya sudah membaca"
  );
  readButton.type = "button";

  readButton.addEventListener("click", () => {
    if (answered) return;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      setMessage("gameMessage", "Hentikan rakaman dahulu sebelum meneruskan.");
      return;
    }

    answered = true;
    score++;
    correctAnswers++;
    $("scoreValue").textContent = score;
    setMessage("gameMessage", "Bagus! Kamu telah mencuba membaca. ⭐");
    speak("Bagus! " + item.word);
    showNextButton();
  });

  container.append(readButton);
}

async function startWordRecording(word, recordButton, stopButton, playButton, message) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    message.textContent =
      "Rakaman tidak disokong. Gunakan pelayar terkini melalui laman HTTPS.";
    return;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    message.textContent = "Hentikan rakaman yang sedang berjalan dahulu.";
    return;
  }

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    recordingWord = word;

    const options = {};
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      options.mimeType = "audio/webm;codecs=opus";
    }

    mediaRecorder = new MediaRecorder(recordingStream, options);
    recordingMimeType = mediaRecorder.mimeType || "audio/webm";

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) recordingChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", async () => {
      const blob = new Blob(recordingChunks, { type: recordingMimeType });
      const audioId = `${activeRecordId}::${recordingWord}`;

      try {
        await saveAudio(audioId, blob);
        wordAudioIds[recordingWord] = audioId;
        message.textContent = `Rakaman untuk “${recordingWord}” telah disimpan pada peranti ini.`;
        playButton.disabled = false;
      } catch {
        message.textContent = "Rakaman selesai tetapi gagal disimpan.";
      }

      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
      }

      recordButton.disabled = false;
      stopButton.disabled = true;
      saveCurrentWordRecordings();
    });

    mediaRecorder.start();

    recordButton.disabled = true;
    stopButton.disabled = false;
    playButton.disabled = true;
    message.textContent = `Sedang merakam perkataan “${word}”.`;
  } catch {
    message.textContent =
      "Mikrofon tidak dapat diakses. Semak kebenaran mikrofon pada pelayar.";
  }
}

function stopWordRecording(stopButton, recordButton, playButton, message) {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    stopButton.disabled = true;
    message.textContent = "Sedang menyimpan rakaman...";
    mediaRecorder.stop();
  }
}

function checkAnswer() {
  if (answered) return;

  const item = games[gameIndex].words[questionIndex];
  let correct = false;

  if (gameIndex === 0) {
    if (selectedPicture === null) {
      setMessage("gameMessage", "Pilih satu gambar dahulu ya. 😊");
      return;
    }

    correct = selectedPicture === item.image;
  } else if (gameIndex === 1) {
    if (chosenSyllables.length !== item.syllables.length) {
      setMessage("gameMessage", "Tekan semua suku kata mengikut urutan. 😊");
      return;
    }

    correct = chosenSyllables.join("") === item.word;
  }

  answered = true;

  if (correct) {
    score++;
    correctAnswers++;
    setMessage("gameMessage", "Betul! Syabas, hebatnya kamu! ⭐");
    speak("Betul! " + item.word);
  } else {
    setMessage("gameMessage", "Belum tepat. Dengar sebutan dan cuba lagi.");
    speak(item.word);
  }

  $("scoreValue").textContent = score;
  $("checkAnswerBtn").disabled = true;
  showNextButton();
}

function showNextButton() {
  $("checkAnswerBtn").hidden = true;
  $("nextQuestionBtn").hidden = false;

  const lastQuestion = questionIndex === games[gameIndex].words.length - 1;
  const lastGame = gameIndex === games.length - 1;

  $("nextQuestionBtn").textContent = lastQuestion
    ? (lastGame ? "Lihat Keputusan 🏆" : "Misi Seterusnya →")
    : "Soalan Seterusnya →";
}

function nextQuestion() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setMessage("gameMessage", "Hentikan rakaman dahulu sebelum meneruskan.");
    return;
  }

  if (questionIndex < games[gameIndex].words.length - 1) {
    questionIndex++;
    renderQuestion();
    return;
  }

  if (gameIndex < games.length - 1) {
    gameIndex++;
    questionIndex = 0;
    renderQuestion();
    return;
  }

  finishMission();
}

function saveCurrentWordRecordings() {
  const records = loadRecords();
  const existing = records.find((record) => record.id === activeRecordId);

  const record = {
    id: activeRecordId,
    name: studentName,
    score,
    correctAnswers,
    date: new Date().toISOString(),
    theme: selectedTheme,
    wordRecordings: { ...wordAudioIds }
  };

  if (existing) {
    Object.assign(existing, record);
  } else {
    records.push(record);
  }

  saveRecords(records);
}

function finishMission() {
  saveCurrentWordRecordings();

  $("resultStudentName").textContent = "Syabas, " + studentName + "!";
  $("finalScore").textContent = score + " / 15";

  const oldPanel = $("recordingMessage")?.parentElement;
  if (oldPanel) oldPanel.hidden = true;

  showScreen("resultScreen");
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
    const heading = createElement("h3", "", record.name || "Murid");
    const date = record.date
      ? new Date(record.date).toLocaleString("ms-MY")
      : "Tarikh tidak tersedia";

    details.append(
      heading,
      createElement(
        "p", "",
        `${date} · Skor: ${record.score}/15 · Jawapan betul: ${record.correctAnswers}/15`
      )
    );

    const recordings = record.wordRecordings || {};
    const words = games[2].words;

    const section = createElement("div", "recorded-words");
    section.append(createElement("h4", "", "Rakaman bacaan Misi 3"));

    for (const item of words) {
      const wordRow = createElement("div", "recorded-word-row");
      wordRow.style.cssText =
        "padding:10px;margin:8px 0;border-radius:12px;background:#f7f3ff;";

      wordRow.append(createElement("strong", "", item.word));

      const audioId = recordings[item.word];

      if (audioId) {
        try {
          const blob = await getAudio(audioId);

          if (blob) {
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.preload = "none";
            audio.src = URL.createObjectURL(blob);
            wordRow.append(audio);
          } else {
            wordRow.append(createElement("p", "", "Rakaman tiada pada peranti ini."));
          }
        } catch {
          wordRow.append(createElement("p", "", "Rakaman tidak dapat dibuka."));
        }
      } else {
        wordRow.append(createElement("p", "", "Belum ada rakaman."));
      }

      section.append(wordRow);
    }

    details.append(section);

    const badge = createElement("div", "record-score", `${record.score}/15`);
    card.append(details, badge);
    list.append(card);
  }
}

function returnHome() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setMessage("gameMessage", "Hentikan rakaman dahulu.");
    return;
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

  $("finishMissionBtn").addEventListener("click", () => {
    saveCurrentWordRecordings();
    showScreen("homeScreen");
  });

  $("refreshRecordsBtn").addEventListener("click", renderTeacherRecords);

  $("teacherPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") teacherLogin();
  });

  document.querySelectorAll(".theme-option").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
    });
  });
}

function initialise() {
  bindEvents();
  restorePlayer();
}

document.addEventListener("DOMContentLoaded", initialise);
