"use client";

import type { Language } from "../types";

function apiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_REKOLT_API_URL?.trim();
  if (!configuredUrl) {
    throw new Error(
      "Voice service is not configured. Set NEXT_PUBLIC_REKOLT_API_URL.",
    );
  }
  return configuredUrl.replace(/\/+$/, "");
}

const MIN_SPEECH_MS = 500;
const END_SILENCE_MS = 850;
const NO_SPEECH_TIMEOUT_MS = 20_000;
const MAX_RECORDING_MS = 30_000;
const MICROPHONE_PERMISSION_TIMEOUT_MS = 12_000;
const TRANSCRIPTION_TIMEOUT_MS = 20_000;
let voicePlaybackContext: AudioContext | null = null;

function audioContextConstructor() {
  return (
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext
  );
}

/** Unlock spoken replies while the initiating user gesture is still active. */
export async function prepareVoicePlayback() {
  const AudioContextClass = audioContextConstructor();
  if (!AudioContextClass) return;
  if (!voicePlaybackContext || voicePlaybackContext.state === "closed") {
    voicePlaybackContext = new AudioContextClass({
      latencyHint: "interactive",
    });
  }
  if (voicePlaybackContext.state === "suspended") {
    await voicePlaybackContext.resume();
  }
}

export type TranscriptDraft = {
  language: Language;
  raw_transcript: string;
  corrected_transcript: string;
  automatic_corrections: Array<{
    original: string;
    replacement: string;
  }>;
  requires_confirmation: true;
};

export type ConversationLanguage = Language | "fr";

export type ShopProductContext = {
  id: string;
  name: string;
  name_mfe: string;
  category: string;
  active_ingredient: string | null;
  supported_crops: string[];
  supported_problems: string[];
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
  usage_notes: string;
  warnings: string[];
};

export type ConversationTurn = {
  case_id: string;
  source_language: ConversationLanguage;
  confirmed_transcript: string;
  meaning_for_analysis_en: string;
  reply_text: string;
  reply_language: ConversationLanguage;
  translation_uncertain_segments: string[];
  preliminary_only: true;
  visual_observations?: string[];
  possible_risks?: string[];
  missing_information?: string[];
  recommended_actions?: string[];
  urgency?: "low" | "medium" | "high";
  warnings?: string[];
  shop_products: ShopProductContext[];
};

type RecordSpeechOptions = {
  signal?: AbortSignal;
  onLevel?: (level: number) => void;
  onSpeechStart?: () => void;
};

export type ManualSpeechRecorder = {
  cancel: () => void;
  stop: () => Promise<Blob>;
};

function abortError() {
  return new DOMException("Voice capture stopped", "AbortError");
}

function isLocalSecureOrigin() {
  return (
    window.isSecureContext ||
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  );
}

async function requestMicrophoneStream(signal?: AbortSignal) {
  if (!isLocalSecureOrigin()) {
    throw new DOMException(
      "Voice input requires HTTPS or localhost.",
      "SecurityError",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      "Your browser does not support voice recording.",
      "NotSupportedError",
    );
  }
  if (signal?.aborted) throw abortError();

  let settled = false;
  let timer = 0;
  const permissionRequest = navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  return new Promise<MediaStream>((resolve, reject) => {
    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(error);
    };
    const handleAbort = () => finishReject(abortError());
    timer = window.setTimeout(
      () =>
        finishReject(
          new DOMException(
            "Allow microphone access to start speaking.",
            "TimeoutError",
          ),
        ),
      MICROPHONE_PERMISSION_TIMEOUT_MS,
    );
    signal?.addEventListener("abort", handleAbort, { once: true });

    permissionRequest.then(
      (stream) => {
        if (settled || signal?.aborted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", handleAbort);
        resolve(stream);
      },
      (error) => finishReject(error),
    );
  });
}

