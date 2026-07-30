"use client";

import {
  AudioLines,
  Bot,
  ImagePlus,
  Leaf,
  LoaderCircle,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  continueConversation,
  continueConversationWithImages,
  isAbortError,
  microphoneErrorMessage,
  prepareVoicePlayback,
  speakMorisien,
  startManualSpeechRecording,
  transcribeSpeech,
  type ConversationLanguage,
  type ManualSpeechRecorder,
  type ShopProductContext,
} from "../../lib/voice-client";
import type { RiskLevel } from "../../types";
import { Footer } from "../Footer";
import { HandsFreeVoiceConversation } from "../HandsFreeVoiceConversation";
import { Header } from "../Header";

const doctorCopy = {
  mfe: {
    eyebrow: "Asistan agrikol",
    title: "Dokter Plant",
    intro:
      "Koz ar Dokter Plant lor bann sign ki ou trouve. Azout foto pou gard tou detay dan mem konversasion.",
    online: "Pare pou ede",
    welcome:
      "Bonzour! Dir mwa ki plant ou ena ek ki sanzman ou finn remarke. Ou kapav ekrir, koze ouswa azout enn foto.",
    prompt: "Dekrir problem ou plant…",
    send: "Avoy mesaz",
    attach: "Azout foto",
    listen: "Koz ar Dokter Plant",
    stopListening: "Aret ekoute",
    listening: "Mo pe ekout ou…",
    conversation: "Koumans enn konversasion lavwa",
    imageDescription:
      "Azout osi enn deskripsion text pou Gemma analiz foto-la dan so konteks.",
    voiceUnsupported:
      "Sa browser-la pa soutenir dikte vokal. Ou kapav ekrir ou mesaz.",
    speak: "Lir repons-la",
    suggestions: "Ki ou kapav fer aster",
    privacyTitle: "Ou foto res prive",
    privacy:
      "Bann foto servi zis pou prepar sa repons-la. Zot pa anrezistre dan enn bazdone. Pa azout figir, nom ouswa lezot detay personel.",
    diagnosis:
      "Dokter Plant donn enn premie gid baze lor ou deskripsion; li pa ranplas enn diagnostic profesionnnel.",
    error: "Dokter Plant pa finn kapav reponn. Reeseye dan enn moman.",
    quickTitle: "Koumans ar enn lexanp",
    quickPrompts: [
      "Mo bann fey tomat ena tach nwar.",
      "Mo plant piman pe vinn zonn.",
      "Ena bann trou lor mo fey.",
    ],
    attachmentLimit: "Ziska 3 foto · JPEG, PNG ouswa WebP",
    imageAlt: "Foto plant ki finn swazir",
  },
  en: {
    eyebrow: "Agricultural assistant",
    title: "Dokter Plant",
    intro:
      "Chat with Dokter Plant about visible symptoms. Add photos to keep every detail in one conversation.",
    online: "Ready to help",
    welcome:
      "Hello! Tell me which plant you have and what changed. You can type, speak or attach a photo.",
    prompt: "Describe your plant problem…",
    send: "Send message",
    attach: "Attach photos",
    listen: "Speak to Dokter Plant",
    stopListening: "Stop listening",
    listening: "Listening to you…",
    conversation: "Start a hands-free voice conversation",
    imageDescription:
      "Add a written description so Gemma can analyse the image in context.",
    voiceUnsupported:
      "Voice dictation is not supported by this browser. You can type your message instead.",
    speak: "Read this reply aloud",
    suggestions: "What you can do now",
    privacyTitle: "Your photos stay private",
    privacy:
      "Photos are processed only to prepare this response and are not saved in a database. Avoid faces, names or other personal details.",
    diagnosis:
      "Dokter Plant gives preliminary guidance from your description; it does not replace a professional diagnosis.",
    error: "Dokter Plant could not answer. Please try again in a moment.",
    quickTitle: "Start with an example",
    quickPrompts: [
      "My tomato leaves have black spots.",
      "My chilli plant is turning yellow.",
      "There are holes in my leaves.",
    ],
    attachmentLimit: "Up to 3 photos · JPEG, PNG or WebP",
    imageAlt: "Selected plant photo",
  },
} as const;

type AttachmentPreview = {
  id: string;
  file: File;
  previewUrl: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  language: ConversationLanguage;
  attachments?: string[];
  actions?: string[];
  disclaimer?: string;
  risk?: RiskLevel;
};

