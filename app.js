const stages = [
  { image: "unnamed.gif", label: "stage 1 : Cat cells" },
  { image: "unnamed%20(1).gif", label: "stage 2 : Little cat" },
  { image: "unnamed%20(2).gif", label: "stage 3 : Sleeping cat" },
  { image: "unnamed%20(3).gif", label: "stage 4 : Silly cat" },
  { image: "unnamed%20(4).gif", label: "stage 5 : Nerdy cat" },
];

const goalMs = 40 * 60 * 1000;
const timerDisplay = document.querySelector("#timer-display");
const toggleButton = document.querySelector("#toggle-button");
const toggleIcon = document.querySelector("#toggle-icon");
const toggleText = document.querySelector("#toggle-text");
const resetButton = document.querySelector("#reset-button");
let stageIcon = document.querySelector("#stage-icon");
const stageLabel = document.querySelector("#stage-label");
const milestoneCopy = document.querySelector("#milestone-copy");
const progressPercent = document.querySelector("#progress-percent");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const historyButton = document.querySelector("#history-button");
const historyDialog = document.querySelector("#history-dialog");
const historyClose = document.querySelector("#history-close");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const historyStorageMessage = document.querySelector("#history-storage-message");
const historyClear = document.querySelector("#history-clear");

let elapsedMs = 0;
let startedAt = null;
let tickerId = null;
let currentStage = 0;
const historyStorageKey = "study-cat-history";
let studyHistory = loadHistory();

function loadHistory() {
  try {
    const savedHistory = window.localStorage.getItem(historyStorageKey);
    if (savedHistory === null) {
      return [];
    }

    const parsedHistory = JSON.parse(savedHistory);
    if (
      !Array.isArray(parsedHistory) ||
      parsedHistory.some(
        (entry) =>
          typeof entry.completedAt !== "string" ||
          !Number.isFinite(Date.parse(entry.completedAt)) ||
          !Number.isFinite(entry.durationMs) ||
          entry.durationMs <= 0 ||
          typeof entry.stageImage !== "string" ||
          !stages.some((stage) => stage.image === entry.stageImage) ||
          typeof entry.stageLabel !== "string"
      )
    ) {
      throw new Error("Saved study history has an invalid format.");
    }

    return parsedHistory;
  } catch (error) {
    console.error("Unable to load study history.", error);
    historyStorageMessage.textContent = "Unable to load study history.";
    historyStorageMessage.hidden = false;
    return [];
  }
}

function formatSessionDuration(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  return minutes === 0 ? "Less than 1 minute" : `${minutes} minutes`;
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = studyHistory.length > 0;
  historyList.hidden = studyHistory.length === 0;
  historyClear.disabled = studyHistory.length === 0;

  for (const entry of [...studyHistory].reverse()) {
    const item = document.createElement("li");
    item.className = "history-item";

    const image = document.createElement("img");
    image.className = "history-icon";
    if (entry.stageImage.toLowerCase().endsWith(".gif")) {
      image.classList.add("is-pixel-art");
    }
    image.src = entry.stageImage;
    image.alt = entry.stageLabel;

    const copy = document.createElement("div");
    copy.className = "history-copy";

    const stage = document.createElement("p");
    stage.className = "history-stage";
    stage.textContent = entry.stageLabel;

    const duration = document.createElement("p");
    duration.className = "history-duration";
    duration.textContent = `Read for ${formatSessionDuration(entry.durationMs)}`;

    const date = document.createElement("p");
    date.className = "history-date";
    date.textContent = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(entry.completedAt));

    copy.append(stage, duration, date);
    item.append(image, copy);
    historyList.append(item);
  }
}