/** Present microphone failures in the active interface language. */
export function microphoneErrorMessage(
  error: unknown,
  language: Language,
) {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : "";
  const english = {
    denied: "Microphone permission was denied.",
    unsupported: "Your browser does not support voice recording.",
    insecure: "Voice input requires HTTPS or localhost.",
    timeout: "Allow microphone access to start speaking.",
    failed: "We could not start the microphone. Try again.",
  };
  const morisien = {
    denied: "Permision mikro finn refize.",
    unsupported: "Ou browser pa suport anrezistreman lavwa.",
    insecure: "Fonksion lavwa bizin HTTPS ouswa localhost.",
    timeout: "Donn permision mikro pou koumans koze.",
    failed: "Nou pa finn kapav demar mikro-la. Re-ese.",
  };
  const copy = language === "mfe" ? morisien : english;

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return copy.denied;
  }
  if (name === "NotSupportedError") return copy.unsupported;
  if (name === "SecurityError") return copy.insecure;
  if (name === "TimeoutError") return copy.timeout;
  return copy.failed;
}

function mergeSamples(chunks: Float32Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/** Encode mono browser samples as the PCM WAV format expected by MMS. */
export function encodePcmWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      offset,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Start a reliable PCM recording that ends only when the user presses stop.
 * This avoids laptop noise and natural pauses accidentally ending a turn.
 */
export async function startManualSpeechRecording({
  signal,
  onLevel,
}: Omit<RecordSpeechOptions, "onSpeechStart"> = {}): Promise<ManualSpeechRecorder> {
  const stream = await requestMicrophoneStream(signal);
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Sa browser-la pa kapav lir lavwa.");
  }

  const context = new AudioContextClass({ latencyHint: "interactive" });
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(2048, 1, 1);
  const silentOutput = context.createGain();
  const chunks: Float32Array[] = [];
  let finished = false;

  silentOutput.gain.value = 0;
  source.connect(processor);
  processor.connect(silentOutput);
  silentOutput.connect(context.destination);

  const cleanup = async () => {
    if (finished) return;
    finished = true;
    signal?.removeEventListener("abort", cancel);
    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    silentOutput.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    onLevel?.(0);
    await context.close();
  };

  const cancel = () => {
    void cleanup();
  };
  signal?.addEventListener("abort", cancel, { once: true });

  processor.onaudioprocess = (event) => {
    if (finished) return;
    const input = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
    let energy = 0;
    for (const sample of input) energy += sample * sample;
    onLevel?.(Math.min(1, Math.sqrt(energy / input.length) * 14));
  };

  return {
    cancel,
    stop: async () => {
      if (finished) throw abortError();
      const sampleRate = context.sampleRate;
      const samples = mergeSamples(chunks);
      await cleanup();
      if (samples.length < sampleRate * 0.25) {
        throw new Error("Recording-la tro kourt. Koz ankor enn fwa.");
      }
      return encodePcmWav(samples, sampleRate);
    },
  };
}

/**
 * Capture one natural utterance and stop after sustained trailing silence.
 * A short ambient calibration keeps the detector usable on laptop microphones.
 */
