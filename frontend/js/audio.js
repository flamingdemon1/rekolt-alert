const PREFERRED_AUDIO_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function supportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return (
    PREFERRED_AUDIO_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

function fileExtension(type) {
  if (type.includes("mp4")) {
    return "m4a";
  }

  if (type.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}

/**
 * Records a voice note locally. It does not transcribe or upload audio.
 */
export class LocalAudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.recordingStartedAt = null;
    this.file = null;
  }

  static isSupported() {
    return Boolean(
      navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined",
    );
  }

  get isRecording() {
    return this.mediaRecorder?.state === "recording";
  }

  async start() {
    if (!LocalAudioRecorder.isSupported()) {
      throw new Error("Voice recording is not supported in this browser.");
    }

    if (this.isRecording) {
      return;
    }

    this.clear();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = supportedMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);
    this.chunks = [];

    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    this.mediaRecorder.start();
    this.recordingStartedAt = Date.now();
  }

  async stop() {
    if (!this.isRecording) {
      return this.file;
    }

    const recorder = this.mediaRecorder;

    const completed = new Promise((resolve, reject) => {
      recorder.addEventListener(
        "stop",
        () => {
          const type = recorder.mimeType || this.chunks[0]?.type || "audio/webm";
          const blob = new Blob(this.chunks, { type });
          const extension = fileExtension(type);
          this.file = new File([blob], `crop-voice-note.${extension}`, { type });
          this.stopTracks();
          resolve(this.file);
        },
        { once: true },
      );
      recorder.addEventListener(
        "error",
        (event) => {
          this.stopTracks();
          reject(event.error ?? new Error("The recording could not be saved."));
        },
        { once: true },
      );
    });

    recorder.stop();
    return completed;
  }

  clear() {
    if (this.isRecording) {
      this.mediaRecorder.stop();
    }

    this.stopTracks();
    this.mediaRecorder = null;
    this.chunks = [];
    this.recordingStartedAt = null;
    this.file = null;
  }

  stopTracks() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
