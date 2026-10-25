/* Misi Bijak KV+KV — prototaip pendidikan.
   Rakaman dan rekod dalam versi ini tidak dihantar ke pelayan. */
"use strict";

const WORDS = [
  { word: "baju", syllables: ["ba", "ju"], image: "👕", meaning: "baju" },
  { word: "buku", syllables: ["bu", "ku"], image: "📘", meaning: "buku" },
  { word: "guli", syllables: ["gu", "li"], image: "🔵", meaning: "guli" },
  { word: "meja", syllables: ["me", "ja"], image: "🪑", meaning: "meja" },
  { word: "mata", syllables: ["ma", "ta"], image: "👀", meaning: "mata" },
  { word: "sapu", syllables: ["sa", "pu"], image: "🧹", meaning: "sapu" },
  { word: "susu", syllables: ["su", "su"], image: "🥛", meaning: "susu" },
  { word: "topi", syllables: ["to", "pi"], image: "🧢", meaning: "topi" },
  { word: "roda", syllables: ["ro", "da"], image: "🛞", meaning: "roda" },
  { word: "kaki", syllables: ["ka", "ki"], image: "🦶", meaning: "kaki" },
  { word: "kuda", syllables: ["ku", "da"], image: "🐴", meaning: "kuda" },
  { word: "bola", syllables: ["bo", "la"], image: "⚽", meaning: "bola" },
  { word: "pipi", syllables: ["pi", "pi"], image: "😊", meaning: "pipi" }
];

const $ = (selector) => document.querySelector(selector);
const homeView = $("#homeView");
const gameView = $("#gameView");
const teacherView = $("#teacherView");
const gameContent = $("#gameContent");
const feedback = $("#feedback");

let currentGame = "";
let roundIndex = 0;
let roundItems = [];
let currentRecording = null;
let mediaRecorder = null;
let audioChunks = [];
let sessionScore = 0;
let correctAnswers = 0;
let recordingCount = 0;
let history = safeLoadHistory();

