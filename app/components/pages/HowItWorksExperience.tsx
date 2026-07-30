"use client";

import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Download,
  FileText,
  History,
  ImageIcon,
  Leaf,
  MapPin,
  MessageCircleQuestion,
  Mic,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  TriangleAlert,
  Type,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import type { Language } from "../../types";
import { Footer } from "../Footer";
import { Header } from "../Header";
import styles from "../../kouma-li-marse/how-it-works.module.css";

export const INITIAL_ACTIVE_STAGE = 0;

const pageCopy = {
  en: {
    back: "Back home",
    eyebrow: "From concern to clear next steps",
    title: "See one crop case come to life.",
    intro:
      "Follow a farmer's question as Rekolt Alert brings together their words, crop imagery and local context to prepare cautious, practical guidance.",
    start: "Start with your crop",
    explore: "Explore the five stages",
    heroLabel: "A connected crop journey",
    heroStatement: "My tomato leaves have dark spots after the rain.",
    heroResult: "Practical next steps, with uncertainty made clear.",
    contextItems: [
      ["Two ways to explain", "Text or voice, in English or Kreol Morisien"],
      ["One connected case", "Image, weather and farmer observations stay together"],
      ["A responsible result", "Safe first steps, follow-up questions and clear limits"],
    ],
    journeyEyebrow: "Interactive walkthrough",
    journeyTitle: "Every answer is built in five visible stages.",
    journeyIntro:
      "Select a stage to see how the same crop concern moves through Rekolt Alert. This walkthrough is illustrative and does not run a live diagnosis.",
    stages: [
      {
        short: "Share",
        title: "Share the problem",
        body: "The farmer writes, speaks or adds a crop photo. Their own observations remain the starting point.",
      },
      {
        short: "Understand",
        title: "Gemma understands",
        body: "Gemma examines the farmer's message and image together, separating visible signs from possible causes.",
      },
      {
        short: "Context",
        title: "Add local context",
        body: "Weather, location, case history and relevant shop data can add useful context without overriding the evidence.",
      },
      {
        short: "Guide",
        title: "Prepare practical guidance",
        body: "The assistant suggests safe first steps, explains uncertainty and asks focused follow-up questions.",
      },
      {
        short: "Result",
        title: "Review the result",
        body: "The farmer receives a structured preliminary result they can continue, save or share for professional review.",
      },
    ],
    previous: "Previous stage",
    next: "Next stage",
    stageOf: (current: number) => `Stage ${current} of 5`,
    demo: {
      illustrative: "Illustrative workflow",
      statement: "Farmer statement",
      input: "My tomato leaves have dark spots after the rain.",
      addPhoto: "Crop photo added",
      voice: "Voice",
      text: "Text",
      processing: "Examining image and statement together",
      visible: "Visible observations",
      observations: ["Dark leaf spots", "Leaf edges curling", "Wet foliage"],
      notDiagnosis: "Possible observations — not a confirmed diagnosis",
      weather: "Recent weather",
      weatherValue: "Rain and humid conditions",
      place: "Local context",
      placeValue: "Farmer-authorised district context",
      catalogue: "Relevant catalogue",
      catalogueValue: "Only matched, real products",
      case: "Case history",
      caseValue: "Farmer's previous observations",
      action: "Immediate safe action",
      actionValue:
        "Remove badly affected leaves and keep them away from healthy plants.",
      possibility: "What may be contributing",
      possibilityValue:
        "Persistent leaf moisture can increase the risk of several crop problems.",
      questions: "Useful follow-up questions",
      questionItems: [
        "Are new leaves also affected?",
        "Did the spots appear after heavy rain?",
        "Are stems or fruit showing changes?",
      ],
      urgency: "Review promptly if the problem spreads",
      result: "Preliminary crop risk result",
      resultIntro:
        "A clear summary keeps observations, possibilities and next steps separate.",
      reportItems: [
        "Farmer statement and crop photo",
        "Visible observations",
        "Possible risks with uncertainty",
        "Safe actions and follow-up questions",
      ],
      continue: "Continue conversation",
      download: "Report ready to review",
    },
    responsibleEyebrow: "Responsible by design",
    responsibleTitle: "Helpful guidance without false certainty.",
    responsibleBody:
      "Rekolt Alert is designed to show what the farmer reported, what the system observed and what remains uncertain. It supports — but never replaces — qualified agricultural judgement.",
    principles: [
      ["Observations stay separate from possible causes", ScanLine],
      ["Safer non-chemical steps come first", Leaf],
      ["Urgent or uncertain cases are clearly escalated", TriangleAlert],
      ["Shop products appear only when they exist in the catalogue", ShoppingBag],
    ],
    ctaTitle: "Ready to start with your own crop?",
    ctaBody:
      "Describe what changed, add a clear photo if you have one, and build the case one step at a time.",
    ctaPrimary: "Check a plant",
    ctaSecondary: "Explore district data",
  },
  mfe: {
    back: "Retour Akey",
    eyebrow: "Depi enn problem ziska bann prosin etap kler",
    title: "Get enn ka plant pran lavi.",
    intro:
      "Swiv kestyon enn planter pandan ki Rekolt Alert rasanble so bann parol, zimaz plant ek kontext lokal pou prepar enn gid pridan ek pratik.",
    start: "Koumans avek ou plant",
    explore: "Dekouver sink etap-la",
    heroLabel: "Enn parkour plant konekte",
    heroStatement: "Fey mo bann tomate ena tas nwar apre lapli.",
    heroResult: "Bann prosin etap pratik, avek dout explike kler.",
    contextItems: [
      ["De fason pou explike", "Text ouswa lavwa, an English ouswa Kreol Morisien"],
      ["Enn ka konekte", "Zimaz, meteo ek observasion planter res ansam"],
      ["Enn rezilta responsab", "Premie aksion sir, kestyon ek limit kler"],
    ],
    journeyEyebrow: "Parkour interaktif",
    journeyTitle: "Sak repons konstrir atraver sink etap vizib.",
    journeyIntro:
      "Swazir enn etap pou get kouma mem problem plant-la avanse dan Rekolt Alert. Sa parkour-la se enn lexanp viziel; li pa fer enn diagnostic an direk.",
    stages: [
      {
        short: "Partaze",
        title: "Partaz problem-la",
        body: "Planter ekrir, koze ouswa azout enn foto. So prop observasion res pwin depar.",
      },
      {
        short: "Konpran",
        title: "Gemma konpran",
        body: "Gemma examinn mesaz ek zimaz planter ansam, ek separ sign vizib depi bann lakoz posib.",
      },
      {
        short: "Kontext",
        title: "Azout kontext lokal",
        body: "Meteo, pozision, listwar ka ek done magazin apropriye azout kontext san ranplas bann prev.",
      },
      {
        short: "Gide",
        title: "Prepar enn gid pratik",
        body: "Asistan-la propoz bann premie aksion sir, explik dout ek poz bann kestyon presi.",
      },
      {
        short: "Rezilta",
        title: "Reviz rezilta-la",
        body: "Planter gagn enn rezilta preliminer striktire ki li kapav kontinie, sov ouswa partaze pou enn revi profesionel.",
      },
    ],
    previous: "Etap avan",
    next: "Prosin etap",
    stageOf: (current: number) => `Etap ${current} lor 5`,
    demo: {
      illustrative: "Lexanp viziel",
      statement: "Mesaz planter",
      input: "Fey mo bann tomate ena tas nwar apre lapli.",
      addPhoto: "Foto plant finn azoute",
      voice: "Lavwa",
      text: "Text",
      processing: "Pe examinn zimaz ek mesaz ansam",
      visible: "Observasion vizib",
      observations: ["Tas nwar lor fey", "Bor fey pe roule", "Fey-la ankor mouye"],
      notDiagnosis: "Observasion posib — pa enn diagnostic konfirme",
      weather: "Meteo resan",
      weatherValue: "Lapli ek kondision imid",
      place: "Kontext lokal",
      placeValue: "Kontext distrik otorize par planter",
      catalogue: "Katalog apropriye",
      catalogueValue: "Zis prodwi reel ki koresponn",
      case: "Listwar ka",
      caseValue: "Bann observasion avan planter",
      action: "Premie aksion sir",
      actionValue:
        "Tir bann fey bien afekte ek gard zot lwin ar bann plant ki an bonn sante.",
      possibility: "Seki kapav pe kontribie",
      possibilityValue:
        "Kan fey res mouye, risk plizier problem plant kapav ogmante.",
      questions: "Kestion itil pou kontinie",
      questionItems: [
        "Eski bann nouvo fey osi afekte?",
        "Eski tas-la finn aparet apre gro lapli?",
        "Eski tiz ouswa fri ena bann sanzman?",
      ],
      urgency: "Fer reviz vit si problem-la pe fane",
      result: "Rezilta preliminer lor risk plant",
      resultIntro:
        "Enn rezime kler separ observasion, posibilite ek bann prosin etap.",
      reportItems: [
        "Mesaz planter ek foto plant",
        "Observasion vizib",
        "Risk posib avek nivo dout",
        "Aksion sir ek kestyon pou kontinie",
      ],
      continue: "Kontinie konversasion",
      download: "Rapor pare pou revize",
    },
    responsibleEyebrow: "Responsab depi koumansman",
    responsibleTitle: "Enn gid itil san donn fos sertitid.",
    responsibleBody:
      "Rekolt Alert montre seki planter finn dir, seki sistem finn observe ek seki ankor pa sir. Li soutenir — me zame ranplas — zizman enn profesionel agrikol kalifie.",
    principles: [
      ["Observasion res separe depi lakoz posib", ScanLine],
      ["Bann aksion san prodwi simik vinn avan", Leaf],
      ["Ka irzan ouswa pa sir gagn signale kler", TriangleAlert],
      ["Prodwi magazin paret zis si zot dan katalog", ShoppingBag],
    ],
    ctaTitle: "Pare pou koumans avek ou prop plant?",
    ctaBody:
      "Dir seki finn sanze, azout enn foto kler si ou ena, ek konstrir ka-la enn etap alafwa.",
    ctaPrimary: "Verifie enn plant",
    ctaSecondary: "Get done distrik",
  },
} satisfies Record<Language, Record<string, unknown>>;

