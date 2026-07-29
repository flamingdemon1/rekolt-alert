"use client";

import {
  Bot,
  ImagePlus,
  Leaf,
  LoaderCircle,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlantChatReply } from "../../backend/plant-chat/plant-chat.types";
import { useLanguage } from "../../context/LanguageContext";
import type { RiskLevel } from "../../types";
import { Footer } from "../Footer";
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
    attachmentLimit: "Ziska 3 foto · JPEG, PNG, WebP ouswa HEIC",
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
    attachmentLimit: "Up to 3 photos · JPEG, PNG, WebP or HEIC",
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
  attachments?: string[];
  actions?: string[];
  disclaimer?: string;
  risk?: RiskLevel;
};

type SpeechResultEvent = {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const MAX_ATTACHMENTS = 3;
const TARGET_ATTACHMENT_BYTES = 420 * 1024;
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

/**
 * Compresses large phone photos before upload so chat turns remain quick and
 * comfortably below the server request limit.
 */
async function prepareAttachment(file: File) {
  if (file.size <= TARGET_ATTACHMENT_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");

  if (!context) throw new Error("This image could not be prepared.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let preparedBlob: Blob | null = null;
  for (const quality of [0.8, 0.68, 0.56, 0.46]) {
    preparedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (preparedBlob && preparedBlob.size <= TARGET_ATTACHMENT_BYTES) break;
  }
  if (!preparedBlob) throw new Error("This image could not be prepared.");

  const name = file.name.replace(/\.[^.]+$/, "") + "-prepared.jpg";
  return new File([preparedBlob], name, { type: "image/jpeg" });
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
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const attachmentsRef = useRef<AttachmentPreview[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl),
      );
      recognitionRef.current?.stop();
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

  /** Uses browser speech recognition as a microphone-powered prompt input. */
  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError(content.voiceUnsupported);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "mfe" ? "fr-FR" : "en-GB";
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]?.[0]?.transcript;
      if (result) {
        setPrompt((current) => `${current} ${result}`.trim());
      }
    };
    recognition.onerror = () => {
      setError(content.voiceUnsupported);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  };

  /** Reads any assistant reply using the device's built-in speech voice. */
  const speakReply = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setError(content.voiceUnsupported);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "mfe" ? "fr-FR" : "en-GB";
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
  };

  const submitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt && !attachments.length) {
      setError(
        language === "mfe"
          ? "Ekrir enn kestion ouswa azout enn foto."
          : "Write a question or attach a photo.",
      );
      return;
    }

    const sentAttachments = [...attachments];
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      body:
        cleanPrompt ||
        (language === "mfe"
          ? "Mo pe avoy bann foto sa plant-la."
          : "I am sending photos of this plant."),
      attachments: sentAttachments.map((attachment) => attachment.file.name),
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setError("");
    setSubmitting(true);

    try {
      const form = new FormData();
      form.set("prompt", cleanPrompt);
      const preparedAttachments = await Promise.all(
        sentAttachments.map((attachment) =>
          prepareAttachment(attachment.file),
        ),
      );
      preparedAttachments.forEach((file) =>
        form.append("attachments", file, file.name),
      );

      const response = await fetch("/api/plant-chat", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as PlantChatReply & {
        error?: string;
      };

      if (!response.ok) throw new Error(data.error || content.error);

      setMessages((current) => [
        ...current,
        {
          id: data.id,
          role: "assistant",
          body: data.message[language],
          actions: data.actions[language],
          disclaimer: `${data.disclaimer[language]} ${data.privacy[language]}`,
          risk: data.risk,
        },
      ]);
      sentAttachments.forEach((attachment) =>
        URL.revokeObjectURL(attachment.previewUrl),
      );
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (submitError) {
      setPrompt(cleanPrompt);
      setError(
        submitError instanceof Error ? submitError.message : content.error,
      );
    } finally {
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
                  onClick={() => speakReply(content.welcome)}
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
                    <span>{language === "mfe" ? "MO" : "ME"}</span>
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
                        speakReply(
                          [message.body, ...(message.actions ?? [])].join(". "),
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
                accept="image/jpeg,image/png,image/webp,image/heic"
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
                disabled={submitting}
                aria-pressed={listening}
                aria-label={
                  listening ? content.stopListening : content.listen
                }
                title={listening ? content.stopListening : content.listen}
              >
                <Mic size={21} />
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
                  {content.listening}
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
    </main>
  );
}
