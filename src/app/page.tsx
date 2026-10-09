/**
 * Public landing page with four fixed Greek sentences, Arabic translations, and login links. No weekly rotation.
 */
import { T } from "@/components/I18nProvider";
import Link from "next/link";
import { getLandingSentencesSafe } from "@/lib/landing";
import { APP_NAME, SUPPORTED_LANGUAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sentences = await getLandingSentencesSafe();

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="top-nav">
          <span className="brand">{APP_NAME}</span>
          <div className="nav-actions">
            <Link href="/login">
              {" "}
              <T k="Login" />{" "}
            </Link>
            <Link href="/admin/login">
              {" "}
              <T k="Admin" />{" "}
            </Link>
          </div>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow">
            {" "}
            <T k="Learn Greek" />{" "}
          </p>
          <h1>
            {" "}
            <T k="Learn useful sentences every day." />{" "}
          </h1>
          <p>
            {" "}
            <T k="Choose a topic and a level. Learn Greek with Arabic translations, listening, saving, and progress tracking." />{" "}
          </p>
          <Link className="primary-link" href="/login">
            {" "}
            <T k="Start learning" />{" "}
          </Link>
        </div>

        <div className="sentence-marquee" aria-label="Public Greek sentences">
          {sentences.slice(0, 4).map((sentence, index) => {
            const language = SUPPORTED_LANGUAGES.find(
              (item) => item.value === sentence.language,
            );
            return (
              <article
                className="floating-sentence"
                style={{ animationDelay: `${index * 0.6}s` }}
                key={sentence.text}
              >
                <span>
                  <T k={language?.label ?? sentence.language} />
                </span>
                <strong>{sentence.text}</strong>
                <p>{sentence.arabicTranslation}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
