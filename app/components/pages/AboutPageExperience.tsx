"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Code2,
  FileText,
  LayoutDashboard,
  Mic,
  Monitor,
  Server,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import type { Language } from "../../types";
import { Footer } from "../Footer";
import { Header } from "../Header";
import styles from "../../lor-nou/about.module.css";

const INITIAL_ACTIVE_SLIDE = 1;

const pageCopy = {
  en: {
    back: "Back home",
    event: "Build with Gemma 2026 · Middlesex University Mauritius",
    heroTitle: "Built in Mauritius, for Mauritian farmers.",
    heroBody:
      "Rekolt Alert combines Gemma 4, crop imagery, local weather, shop data and multilingual guidance to help farmers understand crop problems and take useful first steps.",
    meetTeam: "Meet the team",
    seeHow: "See how it works",
    heroVisualLabel: "Created together in Mauritius",
    heroVisualTitle: "Five builders. One local mission.",
    storyEyebrow: "The reason behind the work",
    storyTitle: "Why we built Rekolt Alert",
    storyParagraphs: [
      "Farmers often notice crop problems before they know exactly what is happening. The information they need can be scattered, highly technical or unavailable in the language they use every day.",
      "We built Rekolt Alert to bring crop imagery, farmer descriptions, local weather, practical guidance and relevant shop products into one accessible experience. Farmers can communicate in English or Kreol Morisien and receive clear first-step support while important decisions remain under human control.",
    ],
    quote:
      "Technology should adapt to the farmer — not force the farmer to adapt to technology.",
    pillarsEyebrow: "Designed around the farmer",
    pillarsTitle: "Local support, from first question to next step.",
    pillars: [
      {
        title: "Speak naturally",
        body: "Farmers can explain crop problems in English or Kreol Morisien through text or voice.",
        icon: Mic,
      },
      {
        title: "Understand the field",
        body: "Gemma combines crop images, farmer descriptions, weather context and case information to understand the situation more clearly.",
        icon: BrainCircuit,
      },
      {
        title: "Act with confidence",
        body: "Rekolt Alert provides practical first steps, relevant shop products and clear warnings without pretending that AI replaces an agricultural professional.",
        icon: ShieldCheck,
      },
    ],
    processEyebrow: "One connected workflow",
    processTitle: "How Rekolt Alert works",
    process: [
      ["Farmer speaks or uploads an image", Camera],
      ["Gemma analyses the crop and description", BrainCircuit],
      ["Weather, case and shop context are checked", CloudSun],
      ["Practical guidance and relevant products are shown", ShoppingBag],
      ["The farmer may save or download a report", FileText],
    ],
    teamEyebrow: "Created collaboratively",
    teamTitle: "The team behind Rekolt Alert",
    teamIntro:
      "Rekolt Alert was created by five Middlesex University Mauritius students working across AI, backend engineering, frontend development, user experience and testing.",
    previous: "Show previous team slide",
    next: "Show next team slide",
    slides: [
      {
        label: "Our team",
        title: "Five people. One shared goal.",
        description:
          "Combining AI, engineering, design and local knowledge to create a practical tool for Mauritian agriculture.",
        image: "/team/team-group-back.jpeg",
        alt: "The five Rekolt Alert team members standing together at Build with Gemma, seen from behind",
      },
      {
        label: "Our identity",
        title: "Rekolt Alert",
        description:
          "Local technology designed to make agricultural support clearer, faster and more accessible.",
        image: "/team/team-logo.jpeg",
        alt: "Rekolt Alert team logo with a glowing code and agricultural emblem",
        logo: true,
      },
      {
        label: "Built together",
        title: "Different roles, one working system.",
        description:
          "From the farmer interface to Gemma integration, every part was built collaboratively during the hackathon.",
        image: "/team/team-group-front.jpeg",
        alt: "The five Rekolt Alert team members together at Build with Gemma",
      },
    ],
    roles: [
      {
        name: "Shihad Shibchurn",
        role: "Creole Integration & AI Testing",
        body: "Developed and tested multilingual AI behaviour, Mauritian Creole support, agricultural conversations and response quality.",
      },
      {
        name: "Fahim",
        role: "Frontend Development",
        body: "Built the main farmer-facing interface, input experience, interactions and visual components.",
      },
      {
        name: "Zuhayr",
        role: "Frontend & Dashboard",
        body: "Developed dashboard views, responsive layouts, results displays and supporting frontend interactions.",
      },
      {
        name: "Kavish",
        role: "UX, Reports & Testing",
        body: "Designed the farmer journey, accessibility, loading and error states, report experience and full-workflow testing.",
      },
      {
        name: "Manav",
        role: "Backend & Gemma Integration",
        body: "Built the FastAPI backend, Gemma 4 integration, function calling, weather tools, structured responses and case storage.",
      },
    ],
    purposeTitle: "Five roles. One shared purpose.",
    purposeBody:
      "We divided the project across AI, backend engineering, frontend development, user experience and testing — then brought every part together into one solution for Mauritian agriculture.",
    roleLabels: [
      ["AI & Kreol", Sparkles],
      ["Frontend", Monitor],
      ["Dashboard", BarChart3],
      ["UX & Testing", CheckCircle2],
      ["Backend & Gemma", Server],
    ],
    sprintEyebrow: "Technology and acknowledgement",
    sprintTitle: "Built during a 24-hour sprint",
    sprintBody:
      "Rekolt Alert was created for Build with Gemma: Blue Mauritius & Beyond at Middlesex University Mauritius. The prototype demonstrates how multimodal AI, function calling and local-language accessibility can support Mauritius’s food-security ecosystem.",
    technologies: [
      "Gemma 4",
      "FastAPI",
      "HTML",
      "CSS",
      "JavaScript",
      "Mauritian Creole",
      "Weather context",
      "Agricultural shop data",
    ],
    responsible:
      "Rekolt Alert provides AI-assisted preliminary guidance. It does not replace inspection or advice from a qualified agricultural professional.",
    ctaTitle: "See Rekolt Alert in action.",
    ctaBody:
      "Start with a crop question, add what you can see, and explore the local context behind every response.",
    start: "Start a crop conversation",
    dashboard: "Explore the dashboard",
  },
  mfe: {
    back: "Retour Akey",
    event: "Build with Gemma 2026 · Middlesex University Mauritius",
    heroTitle: "Kree dan Moris, pou bann planter Morisien.",
    heroBody:
      "Rekolt Alert rasanble Gemma 4, zimaz plant, meteo lokal, done magazin ek gid dan plizier langaz pou ed planter konpran problem rekolt ek pran bann premie aksion itil.",
    meetTeam: "Zwenn lekip-la",
    seeHow: "Get kouma li marse",
    heroVisualLabel: "Kree ansam dan Moris",
    heroVisualTitle: "Sink dimounn. Enn mision lokal.",
    storyEyebrow: "Rezon deryer nou travay",
    storyTitle: "Kifer nou finn kree Rekolt Alert",
    storyParagraphs: [
      "Souvan, bann planter trouv enn problem lor zot rekolt avan ki zot kone exakteman ki pe arive. Informasion ki zot bizin kapav disperse, tro teknik ouswa pa disponib dan langaz ki zot servi toulezour.",
      "Nou finn kree Rekolt Alert pou rasanble zimaz plant, deskripsion planter, meteo lokal, gid pratik ek prodwi magazin dan enn sel lexperyans aksesib. Planter kapav koz an English ouswa Kreol Morisien ek gagn bann premie konsey kler, pandan ki bann desizion inportan res anba kontrol imin.",
    ],
    quote:
      "Teknolozi bizin adapte ar planter — pa fors planter adapte ar teknolozi.",
    pillarsEyebrow: "Kree otour planter",
    pillarsTitle: "Sipor lokal, depi premie kestyon ziska prosin etap.",
    pillars: [
      {
        title: "Koz dan ou fason",
        body: "Planter kapav explik problem rekolt an English ouswa Kreol Morisien, par text ouswa lavwa.",
        icon: Mic,
      },
      {
        title: "Konpran seki ena dan karo",
        body: "Gemma rasanble zimaz plant, deskripsion planter, meteo ek informasion lor ka-la pou konpran sityasion-la pli kler.",
        icon: BrainCircuit,
      },
      {
        title: "Azir avek konfians",
        body: "Rekolt Alert donn bann premie aksion pratik, prodwi magazin apropriye ek lavertisman kler san pretann ranplas enn profesionel agrikol.",
        icon: ShieldCheck,
      },
    ],
    processEyebrow: "Enn parkour konekte",
    processTitle: "Kouma Rekolt Alert marse",
    process: [
      ["Planter koze ouswa azout enn foto", Camera],
      ["Gemma analiz plant ek deskripsion", BrainCircuit],
      ["Meteo, ka ek magazin gagn verifie", CloudSun],
      ["Gid pratik ek prodwi apropriye afise", ShoppingBag],
      ["Planter kapav sov ouswa telecharg enn rapor", FileText],
    ],
    teamEyebrow: "Kree an kolaborasion",
    teamTitle: "Lekip deryer Rekolt Alert",
    teamIntro:
      "Sink etidian Middlesex University Mauritius finn kree Rekolt Alert ansam, avek bann rol dan AI, backend, frontend, lexperyans itilizater ek test.",
    previous: "Montre slide lekip avan",
    next: "Montre prosin slide lekip",
    slides: [
      {
        label: "Nou lekip",
        title: "Sink dimounn. Enn lobzektif.",
        description:
          "AI, devlopman, design ek konesans lokal finn zwenn pou kree enn zouti pratik pou lagrikiltir Moris.",
        image: "/team/team-group-back.jpeg",
        alt: "Sink manb lekip Rekolt Alert ansam kot Build with Gemma, depi deryer",
      },
      {
        label: "Nou lidantite",
        title: "Rekolt Alert",
        description:
          "Enn teknolozi lokal pou rann sipor agrikol pli kler, pli rapid ek pli aksesib.",
        image: "/team/team-logo.jpeg",
        alt: "Logo lekip Rekolt Alert avek enn sinbol code ek lagrikiltir ki pe briye",
        logo: true,
      },
      {
        label: "Kree ansam",
        title: "Bann rol diferan, enn sel sistem.",
        description:
          "Depi linterfas planter ziska integrasion Gemma, sak parti finn kree an kolaborasion pandan hackathon.",
        image: "/team/team-group-front.jpeg",
        alt: "Sink manb lekip Rekolt Alert ansam kot Build with Gemma",
      },
    ],
    roles: [
      {
        name: "Shihad Shibchurn",
        role: "Integrasion Kreol & Test AI",
        body: "Finn devlop ek teste konportman AI miltilang, sipor Kreol Morisien, konversasion agrikol ek kalite repons.",
      },
      {
        name: "Fahim",
        role: "Devlopman Frontend",
        body: "Finn kree linterfas prinsipal pou planter, lexperyans input, interaksion ek bann eleman viziel.",
      },
      {
        name: "Zuhayr",
        role: "Frontend & Dashboard",
        body: "Finn devlop dashboard, layout responsive, afisaz rezilta ek bann interaksion frontend.",
      },
      {
        name: "Kavish",
        role: "UX, Rapor & Test",
        body: "Finn design parkour planter, aksesibilite, leta loading ek erer, lexperyans rapor ek test konple.",
      },
      {
        name: "Manav",
        role: "Backend & Integrasion Gemma",
        body: "Finn kree backend FastAPI, integrasion Gemma 4, function calling, zouti meteo, repons striktire ek stokaz ka.",
      },
    ],
    purposeTitle: "Sink rol. Enn sel lobzektif.",
    purposeBody:
      "Nou finn diviz proze-la ant AI, backend, frontend, lexperyans itilizater ek test — apre nou finn rasanble tou dan enn solision pou lagrikiltir Moris.",
    roleLabels: [
      ["AI & Kreol", Sparkles],
      ["Frontend", Monitor],
      ["Dashboard", BarChart3],
      ["UX & Test", CheckCircle2],
      ["Backend & Gemma", Server],
    ],
    sprintEyebrow: "Teknolozi ek rekonesans",
    sprintTitle: "Kree pandan enn sprint 24-er",
    sprintBody:
      "Rekolt Alert finn kree pou Build with Gemma: Blue Mauritius & Beyond kot Middlesex University Mauritius. Prototip-la montre kouma AI multimodal, function calling ek aksesibilite dan langaz lokal kapav soutenir sekirite alimanter Moris.",
    technologies: [
      "Gemma 4",
      "FastAPI",
      "HTML",
      "CSS",
      "JavaScript",
      "Kreol Morisien",
      "Konteks meteo",
      "Done magazin agrikol",
    ],
    responsible:
      "Rekolt Alert donn bann premie gid avek led AI. Li pa ranplas inspeksion ouswa konsey enn profesionel agrikol kalifie.",
    ctaTitle: "Get Rekolt Alert an aksion.",
    ctaBody:
      "Koumans avek enn kestyon lor rekolt, azout seki ou pe trouve, ek dekouver konteks lokal deryer sak repons.",
    start: "Koumans enn konversasion agrikol",
    dashboard: "Explor dashboard",
  },
} as const;