export async function recordSpeechUntilSilence({
  signal,
  onLevel,
  onSpeechStart,
}: RecordSpeechOptions = {}) {
  const stream = await requestMicrophoneStream(signal);
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextClass) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Sa browser-la pa kapav lir lavwa.");
  }

  const context = new AudioContextClass({ latencyHint: "interactive" });
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(2048, 1, 1);
  const silentOutput = context.createGain();
  silentOutput.gain.value = 0;
  source.connect(processor);
  processor.connect(silentOutput);
  silentOutput.connect(context.destination);

  return new Promise<Blob>((resolve, reject) => {
    const chunks: Float32Array[] = [];
    const calibrationLevels: number[] = [];
    const startedAt = Date.now();
    let speechStartedAt = 0;
    let lastVoiceAt = 0;
    let consecutiveVoiceFrames = 0;
    let finished = false;

    const cleanup = async () => {
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      silentOutput.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      onLevel?.(0);
      await context.close();
    };

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", handleAbort);
      const merged = mergeSamples(chunks);
      void cleanup().finally(() => {
        if (error) {
          reject(error);
        } else if (!speechStartedAt || merged.length === 0) {
          reject(new Error("Mo pa finn tann okenn lavwa. Reeseye."));
        } else {
          resolve(encodePcmWav(merged, context.sampleRate));
        }
      });
    };

    const handleAbort = () => finish(abortError());
    signal?.addEventListener("abort", handleAbort, { once: true });

    processor.onaudioprocess = (event) => {
      if (finished) return;
      const now = Date.now();
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input);
      chunks.push(copy);

      let energy = 0;
      for (const sample of input) energy += sample * sample;
      const rms = Math.sqrt(energy / input.length);
      onLevel?.(Math.min(1, rms * 14));

      if (now - startedAt < 700) calibrationLevels.push(rms);
      const sortedCalibration = [...calibrationLevels].sort(
        (left, right) => left - right,
      );
      const quietFrameCount = Math.max(
        1,
        Math.ceil(sortedCalibration.length * 0.4),
      );
      const quietFrames = sortedCalibration.slice(0, quietFrameCount);
      const ambient =
        quietFrames.length > 0
          ? quietFrames.reduce((sum, level) => sum + level, 0) /
            quietFrames.length
          : 0;
      const voiceThreshold = Math.max(0.01, ambient * 2.4);

      if (rms >= voiceThreshold) {
        consecutiveVoiceFrames += 1;
        lastVoiceAt = now;
        if (!speechStartedAt && consecutiveVoiceFrames >= 4) {
          speechStartedAt = now;
          onSpeechStart?.();
        }
      } else {
        consecutiveVoiceFrames = 0;
      }

      const spokeLongEnough =
        speechStartedAt > 0 && now - speechStartedAt >= MIN_SPEECH_MS;
      if (
        spokeLongEnough &&
        lastVoiceAt > 0 &&
        now - lastVoiceAt >= END_SILENCE_MS
      ) {
        finish();
        return;
      }
      if (!speechStartedAt && now - startedAt >= NO_SPEECH_TIMEOUT_MS) {
        finish(new Error("Mo pa finn tann okenn lavwa. Reeseye."));
        return;
      }
      if (now - startedAt >= MAX_RECORDING_MS) finish();
    };
  });
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { detail?: string; error?: string };
    return body.detail ?? body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function requestWithTimeout(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort(externalSignal?.reason);
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (externalSignal?.aborted) {
    forwardAbort();
  } else {
    externalSignal?.addEventListener("abort", forwardAbort, {
      once: true,
    });
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      window.clearTimeout(timer);
      externalSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

/** Send PCM WAV audio through the selected MMS language adapter. */
export async function transcribeSpeech(
  wavAudio: Blob,
  language: Language,
  signal?: AbortSignal,
) {
  const request = requestWithTimeout(signal, TRANSCRIPTION_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${apiBaseUrl()}/api/v1/language/transcribe?language=${language}`,
      {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wavAudio,
        signal: request.signal,
      },
    );
    if (!response.ok) throw new Error(await readApiError(response));
    return (await response.json()) as TranscriptDraft;
  } catch (error) {
    if (request.timedOut()) {
      throw new Error(
        language === "mfe"
          ? "Transkripsion pe pran tro boukou letan. Re-ese."
          : "Transcription is taking too long. Try again.",
      );
    }
    throw error;
  } finally {
    request.cleanup();
  }
}

/** Preserve the original Morisien-only call for existing integrations. */
export async function transcribeMorisien(
  wavAudio: Blob,
  signal?: AbortSignal,
) {
  return transcribeSpeech(wavAudio, "mfe", signal);
}

/** Continue the shared safe Gemma conversation using confirmed text only. */
export async function continueConversation(
  confirmedTranscript: string,
  caseId?: string,
  signal?: AbortSignal,
  language: ConversationLanguage | null = null,
) {
  const request = requestWithTimeout(signal, 28_000);
  try {
    const response = await fetch(
      `${apiBaseUrl()}/api/v1/language/conversation/turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId ?? null,
          confirmed_transcript: confirmedTranscript,
          language,
        }),
        signal: request.signal,
      },
    );
    if (!response.ok) throw new Error(await readApiError(response));
    return (await response.json()) as ConversationTurn;
  } catch (error) {
    if (request.timedOut()) {
      throw new Error(
        language === "mfe"
          ? "Dokter Plant pe pran tro boukou letan. Reeseye."
          : "Dokter Plant is taking too long. Please try again.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        language === "mfe"
          ? "Dokter Plant pa finn konekte ar servis AI. Re-eseye."
          : "Dokter Plant could not connect to the AI service. Please retry.",
      );
    }
    throw error;
  } finally {
    request.cleanup();
  }
}

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`Pa finn kapav lir ${file.name}.`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error(`Format ${file.name} pa valide.`));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Continue a turn with real multimodal crop-image analysis. */
export async function continueConversationWithImages(
  confirmedTranscript: string,
  images: File[],
  caseId?: string,
  signal?: AbortSignal,
  language: ConversationLanguage | null = null,
) {
  const encodedImages = await Promise.all(
    images.map(async (image) => ({
      filename: image.name,
      mime_type: image.type,
      data_base64: await fileAsBase64(image),
    })),
  );
  const request = requestWithTimeout(signal, 45_000);
  try {
    const response = await fetch(
      `${apiBaseUrl()}/api/v1/language/conversation/turn-with-images`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId ?? null,
          confirmed_transcript: confirmedTranscript,
          language,
          images: encodedImages,
        }),
        signal: request.signal,
      },
    );
    if (!response.ok) throw new Error(await readApiError(response));
    return (await response.json()) as ConversationTurn;
  } catch (error) {
    if (request.timedOut()) {
      throw new Error(
        language === "mfe"
          ? "Analiz foto pe pran tro boukou letan. Reeseye."
          : "Image analysis is taking too long. Please try again.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        language === "mfe"
          ? "Analiz foto pa finn konekte ar servis AI. Re-eseye."
          : "Image analysis could not connect to the AI service. Please retry.",
      );
    }
    throw error;
  } finally {
    request.cleanup();
  }
}

