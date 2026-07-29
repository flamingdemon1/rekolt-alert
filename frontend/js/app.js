import {
  ApiConfigurationError,
  getConfiguredEndpoint,
  submitFarmerIntake,
} from "./api.js";
import { LocalAudioRecorder } from "./audio.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 60;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LANGUAGE_LABELS = {
  mfe: "Kreol Morisien",
  fr: "Français",
  en: "English",
};

const form = document.querySelector("#crop-intake-form");
const detailsPanel = document.querySelector('[data-panel="details"]');
const reviewPanel = document.querySelector('[data-panel="review"]');
const detailsProgress = document.querySelector('[data-progress-step="details"]');
const reviewProgress = document.querySelector('[data-progress-step="review"]');
const imageInput = document.querySelector("#crop-image");
const dropZone = document.querySelector("[data-drop-zone]");
const uploadEmpty = document.querySelector("[data-upload-empty]");
const uploadPreview = document.querySelector("[data-upload-preview]");
const imagePreview = document.querySelector("[data-image-preview]");
const imageName = document.querySelector("[data-image-name]");
const imageSize = document.querySelector("[data-image-size]");
const removeImageButton = document.querySelector("[data-remove-image]");
const statementInput = document.querySelector("#farmer-statement");
const characterCount = document.querySelector("[data-character-count]");
const errorSummary = document.querySelector("[data-error-summary]");
const errorList = document.querySelector("[data-error-list]");
const editDetailsButton = document.querySelector("[data-edit-details]");
const sendButton = document.querySelector("[data-send-analysis]");
const connectionNotice = document.querySelector("[data-connection-notice]");
const submitStatus = document.querySelector("[data-submit-status]");

const voiceIdle = document.querySelector("[data-voice-idle]");
const voiceRecording = document.querySelector("[data-voice-recording]");
const audioPreview = document.querySelector("[data-audio-preview]");
const audioPlayer = document.querySelector("[data-audio-player]");
const voiceStatus = document.querySelector("[data-voice-status]");
const recordingTime = document.querySelector("[data-recording-time]");
const startRecordingButton = document.querySelector("[data-start-recording]");
const stopRecordingButton = document.querySelector("[data-stop-recording]");
const removeAudioButton = document.querySelector("[data-remove-audio]");

const recorder = new LocalAudioRecorder();
let imageObjectUrl = "";
let audioObjectUrl = "";
let recordingTimer = null;
let submitController = null;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setFieldError(name, message) {
  const field = form.elements.namedItem(name);
  const error = document.querySelector(`[data-error-for="${name}"]`);
  const group = document.querySelector(`[data-field="${name}"]`);

  field?.setAttribute("aria-invalid", message ? "true" : "false");
  group?.classList.toggle("has-error", Boolean(message));
  if (name === "crop_image") {
    dropZone.classList.toggle("has-error", Boolean(message));
  }
  if (error) {
    error.textContent = message;
  }
}

function clearErrors() {
  setFieldError("crop_image", "");
  setFieldError("farmer_statement", "");
  errorSummary.hidden = true;
  errorList.replaceChildren();
}

function validateImage(file) {
  if (!file) {
    return "Add one clear crop photo.";
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG or WebP image.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Choose an image smaller than 10 MB.";
  }

  return "";
}

function validateForm() {
  clearErrors();

  const errors = [];
  const imageError = validateImage(imageInput.files[0]);
  const statement = statementInput.value.trim();

  if (imageError) {
    setFieldError("crop_image", imageError);
    errors.push({ field: imageInput, message: imageError });
  }

  if (!statement) {
    const message = "Describe what you have noticed about the crop.";
    setFieldError("farmer_statement", message);
    errors.push({ field: statementInput, message });
  }

  if (errors.length) {
    errors.forEach(({ message }) => {
      const item = document.createElement("li");
      item.textContent = message;
      errorList.append(item);
    });
    errorSummary.hidden = false;
    errorSummary.scrollIntoView({ behavior: "smooth", block: "center" });
    errors[0].field.focus({ preventScroll: true });
    return false;
  }

  return true;
}

function releaseImageUrl() {
  if (imageObjectUrl) {
    URL.revokeObjectURL(imageObjectUrl);
    imageObjectUrl = "";
  }
}

