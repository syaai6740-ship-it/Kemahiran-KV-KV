"use strict";

/* =========================================
   JOM KENAL: PENGEMBARAAN DUNIA KATA
   Bahasa Melayu Pemulihan Khas Tahun 1
========================================= */

const $ = (selector) => document.querySelector(selector);

const homeScreen = $("#homeScreen");
const gameScreen = $("#gameScreen");
const resultScreen = $("#resultScreen");
const activityContent = $("#activityContent");
const feedback = $("#feedback");
const checkBtn = $("#checkBtn");
const nextBtn = $("#nextBtn");
const themeSelect = $("#themeSelect");

let currentMission = 1;
let questionIndex = 0;
let selectedPicture = null;
let selectedSyllables = [];
let answered = false;
let currentScore = 0;
let totalQuestions = 0;
let completedMissions = new Set();
let missionScores = {};
let studentName = "Murid";
let recordingState = null;
let recordingUrl = null;
let recordingBlob = null;
let recordingChunks = [];
let isRecording = false;
let recordedThisQuestion = false;

/* Perkataan dan gambar menggunakan emoji sebagai ilustrasi.
   Tiada label perkataan dipaparkan di bawah pilihan gambar. */

const missionData = {
  1: {
    title: "Kenal dan Baca",
    description: "Baca perkataan yang dipaparkan, kemudian pilih gambar yang betul.",
    questions: [
      {
        word: "sabun",
        answer: "🧼",
        options: ["🧼", "🧹", "👕"],
        explanation: "Betul! Sabun digunakan untuk membersihkan badan dan tangan."
      },
      {
        word: "sapu",
        answer: "🧹",
        options: ["🧺", "🧹", "🧼"],
        explanation: "Betul! Penyapu digunakan untuk menyapu lantai."
      },
      {
        word: "baju",
        answer: "👕",
        options: ["🧽", "👕", "🪥"],
        explanation: "Betul! Baju perlu dijaga supaya bersih."
      }
    ]
  },

  2: {
    title: "Cantum dan Baca",
    description: "Perhatikan gambar. Pilih suku kata yang betul untuk mencantumkan perkataan.",
    questions: [
      {
        picture: "🧼",
        clue: "Apakah nama benda ini?",
        syllables: ["sa", "bun"],
        choices: ["sa", "bu", "bun", "pu"],
        answer: "sabun",
        explanation: "Bagus! sa + bun membentuk perkataan sabun."
      },
      {
        picture: "👕",
        clue: "Apakah nama benda ini?",
        syllables: ["ba", "ju"],
        choices: ["ba", "ju", "bu", "su"],
        answer: "baju",
        explanation: "Bagus! ba + ju membentuk perkataan baju."
      },
      {
        picture: "🧹",
        clue: "Apakah nama benda ini?",
        syllables: ["sa", "pu"],
        choices: ["sa", "pu", "bu", "pi"],
        answer: "sapu",
        explanation: "Bagus! sa + pu membentuk perkataan sapu."
      }
    ]
  },

  3: {
    title: "Baca dan Faham",
    description: "Fahami soalan dan pilih gambar yang menjawab soalan tersebut.",
    questions: [
      {
        question: "Apakah yang digunakan untuk mencuci tangan?",
        answer: "🧼",
        options: ["🧼", "👕", "🧹"],
        explanation: "Betul! Sabun digunakan untuk mencuci tangan."
      },
      {
        question: "Apakah yang digunakan untuk menyapu lantai?",
        answer: "🧹",
        options: ["🪥", "🧹", "🧺"],
        explanation: "Betul! Penyapu digunakan untuk menyapu lantai."
      },
      {
        question: "Apakah yang kita pakai pada badan?",
        answer: "👕",
        options: ["🧽", "🧼", "👕"],
        explanation: "Betul! Baju dipakai pada badan."
      }
    ]
  },

  4: {
    title: "Cabaran Baca Sendiri",
    description: "Baca perkataan dengan suara sendiri. Rakam dan dengar semula bacaan anda.",
    questions: [
      {
        word: "sabun"
      },
      {
        word: "baju"
      },
      {
        word: "sapu"
      }
    ]
  }
};