function saveStudySession(durationMs) {
  const stageIndex = Math.floor(durationMs / goalMs) % stages.length;
  const stage = stages[stageIndex];
  studyHistory.push({
    completedAt: new Date().toISOString(),
    durationMs,
    stageImage: stage.image,
    stageLabel: stage.label,
  });

  try {
    window.localStorage.setItem(historyStorageKey, JSON.stringify(studyHistory));
    historyStorageMessage.textContent = "";
    historyStorageMessage.hidden = true;
  } catch (error) {
    console.error("Unable to save study history.", error);
    historyStorageMessage.textContent = "Unable to save study history.";
    historyStorageMessage.hidden = false;
  }
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function updateDisplay() {
  const elapsed = elapsedMs + (startedAt === null ? 0 : Date.now() - startedAt);
  const stageIndex = Math.floor(elapsed / goalMs) % stages.length;
  const progressMs = elapsed % goalMs;
  const percentage = Math.floor((progressMs / goalMs) * 100);
  const remainingMinutes = Math.ceil((goalMs - progressMs) / 60000);

  timerDisplay.textContent = formatTime(elapsed);
  milestoneCopy.textContent =
    progressMs === 0 && elapsed > 0
      ? "Goal reached! Next growth stage in 1 minute."
      : `Next growth stage in ${remainingMinutes} minutes.`;
  progressPercent.textContent = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", String(percentage));
  progressFill.style.width = `${(progressMs / goalMs) * 100}%`;

  if (stageIndex !== currentStage) {
    currentStage = stageIndex;
    stageIcon.src = stages[stageIndex].image;
    stageIcon.alt = stages[stageIndex].label;
    stageIcon.classList.toggle("is-pixel-art", stages[stageIndex].image.endsWith(".gif"));
    stageIcon.classList.add("is-changing");
    window.setTimeout(() => stageIcon.classList.remove("is-changing"), 300);
  }
  stageLabel.textContent = stages[stageIndex].label;
}

function setRunning(isRunning) {
  toggleButton.setAttribute("aria-pressed", String(isRunning));
  toggleIcon.textContent = isRunning ? "⏸" : "▶";
  toggleText.textContent = isRunning ? "Break" : "Start";

  if (isRunning) {
    startedAt = Date.now();
    tickerId = window.setInterval(updateDisplay, 250);
  } else {
    if (startedAt !== null) {
      elapsedMs += Date.now() - startedAt;
      startedAt = null;
    }
    window.clearInterval(tickerId);
    tickerId = null;
    updateDisplay();
  }
}

toggleButton.addEventListener("click", () => {
  setRunning(startedAt === null);
});

resetButton.addEventListener("click", () => {
  const durationMs = elapsedMs + (startedAt === null ? 0 : Date.now() - startedAt);
  if (durationMs > 0) {
    saveStudySession(durationMs);
  }

  const restartedIcon = stageIcon.cloneNode();
  stageIcon.replaceWith(restartedIcon);
  stageIcon = restartedIcon;
  stageIcon.src = stages[0].image;
  stageIcon.alt = stages[0].label;
  stageIcon.classList.toggle("is-pixel-art", stages[0].image.endsWith(".gif"));
  stageIcon.classList.remove("is-changing");

  elapsedMs = 0;
  startedAt = null;
  window.clearInterval(tickerId);
  tickerId = null;
  currentStage = 0;
  setRunning(false);
  updateDisplay();
});

historyButton.addEventListener("click", () => {
  renderHistory();
  historyDialog.showModal();
});

historyClose.addEventListener("click", () => {
  historyDialog.close();
});

historyClear.addEventListener("click", () => {
  if (studyHistory.length === 0 || !window.confirm("Delete all saved study history?")) {
    return;
  }

  try {
    window.localStorage.removeItem(historyStorageKey);
    studyHistory = [];
    historyStorageMessage.textContent = "";
    historyStorageMessage.hidden = true;
    renderHistory();
  } catch (error) {
    console.error("Unable to clear study history.", error);
    historyStorageMessage.textContent = "Unable to clear study history.";
    historyStorageMessage.hidden = false;
  }
});

historyDialog.addEventListener("click", (event) => {
  if (event.target === historyDialog) {
    historyDialog.close();
  }
});

renderHistory();
updateDisplay();