function showSelectedImage(file) {
  const error = validateImage(file);
  if (error) {
    setFieldError("crop_image", error);
    imageInput.value = "";
    return;
  }

  releaseImageUrl();
  imageObjectUrl = URL.createObjectURL(file);
  imagePreview.src = imageObjectUrl;
  imagePreview.alt = `Preview of selected crop image: ${file.name}`;
  imageName.textContent = file.name;
  imageSize.textContent = formatBytes(file.size);
  uploadEmpty.hidden = true;
  uploadPreview.hidden = false;
  setFieldError("crop_image", "");
}

function removeSelectedImage() {
  releaseImageUrl();
  imageInput.value = "";
  imagePreview.removeAttribute("src");
  imagePreview.alt = "";
  uploadPreview.hidden = true;
  uploadEmpty.hidden = false;
  imageInput.focus();
}

function assignDroppedFile(file) {
  if (!file) {
    return;
  }

  const transfer = new DataTransfer();
  transfer.items.add(file);
  imageInput.files = transfer.files;
  showSelectedImage(file);
}

function selectedValue(name) {
  return new FormData(form).get(name)?.toString().trim() ?? "";
}

function fillReview() {
  const selectedLanguage = selectedValue("language");
  const crop = selectedValue("crop");
  const locality = selectedValue("locality");
  const statement = selectedValue("farmer_statement");
  const selectedImage = imageInput.files[0];

  document.querySelector("[data-review-image]").src = imageObjectUrl;
  document.querySelector("[data-review-image-name]").textContent = selectedImage.name;
  document.querySelector("[data-review-language]").textContent =
    LANGUAGE_LABELS[selectedLanguage] ?? selectedLanguage;
  document.querySelector("[data-review-crop]").textContent = crop || "Not provided";
  document.querySelector("[data-review-location]").textContent =
    locality || "Not provided";
  document.querySelector("[data-review-statement]").textContent = statement;
  document.querySelector("[data-review-audio]").textContent = recorder.file
    ? "Voice note attached"
    : "No voice note";
}

function showReview() {
  fillReview();
  detailsPanel.hidden = true;
  reviewPanel.hidden = false;
  detailsProgress.classList.remove("is-active");
  detailsProgress.classList.add("is-complete");
  detailsProgress.removeAttribute("aria-current");
  reviewProgress.classList.add("is-active");
  reviewProgress.setAttribute("aria-current", "step");
  reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  reviewPanel.focus?.({ preventScroll: true });
}

function showDetails() {
  reviewPanel.hidden = true;
  detailsPanel.hidden = false;
  reviewProgress.classList.remove("is-active");
  reviewProgress.removeAttribute("aria-current");
  detailsProgress.classList.remove("is-complete");
  detailsProgress.classList.add("is-active");
  detailsProgress.setAttribute("aria-current", "step");
  detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  statementInput.focus({ preventScroll: true });
}

function updateCharacterCount() {
  characterCount.textContent = `${statementInput.value.length} / ${statementInput.maxLength}`;
  if (statementInput.value.trim()) {
    setFieldError("farmer_statement", "");
  }
}

function updateRecordingClock() {
  const elapsedSeconds = Math.min(
    MAX_RECORDING_SECONDS,
    Math.floor((Date.now() - recorder.recordingStartedAt) / 1000),
  );
  recordingTime.textContent = formatTime(elapsedSeconds);
  recordingTime.dateTime = `PT${elapsedSeconds}S`;

  if (elapsedSeconds >= MAX_RECORDING_SECONDS) {
    stopRecording();
  }
}

function releaseAudioUrl() {
  if (audioObjectUrl) {
    URL.revokeObjectURL(audioObjectUrl);
    audioObjectUrl = "";
  }
}

function microphoneErrorMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Microphone access was not allowed. You can type your description instead.";
  }

  if (error?.name === "NotFoundError") {
    return "No microphone was found. You can type your description instead.";
  }

  return error?.message || "The voice note could not be recorded. Please try again.";
}

async function startRecording() {
  try {
    startRecordingButton.disabled = true;
    voiceStatus.textContent = "Requesting microphone access…";
    await recorder.start();
    voiceIdle.hidden = true;
    audioPreview.hidden = true;
    voiceRecording.hidden = false;
    recordingTime.textContent = "00:00";
    recordingTime.dateTime = "PT0S";
    voiceStatus.textContent = "Recording locally. Stop when you have finished.";
    recordingTimer = window.setInterval(updateRecordingClock, 250);
  } catch (error) {
    voiceStatus.textContent = microphoneErrorMessage(error);
  } finally {
    startRecordingButton.disabled = false;
  }
}

