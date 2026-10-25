"use strict";

/* =========================================================
   JOM KENAL: PENGEMBARAAN DUNIA KATA
   Bahasa Melayu Pemulihan Khas Tahun 1

   Fungsi:
   1. Empat misi bacaan
   2. Pilihan tema
   3. Semakan jawapan dan markah
   4. Rakaman, main semula dan muat turun suara
   5. Rekod pencapaian murid
   6. Ruang guru dengan kata laluan 1234
   7. Eksport rekod ke CSV
   8. Penyimpanan rekod menggunakan localStorage
   9. Penyimpanan rakaman menggunakan IndexedDB
   ========================================================= */

(() => {
  "use strict";

  /* =========================
     1. DATA MISI
     ========================= */

  const MISSIONS = [
    {
      id: 1,
      title: "Kenal dan Baca",
      description: "Baca perkataan dan pilih gambar yang betul.",
      questions: [
        {
          word: "sabun",
          prompt: "Baca perkataan ini. Kemudian, pilih gambar yang betul.",
          choices: [
            { text: "Sabun", emoji: "🧼", value: "sabun" },
            { text: "Baju", emoji: "👕", value: "baju" },
            { text: "Sapu", emoji: "🧹", value: "sapu" }
          ],
          answer: "sabun"
        },
        {
          word: "sapu",
          prompt: "Perhatikan perkataan. Pilih gambar yang sepadan.",
          choices: [
            { text: "Baju", emoji: "👕", value: "baju" },
            { text: "Sapu", emoji: "🧹", value: "sapu" },
            { text: "Sabun", emoji: "🧼", value: "sabun" }
          ],
          answer: "sapu"
        },
        {
          word: "baju",
          prompt: "Baca perkataan dan pilih gambar yang betul.",
          choices: [
            { text: "Sapu", emoji: "🧹", value: "sapu" },
            { text: "Sabun", emoji: "🧼", value: "sabun" },
            { text: "Baju", emoji: "👕", value: "baju" }
          ],
          answer: "baju"
        }
      ]
    },
    {
      id: 2,
      title: "Cantum dan Baca",
      description: "Pilih suku kata untuk membentuk perkataan.",
      questions: [
        {
          prompt: "Cantumkan suku kata untuk membentuk perkataan sabun.",
          parts: ["sa", "bun", "ba", "ju"],
          answerParts: ["sa", "bun"],
          answer: "sabun",
          emoji: "🧼"
        },
        {
          prompt: "Cantumkan suku kata untuk membentuk perkataan sapu.",
          parts: ["sa", "pu", "su", "ku"],
          answerParts: ["sa", "pu"],
          answer: "sapu",
          emoji: "🧹"
        },
        {
          prompt: "Cantumkan suku kata untuk membentuk perkataan baju.",
          parts: ["ba", "ju", "bu", "ku"],
          answerParts: ["ba", "ju"],
          answer: "baju",
          emoji: "👕"
        }
      ]
    },
    {
      id: 3,
      title: "Baca dan Faham",
      description: "Baca perkataan dan jawab soalan berdasarkan gambar.",
      questions: [
        {
          word: "sabun",
          prompt: "Apakah yang digunakan untuk mencuci tangan?",
          choices: [
            { text: "Sabun", emoji: "🧼", value: "sabun" },
            { text: "Baju", emoji: "👕", value: "baju" },
            { text: "Sapu", emoji: "🧹", value: "sapu" }
          ],
          answer: "sabun"
        },
        {
          word: "sapu",
          prompt: "Apakah alat yang digunakan untuk menyapu lantai?",
          choices: [
            { text: "Baju", emoji: "👕", value: "baju" },
            { text: "Sapu", emoji: "🧹", value: "sapu" },
            { text: "Sabun", emoji: "🧼", value: "sabun" }
          ],
          answer: "sapu"
        },
        {
          word: "baju",
          prompt: "Apakah yang kita pakai pada badan?",
          choices: [
            { text: "Sabun", emoji: "🧼", value: "sabun" },
            { text: "Sapu", emoji: "🧹", value: "sapu" },
            { text: "Baju", emoji: "👕", value: "baju" }
          ],
          answer: "baju"
        }
      ]
    },
    {
      id: 4,
      title: "Cabaran Baca Sendiri",
      description: "Baca perkataan dengan suara sendiri dan dengar semula rakaman.",
      questions: [
        {
          word: "sabun",
          prompt: "Sebut perkataan ini dengan jelas, kemudian rakam suara kamu.",
          emoji: "🧼"
        },
        {
          word: "sapu",
          prompt: "Baca perkataan ini. Kemudian, rakam suara kamu.",
          emoji: "🧹"
        },
        {
          word: "baju",
          prompt: "Baca perkataan ini dengan sebutan yang jelas.",
          emoji: "👕"
        }
      ]
    }
  ];

  const STORAGE_KEYS = {
    records: "jomKenal_studentRecords_v1",
    theme: "jomKenal_selectedTheme_v1",
    student: "jomKenal_studentName_v1"
  };

  const TEACHER_PASSWORD = "1234";
  const DB_NAME = "JomKenalAudioDB";
  const DB_VERSION = 1;
  const AUDIO_STORE = "recordings";

  /* =========================
     2. STATUS APLIKASI
     ========================= */

  let currentMission = null;
  let currentQuestionIndex = 0;
  let currentScore = 0;
  let totalAnswered = 0;
  let selectedAnswer = null;
  let selectedParts = [];
  let questionChecked = false;

  let mediaRecorder = null;
  let recordingChunks = [];
  let currentAudioUrl = null;
  let recordingStream = null;
  let recordingStartedAt = null;

  let dbPromise = null;
  let currentSessionId = null;

  /* =========================
     3. FUNGSI BANTUAN
     ========================= */

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    const element = getElement(id);
    if (element) element.textContent = text;
  }

  function showElement(element) {
    if (element) element.hidden = false;
  }

  function hideElement(element) {
    if (element) element.hidden = true;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStudentName() {
    const input = getElement("studentName");
    const enteredName = input ? input.value.trim() : "";
    return enteredName || "Murid";
  }

  function getSavedStudentName() {
    try {
      return localStorage.getItem(STORAGE_KEYS.student) || "";
    } catch {
      return "";
    }
  }

  function saveStudentName(name) {
    try {
      localStorage.setItem(STORAGE_KEYS.student, name);
    } catch (error) {
      console.warn("Nama murid tidak dapat disimpan:", error);
    }
  }

  function getRecords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.records);
      const records = stored ? JSON.parse(stored) : [];
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.warn("Rekod tidak dapat dibaca:", error);
      return [];
    }
  }

  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error("Rekod tidak dapat disimpan:", error);
      alert(
        "Rekod tidak dapat disimpan. Ruang storan pelayar mungkin penuh."
      );
      return false;
    }
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("ms-MY", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /* =========================
     4. PAPARAN SKRIN
     ========================= */

  function showScreen(screenId) {
    const screenIds = ["homeScreen", "gameScreen", "resultScreen"];

    screenIds.forEach((id) => {
      const screen = getElement(id);
      if (!screen) return;

      screen.hidden = id !== screenId;
      screen.classList.toggle("active", id === screenId);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    stopRecordingIfNeeded();
    showScreen("homeScreen");
    updateHomeProgress();
  }

  /* =========================
     5. PILIH TEMA
     ========================= */

  function applyTheme(theme) {
    const validThemes = ["forest", "space", "garden", "ocean"];
    const selectedTheme = validThemes.includes(theme) ? theme : "forest";

    document.body.dataset.theme = selectedTheme;

    document.documentElement.dataset.theme = selectedTheme;

    const themeSelect = getElement("themeSelect");
    if (themeSelect && themeSelect.value !== selectedTheme) {
      themeSelect.value = selectedTheme;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.theme, selectedTheme);
    } catch (error) {
      console.warn("Tema tidak dapat disimpan:", error);
    }
  }

  function initialiseTheme() {
    let savedTheme = "forest";

    try {
      savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "forest";
    } catch (error) {
      console.warn("Tema tersimpan tidak dapat dibaca:", error);
    }

    applyTheme(savedTheme);

    const themeSelect = getElement("themeSelect");
    if (themeSelect) {
      themeSelect.addEventListener("change", () => {
        applyTheme(themeSelect.value);
      });
    }
  }

  /* =========================
     6. MULAKAN MISI
     ========================= */

  function startMission(missionId) {
    const mission = MISSIONS.find((item) => item.id === Number(missionId));

    if (!mission) {
      alert("Misi tidak ditemui. Sila pilih misi yang betul.");
      return;
    }

    const studentName = getStudentName();
    saveStudentName(studentName);

    currentMission = mission;
    currentQuestionIndex = 0;
    currentScore = 0;
    totalAnswered = 0;
    selectedAnswer = null;
    selectedParts = [];
    questionChecked = false;
    currentSessionId =
      "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    setText("studentGreeting", `Selamat datang, ${studentName}!`);
    setText("missionEyebrow", `MISI ${mission.id}`);
    setText("missionTitle", mission.title);
    setText("missionDescription", mission.description);
    setText("missionCount", `Misi ${mission.id} daripada ${MISSIONS.length}`);

    showScreen("gameScreen");
    renderQuestion();
  }

  /* =========================
     7. PAPAR SOALAN
     ========================= */

  function renderQuestion() {
    if (!currentMission) return;

    const question = currentMission.questions[currentQuestionIndex];
    const activityContent = getElement("activityContent");

    if (!question || !activityContent) return;

    selectedAnswer = null;
    selectedParts = [];
    questionChecked = false;

    setText(
      "questionProgressText",
      `Soalan ${currentQuestionIndex + 1} daripada ${currentMission.questions.length}`
    );

    const progressBar = getElement("questionProgressBar");
    if (progressBar) {
      const percentage =
        ((currentQuestionIndex + 1) / currentMission.questions.length) * 100;

      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute("aria-valuenow", String(percentage));
    }

    const scoreBadge = getElement("scoreBadge");
    if (scoreBadge) {
      scoreBadge.textContent = `Markah: ${currentScore}`;
    }

    const feedback = getElement("feedback");
    if (feedback) {
      feedback.textContent = "";
      feedback.className = "feedback";
      feedback.hidden = true;
    }

    const checkBtn = getElement("checkBtn");
    const nextBtn = getElement("nextBtn");

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.hidden = false;
      checkBtn.textContent = "Semak Jawapan";
    }

    if (nextBtn) {
      nextBtn.hidden = true;
      nextBtn.disabled = false;
    }

    if (currentMission.id === 1) {
      renderMissionOne(question, activityContent);
    } else if (currentMission.id === 2) {
      renderMissionTwo(question, activityContent);
    } else if (currentMission.id === 3) {
      renderMissionThree(question, activityContent);
    } else if (currentMission.id === 4) {
      renderMissionFour(question, activityContent);
    }
  }

  /* =========================
     8. MISI 1: KENAL DAN BACA
     ========================= */

  function renderMissionOne(question, container) {
    const choices = shuffle(question.choices);

    container.innerHTML = `
      <section class="question-card">
        <p class="question-prompt">${escapeHTML(question.prompt)}</p>

        <div class="word-display" aria-label="Perkataan untuk dibaca">
          ${escapeHTML(question.word)}
        </div>

        <p class="instruction">Pilih gambar yang sepadan dengan perkataan.</p>

        <div class="picture-choices">
          ${choices
            .map(
              (choice) => `
                <button
                  type="button"
                  class="picture-choice"
                  data-answer="${escapeHTML(choice.value)}"
                  aria-pressed="false"
                >
                  <span class="choice-emoji" aria-hidden="true">
                    ${choice.emoji}
                  </span>
                  <span class="choice-label">
                    ${escapeHTML(choice.text)}
                  </span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;

    attachPictureChoiceEvents();
  }

  /* =========================
     9. MISI 2: CANTUM DAN BACA
     ========================= */

  function renderMissionTwo(question, container) {
    const parts = shuffle(question.parts);

    container.innerHTML = `
      <section class="question-card">
        <p class="question-prompt">${escapeHTML(question.prompt)}</p>

        <div class="word-display">
          ${question.emoji}
        </div>

        <p class="instruction">Pilih suku kata mengikut turutan.</p>

        <div class="selected-parts" id="selectedParts" aria-live="polite">
          <span class="empty-parts">Suku kata yang dipilih akan muncul di sini.</span>
        </div>

        <div class="syllable-choices">
          ${parts
            .map(
              (part, index) => `
                <button
                  type="button"
                  class="syllable-choice"
                  data-part="${escapeHTML(part)}"
                  data-index="${index}"
                  aria-pressed="false"
                >
                  ${escapeHTML(part)}
                </button>
              `
            )
            .join("")}
        </div>

        <button type="button" class="secondary-btn" id="resetPartsBtn">
          Cuba Semula
        </button>
      </section>
    `;

    container.querySelectorAll(".syllable-choice").forEach((button) => {
      button.addEventListener("click", () => {
        if (questionChecked || button.disabled) return;

        const part = button.dataset.part;

        selectedParts.push({
          part,
          button
        });

        button.disabled = true;
        button.setAttribute("aria-pressed", "true");
        button.classList.add("selected");

        updateSelectedPartsDisplay();
      });
    });

    const resetBtn = getElement("resetPartsBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (questionChecked) return;

        selectedParts.forEach((item) => {
          item.button.disabled = false;
          item.button.classList.remove("selected");
          item.button.setAttribute("aria-pressed", "false");
        });

        selectedParts = [];
        updateSelectedPartsDisplay();
      });
    }

    updateSelectedPartsDisplay();
  }

  function updateSelectedPartsDisplay() {
    const display = getElement("selectedParts");
    if (!display) return;

    if (selectedParts.length === 0) {
      display.innerHTML =
        '<span class="empty-parts">Suku kata yang dipilih akan muncul di sini.</span>';
      return;
    }

    display.innerHTML = selectedParts
      .map(
        (item) => `
          <span class="selected-syllable">${escapeHTML(item.part)}</span>
        `
      )
      .join("");
  }

  /* =========================
     10. MISI 3: BACA DAN FAHAM
     ========================= */

  function renderMissionThree(question, container) {
    const choices = shuffle(question.choices);

    container.innerHTML = `
      <section class="question-card">
        <p class="question-prompt">${escapeHTML(question.prompt)}</p>

        <div class="word-display">
          ${escapeHTML(question.word)}
        </div>

        <div class="picture-choices">
          ${choices
            .map(
              (choice) => `
                <button
                  type="button"
                  class="picture-choice"
                  data-answer="${escapeHTML(choice.value)}"
                  aria-pressed="false"
                >
                  <span class="choice-emoji" aria-hidden="true">
                    ${choice.emoji}
                  </span>
                  <span class="choice-label">
                    ${escapeHTML(choice.text)}
                  </span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;

    attachPictureChoiceEvents();
  }

  /* =========================
     11. MISI 4: CABARAN BACA SENDIRI
     ========================= */

  function renderMissionFour(question, container) {
    container.innerHTML = `
      <section class="question-card">
        <p class="question-prompt">${escapeHTML(question.prompt)}</p>

        <div class="word-display">
          <span aria-hidden="true">${question.emoji}</span>
          <span>${escapeHTML(question.word)}</span>
        </div>

        <p class="instruction">
          Baca perkataan di atas. Tekan butang rakam apabila bersedia.
        </p>

        <div class="recording-controls">
          <button type="button" class="record-btn" id="recordBtn">
            🎙️ Mula Rakam
          </button>

          <button type="button" class="secondary-btn" id="stopRecordBtn" disabled>
            ⏹️ Hentikan Rakaman
          </button>
        </div>

        <p id="recordingStatus" class="recording-status" aria-live="polite">
          Belum ada rakaman untuk soalan ini.
        </p>

        <div id="audioPreviewContainer" class="audio-preview-container"></div>

        <button type="button" class="secondary-btn" id="downloadAudioBtn" hidden>
          ⬇️ Muat Turun Rakaman
        </button>
      </section>
    `;

    const recordBtn = getElement("recordBtn");
    const stopRecordBtn = getElement("stopRecordBtn");

    if (recordBtn) {
      recordBtn.addEventListener("click", startRecording);
    }

    if (stopRecordBtn) {
      stopRecordBtn.addEventListener("click", stopRecording);
    }
  }

  /* =========================
     12. PILIHAN GAMBAR
     ========================= */

  function attachPictureChoiceEvents() {
    document.querySelectorAll(".picture-choice").forEach((button) => {
      button.addEventListener("click", () => {
        if (questionChecked) return;

        document.querySelectorAll(".picture-choice").forEach((choice) => {
          choice.classList.remove("selected");
          choice.setAttribute("aria-pressed", "false");
        });

        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
        selectedAnswer = button.dataset.answer;
      });
    });
  }

  /* =========================
     13. SEMAK JAWAPAN
     ========================= */

  function handleCheck() {
    if (!currentMission || questionChecked) return;

    const question = currentMission.questions[currentQuestionIndex];
    let isCorrect = false;

    if (currentMission.id === 1 || currentMission.id === 3) {
      if (!selectedAnswer) {
        showFeedback("Pilih satu jawapan dahulu.", "warning");
        return;
      }

      isCorrect = selectedAnswer === question.answer;
    }

    if (currentMission.id === 2) {
      if (selectedParts.length === 0) {
        showFeedback("Pilih suku kata dahulu.", "warning");
        return;
      }

      const submittedWord = selectedParts.map((item) => item.part).join("");
      isCorrect = submittedWord === question.answer;
    }

    if (currentMission.id === 4) {
      const audioExists = Boolean(getElement("audioPreview"));
      const savedRecording = Boolean(
        getElement("downloadAudioBtn") &&
          !getElement("downloadAudioBtn").hidden
      );

      if (!audioExists && !savedRecording) {
        showFeedback("Rakam suara kamu dahulu sebelum meneruskan.", "warning");
        return;
      }

      // Misi bacaan kendiri diberi satu markah penyertaan apabila rakaman dibuat.
      isCorrect = true;
    }

    questionChecked = true;
    totalAnswered += 1;

    if (isCorrect) {
      currentScore += 1;
      showFeedback(
        currentMission.id === 4
          ? "Bagus! Kamu sudah membuat rakaman bacaan."
          : "Tahniah! Jawapan kamu betul.",
        "success"
      );
    } else {
      showFeedback(
        `Belum tepat. Jawapan yang betul ialah "${question.answer}". Cuba ingat semula.`,
        "error"
      );
    }

    document.querySelectorAll(
      ".picture-choice, .syllable-choice, #resetPartsBtn"
    ).forEach((button) => {
      button.disabled = true;
    });

    const checkBtn = getElement("checkBtn");
    const nextBtn = getElement("nextBtn");

    if (checkBtn) checkBtn.hidden = true;

    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.textContent =
        currentQuestionIndex === currentMission.questions.length - 1
          ? "Lihat Keputusan"
          : "Soalan Seterusnya";
    }

    const scoreBadge = getElement("scoreBadge");
    if (scoreBadge) {
      scoreBadge.textContent = `Markah: ${currentScore}`;
    }
  }

  function showFeedback(message, type) {
    const feedback = getElement("feedback");
    if (!feedback) {
      if (type === "warning") alert(message);
      return;
    }

    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
    feedback.hidden = false;
  }

  /* =========================
     14. SOALAN SETERUSNYA
     ========================= */

  function handleNext() {
    if (!currentMission || !questionChecked) return;

    if (currentQuestionIndex < currentMission.questions.length - 1) {
      currentQuestionIndex += 1;
      renderQuestion();
    } else {
      finishMission();
    }
  }

  /* =========================
     15. SIMPAN KEPUTUSAN
     ========================= */

  function finishMission() {
    if (!currentMission) return;

    stopRecordingIfNeeded();

    const studentName = getStudentName();
    const totalQuestions = currentMission.questions.length;
    const percentage = Math.round((currentScore / totalQuestions) * 100);

    const record = {
      id: currentSessionId || `session_${Date.now()}`,
      studentName,
      missionId: currentMission.id,
      missionTitle: currentMission.title,
      score: currentScore,
      totalQuestions,
      percentage,
      completedAt: new Date().toISOString()
    };

    const records = getRecords();
    records.push(record);
    saveRecords(records);

    setText("resultMessage", getResultMessage(percentage));
    setText("resultScore", `${currentScore} / ${totalQuestions}`);
    setText("resultPercentage", `${percentage}%`);

    showScreen("resultScreen");
    updateHomeProgress();
  }

  function getResultMessage(percentage) {
    if (percentage === 100) {
      return "Hebat! Semua jawapan kamu betul. Teruskan usaha yang baik!";
    }

    if (percentage >= 60) {
      return "Bagus! Kamu semakin mahir membaca. Teruskan berlatih!";
    }

    return "Teruskan mencuba. Baca perkataan perlahan-lahan dan minta bantuan guru jika perlu.";
  }

  function updateHomeProgress() {
    const records = getRecords();
    const studentName = getStudentName();

    const studentRecords = records.filter(
      (record) =>
        String(record.studentName).toLowerCase() === studentName.toLowerCase()
    );

    const progressElement = getElement("homeProgress");
    if (progressElement) {
      const completedMissions = new Set(
        studentRecords.map((record) => record.missionId)
      ).size;

      progressElement.textContent =
        `Misi selesai: ${completedMissions} daripada ${MISSIONS.length}`;
    }

    const completedElement = getElement("completedMissions");
    if (completedElement) {
      completedElement.textContent = String(
        new Set(studentRecords.map((record) => record.missionId)).size
      );
    }
  }

  /* =========================
     16. RAKAMAN SUARA
     ========================= */

  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showFeedback(
        "Pelayar ini tidak menyokong rakaman suara. Cuba gunakan Chrome atau Edge melalui HTTPS.",
        "error"
      );
      return;
    }

    if (!window.MediaRecorder) {
      showFeedback("Fungsi rakaman tidak disokong oleh pelayar ini.", "error");
      return;
    }

    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      recordingChunks = [];

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      }

      mediaRecorder = new MediaRecorder(recordingStream, options);
      recordingStartedAt = Date.now();

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const mimeType =
          mediaRecorder && mediaRecorder.mimeType
            ? mediaRecorder.mimeType
            : "audio/webm";

        const audioBlob = new Blob(recordingChunks, { type: mimeType });

        await handleRecordingReady(audioBlob);

        if (recordingStream) {
          recordingStream.getTracks().forEach((track) => track.stop());
          recordingStream = null;
        }
      });

      mediaRecorder.start();

      const recordBtn = getElement("recordBtn");
      const stopBtn = getElement("stopRecordBtn");
      const status = getElement("recordingStatus");

      if (recordBtn) recordBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      if (status) status.textContent = "Sedang merakam suara...";

      showFeedback("Rakaman bermula. Baca perkataan dengan jelas.", "success");
    } catch (error) {
      console.error("Ralat semasa memulakan rakaman:", error);

      showFeedback(
        "Mikrofon tidak dapat digunakan. Benarkan akses mikrofon pada pelayar dan cuba semula.",
        "error"
      );

      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
      }
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    const recordBtn = getElement("recordBtn");
    const stopBtn = getElement("stopRecordBtn");

    if (recordBtn) recordBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  }

  function stopRecordingIfNeeded() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (error) {
        console.warn("Rakaman tidak dapat dihentikan:", error);
      }
    }

    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
      recordingStream = null;
    }
  }

  async function handleRecordingReady(audioBlob) {
    if (!audioBlob || audioBlob.size === 0) {
      showFeedback("Rakaman kosong. Sila cuba rakam sekali lagi.", "error");
      return;
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }

    currentAudioUrl = URL.createObjectURL(audioBlob);

    const container = getElement("audioPreviewContainer");
    if (container) {
      container.innerHTML = `
        <p class="instruction">Dengar semula rakaman kamu:</p>
        <audio id="audioPreview" controls preload="metadata">
          <source src="${currentAudioUrl}" type="${escapeHTML(audioBlob.type)}">
          Pelayar anda tidak menyokong audio.
        </audio>
      `;
    }

    const downloadBtn = getElement("downloadAudioBtn");
    if (downloadBtn) {
      downloadBtn.hidden = false;
      downloadBtn.onclick = () => downloadRecording(audioBlob);
    }

    const elapsedSeconds = recordingStartedAt
      ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000))
      : 0;

    const status = getElement("recordingStatus");
    if (status) {
      status.textContent =
        `Rakaman siap (${elapsedSeconds} saat). Dengar semula sebelum meneruskan.`;
    }

    await saveAudioToDatabase(audioBlob, {
      sessionId: currentSessionId,
      studentName: getStudentName(),
      missionId: currentMission ? currentMission.id : null,
      missionTitle: currentMission ? currentMission.title : "",
      word:
        currentMission &&
        currentMission.questions[currentQuestionIndex]
          ? currentMission.questions[currentQuestionIndex].word
          : "",
      createdAt: new Date().toISOString()
    });

    showFeedback("Rakaman berjaya dibuat. Kamu boleh mendengarnya semula.", "success");
  }

  function downloadRecording(blob) {
    const word =
      currentMission &&
      currentMission.questions[currentQuestionIndex]
        ? currentMission.questions[currentQuestionIndex].word
        : "bacaan";

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `rakaman-${word}-${Date.now()}.webm`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* =========================
     17. INDEXEDDB UNTUK AUDIO
     ========================= */

  function openAudioDatabase() {
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB tidak disokong."));
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          const store = db.createObjectStore(AUDIO_STORE, {
            keyPath: "id"
          });

          store.createIndex("studentName", "studentName", {
            unique: false
          });

          store.createIndex("createdAt", "createdAt", {
            unique: false
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  async function saveAudioToDatabase(blob, metadata) {
    try {
      const db = await openAudioDatabase();

      const audioRecord = {
        id: `${metadata.sessionId || Date.now()}_${metadata.word || "audio"}`,
        blob,
        ...metadata
      };

      await new Promise((resolve, reject) => {
        const transaction = db.transaction(AUDIO_STORE, "readwrite");
        transaction.objectStore(AUDIO_STORE).put(audioRecord);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn("Rakaman tidak dapat disimpan dalam IndexedDB:", error);
      // Rakaman masih boleh didengar dan dimuat turun dalam sesi semasa.
    }
  }

  async function getAllAudioRecords() {
    const db = await openAudioDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, "readonly");
      const request = transaction.objectStore(AUDIO_STORE).getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /* =========================
     18. RUANG GURU
     ========================= */

  function createTeacherInterface() {
    if (getElement("teacherPanel")) return;

    const teacherPanel = document.createElement("section");
    teacherPanel.id = "teacherPanel";
    teacherPanel.hidden = true;
    teacherPanel.className = "teacher-panel";

    teacherPanel.innerHTML = `
      <div class="teacher-panel-header">
        <div>
          <p class="teacher-eyebrow">PANEL PENGURUSAN</p>
          <h2>Ruang Guru</h2>
          <p>Rekod pencapaian dan rakaman bacaan murid.</p>
        </div>
        <button type="button" id="closeTeacherBtn" class="secondary-btn">
          Tutup
        </button>
      </div>

      <div class="teacher-actions">
        <button type="button" id="refreshTeacherBtn" class="primary-btn">
          Muat Semula Rekod
        </button>
        <button type="button" id="exportCsvBtn" class="secondary-btn">
          Eksport CSV
        </button>
      </div>

      <div id="teacherSummary" class="teacher-summary"></div>

      <div class="teacher-table-wrap">
        <table class="teacher-table">
          <thead>
            <tr>
              <th>Nama Murid</th>
              <th>Misi</th>
              <th>Markah</th>
              <th>Peratus</th>
              <th>Tarikh</th>
              <th>Rakaman</th>
            </tr>
          </thead>
          <tbody id="teacherRecordsBody"></tbody>
        </table>
      </div>

      <p id="teacherNotice" class="teacher-notice" aria-live="polite"></p>
    `;

    document.body.appendChild(teacherPanel);

    const closeBtn = getElement("closeTeacherBtn");
    const refreshBtn = getElement("refreshTeacherBtn");
    const exportBtn = getElement("exportCsvBtn");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        teacherPanel.hidden = true;
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", renderTeacherRecords);
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", exportRecordsToCSV);
    }
  }

  function createTeacherEntryButton() {
    if (getElement("teacherEntryBtn")) return;

    const button = document.createElement("button");
    button.id = "teacherEntryBtn";
    button.type = "button";
    button.className = "teacher-entry-btn";
    button.textContent = "👩‍🏫 Ruang Guru";

    button.addEventListener("click", openTeacherPanel);

    const target =
      getElement("homeScreen") ||
      document.querySelector("main") ||
      document.body;

    target.appendChild(button);
  }

  function openTeacherPanel() {
    const password = window.prompt("Masukkan kata laluan guru:");

    if (password === null) return;

    if (password !== TEACHER_PASSWORD) {
      alert("Kata laluan tidak betul.");
      return;
    }

    createTeacherInterface();

    const panel = getElement("teacherPanel");
    if (panel) {
      panel.hidden = false;
      renderTeacherRecords();
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function renderTeacherRecords() {
    const recordsBody = getElement("teacherRecordsBody");
    const summary = getElement("teacherSummary");
    const notice = getElement("teacherNotice");

    if (!recordsBody) return;

    const records = getRecords();

    if (summary) {
      const students = new Set(records.map((record) => record.studentName));
      const average =
        records.length > 0
          ? Math.round(
              records.reduce(
                (sum, record) => sum + Number(record.percentage || 0),
                0
              ) / records.length
            )
          : 0;

      summary.innerHTML = `
        <div class="teacher-stat">
          <span class="teacher-stat-label">Jumlah rekod</span>
          <strong>${records.length}</strong>
        </div>
        <div class="teacher-stat">
          <span class="teacher-stat-label">Bilangan murid</span>
          <strong>${students.size}</strong>
        </div>
        <div class="teacher-stat">
          <span class="teacher-stat-label">Purata peratus</span>
          <strong>${average}%</strong>
        </div>
      `;
    }

    if (records.length === 0) {
      recordsBody.innerHTML = `
        <tr>
          <td colspan="6">Belum ada rekod pencapaian murid.</td>
        </tr>
      `;
    } else {
      const audioRecords = await getAudioRecordsSafely();

      recordsBody.innerHTML = [...records]
        .reverse()
        .map((record) => {
          const matchingAudio = audioRecords.filter(
            (audio) =>
              audio.studentName === record.studentName &&
              Number(audio.missionId) === Number(record.missionId)
          );

          const audioCell =
            matchingAudio.length > 0
              ? matchingAudio
                  .map(
                    (audio) => `
                      <button
                        type="button"
                        class="teacher-audio-btn"
                        data-audio-id="${escapeHTML(audio.id)}"
                      >
                        ▶ Dengar ${escapeHTML(audio.word || "rakaman")}
                      </button>
                    `
                  )
                  .join("<br>")
              : "—";

          return `
            <tr>
              <td>${escapeHTML(record.studentName)}</td>
              <td>${escapeHTML(record.missionTitle)}</td>
              <td>${Number(record.score || 0)} / ${Number(record.totalQuestions || 0)}</td>
              <td>${Number(record.percentage || 0)}%</td>
              <td>${escapeHTML(formatDate(record.completedAt))}</td>
              <td>${audioCell}</td>
            </tr>
          `;
        })
        .join("");
    }

    recordsBody.querySelectorAll(".teacher-audio-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await playSavedAudio(button.dataset.audioId);
      });
    });

    if (notice) {
      notice.textContent =
        "Rekod disimpan dalam pelayar pada peranti ini. Gunakan peranti dan pelayar yang sama untuk melihat rekod tersebut.";
    }
  }

  async function getAudioRecordsSafely() {
    try {
      return await getAllAudioRecords();
    } catch (error) {
      console.warn("Rekod audio tidak dapat dimuatkan:", error);
      return [];
    }
  }

  async function playSavedAudio(audioId) {
    try {
      const audioRecords = await getAllAudioRecords();
      const record = audioRecords.find((item) => item.id === audioId);

      if (!record || !record.blob) {
        alert("Rakaman tidak ditemui.");
        return;
      }

      const url = URL.createObjectURL(record.blob);
      const audioWindow = window.open("", "_blank");

      if (!audioWindow) {
        URL.revokeObjectURL(url);
        alert("Pelayar menyekat tetingkap baharu. Benarkan tetingkap pop timbul untuk memainkan rakaman.");
        return;
      }

      audioWindow.document.title = "Rakaman Bacaan Murid";
      audioWindow.document.body.style.fontFamily = "Arial, sans-serif";
      audioWindow.document.body.style.padding = "24px";

      const heading = audioWindow.document.createElement("h2");
      heading.textContent = `Rakaman: ${record.studentName || "Murid"}`;

      const description = audioWindow.document.createElement("p");
      description.textContent = `Perkataan: ${record.word || "Bacaan"}`;

      const audio = audioWindow.document.createElement("audio");
      audio.controls = true;
      audio.autoplay = true;
      audio.src = url;
      audio.style.width = "100%";

      audioWindow.document.body.append(heading, description, audio);
    } catch (error) {
      console.error("Rakaman tidak dapat dimainkan:", error);
      alert("Rakaman tidak dapat dimainkan.");
    }
  }

  /* =========================
     19. EKSPORT CSV
     ========================= */

  function exportRecordsToCSV() {
    const records = getRecords();

    if (records.length === 0) {
      alert("Belum ada rekod untuk dieksport.");
      return;
    }

    const headings = [
      "Nama Murid",
      "ID Misi",
      "Nama Misi",
      "Markah",
      "Jumlah Soalan",
      "Peratus",
      "Tarikh"
    ];

    const rows = records.map((record) => [
      record.studentName,
      record.missionId,
      record.missionTitle,
      record.score,
      record.totalQuestions,
      `${record.percentage}%`,
      formatDate(record.completedAt)
    ]);

    const csvCell = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headings.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(","))
    ].join("\r\n");

    // BOM membantu Excel membaca aksara Bahasa Melayu dengan lebih baik.
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rekod-jom-kenal-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* =========================
     20. BUTANG MULA MISI
     ========================= */

  function bindMissionButtons() {
    document.querySelectorAll("[data-mission]").forEach((button) => {
      button.addEventListener("click", () => {
        startMission(button.dataset.mission);
      });
    });

    // Sokongan untuk butang yang menggunakan ID khusus.
    document.querySelectorAll("[data-start-mission]").forEach((button) => {
      button.addEventListener("click", () => {
        startMission(button.dataset.startMission);
      });
    });
  }

  function bindNavigationButtons() {
    const homeLink = getElement("homeLink");
    const backHomeBtn = getElement("backHomeBtn");
    const resultHomeBtn = getElement("resultHomeBtn");
    const chooseMissionBtn = getElement("chooseMissionBtn");
    const retryBtn = getElement("retryBtn");
    const startBtn = getElement("startBtn");
    const checkBtn = getElement("checkBtn");
    const nextBtn = getElement("nextBtn");

    if (homeLink) {
      homeLink.addEventListener("click", (event) => {
        event.preventDefault();
        goHome();
      });
    }

    if (backHomeBtn) {
      backHomeBtn.addEventListener("click", goHome);
    }

    if (resultHomeBtn) {
      resultHomeBtn.addEventListener("click", goHome);
    }

    if (chooseMissionBtn) {
      chooseMissionBtn.addEventListener("click", goHome);
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        if (currentMission) startMission(currentMission.id);
      });
    }

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        const firstMission = getElement("firstMissionId");
        const missionId = firstMission ? firstMission.value : 1;
        startMission(missionId);
      });
    }

    if (checkBtn) {
      checkBtn.addEventListener("click", handleCheck);
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", handleNext);
    }
  }

  /* =========================
     21. MULAKAN APLIKASI
     ========================= */

  function initialiseStudentName() {
    const input = getElement("studentName");
    if (!input) return;

    input.value = getSavedStudentName();

    input.addEventListener("change", () => {
      saveStudentName(input.value.trim());
      updateHomeProgress();
    });
  }

  function initialiseApp() {
    initialiseTheme();
    initialiseStudentName();
    bindNavigationButtons();
    bindMissionButtons();

    createTeacherInterface();
    createTeacherEntryButton();

    updateHomeProgress();
    showScreen("homeScreen");

    console.info("Jom Kenal berjaya dimulakan.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseApp);
  } else {
    initialiseApp();
  }
})();