/* Tukar tema */
themeSelect.addEventListener("change", () => {
  document.body.dataset.theme = themeSelect.value;
});

/* Navigasi */
$("#startBtn").addEventListener("click", () => {
  studentName = $("#studentName").value.trim() || "Murid";
  $("#studentGreeting").textContent = `Selamat belajar, ${studentName}!`;
  showScreen("homeScreen");
  updateHomeProgress();
});

$("#homeLink").addEventListener("click", (event) => {
  event.preventDefault();
  goHome();
});

$("#backHomeBtn").addEventListener("click", goHome);
$("#chooseMissionBtn").addEventListener("click", goHome);
$("#resultHomeBtn").addEventListener("click", goHome);

document.querySelectorAll("[data-mission]").forEach((button) => {
  button.addEventListener("click", () => {
    studentName = $("#studentName").value.trim() || studentName;
    $("#studentGreeting").textContent = `Selamat belajar, ${studentName}!`;
    startMission(Number(button.dataset.mission));
  });
});

$("#retryBtn").addEventListener("click", () => {
  startMission(currentMission);
});

checkBtn.addEventListener("click", handleCheck);
nextBtn.addEventListener("click", handleNext);

/* Paparan skrin */
function showScreen(screenId) {
  [homeScreen, gameScreen, resultScreen].forEach((screen) => {
    screen.classList.add("hidden");
  });

  $(`#${screenId}`).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  stopRecordingIfNeeded();
  clearRecordingUrl();
  showScreen("homeScreen");
  updateHomeProgress();
}

/* Mulakan misi */
function startMission(missionNumber) {
  stopRecordingIfNeeded();
  clearRecordingUrl();

  currentMission = missionNumber;
  questionIndex = 0;
  currentScore = 0;
  totalQuestions = missionData[missionNumber].questions.length;
  selectedPicture = null;
  selectedSyllables = [];
  answered = false;
  recordedThisQuestion = false;

  $("#missionEyebrow").textContent = `MISI ${missionNumber}`;
  $("#missionTitle").textContent = missionData[missionNumber].title;
  $("#missionDescription").textContent = missionData[missionNumber].description;
  $("#missionCount").textContent = `${missionNumber}/4`;

  showScreen("gameScreen");
  renderQuestion();
}

/* Papar soalan mengikut misi */
function renderQuestion() {
  stopRecordingIfNeeded();
  clearRecordingUrl();

  selectedPicture = null;
  selectedSyllables = [];
  answered = false;
  recordedThisQuestion = false;

  feedback.className = "feedback hidden";
  feedback.textContent = "";
  checkBtn.classList.remove("hidden");
  nextBtn.classList.add("hidden");
  checkBtn.disabled = false;

  const question = missionData[currentMission].questions[questionIndex];

  $("#questionProgressText").textContent =
    `Soalan ${questionIndex + 1} daripada ${totalQuestions}`;

  $("#questionProgressBar").style.width =
    `${(questionIndex / totalQuestions) * 100}%`;

  if (currentMission === 1) {
    renderMissionOne(question);
  } else if (currentMission === 2) {
    renderMissionTwo(question);
  } else if (currentMission === 3) {
    renderMissionThree(question);
  } else if (currentMission === 4) {
    renderMissionFour(question);
  }
}

/* MISI 1: Perkataan dan pilihan gambar */
function renderMissionOne(question) {
  activityContent.innerHTML = `
    <h2 class="activity-prompt">Baca perkataan ini.</h2>
    <div class="reading-word">${question.word}</div>
    <p class="activity-instruction">Pilih satu gambar yang sepadan dengan perkataan.</p>
    <div class="picture-choices" id="pictureChoices">
      ${question.options.map((emoji, index) => `
        <button
          type="button"
          class="picture-choice"
          data-choice="${escapeHTML(emoji)}"
          aria-label="Pilihan gambar ${index + 1}">
          <span class="picture-emoji" aria-hidden="true">${emoji}</span>
        </button>
      `).join("")}
    </div>
  `;

  attachPictureChoiceEvents();
}

