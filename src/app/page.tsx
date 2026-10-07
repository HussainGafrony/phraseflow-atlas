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
            <Link href="/login">Login</Link>
            <Link href="/admin/login">Admin</Link>
          </div>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow">German · English · Greek</p>
          <h1>Learn useful sentences every day.</h1>
          <p>
            Choose a language, a topic, and a level. Get fresh daily sentences
            with Arabic translation, listening, saving, and progress tracking.
          </p>
          <Link className="primary-link" href="/login">
            Start learning
          </Link>
        </div>

        <div className="sentence-marquee" aria-label="Weekly public sentences">
          {sentences.slice(0, 4).map((sentence, index) => {
            const language = SUPPORTED_LANGUAGES.find((item) => item.value === sentence.language);
            return (
              <article className="floating-sentence" style={{ animationDelay: `${index * 0.6}s` }} key={sentence.text}>
                <span>{language?.label ?? sentence.language}</span>
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