function positionFor(index: number, active: number) {
  if (index === active) return styles.active;
  if (index === (active + 2) % 3) return styles.left;
  return styles.right;
}

export function AboutPageExperience() {
  const { language, setLanguage } = useLanguage();
  const content = pageCopy[language];
  const [activeSlide, setActiveSlide] = useState(INITIAL_ACTIVE_SLIDE);
  const touchStart = useRef<number | null>(null);

  const rotate = (direction: -1 | 1) => {
    setActiveSlide((current) => (current + direction + 3) % 3);
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath="/lor-nou"
        />
      </div>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={17} />
              {content.back}
            </Link>
            <span className={styles.eventBadge}>{content.event}</span>
            <h1>{content.heroTitle}</h1>
            <p>{content.heroBody}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#team">
                {content.meetTeam}
                <ArrowRight size={18} />
              </a>
              <a className={styles.secondaryAction} href="#process">
                {content.seeHow}
              </a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label={content.heroVisualTitle}>
            <div className={styles.heroImage}>
              <Image
                src="/team/team-group-front.jpeg"
                alt=""
                fill
                priority
                unoptimized
                sizes="(max-width: 760px) 90vw, 46vw"
              />
            </div>
            <div className={styles.heroVisualCopy}>
              <span>{content.heroVisualLabel}</span>
              <strong>{content.heroVisualTitle}</strong>
            </div>
            <div className={styles.heroLogo}>
              <Image
                src="/team/team-logo.jpeg"
                alt=""
                width={100}
                height={100}
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.sectionHeading}>
          <span>{content.storyEyebrow}</span>
          <h2>{content.storyTitle}</h2>
        </div>
        <div className={styles.storyGrid}>
          <div className={styles.storyText}>
            {content.storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <blockquote>
            <Sparkles size={25} aria-hidden="true" />
            <p>“{content.quote}”</p>
          </blockquote>
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.sectionHeading}>
          <span>{content.pillarsEyebrow}</span>
          <h2>{content.pillarsTitle}</h2>
        </div>
        <div className={styles.pillarGrid}>
          {content.pillars.map(({ title, body, icon: Icon }, index) => (
            <article key={title}>
              <div>
                <Icon size={23} aria-hidden="true" />
              </div>
              <small>0{index + 1}</small>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.process} id="process">
        <div className={styles.sectionHeading}>
          <span>{content.processEyebrow}</span>
          <h2>{content.processTitle}</h2>
        </div>
        <ol className={styles.processFlow}>
          {content.process.map(([label, Icon], index) => (
            <li key={label}>
              <span>0{index + 1}</span>
              <div>
                <Icon size={22} aria-hidden="true" />
              </div>
              <p>{label}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.team} id="team">
        <div className={styles.teamIntro}>
          <div className={styles.sectionHeading}>
            <span>{content.teamEyebrow}</span>
            <h2>{content.teamTitle}</h2>
          </div>
          <p>{content.teamIntro}</p>
        </div>

        <div
          className={styles.carousel}
          aria-label={content.teamTitle}
          aria-roledescription="carousel"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              rotate(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              rotate(1);
            }
          }}
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return;
            const distance =
              (event.changedTouches[0]?.clientX ?? touchStart.current) -
              touchStart.current;
            if (Math.abs(distance) > 45) rotate(distance > 0 ? -1 : 1);
            touchStart.current = null;
          }}
        >
          <div className={styles.carouselStage}>
            {content.slides.map((slide, index) => {
              const active = index === activeSlide;
              const isLogo = "logo" in slide && slide.logo;
              return (
                <button
                  className={`${styles.carouselCard} ${positionFor(index, activeSlide)} ${
                    isLogo ? styles.logoCard : ""
                  }`}
                  type="button"
                  aria-label={`${slide.label}: ${slide.title}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => setActiveSlide(index)}
                  key={slide.image}
                >
                  <Image
                    className={styles.carouselImage}
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    loading="lazy"
                    unoptimized
                    sizes="(max-width: 600px) 82vw, (max-width: 1024px) 48vw, 34vw"
                  />
                  <span className={styles.cardShade} aria-hidden="true" />
                  <span className={styles.carouselCaption}>
                    <small>{slide.label}</small>
                    <strong>{slide.title}</strong>
                    <span>{slide.description}</span>
                  </span>
                </button>
              );
            })}
            <button
              className={`${styles.sideCardHitArea} ${styles.sideCardHitLeft}`}
              type="button"
              aria-label={`Show ${content.slides[(activeSlide + 2) % 3].title} in the centre`}
              onClick={() => setActiveSlide((activeSlide + 2) % 3)}
            />
            <button
              className={`${styles.sideCardHitArea} ${styles.sideCardHitRight}`}
              type="button"
              aria-label={`Show ${content.slides[(activeSlide + 1) % 3].title} in the centre`}
              onClick={() => setActiveSlide((activeSlide + 1) % 3)}
            />
          </div>

          <div className={styles.carouselControls}>
            <button
              type="button"
              aria-label={content.previous}
              onClick={() => rotate(-1)}
            >
              <ChevronLeft size={21} />
            </button>
            <span aria-hidden="true">
              {content.slides.map((slide, index) => (
                <i className={index === activeSlide ? styles.dotActive : ""} key={slide.image} />
              ))}
            </span>
            <button type="button" aria-label={content.next} onClick={() => rotate(1)}>
              <ChevronRight size={21} />
            </button>
          </div>
          <p className={styles.srOnly} aria-live="polite">
            Slide {activeSlide + 1} of 3: {content.slides[activeSlide].alt}
          </p>
        </div>

        <div className={styles.roleGrid}>
          {content.roles.map((member, index) => (
            <article key={member.name}>
              <span>0{index + 1}</span>
              <h3>{member.name}</h3>
              <strong>{member.role}</strong>
              <p>{member.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sharedPurpose}>
        <div>
          <span>05 / 01</span>
          <h2>{content.purposeTitle}</h2>
          <p>{content.purposeBody}</p>
        </div>
        <div className={styles.roleIndicators}>
          {content.roleLabels.map(([label, Icon]) => (
            <span key={label}>
              <Icon size={18} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.technology}>
        <div className={styles.techCopy}>
          <span>{content.sprintEyebrow}</span>
          <h2>{content.sprintTitle}</h2>
          <p>{content.sprintBody}</p>
          <aside>
            <ShieldCheck size={22} aria-hidden="true" />
            {content.responsible}
          </aside>
        </div>
        <div className={styles.techBadges} aria-label="Technology used">
          {content.technologies.map((technology) => (
            <span key={technology}>
              <Code2 size={16} aria-hidden="true" />
              {technology}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div>
          <span>
            <Sparkles size={17} aria-hidden="true" />
            Rekolt Alert
          </span>
          <h2>{content.ctaTitle}</h2>
          <p>{content.ctaBody}</p>
        </div>
        <div>
          <Link href="/check-plant">
            {content.start}
            <ArrowRight size={18} />
          </Link>
          <Link href="/banne-done">
            <LayoutDashboard size={18} />
            {content.dashboard}
          </Link>
        </div>
      </section>

      <Footer language={language as Language} />
    </main>
  );
}