function safeLoadHistory() {
  try { return JSON.parse(localStorage.getItem("kvkvPrototypeHistory") || "[]"); }
  catch { return []; }
}
function saveHistory() {
  try { localStorage.setItem("kvkvPrototypeHistory", JSON.stringify(history.slice(-100))); }
  catch { /* Storage might be disabled; the session still works. */ }
}
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function speak(text) {
  if (!("speechSynthesis" in window)) {
    announce("Audio model tidak disokong oleh pelayar ini. Cuba pelayar yang lain.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ms-MY";
  utterance.rate = 0.78;
  utterance.pitch = 1.12;
  const voices = window.speechSynthesis.getVoices();
  const malayVoice = voices.find(v => /^ms(-|_)?/i.test(v.lang) || /Malay|Bahasa Melayu/i.test(v.name));
  if (malayVoice) utterance.voice = malayVoice;
  utterance.onerror = () => announce("Audio tidak dapat dimainkan. Semak tetapan bunyi peranti.");
  window.speechSynthesis.speak(utterance);
}
function announce(message, type = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}
function showHome() {
  stopPlaybackAndRecording();
  homeView.classList.remove("hidden");
  gameView.classList.add("hidden");
  teacherView.classList.add("hidden");
  updateProgress();
}
function stopPlaybackAndRecording() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (mediaRecorder && mediaRecorder.state === "recording") {
    try { mediaRecorder.stop(); } catch {}
  }
}
function updateProgress() {
  $("#homeScore").textContent = sessionScore;
  $("#gameScore").textContent = sessionScore;
  $("#progressFill").style.width = `${Math.min(100, sessionScore)}%`;
  $("#progressMessage").textContent = sessionScore >= 100
    ? "Hebat! Kamu sudah mengumpul banyak mata. Teruskan berlatih!"
    : "Selesaikan aktiviti untuk mengumpul mata.";
}
function logEvent(label, detail, points = 0) {
  sessionScore += points;
  history.push({ label, detail, points, time: new Date().toLocaleString("ms-MY") });
  saveHistory();
  updateProgress();
}
function startGame(game) {
  stopPlaybackAndRecording();
  currentGame = game;
  roundIndex = 0;
  feedback.textContent = "";
  feedback.className = "feedback";
  homeView.classList.add("hidden");
  teacherView.classList.add("hidden");
  gameView.classList.remove("hidden");
  const config = {
    speak: ["MISI 1", "Dengar, Sebut dan Rakam"],
    syllable: ["MISI 2", "Cantum Suku Kata"],
    picture: ["MISI 3", "Cari Gambar dan Jawab"]
  }[game];
  $("#gameKicker").textContent = config[0];
  $("#gameTitle").textContent = config[1];
  roundItems = shuffle(WORDS).slice(0, 5);
  renderRound();
}
function currentWord() { return roundItems[roundIndex % roundItems.length]; }
function nextRound() {
  roundIndex++;
  if (roundIndex >= roundItems.length) {
    gameContent.innerHTML = `
      <div class="big-picture">🏆</div>
      <h2 class="target-word">Misi selesai!</h2>
      <p class="activity-help">Syabas! Kamu sudah mencuba ${roundItems.length} soalan.</p>
      <div class="center-row"><button class="button button-primary" id="replayButton" type="button">Main lagi 🔁</button><button class="button button-light" id="homeFromFinish" type="button">Menu utama</button></div>`;
    $("#replayButton").addEventListener("click", () => startGame(currentGame));
    $("#homeFromFinish").addEventListener("click", showHome);
    announce("Syabas! Teruskan usaha kamu.", "good");
    return;
  }
  feedback.textContent = "";
  feedback.className = "feedback";
  renderRound();
}
function renderRound() {
  updateProgress();
  if (currentGame === "speak") renderSpeak();
  if (currentGame === "syllable") renderSyllable();
  if (currentGame === "picture") renderPicture();
}
function renderSpeak() {
  const item = currentWord();
  gameContent.innerHTML = `
    <div class="activity-top"><span>SOALAN ${roundIndex + 1} DARIPADA ${roundItems.length}</span><span>Dengar dengan teliti 👂</span></div>
    <div class="big-picture" aria-label="Gambar ${item.word}">${item.image}</div>
    <div class="target-word">${item.word}</div>
    <p class="activity-help">Dengar sebutan, kemudian sebut perkataan ini.</p>
    <div class="center-row"><button class="button button-primary" id="listenButton" type="button">🔊 Dengar perkataan</button></div>
    <div class="recording-panel">
      <p><strong>Giliran kamu!</strong> Tekan rakam dan sebut perkataan.</p>
      <div class="center-row"><button class="button button-primary" id="recordButton" type="button">🎙️ Mula rakam</button><button class="button button-light" id="playRecordingButton" type="button" disabled>▶ Main rakaman</button></div>
      <p id="recordingStatus" class="recording-status">Rakaman hanya berada pada peranti ini dalam prototaip.</p>
      <audio id="recordedAudio" controls class="hidden"></audio>
    </div>
    <div class="center-row"><button class="button button-light" id="skipSpeak" type="button">Seterusnya →</button></div>`;
  $("#listenButton").addEventListener("click", () => speak(item.word));
  $("#recordButton").addEventListener("click", toggleRecording);
  $("#playRecordingButton").addEventListener("click", () => {
    const audio = $("#recordedAudio");
    if (audio.src) audio.play();
  });
  $("#skipSpeak").addEventListener("click", () => {
    logEvent("Dengar, Sebut dan Rakam", `Latihan perkataan: ${item.word}`, 0);
    nextRound();
  });
}
async function toggleRecording() {
  const button = $("#recordButton");
  const status = $("#recordingStatus");
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    button.textContent = "🎙️ Rakam semula";
    status.textContent = "Rakaman dihentikan.";
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    status.textContent = "Rakaman tidak disokong. Gunakan HTTPS atau pelayar yang menyokong mikrofon.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => { if (event.data.size > 0) audioChunks.push(event.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      const audio = $("#recordedAudio");
      audio.src = url;
      audio.classList.remove("hidden");
      $("#playRecordingButton").disabled = false;
      recordingCount++;
      status.textContent = "Rakaman tersedia untuk dimainkan semula pada peranti ini.";
      logEvent("Rakaman suara", `Rakaman setempat untuk perkataan: ${currentWord().word}`, 0);
      stream.getTracks().forEach(track => track.stop());
      updateTeacherDashboard();
    };
    mediaRecorder.start();
    button.textContent = "⏹ Hentikan rakaman";
    status.textContent = "Sedang merakam… Sebut perkataan dengan jelas.";
  } catch (error) {
    status.textContent = "Mikrofon tidak dapat digunakan. Semak kebenaran mikrofon pada pelayar.";
  }
}
function renderSyllable() {
  const item = currentWord();
  const options = shuffle([item.syllables[0], item.syllables[1], ...shuffle(WORDS.filter(w => w.word !== item.word).map(w => w.syllables[0])).slice(0, 2)]);
  let first = "";
  let second = "";
  gameContent.innerHTML = `
    <div class="activity-top"><span>SOALAN ${roundIndex + 1} DARIPADA ${roundItems.length}</span><span>Cantumkan dua bahagian 🧩</span></div>
    <div class="big-picture">${item.image}</div>
    <p class="activity-help">Pilih suku kata pertama, kemudian suku kata kedua untuk membentuk perkataan.</p>
    <div class="syllable-slots"><div class="syllable-slot" id="slotOne">?</div><span class="plus">+</span><div class="syllable-slot" id="slotTwo">?</div></div>
    <div class="syllable-bank" id="syllableBank"></div>
    <div class="center-row"><button class="button button-light" id="resetSyllables" type="button">↺ Cuba semula</button><button class="button button-primary" id="checkSyllables" type="button">Semak jawapan</button></div>`;
  // Ensure the correct syllables are available, alongside distractors.
  const choices = shuffle([...new Set([item.syllables[0], item.syllables[1], ...options])]).slice(0, 6);
  if (!choices.includes(item.syllables[0])) choices[0] = item.syllables[0];
  if (!choices.includes(item.syllables[1])) choices[1] = item.syllables[1];
  const bank = $("#syllableBank");
  choices.forEach(syllable => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "syllable-chip"; btn.textContent = syllable;
    btn.addEventListener("click", () => {
      if (!first) { first = syllable; $("#slotOne").textContent = syllable; }
      else if (!second) { second = syllable; $("#slotTwo").textContent = syllable; }
      else { announce("Tekan Cuba semula jika mahu menukar jawapan."); }
    });
    bank.appendChild(btn);
  });
  $("#resetSyllables").addEventListener("click", () => { first = ""; second = ""; $("#slotOne").textContent = "?"; $("#slotTwo").textContent = "?"; announce(""); });
  $("#checkSyllables").addEventListener("click", () => {
    if (!first || !second) { announce("Pilih dua suku kata dahulu ya."); return; }
    const answer = first + second;
    const isCorrect = answer === item.word;
    if (isCorrect) {
      correctAnswers++; logEvent("Cantum Suku Kata", `${first} + ${second} = ${answer}`, 10);
      announce("Betul! Hebat! ⭐", "good");
      speak(item.word);
      $("#checkSyllables").disabled = true;
      setTimeout(nextRound, 1100);
    } else {
      logEvent("Cubaan cantum suku kata", `Jawapan belum tepat untuk gambar ${item.word}`, 0);
      announce("Belum tepat. Cuba lihat gambar dan pilih lagi.", "try");
    }
    updateTeacherDashboard();
  });
}
function renderPicture() {
  const item = currentWord();
  const choices = shuffle([item, ...shuffle(WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
  gameContent.innerHTML = `
    <div class="activity-top"><span>SOALAN ${roundIndex + 1} DARIPADA ${roundItems.length}</span><span>Baca dan pilih gambar 🖼️</span></div>
    <p class="activity-help">Perkataan apakah ini? Tekan 🔊 untuk mendengar.</p>
    <div class="target-word">${item.word}</div>
    <div class="center-row"><button id="listenPictureWord" class="button button-light" type="button">🔊 Dengar perkataan</button></div>
    <div class="choice-grid" id="pictureChoices"></div>`;
  $("#listenPictureWord").addEventListener("click", () => speak(item.word));
  const grid = $("#pictureChoices");
  choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "choice";
    btn.innerHTML = `<span style="display:block;font-size:42px">${choice.image}</span><span>${choice.word}</span>`;
    btn.addEventListener("click", () => {
      [...grid.querySelectorAll("button")].forEach(b => b.disabled = true);
      if (choice.word === item.word) {
        btn.classList.add("correct");
        correctAnswers++; logEvent("Cari Gambar dan Jawab", `Betul: ${item.word}`, 10);
        announce("Ya, betul! Kamu berjaya! 🌟", "good");
        speak(item.word);
        setTimeout(nextRound, 1000);
      } else {
        btn.classList.add("wrong");
        logEvent("Cari Gambar dan Jawab", `Pilihan belum tepat bagi ${item.word}`, 0);
        announce("Belum tepat. Jawapan yang betul ialah " + item.word + ". Mari cuba soalan seterusnya.", "try");
        const correctBtn = [...grid.querySelectorAll("button")].find(b => b.textContent.includes(item.word));
        if (correctBtn) correctBtn.classList.add("correct");
        setTimeout(nextRound, 1600);
      }
      updateTeacherDashboard();
    });
    grid.appendChild(btn);
  });
}
function showTeacher() {
  stopPlaybackAndRecording();
  homeView.classList.add("hidden");
  gameView.classList.add("hidden");
  teacherView.classList.remove("hidden");
  updateTeacherDashboard();
}
function updateTeacherDashboard() {
  $("#teacherScore").textContent = sessionScore;
  $("#teacherCorrect").textContent = correctAnswers;
  $("#teacherRecordings").textContent = recordingCount;
  const list = $("#historyList");
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = '<p class="muted">Belum ada rekod. Cuba satu permainan dahulu.</p>';
    return;
  }
  history.slice().reverse().slice(0, 30).forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";
    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.label;
    const detail = document.createElement("small");
    detail.textContent = `${item.detail} • ${item.time}`;
    left.append(title, detail);
    const points = document.createElement("strong");
    points.textContent = `+${item.points} ⭐`;
    row.append(left, points);
    list.appendChild(row);
  });
}
$("#startButton").addEventListener("click", () => startGame("speak"));
document.querySelectorAll("[data-game]").forEach(button => button.addEventListener("click", () => startGame(button.dataset.game)));
$("#backButton").addEventListener("click", showHome);
$("#teacherButton").addEventListener("click", showTeacher);
$("#teacherBackButton").addEventListener("click", showHome);
$("#clearHistory").addEventListener("click", () => {
  if (!confirm("Padam semua rekod prototaip yang disimpan pada peranti ini?")) return;
  history = []; sessionScore = 0; correctAnswers = 0; recordingCount = 0;
  saveHistory(); updateTeacherDashboard(); updateProgress();
});
$("#avatarSelect").addEventListener("change", event => {
  $("#heroAvatar").textContent = event.target.value;
  try { localStorage.setItem("kvkvAvatar", event.target.value); } catch {}
});
$("#themeButton").addEventListener("click", () => {
  const themes = ["", "theme-sky", "theme-peach"];
  const current = themes.findIndex(theme => document.body.className === theme);
  document.body.className = themes[(current + 1) % themes.length];
});
try {
  const savedAvatar = localStorage.getItem("kvkvAvatar");
  if (savedAvatar) { $("#avatarSelect").value = savedAvatar; $("#heroAvatar").textContent = savedAvatar; }
} catch {}
updateProgress();