/* MISI 2: Gambar dan pilihan suku kata */
function renderMissionTwo(question) {
  activityContent.innerHTML = `
    <h2 class="activity-prompt">Cantumkan suku kata.</h2>
    <p class="activity-instruction">${question.clue}</p>
    <div class="target-picture" role="img" aria-label="Gambar petunjuk">
      ${question.picture}
    </div>

    <div class="syllable-workspace">
      <div class="syllable-slots">
        <div class="syllable-slot" id="slot0">?</div>
        <span class="syllable-plus">+</span>
        <div class="syllable-slot" id="slot1">?</div>
      </div>

      <p class="activity-instruction">Pilih suku kata mengikut urutan.</p>

      <div class="syllable-buttons" id="syllableChoices">
        ${question.choices.map((syllable) => `
          <button
            type="button"
            class="syllable-button"
            data-syllable="${escapeHTML(syllable)}">
            ${syllable}
          </button>
        `).join("")}
      </div>

      <div class="syllable-actions">
        <button type="button" id="undoSyllableBtn" class="secondary-btn">
          ↩ Buang Pilihan
        </button>
        <button type="button" id="resetSyllablesBtn" class="secondary-btn">
          Ulang Semula
        </button>
      </div>
    </div>
  `;

  document.querySelectorAll("[data-syllable]").forEach((button) => {
    button.addEventListener("click", () => {
      if (answered || selectedSyllables.length >= 2) return;

      const syllable = button.dataset.syllable;
      selectedSyllables.push(syllable);
      button.classList.add("selected");
      button.disabled = true;

      updateSyllableSlots();
    });
  });

  $("#undoSyllableBtn").addEventListener("click", () => {
    if (answered || selectedSyllables.length === 0) return;

    selectedSyllables.pop();
    updateSyllableButtons();
    updateSyllableSlots();
  });

  $("#resetSyllablesBtn").addEventListener("click", () => {
    if (answered) return;
    selectedSyllables = [];
    updateSyllableButtons();
    updateSyllableSlots();
  });
}

function updateSyllableSlots() {
  $("#slot0").textContent = selectedSyllables[0] || "?";
  $("#slot1").textContent = selectedSyllables[1] || "?";
}

function updateSyllableButtons() {
  document.querySelectorAll("[data-syllable]").forEach((button) => {
    button.disabled = false;
    button.classList.remove("selected");
  });

  selectedSyllables.forEach((syllable, index) => {
    const matchingButtons = Array.from(
      document.querySelectorAll("[data-syllable]")
    ).filter((button) => button.dataset.syllable === syllable);

    const button = matchingButtons.find((item) => !item.disabled);

    if (button) {
      button.disabled = true;
      button.classList.add("selected");
    }
  });
}

/* MISI 3: Soalan dan gambar tanpa label perkataan */
function renderMissionThree(question) {
  activityContent.innerHTML = `
    <h2 class="activity-prompt">${question.question}</h2>
    <p class="activity-instruction">Pilih satu gambar sebagai jawapan.</p>

    <div class="picture-choices" id="pictureChoices">
      ${question.options.map((emoji, index) => `
        <button
          type="button"
          class="picture-choice"
          data-choice="${escapeHTML(emoji)}"
          aria-label="Pilihan gambar ${index + 1}">
          <span class="picture-emoji" aria-hidden="true">${emoji}</span>
        </button>
      `).join("")}
    </div>
  `;

  attachPictureChoiceEvents();
}

/* Pilihan gambar untuk Misi 1 dan Misi 3 */
function attachPictureChoiceEvents() {
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (answered) return;

      selectedPicture = button.dataset.choice;

      document.querySelectorAll("[data-choice]").forEach((item) => {
        item.classList.remove("selected");
      });

      button.classList.add("selected");
    });
  });
}