/** Generate calibrated Morisien audio through the shared FastAPI service. */
export async function synthesizeMorisien(
  text: string,
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiBaseUrl()}/api/v1/language/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return response.blob();
}

/** Play generated speech and resolve only after the reply finishes. */
export async function playAudioBlob(
  audioBlob: Blob,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw abortError();
  if (voicePlaybackContext && voicePlaybackContext.state !== "closed") {
    if (voicePlaybackContext.state === "suspended") {
      await voicePlaybackContext.resume();
    }
    const decoded = await voicePlaybackContext.decodeAudioData(
      await audioBlob.arrayBuffer(),
    );
    const source = voicePlaybackContext.createBufferSource();
    source.buffer = decoded;
    source.connect(voicePlaybackContext.destination);

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        signal?.removeEventListener("abort", handleAbort);
        source.disconnect();
      };
      const handleAbort = () => {
        try {
          source.stop();
        } catch {
          // The source may already have completed.
        }
        cleanup();
        reject(abortError());
      };
      signal?.addEventListener("abort", handleAbort, { once: true });
      source.onended = () => {
        cleanup();
        resolve();
      };
      source.start();
    });
  }

  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      URL.revokeObjectURL(url);
    };
    const handleAbort = () => {
      audio.pause();
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Mo pa finn kapav zwe repons lavwa-la."));
    };
    void audio.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

export async function speakMorisien(
  text: string,
  signal?: AbortSignal,
) {
  const audio = await synthesizeMorisien(text, signal);
  await playAudioBlob(audio, signal);
}

/** Speak an English reply and keep cancellation tied to the voice session. */
export async function speakEnglish(
  text: string,
  signal?: AbortSignal,
) {
  if (!("speechSynthesis" in window)) {
    throw new Error("This browser cannot play an English voice reply.");
  }
  if (signal?.aborted) throw abortError();

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.96;

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      window.speechSynthesis.cancel();
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    utterance.onend = () => {
      cleanup();
      resolve();
    };
    utterance.onerror = () => {
      cleanup();
      reject(new Error("The English voice reply could not be played."));
    };
    window.speechSynthesis.speak(utterance);
  });
}

/** Speak in the same language selected for this conversation. */
export async function speakConversationReply(
  text: string,
  language: Language,
  signal?: AbortSignal,
) {
  if (language === "mfe") {
    await speakMorisien(text, signal);
    return;
  }
  await speakEnglish(text, signal);
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