async function stopRecording() {
  if (!recorder.isRecording) {
    return;
  }

  stopRecordingButton.disabled = true;
  window.clearInterval(recordingTimer);
  recordingTimer = null;

  try {
    const file = await recorder.stop();
    releaseAudioUrl();
    audioObjectUrl = URL.createObjectURL(file);
    audioPlayer.src = audioObjectUrl;
    voiceRecording.hidden = true;
    voiceIdle.hidden = true;
    audioPreview.hidden = false;
    voiceStatus.textContent =
      "Voice note ready. It remains on this device until you send the form.";
  } catch (error) {
    voiceRecording.hidden = true;
    voiceIdle.hidden = false;
    voiceStatus.textContent = microphoneErrorMessage(error);
  } finally {
    stopRecordingButton.disabled = false;
  }
}

function removeAudio() {
  window.clearInterval(recordingTimer);
  recordingTimer = null;
  recorder.clear();
  releaseAudioUrl();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  audioPreview.hidden = true;
  voiceRecording.hidden = true;
  voiceIdle.hidden = false;
  voiceStatus.textContent =
    "Voice note removed. Nothing was uploaded or stored by Rekolt Alert.";
  startRecordingButton.focus();
}

function buildPayload() {
  const payload = new FormData(form);
  if (recorder.file) {
    payload.append("audio_note", recorder.file, recorder.file.name);
  }
  return payload;
}

function setSubmitState({ busy, message = "", isError = false }) {
  sendButton.disabled = busy || !getConfiguredEndpoint();
  sendButton.setAttribute("aria-busy", String(busy));
  submitStatus.hidden = !message;
  submitStatus.textContent = message;
  submitStatus.style.color = isError ? "var(--danger)" : "";
  if (busy) {
    sendButton.firstChild.textContent = "Sending… ";
  } else {
    sendButton.firstChild.textContent = "Send for preliminary check ";
  }
}

async function sendForAnalysis() {
  const endpoint = getConfiguredEndpoint();
  submitController?.abort();
  submitController = new AbortController();
  setSubmitState({ busy: true, message: "Sending your information securely…" });

  try {
    const response = await submitFarmerIntake({
      endpoint,
      payload: buildPayload(),
      signal: submitController.signal,
    });
    setSubmitState({
      busy: false,
      message:
        "Your information was received. The results view will use the backend response once the shared contract is approved.",
    });
    window.dispatchEvent(
      new CustomEvent("rekolt:intake-submitted", { detail: { response } }),
    );
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const message =
      error instanceof ApiConfigurationError
        ? "The analysis connection is not configured. Your information was not sent."
        : error.message;
    setSubmitState({ busy: false, message, isError: true });
  }
}

function configureConnectionState() {
  const endpoint = getConfiguredEndpoint();
  sendButton.disabled = !endpoint;
  connectionNotice.hidden = Boolean(endpoint);
}

imageInput.addEventListener("change", () => showSelectedImage(imageInput.files[0]));
removeImageButton.addEventListener("click", removeSelectedImage);
statementInput.addEventListener("input", updateCharacterCount);
startRecordingButton.addEventListener("click", startRecording);
stopRecordingButton.addEventListener("click", stopRecording);
removeAudioButton.addEventListener("click", removeAudio);
editDetailsButton.addEventListener("click", showDetails);
sendButton.addEventListener("click", sendForAnalysis);

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
}

dropZone.addEventListener("drop", (event) => {
  assignDroppedFile(event.dataTransfer?.files[0]);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (recorder.isRecording) {
    await stopRecording();
  }
  if (validateForm()) {
    showReview();
  }
});

window.addEventListener("beforeunload", () => {
  submitController?.abort();
  recorder.clear();
  releaseImageUrl();
  releaseAudioUrl();
});

if (!LocalAudioRecorder.isSupported()) {
  startRecordingButton.disabled = true;
  voiceStatus.textContent =
    "Voice recording is not supported in this browser. You can type your description.";
}

updateCharacterCount();
configureConnectionState();