/* MISI 4: Bacaan lisan dan rakaman */
function renderMissionFour(question) {
  activityContent.innerHTML = `
    <h2 class="activity-prompt">Baca perkataan dengan suara sendiri.</h2>

    <div class="reading-word">${question.word}</div>

    <div class="recording-panel">
      <div class="recording-microphone" aria-hidden="true">🎙️</div>
      <h3>Ruang Rakaman Suara</h3>
      <p class="activity-instruction">
        Sebut perkataan di atas dengan jelas. Tekan butang rakam untuk bermula.
      </p>

      <div id="recordingStatus" class="recording-status" role="status" aria-live="polite">
        Rakaman belum dimulakan.
      </div>

      <div class="recording-buttons">
        <button type="button" id="startRecordingBtn" class="record-btn">
          🔴 Rakam Suara
        </button>
        <button type="button" id="stopRecordingBtn" class="record-btn stop" disabled>
          ⏹ Berhenti
        </button>
        <button type="button" id="playRecordingBtn" class="record-btn playback" disabled>
          ▶ Dengar Semula
        </button>
        <button type="button" id="downloadRecordingBtn" class="record-btn download" disabled>
          ⬇ Muat Turun
        </button>
      </div>

      <audio id="recordedAudio" class="record-audio hidden" controls></audio>

      <p class="recording-note">
        Benarkan akses mikrofon apabila diminta oleh pelayar.
        Rakaman boleh didengar semula untuk membantu murid dan guru menyemak bacaan.
      </p>
    </div>
  `;

  $("#startRecordingBtn").addEventListener("click", startRecording);
  $("#stopRecordingBtn").addEventListener("click", stopRecording);
  $("#playRecordingBtn").addEventListener("click", playRecording);
  $("#downloadRecordingBtn").addEventListener("click", downloadRecording);

  checkBtn.textContent = "Saya Sudah Membaca";
  checkBtn.disabled = false;
}

/* Semak jawapan */
function handleCheck() {
  if (answered) return;

  if (currentMission === 1 || currentMission === 3) {
    if (!selectedPicture) {
      showFeedback("Pilih satu gambar dahulu, ya!", "neutral");
      return;
    }

    const question = missionData[currentMission].questions[questionIndex];
    const correct = selectedPicture === question.answer;

    if (correct) {
      currentScore++;
      showFeedback(question.explanation, "success");
    } else {
      showFeedback("Belum tepat. Cuba perhatikan semula perkataan atau soalan.", "error");
    }

    if (correct) {
      markCorrectChoice(question.answer);
    } else {
      markIncorrectChoice(selectedPicture);
    }

    finishQuestion();
    return;
  }

  if (currentMission === 2) {
    if (selectedSyllables.length < 2) {
      showFeedback("Pilih dua suku kata dahulu.", "neutral");
      return;
    }

    const question = missionData[2].questions[questionIndex];
    const assembledWord = selectedSyllables.join("");
    const correct = assembledWord === question.answer;

    if (correct) {
      currentScore++;
      showFeedback(question.explanation, "success");
    } else {
      showFeedback("Belum tepat. Cuba semak susunan suku kata.", "error");
    }

    finishQuestion();
    return;
  }

  if (currentMission === 4) {
    if (!recordedThisQuestion) {
      showFeedback("Rakam bacaan anda dahulu sebelum meneruskan.", "neutral");
      return;
    }

    currentScore++;
    showFeedback(
      "Bagus! Anda telah merakam bacaan. Dengar semula rakaman untuk menyemak sebutan.",
      "success"
    );
    finishQuestion();
  }
}

function markCorrectChoice(answer) {
  document.querySelectorAll("[data-choice]").forEach((button) => {
    if (button.dataset.choice === answer) {
      button.classList.add("correct");
    }
  });
}

function markIncorrectChoice(choice) {
  document.querySelectorAll("[data-choice]").forEach((button) => {
    if (button.dataset.choice === choice) {
      button.classList.add("incorrect");
    }
  });
}

function finishQuestion() {
  answered = true;
  checkBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");

  document.querySelectorAll("[data-choice], [data-syllable]").forEach((button) => {
    button.disabled = true;
  });

  $("#questionProgressBar").style.width =
    `${((questionIndex + 1) / totalQuestions) * 100}%`;
}

function handleNext() {
  if (!answered) return;

  if (questionIndex < totalQuestions - 1) {
    questionIndex++;
    renderQuestion();
  } else {
    finishMission();
  }
}

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

function finishMission() {
  completedMissions.add(currentMission);
  missionScores[currentMission] = currentScore;

  $("#resultMessage").textContent =
    currentMission === 4
      ? `Tahniah, ${studentName}! Anda telah menyelesaikan cabaran bacaan dan rakaman.`
      : `Tahniah, ${studentName}! Anda telah menamatkan misi ${currentMission}.`;

  $("#resultScore").textContent = `${currentScore}/${totalQuestions}`;

  $("#retryBtn").textContent = "Cuba Misi Ini Lagi 🔄";

  updateHomeProgress();
  showScreen("resultScreen");
}

