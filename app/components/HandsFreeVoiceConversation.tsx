"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  continueConversation,
  isAbortError,
  recordSpeechUntilSilence,
  speakConversationReply,
  transcribeSpeech,
  type ConversationTurn,
} from "../lib/voice-client";
import type { Language } from "../types";

type VoicePhase =
  | "starting"
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

interface HandsFreeVoiceConversationProps {
  language: Language;
  onClose: () => void;
  onTurn?: (turn: ConversationTurn) => void;
}

const phaseCopy: Record<
  Language,
  Record<VoicePhase, { title: string; detail: string }>
> = {
  mfe: {
    starting: { title: "Pe ouver mikro", detail: "Enn ti moman…" },
    idle: {
      title: "Dokter Plant pare",
      detail: "Tape mikro pou koze",
    },
    listening: {
      title: "Mo pe ekout ou",
      detail: "Koz normalman; mo pou reponn kan ou fini",
    },
    transcribing: {
      title: "MMS pe ekout recording-la",
      detail: "Mo pe transkrir…",
    },
    thinking: {
      title: "Gemma pe analiz ou mesaz",
      detail: "Mo pe prepar repons…",
    },
    speaking: {
      title: "Dokter Plant pe koze",
      detail: "Ekout repons-la",
    },
    error: {
      title: "Mo pa finn kapav kontinie",
      detail: "Tape pou resey",
    },
  },
  en: {
    starting: { title: "Opening microphone", detail: "One moment…" },
    idle: {
      title: "Dokter Plant is ready",
      detail: "Tap the microphone to speak",
    },
    listening: {
      title: "I am listening",
      detail: "Speak naturally; I will answer when you finish",
    },
    transcribing: {
      title: "MMS is processing the recording",
      detail: "Transcribing…",
    },
    thinking: {
      title: "Gemma is reviewing your message",
      detail: "Preparing a reply…",
    },
    speaking: {
      title: "Dokter Plant is speaking",
      detail: "Listen to the reply",
    },
    error: {
      title: "I could not continue",
      detail: "Tap to try again",
    },
  },
};

function VoiceGlyph({
  phase,
  onActivate,
}: {
  phase: VoicePhase;
  onActivate: () => void;
}) {
  return (
    <div className={`voice-stage phase-${phase}`}>
      <span aria-hidden="true" className="voice-orbit voice-orbit-one" />
      <span aria-hidden="true" className="voice-orbit voice-orbit-two" />
      <span aria-hidden="true" className="voice-level-ring" />
      <button
        aria-label="Start listening"
        className="voice-core voice-core-action"
        disabled={phase !== "idle" && phase !== "error"}
        onClick={onActivate}
        type="button"
      >
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M12 14a3.5 3.5 0 0 0 3.5-3.5v-4a3.5 3.5 0 1 0-7 0v4A3.5 3.5 0 0 0 12 14Zm-6-3.5a6 6 0 0 0 12 0M12 16.5V21m-3 0h6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </button>
      <span aria-hidden="true" className="voice-wave">
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
    </div>
  );
}