const MAX_ATTACHMENTS = 3;
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function shopProductAction(
  product: ShopProductContext,
  language: ConversationLanguage,
) {
  const status = {
    en: {
      in_stock: "in stock",
      low_stock: "low stock",
      out_of_stock: "out of stock",
      unknown: "stock not recorded",
    },
    fr: {
      in_stock: "en stock",
      low_stock: "stock faible",
      out_of_stock: "en rupture de stock",
      unknown: "stock non enregistré",
    },
    mfe: {
      in_stock: "ena an stok",
      low_stock: "stok pe fini",
      out_of_stock: "pena an stok",
      unknown: "stok pa finn anrezistre",
    },
  }[language][product.stock_status];
  const name =
    language === "mfe" && product.name_mfe ? product.name_mfe : product.name;
  return `${name} [${product.id}] — ${status}`;
}

/** Dedicated plant-assistant conversation with voice, speech and attachments. */
export function CheckPlantPage() {
  const { language, setLanguage } = useLanguage();
  const content = doctorCopy[language];
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [quickMicInitialising, setQuickMicInitialising] = useState(false);
  const [quickMicProcessing, setQuickMicProcessing] = useState(false);
  const [voiceConversationOpen, setVoiceConversationOpen] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const quickMicAbortRef = useRef<AbortController | null>(null);
  const quickMicRecorderRef = useRef<ManualSpeechRecorder | null>(null);
  const chatCaseIdRef = useRef<string | undefined>(undefined);
  const attachmentsRef = useRef<AttachmentPreview[]>([]);
  const submittingRef = useRef(false);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl),
      );
      quickMicRecorderRef.current?.cancel();
      quickMicRecorderRef.current = null;
      quickMicAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  /** Adds up to three local previews without uploading anything yet. */
  const addAttachments = (files: FileList | null) => {
    if (!files) return;

    setAttachments((current) => {
      const availableSlots = MAX_ATTACHMENTS - current.length;
      const selected = Array.from(files)
        .filter(
          (file) =>
            SUPPORTED_ATTACHMENT_TYPES.has(file.type) &&
            !current.some(
              (attachment) =>
                attachment.file.name === file.name &&
                attachment.file.size === file.size &&
                attachment.file.lastModified === file.lastModified,
            ),
        )
        .slice(0, availableSlots)
        .map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));

      return [...current, ...selected];
    });
    setError("");
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => {
        if (attachment.id === id) {
          URL.revokeObjectURL(attachment.previewUrl);
          return false;
        }
        return true;
      }),
    );
  };

  /** Records until the same button is pressed, then fills the composer. */
  const toggleVoiceInput = async () => {
    if (quickMicInitialising || quickMicProcessing) return;

    if (listening) {
      const recorder = quickMicRecorderRef.current;
      const controller = quickMicAbortRef.current;
      if (!recorder || !controller) {
        setListening(false);
        return;
      }

      quickMicRecorderRef.current = null;
      setListening(false);
      setQuickMicProcessing(true);
      try {
        const wav = await recorder.stop();
        const draft = await transcribeSpeech(
          wav,
          language,
          controller.signal,
        );
        setPrompt((current) =>
          `${current} ${draft.corrected_transcript}`.trim(),
        );
      } catch (voiceError) {
        if (!isAbortError(voiceError)) {
          setError(
            voiceError instanceof Error
              ? voiceError.message
              : content.voiceUnsupported,
          );
        }
      } finally {
        if (quickMicAbortRef.current === controller) {
          quickMicAbortRef.current = null;
        }
        setQuickMicProcessing(false);
      }
      return;
    }

    const controller = new AbortController();
    quickMicAbortRef.current = controller;
    setError("");
    setQuickMicInitialising(true);
    try {
      const recorder = await startManualSpeechRecording({
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        recorder.cancel();
        return;
      }
      quickMicRecorderRef.current = recorder;
      setListening(true);
    } catch (voiceError) {
      if (!isAbortError(voiceError)) {
        setError(microphoneErrorMessage(voiceError, language));
      }
      if (quickMicAbortRef.current === controller) {
        quickMicAbortRef.current = null;
        setListening(false);
      }
    } finally {
      setQuickMicInitialising(false);
    }
  };

  /** Reads Morisien replies with the calibrated model. */
  const speakReply = async (
    text: string,
    replyLanguage: ConversationLanguage,
  ) => {
    if (replyLanguage === "mfe") {
      try {
        await prepareVoicePlayback();
        await speakMorisien(text);
      } catch (speechError) {
        setError(
          speechError instanceof Error ? speechError.message : content.error,
        );
      }
      return;
    }
    if (!("speechSynthesis" in window)) {
      setError(content.voiceUnsupported);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = replyLanguage === "fr" ? "fr-FR" : "en-GB";
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
  };

  const submitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError(
        attachments.length
          ? content.imageDescription
          : language === "mfe"
            ? "Ekrir enn kestion ouswa servi mikro."
            : "Write a question or use the microphone.",
      );
      return;
    }

    const sentAttachments = [...attachments];
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      body: cleanPrompt,
      language,
      attachments: sentAttachments.map((attachment) => attachment.file.name),
    };

    submittingRef.current = true;
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setError("");
    setSubmitting(true);

    try {
      const turn = sentAttachments.length
        ? await continueConversationWithImages(
            cleanPrompt,
            sentAttachments.map((attachment) => attachment.file),
            chatCaseIdRef.current,
            undefined,
            language,
          )
        : await continueConversation(
            cleanPrompt,
            chatCaseIdRef.current,
            undefined,
            language,
          );
      chatCaseIdRef.current = turn.case_id;
      const risk =
        turn.urgency === "medium" ? "moderate" : turn.urgency;

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          body: turn.reply_text,
          language: turn.reply_language,
          actions: [
            ...(turn.recommended_actions ?? []),
            ...(turn.shop_products ?? []).map((product) =>
              shopProductAction(product, turn.reply_language),
            ),
          ],
          risk,
          disclaimer: content.diagnosis,
        },
      ]);
      sentAttachments.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl),
      );
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : content.error;
      setError(errorMessage);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          body:
            language === "mfe"
              ? `Mo pa finn kapav fini sa repons-la. ${errorMessage}`
              : `I could not complete that reply. ${errorMessage}`,
          language,
        },
      ]);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="inner-page doctor-page">
      <div className="inner-page-header">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath="/check-plant"
        />
      </div>

      <section className="doctor-workspace">
        <aside className="doctor-profile">
          <div className="doctor-mark" aria-hidden="true">
            <Leaf size={29} />
            <Sparkles size={16} />
          </div>
          <span className="eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <div className="doctor-online">
            <span aria-hidden="true" />
            {content.online}
          </div>

          <div className="doctor-privacy">
            <ShieldCheck size={22} />
            <div>
              <strong>{content.privacyTitle}</strong>
              <p>{content.privacy}</p>
            </div>
          </div>
          <p className="doctor-diagnosis-note">{content.diagnosis}</p>
        </aside>

        <div className="doctor-chat">
          <div className="doctor-chat-header">
            <div className="doctor-avatar">
              <Bot size={21} />
            </div>
            <div>
              <strong>Dokter Plant</strong>
              <span>{content.online}</span>
            </div>
          </div>

          <div className="doctor-messages" aria-live="polite">
            <article className="chat-message assistant-message">
              <div className="message-avatar">
                <Leaf size={18} />
              </div>
              <div className="message-content">
                <p>{content.welcome}</p>
                <button
                  className="speak-reply"
                  type="button"
                  onClick={() => void speakReply(content.welcome, language)}
                  aria-label={content.speak}
                  title={content.speak}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </article>

            {!messages.length && (
              <div className="doctor-starters">
                <span>{content.quickTitle}</span>
                <div>
                  {content.quickPrompts.map((quickPrompt) => (
                    <button
                      type="button"
                      onClick={() => setPrompt(quickPrompt)}
                      key={quickPrompt}
                    >
                      {quickPrompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article
                className={`chat-message ${message.role}-message`}
                key={message.id}
              >
                <div className="message-avatar">
                  {message.role === "assistant" ? (
                    <Leaf size={18} />
                  ) : (
                    <span>{message.language === "mfe" ? "MO" : "ME"}</span>
                  )}
                </div>
                <div className="message-content">
                  {message.attachments?.length ? (
                    <div className="sent-attachments">
                      {message.attachments.map((name, index) => (
                        <span key={`${name}-${index}`}>
                          <Paperclip size={13} />
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p>{message.body}</p>
                  {message.actions?.length ? (
                    <div className={`doctor-actions risk-${message.risk}`}>
                      <strong>{content.suggestions}</strong>
                      <ul>
                        {message.actions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {message.disclaimer && (
                    <small>{message.disclaimer}</small>
                  )}
                  {message.role === "assistant" && (
                    <button
                      className="speak-reply"
                      type="button"
                      onClick={() =>
                        void speakReply(
                          [message.body, ...(message.actions ?? [])].join(". "),
                          message.language,
                        )
                      }
                      aria-label={content.speak}
                      title={content.speak}
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            ))}

            {submitting && (
              <article className="chat-message assistant-message">
                <div className="message-avatar">
                  <Leaf size={18} />
                </div>
                <div className="message-content thinking-message">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            )}
          </div>

          <div className="doctor-composer">
            {attachments.length > 0 && (
              <>
                <div className="attachment-previews">
                  {attachments.map((attachment) => (
                    <div className="attachment-preview" key={attachment.id}>
                      {/* Blob previews are local and cannot be optimised by Next Image. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.previewUrl}
                        alt={content.imageAlt}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        aria-label={`Remove ${attachment.file.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="attachment-consent">
                  <ShieldCheck size={15} />
                  <span>{content.privacy}</span>
                </div>
              </>
            )}

            <form ref={formRef} onSubmit={submitMessage}>
              <input
                ref={fileInputRef}
                id="doctor-attachments"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(event) => addAttachments(event.target.files)}
              />
              <button
                className="composer-tool"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  submitting || attachments.length >= MAX_ATTACHMENTS
                }
                aria-label={content.attach}
                title={content.attach}
              >
                <ImagePlus size={21} />
              </button>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={content.prompt}
                aria-label={content.prompt}
              />
              <button
                className={`composer-tool voice-tool ${
                  listening ? "listening" : ""
                }`}
                type="button"
                onClick={toggleVoiceInput}
                disabled={
                  submitting || quickMicInitialising || quickMicProcessing
                }
                aria-pressed={listening}
                aria-label={
                  listening ? content.stopListening : content.listen
                }
                title={listening ? content.stopListening : content.listen}
              >
                {quickMicInitialising || quickMicProcessing ? (
                  <LoaderCircle className="spin" size={21} />
                ) : listening ? (
                  <Square size={18} fill="currentColor" />
                ) : (
                  <Mic size={21} />
                )}
              </button>
              <button
                className="composer-tool conversation-tool"
                type="button"
                onClick={() => {
                  setError("");
                  void prepareVoicePlayback().catch(() => undefined);
                  setVoiceConversationOpen(true);
                }}
                disabled={submitting || voiceConversationOpen}
                aria-label={content.conversation}
                title={content.conversation}
              >
                <AudioLines size={22} />
              </button>
              <button
                className="composer-send"
                type="submit"
                disabled={
                  submitting || (!prompt.trim() && !attachments.length)
                }
                aria-label={content.send}
                title={content.send}
              >
                {submitting ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>

            <div className="composer-meta">
              <span>
                <Paperclip size={13} />
                {content.attachmentLimit}
              </span>
              {listening && (
                <strong>
                  <span aria-hidden="true" />
                  {content.listening} Tape mikro ankor kan ou fini.
                </strong>
              )}
              {quickMicProcessing && (
                <strong>
                  <LoaderCircle className="spin" size={13} />
                  Pe transkrir ou lavwa...
                </strong>
              )}
              {quickMicInitialising && (
                <strong>
                  <LoaderCircle className="spin" size={13} />
                  {language === "mfe"
                    ? "Pe demann permision mikro..."
                    : "Requesting microphone permission..."}
                </strong>
              )}
            </div>
            {error && (
              <p className="doctor-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer language={language} />
      {voiceConversationOpen && (
        <HandsFreeVoiceConversation
          language={language}
          onClose={() => setVoiceConversationOpen(false)}
          onTurn={(turn) => {
            setMessages((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                role: "user",
                body: turn.confirmed_transcript,
                language: turn.source_language,
              },
              {
                id: crypto.randomUUID(),
                role: "assistant",
                body: turn.reply_text,
                language: turn.reply_language,
                disclaimer: content.diagnosis,
              },
            ]);
          }}
        />
      )}
    </main>
  );
}