/* Kemajuan keseluruhan */
function updateHomeProgress() {
  const completed = completedMissions.size;
  $("#homeProgressText").textContent = `${completed} daripada 4 misi selesai`;
  $("#homeProgressBar").style.width = `${(completed / 4) * 100}%`;

  document.querySelectorAll("[data-mission]").forEach((button) => {
    const mission = Number(button.dataset.mission);
    const oldBadge = button.querySelector(".completed-badge");

    if (oldBadge) oldBadge.remove();

    if (completedMissions.has(mission)) {
      const badge = document.createElement("span");
      badge.className = "completed-badge";
      badge.textContent = "✓ Selesai";
      badge.style.color = "var(--success)";
      badge.style.fontWeight = "900";
      badge.style.fontSize = "12px";
      button.appendChild(badge);
    }
  });
}

/* Rakaman suara menggunakan MediaRecorder */
async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined") {
    setRecordingStatus(
      "Pelayar ini tidak menyokong rakaman suara. Cuba Chrome atau Edge terkini melalui HTTPS.",
      false
    );
    return;
  }

  try {
    clearRecordingUrl();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];

    const options = {};

    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      options.mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      options.mimeType = "audio/webm";
    }

    recordingState = new MediaRecorder(stream, options);

    recordingState.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        recordingChunks.push(event.data);
      }
    });

    recordingState.addEventListener("stop", () => {
      recordingBlob = new Blob(recordingChunks, {
        type: recordingState.mimeType || "audio/webm"
      });

      recordingUrl = URL.createObjectURL(recordingBlob);

      const audio = $("#recordedAudio");
      audio.src = recordingUrl;
      audio.classList.remove("hidden");

      $("#playRecordingBtn").disabled = false;
      $("#downloadRecordingBtn").disabled = false;

      setRecordingStatus("Rakaman selesai. Anda boleh mendengar semula atau memuat turun rakaman.", false);

      stream.getTracks().forEach((track) => track.stop());
    });

    recordingState.start();
    isRecording = true;
    recordedThisQuestion = false;

    $("#startRecordingBtn").disabled = true;
    $("#stopRecordingBtn").disabled = false;
    $("#playRecordingBtn").disabled = true;
    $("#downloadRecordingBtn").disabled = true;

    setRecordingStatus("Sedang merakam... Sebut perkataan dengan jelas.", true);
  } catch (error) {
    setRecordingStatus(
      "Mikrofon tidak dapat diakses. Benarkan akses mikrofon pada pelayar dan cuba lagi.",
      false
    );
  }
}

function stopRecording() {
  if (recordingState && isRecording) {
    recordingState.stop();
    isRecording = false;
    recordedThisQuestion = true;

    $("#startRecordingBtn").disabled = false;
    $("#stopRecordingBtn").disabled = true;
  }
}

function stopRecordingIfNeeded() {
  if (recordingState && isRecording) {
    recordingState.stop();
    isRecording = false;
  }
}

function playRecording() {
  const audio = $("#recordedAudio");

  if (audio && audio.src) {
    audio.play().catch(() => {
      setRecordingStatus("Rakaman tidak dapat dimainkan. Cuba tekan butang dengar semula.", false);
    });
  }
}

function downloadRecording() {
  if (!recordingBlob || !recordingUrl) return;

  const link = document.createElement("a");
  link.href = recordingUrl;
  link.download = `bacaan-${missionData[4].questions[questionIndex].word}.webm`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function setRecordingStatus(message, recording) {
  const status = $("#recordingStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-recording", recording);
}

function clearRecordingUrl() {
  if (recordingUrl) {
    URL.revokeObjectURL(recordingUrl);
  }

  recordingUrl = null;
  recordingBlob = null;
  recordingChunks = [];
}

/* Lindungi teks nama atau kandungan dinamik daripada ditafsir sebagai HTML */
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}
/* Paparan awal */
updateHomeProgress();