export function HandsFreeVoiceConversation({
  language,
  onClose,
  onTurn,
}: HandsFreeVoiceConversationProps) {
  const [phase, setPhase] = useState<VoicePhase>("starting");
  const [heardText, setHeardText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeRef = useRef(false);
  const runningRef = useRef(false);
  const sessionAbortRef = useRef<AbortController | null>(null);
  const onTurnRef = useRef(onTurn);
  const caseIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

  const runConversationTurn = useCallback(async (): Promise<boolean> => {
    if (!activeRef.current || runningRef.current) {
      return false;
    }

    runningRef.current = true;
    const signal = sessionAbortRef.current?.signal;

    try {
      setErrorMessage("");
      setPhase("listening");
      const wavAudio = await recordSpeechUntilSilence({ signal });

      if (!activeRef.current) return false;
      setPhase("transcribing");
      const transcript = await transcribeSpeech(
        wavAudio,
        language,
        signal,
      );
      const candidate = transcript.corrected_transcript.trim();

      if (!candidate) {
        throw new Error(
          language === "mfe"
            ? "Mo pa finn tann okenn parol. Koz enn tigit pli pre ar mikro."
            : "I could not hear any speech. Please speak a little closer to the microphone.",
        );
      }

      setHeardText(candidate);
      setPhase("thinking");

      const turn = await continueConversation(
        candidate,
        caseIdRef.current,
        signal,
        language,
      );
      setReplyText(turn.reply_text);
      onTurnRef.current?.(turn);

      if (!activeRef.current) return false;
      setPhase("speaking");
      await speakConversationReply(
        turn.reply_text,
        turn.reply_language === "mfe" ? "mfe" : "en",
        signal,
      );

      if (!activeRef.current) return false;
      runningRef.current = false;
      return true;
    } catch (error) {
      runningRef.current = false;
      if (isAbortError(error) || !activeRef.current) {
        return false;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : language === "mfe"
            ? "Konversasion-la finn arete."
            : "The conversation stopped.",
      );
      setPhase("error");
      return false;
    }
  }, [language]);

  const runConversationSession = useCallback(async () => {
    while (activeRef.current) {
      const completed = await runConversationTurn();
      if (!completed || !activeRef.current) return;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
  }, [runConversationTurn]);

  useEffect(() => {
    activeRef.current = true;
    sessionAbortRef.current = new AbortController();
    caseIdRef.current = `voice-${crypto.randomUUID()}`;

    const timer = window.setTimeout(() => {
      setPhase("idle");
      void runConversationSession();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      activeRef.current = false;
      runningRef.current = false;
      sessionAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, [runConversationSession]);

  const copy = phaseCopy[language][phase];

  const retry = () => {
    if (!activeRef.current || runningRef.current) return;
    void runConversationSession();
  };

  return (
    <div
      aria-label={
        language === "mfe"
          ? "Konversasion vokal avek Dokter Plant"
          : "Voice conversation with Dokter Plant"
      }
      aria-modal="true"
      className="voice-conversation-overlay"
      role="dialog"
    >
      <div className="voice-conversation-backdrop" />
      <section className="voice-conversation-card">
        <button
          aria-label={
            language === "mfe"
              ? "Ferm konversasion vokal"
              : "Close voice conversation"
          }
          className="voice-conversation-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="voice-conversation-brand">
          <span aria-hidden="true">✦</span>
          <strong>
            {language === "mfe"
              ? "Rekolt Alert · Konversasion vokal"
              : "Rekolt Alert · Voice conversation"}
          </strong>
        </div>

        <VoiceGlyph phase={phase} onActivate={retry} />

        <div aria-live="polite" className="voice-conversation-copy">
          <span>
            {phase === "listening"
              ? language === "mfe"
                ? "An direk"
                : "Live"
              : "Dokter Plant"}
          </span>
          <h2>{copy.title}</h2>
          <p>{copy.detail}</p>
          {heardText ? (
            <p className="voice-live-transcript">
              <strong>{language === "mfe" ? "Mo finn tann:" : "I heard:"}</strong>{" "}
              “{heardText}”
            </p>
          ) : null}
          {replyText ? (
            <p className="voice-live-reply">{replyText}</p>
          ) : null}
          {errorMessage ? (
            <p className="voice-conversation-error">{errorMessage}</p>
          ) : null}
        </div>

        <small className="voice-safety-note">
          {language === "mfe"
            ? "Dokter Plant donn enn premie gid; li pa ranplas enn profesionnnel kalifie."
            : "Dokter Plant gives preliminary guidance; it does not replace a qualified professional."}
        </small>

        <button
          className="voice-end-button"
          onClick={onClose}
          type="button"
        >
          {language === "mfe" ? "Fini konversasion" : "End conversation"}
        </button>
      </section>
    </div>
  );
}
