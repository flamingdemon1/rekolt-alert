"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { Footer } from "../Footer";
import { Header } from "../Header";

type AuthMode = "login" | "register";

const authCopy = {
  mfe: {
    login: {
      eyebrow: "Bienveni dan Magazin",
      title: "Konekte pou kontinie.",
      body: "Aksed katalog agrikol Moris ek tou so pri dan enn lespas prive.",
      submit: "Konekte",
      switchPrompt: "Pena enn kont?",
      switchLabel: "Kree enn kont",
    },
    register: {
      eyebrow: "Kree ou kont",
      title: "Ou magazin, pare pou ou.",
      body: "Kree enn kont sekirize pou dekouver semans, plant ek prodwi agrikol.",
      submit: "Kree kont ek kontinie",
      switchPrompt: "Deza ena enn kont?",
      switchLabel: "Konekte",
    },
    username: "Nom itilizater",
    usernameHint: "3–30 karakter: let, sif, pwin, tire ouswa underscore.",
    password: "Mo-de-pas",
    confirm: "Konfirm mo-de-pas",
    show: "Montre mo-de-pas",
    hide: "Kasiet mo-de-pas",
    security:
      "Nou pa gard ou mo-de-pas normal. Li transform avek enn sel inik ek 210,000 letap sekirite.",
    errors: {
      mismatch: "Bann mo-de-pas pa parey.",
      invalid_username: "Met enn nom itilizater valid ant 3 ek 30 karakter.",
      invalid_password: "Mo-de-pas bizin ena omwin 10 karakter.",
      username_taken: "Sa nom itilizater-la deza pe servi.",
      invalid_credentials: "Nom itilizater ouswa mo-de-pas pa korek.",
      invalid_origin: "Reket-la pa finn valide. Re-eseye depi sa paz-la.",
      auth_unavailable: "Servis kont pa disponib aster. Re-eseye inpe pli tar.",
      unknown: "Pa finn kapav kontinie. Re-eseye.",
    },
  },
  en: {
    login: {
      eyebrow: "Welcome to the shop",
      title: "Sign in to continue.",
      body: "Access the Mauritius agricultural catalogue and its prices in your private shop space.",
      submit: "Sign in",
      switchPrompt: "New to the shop?",
      switchLabel: "Create an account",
    },
    register: {
      eyebrow: "Create your account",
      title: "Your shop, ready for you.",
      body: "Create a secure account to browse seeds, plants and agricultural supplies.",
      submit: "Create account and continue",
      switchPrompt: "Already registered?",
      switchLabel: "Sign in",
    },
    username: "Username",
    usernameHint:
      "3–30 characters: letters, numbers, dots, hyphens or underscores.",
    password: "Password",
    confirm: "Confirm password",
    show: "Show password",
    hide: "Hide password",
    security:
      "Your plain password is never stored. It is processed with a unique salt and 210,000 security rounds.",
    errors: {
      mismatch: "The passwords do not match.",
      invalid_username: "Use a valid username between 3 and 30 characters.",
      invalid_password: "Your password must contain at least 10 characters.",
      username_taken: "That username is already registered.",
      invalid_credentials: "The username or password is incorrect.",
      invalid_origin: "The request could not be verified. Retry from this page.",
      auth_unavailable: "Account storage is currently unavailable. Try again shortly.",
      unknown: "Unable to continue. Please try again.",
    },
  },
} as const;

/** Waits until the protected shop has replaced the authentication screen. */
function waitForShopPage(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector("[data-shop-catalog]")) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector("[data-shop-catalog]")) {
        observer.disconnect();
        window.clearTimeout(timeout);
        resolve();
      }
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 1800);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Shared login/register screen keeps validation and the 3D shop transition in
 * one place while the actual credential decisions stay on the server.
 */
export function ShopAuthPage({ mode }: { mode: AuthMode }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const copy = authCopy[language];
  const content = copy[mode];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<
    keyof typeof copy.errors | null
  >(null);

  const openShop = () => {
    const navigate = async () => {
      router.push("/magazin");
      await waitForShopPage();
    };

    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      void navigate();
      return;
    }

    document.startViewTransition(navigate);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);

    if (mode === "register" && password !== confirmation) {
      setErrorCode("mismatch");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/shop-auth/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        const knownError = result.error;
        setErrorCode(
          knownError && knownError in copy.errors
            ? (knownError as keyof typeof copy.errors)
            : "unknown",
        );
        return;
      }

      openShop();
    } catch {
      setErrorCode("unknown");
    } finally {
      setPending(false);
    }
  };

  const alternatePath =
    mode === "login" ? "/magazin/register" : "/magazin/login";

  return (
    <main className="shop-auth-page" data-shop-auth={mode}>
      <div className="shop-auth-header">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          activePath="/magazin"
        />
      </div>

      <section className="shop-auth-shell">
        <div className="shop-auth-story">
          <Image
            src="/shop/vegetable-seedlings.webp"
            width={1200}
            height={800}
            alt=""
            priority
            // The local WebP is already compressed, so no runtime optimizer is needed.
            unoptimized
          />
          <div className="shop-auth-story-overlay">
            <span>46</span>
            <p>
              {language === "mfe"
                ? "prodwi agrikol lokal dan enn sel katalog"
                : "local agricultural products in one catalogue"}
            </p>
          </div>
        </div>

        <div className="shop-auth-card">
          <span className="eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.body}</p>

          <form onSubmit={submit}>
            <label>
              <span>{copy.username}</span>
              <div className="shop-auth-input">
                <UserRound size={19} aria-hidden="true" />
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9._-]{3,30}"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <small>{copy.usernameHint}</small>
            </label>

            <label>
              <span>{copy.password}</span>
              <div className="shop-auth-input">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={passwordVisible ? copy.hide : copy.show}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {mode === "register" && (
              <label>
                <span>{copy.confirm}</span>
                <div className="shop-auth-input">
                  <ShieldCheck size={19} aria-hidden="true" />
                  <input
                    name="passwordConfirmation"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                  />
                </div>
              </label>
            )}

            {errorCode && (
              <p className="shop-auth-error" role="alert">
                {copy.errors[errorCode]}
              </p>
            )}

            <button className="shop-auth-submit" type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="spin" size={19} /> : content.submit}
              {!pending && <ArrowRight size={19} />}
            </button>
          </form>

          <div className="shop-security-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>{copy.security}</p>
          </div>

          <p className="shop-auth-switch">
            {content.switchPrompt}{" "}
            <Link href={alternatePath}>{content.switchLabel}</Link>
          </p>
        </div>
      </section>

      <Footer language={language} />
    </main>
  );
}