type Content = (typeof pageCopy)[Language];

function DemoPanel({ activeStage, content }: { activeStage: number; content: Content }) {
  const demo = content.demo;

  return (
    <div className={styles.demoShell}>
      <div className={styles.demoTopbar}>
        <span>
          <Sprout size={16} aria-hidden="true" />
          Rekolt Alert
        </span>
        <small>{demo.illustrative}</small>
      </div>

      <div className={styles.demoCanvas} key={activeStage}>
        {activeStage === 0 && (
          <div className={styles.shareScene}>
            <div className={styles.cropPreview}>
              <Image
                src="/rekolt-alert-hero.png"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 900px) 90vw, 46vw"
                aria-hidden="true"
              />
              <span>
                <Check size={14} aria-hidden="true" />
                {demo.addPhoto}
              </span>
            </div>
            <div className={styles.messageCard}>
              <small>{demo.statement}</small>
              <p>{demo.input}</p>
              <div>
                <span><Mic size={15} />{demo.voice}</span>
                <span><Type size={15} />{demo.text}</span>
                <span><ImageIcon size={15} />1</span>
              </div>
            </div>
          </div>
        )}

        {activeStage === 1 && (
          <div className={styles.analysisScene}>
            <div className={styles.scanPreview}>
              <Image
                src="/rekolt-alert-hero.png"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 900px) 90vw, 46vw"
                aria-hidden="true"
              />
              <i className={styles.scanBeam} aria-hidden="true" />
              <span><ScanLine size={17} />{demo.processing}</span>
            </div>
            <div className={styles.observationCard}>
              <small>{demo.visible}</small>
              <div>
                {demo.observations.map((item) => (
                  <span key={item}><Check size={14} />{item}</span>
                ))}
              </div>
              <p><ShieldCheck size={15} />{demo.notDiagnosis}</p>
            </div>
          </div>
        )}

        {activeStage === 2 && (
          <div className={styles.contextScene}>
            {[
              [demo.weather, demo.weatherValue, CloudSun],
              [demo.place, demo.placeValue, MapPin],
              [demo.catalogue, demo.catalogueValue, ShoppingBag],
              [demo.case, demo.caseValue, History],
            ].map(([label, value, Icon], index) => (
              <article style={{ "--delay": `${index * 70}ms` } as React.CSSProperties} key={String(label)}>
                <div><Icon size={21} aria-hidden="true" /></div>
                <small>{String(label)}</small>
                <strong>{String(value)}</strong>
              </article>
            ))}
            <div className={styles.contextCore}>
              <BrainCircuit size={29} aria-hidden="true" />
              <span>Gemma</span>
            </div>
          </div>
        )}

        {activeStage === 3 && (
          <div className={styles.guidanceScene}>
            <article className={styles.actionCard}>
              <span><Leaf size={18} />{demo.action}</span>
              <p>{demo.actionValue}</p>
            </article>
            <article className={styles.possibilityCard}>
              <span><Sparkles size={18} />{demo.possibility}</span>
              <p>{demo.possibilityValue}</p>
            </article>
            <article className={styles.questionCard}>
              <span><MessageCircleQuestion size={18} />{demo.questions}</span>
              <ol>
                {demo.questionItems.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </article>
            <div className={styles.urgencyBanner}>
              <TriangleAlert size={18} />
              {demo.urgency}
            </div>
          </div>
        )}

        {activeStage === 4 && (
          <div className={styles.resultScene}>
            <div className={styles.reportHeader}>
              <div><FileText size={24} /></div>
              <span>
                <small>{demo.illustrative}</small>
                <strong>{demo.result}</strong>
              </span>
            </div>
            <p>{demo.resultIntro}</p>
            <div className={styles.reportList}>
              {demo.reportItems.map((item, index) => (
                <span key={item}><i>0{index + 1}</i>{item}<Check size={15} /></span>
              ))}
            </div>
            <div className={styles.reportActions}>
              <span><MessageCircleQuestion size={17} />{demo.continue}</span>
              <span><Download size={17} />{demo.download}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HowItWorksExperience() {
  const { language, setLanguage } = useLanguage();
  const content = pageCopy[language] as Content;
  const [activeStage, setActiveStage] = useState(INITIAL_ACTIVE_STAGE);
  const touchStart = useRef<number | null>(null);

  const move = (direction: number) => {
    setActiveStage((current) => Math.min(4, Math.max(0, current + direction)));
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Header language={language} onLanguageChange={setLanguage} activePath="/kouma-li-marse" />
      </div>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={15} />
              {content.back}
            </Link>
            <span className={styles.eyebrow}>{content.eyebrow}</span>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
            <div className={styles.heroActions}>
              <Link href="/check-plant">{content.start}<ArrowRight size={18} /></Link>
              <a href="#journey">{content.explore}</a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label={content.heroLabel}>
            <Image
              src="/rekolt-alert-hero.png"
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 900px) 92vw, 48vw"
              aria-hidden="true"
            />
            <div className={styles.heroShade} aria-hidden="true" />
            <span className={styles.heroVisualLabel}><Sparkles size={15} />{content.heroLabel}</span>
            <div className={styles.heroMessage}>
              <Mic size={18} />
              <p>{content.heroStatement}</p>
            </div>
            <div className={styles.heroFlow} aria-hidden="true">
              <span><Camera size={18} /></span>
              <i />
              <span><BrainCircuit size={19} /></span>
              <i />
              <span><FileText size={18} /></span>
            </div>
            <div className={styles.heroOutcome}>
              <ShieldCheck size={20} />
              <p>{content.heroResult}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contextStrip} aria-label="Rekolt Alert workflow highlights">
        {content.contextItems.map(([title, body], index) => (
          <article key={title}>
            <span>0{index + 1}</span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </article>
        ))}
      </section>

      <section
        className={styles.journey}
        id="journey"
        tabIndex={0}
        aria-label={content.journeyTitle}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          }
        }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
          if (Math.abs(distance) > 48) move(distance > 0 ? -1 : 1);
          touchStart.current = null;
        }}
      >
        <div className={styles.journeyHeading}>
          <span>{content.journeyEyebrow}</span>
          <h2>{content.journeyTitle}</h2>
          <p>{content.journeyIntro}</p>
        </div>

        <div className={styles.journeyGrid}>
          <div className={styles.stageRail}>
            {content.stages.map((stage, index) => (
              <button
                className={index === activeStage ? styles.stageActive : ""}
                type="button"
                onClick={() => setActiveStage(index)}
                aria-current={index === activeStage ? "step" : undefined}
                key={stage.title}
              >
                <i>{index < activeStage ? <Check size={15} /> : `0${index + 1}`}</i>
                <span><small>{stage.short}</small><strong>{stage.title}</strong><p>{stage.body}</p></span>
              </button>
            ))}
            <div className={styles.stageControls}>
              <button type="button" onClick={() => move(-1)} disabled={activeStage === 0} aria-label={content.previous}>
                <ChevronLeft size={19} />
              </button>
              <span>{content.stageOf(activeStage + 1)}</span>
              <button type="button" onClick={() => move(1)} disabled={activeStage === 4} aria-label={content.next}>
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <DemoPanel activeStage={activeStage} content={content} />
        </div>
        <p className={styles.srOnly} aria-live="polite">
          {content.stageOf(activeStage + 1)}: {content.stages[activeStage].title}. {content.stages[activeStage].body}
        </p>
      </section>

      <section className={styles.responsible}>
        <div className={styles.responsibleCopy}>
          <span>{content.responsibleEyebrow}</span>
          <h2>{content.responsibleTitle}</h2>
          <p>{content.responsibleBody}</p>
        </div>
        <div className={styles.principleGrid}>
          {content.principles.map((principle, index) => {
            const label = principle[0] as string;
            const Icon = principle[1] as typeof ScanLine;

            return (
              <article key={label}>
                <div><Icon size={20} aria-hidden="true" /></div>
                <span>0{index + 1}</span>
                <p>{label}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.cta}>
        <div>
          <span><Sprout size={17} />Rekolt Alert</span>
          <h2>{content.ctaTitle}</h2>
          <p>{content.ctaBody}</p>
        </div>
        <div>
          <Link href="/check-plant">{content.ctaPrimary}<ArrowRight size={18} /></Link>
          <Link href="/banne-done">{content.ctaSecondary}</Link>
        </div>
      </section>

      <Footer language={language} />
    </main>
  );
}
