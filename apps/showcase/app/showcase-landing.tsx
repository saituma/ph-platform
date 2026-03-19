"use client";

import { useEffect, useRef } from "react";
import {
  AppleLogo,
  ArrowDown,
  CalendarDots,
  ChatCircleDots,
  DownloadSimple,
  GooglePlayLogo,
  MonitorPlay,
  ShieldCheck,
  SoccerBall,
  SquaresFour,
} from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroDeviceShowcase } from "./hero-device-showcase";

type Styles = Record<string, string>;

type Stat = { value: string; label: string };
type Feature = { eyebrow: string; title: string; body: string };
type Plan = { name: string; label: string; summary: string; price: string; features: string[] };
type Proof = { title: string; text: string };
type Quote = { role: string; quote: string };

const storeLinks = [
  {
    label: "Download on the",
    store: "App Store",
    href: "https://apps.apple.com",
  },
  {
    label: "Get it on",
    store: "Google Play",
    href: "https://play.google.com",
  },
];

type Props = {
  styles: Styles;
  heroStats: Stat[];
  featurePillars: Feature[];
  planTiers: Plan[];
  proofPoints: Proof[];
  quotes: Quote[];
};

export function ShowcaseLanding({
  styles,
  heroStats,
  featurePillars,
  planTiers,
  proofPoints,
  quotes,
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .from("[data-hero-badge]", { y: 20, opacity: 0, duration: 0.5, stagger: 0.08 })
        .from("[data-hero-copy]", { y: 36, opacity: 0, duration: 0.7, stagger: 0.12 }, "-=0.3")
        .from("[data-hero-stat]", { y: 24, opacity: 0, duration: 0.45, stagger: 0.08 }, "-=0.25")
        .from("[data-hero-scene]", { y: 50, opacity: 0, scale: 0.92, duration: 1, ease: "power3.out" }, "-=0.45")
        .from("[data-hero-phone]", { y: 80, opacity: 0, scale: 0.92, duration: 1 }, "-=0.8")
        .from("[data-hero-card]", { y: 22, opacity: 0, scale: 0.92, duration: 0.55, stagger: 0.08 }, "-=0.45");

      gsap.to("[data-hero-phone]", {
        yPercent: -3,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-hero-scene]",
          start: "top 85%",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-stack]").forEach((element, index) => {
        gsap.fromTo(
          element,
          { rotateX: 0, rotateY: 0, z: 0 },
          {
            rotateX: index % 2 === 0 ? 8 : -8,
            rotateY: index % 2 === 0 ? -12 : 12,
            z: 60 + index * 15,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              end: "bottom 20%",
              scrub: true,
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-shimmer]").forEach((element) => {
        gsap.to(element, {
          xPercent: 120,
          duration: 2.4,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element, index) => {
        gsap.from(element, {
          y: 48,
          opacity: 0,
          duration: 0.7,
          delay: index % 3 === 0 ? 0 : 0.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 82%",
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className={styles.pageShell}>
      <div className={styles.backdrop} />
      <div className={styles.gridLines} />

      <section className={styles.heroSection}>
        <header className={styles.topBar} data-reveal>
          <div className={styles.brandLockup}>
            <div className={styles.brandMark}>
              <SoccerBall size={18} weight="fill" />
            </div>
            <div>
              <p className={styles.kicker}>Performance Coaching</p>
              <h1 className={styles.topBarTitle}>Train smarter. Stay connected. Keep improving.</h1>
            </div>
          </div>
          <nav className={styles.headerNav}>
            <a href="#screens">
              <MonitorPlay size={16} weight="duotone" />
              <span>Screens</span>
            </a>
            <a href="#plans">
              <SquaresFour size={16} weight="duotone" />
              <span>Plans</span>
            </a>
            <a href="#download">
              <DownloadSimple size={16} weight="duotone" />
              <span>Download</span>
            </a>
          </nav>
          <div className={styles.headerActions}>
            <span className={styles.badge} data-hero-badge>
              iOS & Android
            </span>
            <span className={styles.badge} data-hero-badge>
              For athletes and parents
            </span>
            <a href="#download" className={styles.headerDownload} data-hero-badge>
              <ArrowDown size={16} weight="bold" />
              <span>Download</span>
            </a>
          </div>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.sectionKicker} data-hero-copy>
              Football coaching for ambitious young players
            </p>
            <h2 className={styles.heroTitle} data-hero-copy>
              Coaching, planning, support, and progress in one app.
            </h2>
            <p className={styles.heroBody} data-hero-copy>
              Built for young footballers and their families, the app brings together training plans, coach messaging,
              scheduling, video feedback, and parent support in one simple experience.
            </p>

            <div className={styles.heroProofRow} data-hero-copy>
              <div className={styles.heroProofCard}>
                <ChatCircleDots size={18} weight="fill" />
                <div>
                  <strong>Direct coach access</strong>
                  <span>Messaging, video feedback, and premium support inside the app.</span>
                </div>
              </div>
              <div className={styles.heroProofCard}>
                <CalendarDots size={18} weight="fill" />
                <div>
                  <strong>Clear weekly structure</strong>
                  <span>Sessions, calls, and progress tracking kept in one place.</span>
                </div>
              </div>
              <div className={styles.heroProofCard}>
                <ShieldCheck size={18} weight="fill" />
                <div>
                  <strong>Built for parents too</strong>
                  <span>Billing, guidance, and support journeys that make sense.</span>
                </div>
              </div>
            </div>

            <div className={styles.ctaRow} data-hero-copy>
              <a href="#screens" className={styles.primaryCta}>
                See the app
              </a>
              <a href="#plans" className={styles.secondaryCta}>
                View plans
              </a>
            </div>

            <div className={styles.storeRow} data-hero-copy>
              {storeLinks.map((link) => (
                <a key={link.store} href={link.href} target="_blank" rel="noreferrer" className={styles.storeButton}>
                  <span className={styles.storeGlyph}>
                    {link.store === "App Store" ? (
                      <AppleLogo size={18} weight="fill" />
                    ) : (
                      <GooglePlayLogo size={18} weight="fill" />
                    )}
                  </span>
                  <span>
                    <small>{link.label}</small>
                    <strong>{link.store}</strong>
                  </span>
                </a>
              ))}
            </div>

            <div className={styles.statsGrid}>
              {heroStats.map((stat) => (
                <div key={stat.label} className={styles.statCard} data-hero-stat>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroSceneWrap} data-hero-scene>
            <HeroDeviceShowcase styles={styles} />
            <div className={styles.heroSceneCaption}>
              <span>Programs</span>
              <span>Home</span>
              <span>Messages</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.marqueeStrip} data-reveal>
        <div className={styles.marqueeTrack}>
          <span>Training plans</span>
          <span>Coach messaging</span>
          <span>Video feedback</span>
          <span>Parent support</span>
          <span>Schedule management</span>
          <span>Recovery tools</span>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.tabShowcase} data-reveal>
          <div className={styles.sectionIntroCompact}>
            <p className={styles.sectionKicker}>Easy navigation</p>
            <h3 className={styles.sectionTitle}>Every part of the app is easy to reach.</h3>
            <p className={styles.sectionBody}>
              Programs, messages, home, schedule, and account tools are all easy to find from the main navigation.
            </p>
          </div>
          <div className={styles.tabRail}>
            {["Programs", "Messages", "Home", "Schedule", "More"].map((tab, index) => (
              <div key={tab} className={`${styles.tabRailCard} ${index === 2 ? styles.tabRailCardActive : ""}`}>
                <span className={styles.tabRailIcon} />
                <span>{tab}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="screens" className={styles.sectionBlock}>
        <div className={styles.sectionIntro} data-reveal>
          <p className={styles.sectionKicker}>Inside the app</p>
          <h3 className={styles.sectionTitle}>A clearer experience for athletes and parents.</h3>
          <p className={styles.sectionBody}>
            From the home screen to scheduling and coach chat, the app is designed to make progress feel simple and
            support feel close.
          </p>
        </div>

        <div className={styles.screenStoryGrid}>
          <ScreenPanel
            styles={styles}
            title="Home"
            subtitle="See what matters right away."
            body="The home screen highlights the next step, key updates, and the coaching information that matters most."
            chips={["Next session", "Coach updates", "Plan overview"]}
            variant="home"
          />
          <ScreenPanel
            styles={styles}
            title="Schedule"
            subtitle="Keep the week organised."
            body="Sessions, calls, and bookings are easy to follow, so families always know what is coming next."
            chips={["Sessions", "Calls", "Weekly planning"]}
            variant="schedule"
          />
          <ScreenPanel
            styles={styles}
            title="Messages"
            subtitle="Stay in touch with your coach."
            body="Ask questions, get answers, and receive feedback without switching between different tools."
            chips={["Coach replies", "Video feedback", "Direct support"]}
            variant="messages"
          />
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.parallelStage} data-reveal>
          <div className={styles.parallelIntro}>
            <p className={styles.sectionKicker}>See it in action</p>
            <h3 className={styles.sectionTitle}>A mobile experience built around real training life.</h3>
            <p className={styles.sectionBody}>
              The app keeps sessions, coach communication, and weekly planning connected, helping athletes stay focused
              and parents stay informed.
            </p>
          </div>
          <div className={styles.parallelDeviceRail}>
            <MockDeviceScene styles={styles} tone="emerald" label="Home" screen="home" />
            <MockDeviceScene styles={styles} tone="emerald" label="Schedule" screen="schedule" />
            <MockDeviceScene styles={styles} tone="emerald" label="Messages" screen="messages" />
          </div>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.featureGrid}>
          {featurePillars.map((feature) => (
            <article key={feature.title} className={styles.featureCard} data-reveal>
              <p className={styles.featureEyebrow}>{feature.eyebrow}</p>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureBody}>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.proofShell} data-reveal>
          <div className={styles.sectionIntroCompact}>
            <p className={styles.sectionKicker}>Why families use it</p>
            <h3 className={styles.sectionTitle}>Built to support progress on and off the pitch.</h3>
          </div>
          <div className={styles.proofGrid}>
            {proofPoints.map((item) => (
              <article key={item.title} className={styles.proofCard}>
                <h4 className={styles.proofTitle}>{item.title}</h4>
                <p className={styles.proofBody}>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className={styles.sectionBlock}>
        <div className={styles.sectionIntro} data-reveal>
          <p className={styles.sectionKicker}>Plans</p>
          <h3 className={styles.sectionTitle}>Choose the coaching plan that fits your family.</h3>
          <p className={styles.sectionBody}>
            Start with structured training or unlock more personal support, feedback, and guidance as your needs grow.
          </p>
        </div>

        <div className={styles.planGrid}>
          {planTiers.map((tier) => (
            <article key={tier.name} className={styles.planCard} data-reveal>
              <div className={styles.planHeader}>
                <div>
                  <p className={styles.planBadge}>{tier.label}</p>
                  <h4 className={styles.planTitle}>{tier.name}</h4>
                </div>
                <div className={styles.planPrice}>{tier.price}</div>
              </div>
              <p className={styles.planSummary}>{tier.summary}</p>
              <ul className={styles.planList}>
                {tier.features.map((feature) => (
                  <li key={feature} className={styles.planItem}>
                    <span className={styles.planDot} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="download" className={styles.sectionBlock}>
        <div className={styles.downloadShell} data-reveal>
          <div className={styles.sectionIntroCompact}>
            <p className={styles.sectionKicker}>Download</p>
            <h3 className={styles.sectionTitle}>Download the app and keep coaching close.</h3>
            <p className={styles.sectionBody}>
              Available on iPhone and Android for athletes and parents who want one place for coaching, planning, and support.
            </p>
          </div>
          <div className={styles.downloadActions}>
            {storeLinks.map((link) => (
              <a key={link.store} href={link.href} target="_blank" rel="noreferrer" className={styles.storeButtonLarge}>
                <span className={styles.storeGlyphLarge}>
                  {link.store === "App Store" ? (
                    <AppleLogo size={20} weight="fill" />
                  ) : (
                    <GooglePlayLogo size={20} weight="fill" />
                  )}
                </span>
                <span>
                  <small>{link.label}</small>
                  <strong>{link.store}</strong>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.quoteGrid}>
          {quotes.map((quote) => (
            <article key={quote.role} className={styles.quoteCard} data-reveal>
              <p className={styles.quoteRole}>{quote.role}</p>
              <p className={styles.quoteText}>“{quote.quote}”</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.footerSection}>
        <div className={styles.footerCard} data-reveal>
          <p className={styles.footerKicker}>Built for families and athletes</p>
          <h3 className={styles.footerTitle}>One app for training, communication, and progress.</h3>
          <p className={styles.footerBody}>
            From weekly training to coach feedback and parent support, the app brings the full coaching journey together.
          </p>
        </div>
      </section>
    </main>
  );
}

function ScreenPanel({
  styles,
  title,
  subtitle,
  body,
  chips,
  variant,
}: {
  styles: Styles;
  title: string;
  subtitle: string;
  body: string;
  chips: string[];
  variant: "home" | "schedule" | "messages";
}) {
  return (
    <article className={styles.screenPanel} data-reveal>
      <div className={styles.screenInfo}>
        <p className={styles.screenLabel}>{title}</p>
        <h3 className={styles.screenTitle}>{subtitle}</h3>
        <p className={styles.screenBody}>{body}</p>
        <div className={styles.screenChipRow}>
          {chips.map((chip) => (
            <span key={chip} className={styles.screenChip}>
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className={`${styles.browserMock} ${styles[`browser${variant[0].toUpperCase()}${variant.slice(1)}`]}`}>
        <div className={styles.browserBar}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.browserCanvas}>
          {variant === "home" ? (
            <>
              <div className={styles.mockHeroTile} />
              <div className={styles.mockMetricRow}>
                <div />
                <div />
                <div />
              </div>
              <div className={styles.mockStack}>
                <div />
                <div />
                <div />
              </div>
            </>
          ) : null}
          {variant === "schedule" ? (
            <>
              <div className={styles.mockCalendarHeader} />
              <div className={styles.mockCalendarGrid}>
                {Array.from({ length: 14 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>
              <div className={styles.mockAgenda}>
                <div />
                <div />
              </div>
            </>
          ) : null}
          {variant === "messages" ? (
            <>
              <div className={styles.mockInboxTop} />
              <div className={styles.mockThreadList}>
                <div />
                <div />
                <div />
                <div />
              </div>
              <div className={styles.mockComposer} />
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MockDeviceScene({
  styles,
  tone,
  label,
  screen,
}: {
  styles: Styles;
  tone: "emerald" | "amber" | "sky";
  label: string;
  screen: "home" | "schedule" | "messages";
}) {
  return (
    <article className={`${styles.mockDeviceScene} ${styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`]}`} data-stack>
      <div className={styles.sceneBadge}>{label}</div>
      <div className={styles.scenePhone}>
        <div className={styles.scenePhoneTop} />
        <div className={styles.scenePhoneScreen}>
          <div className={styles.sceneHeaderRow} data-depth>
            <span className={styles.sceneAvatar} />
            <div className={styles.sceneHeaderCopy}>
              <span />
              <span />
            </div>
          </div>
          {screen === "home" ? (
            <>
              <div className={styles.sceneHeroCard} data-depth>
                <span className={styles.sceneEyebrow}>Today</span>
                <strong>Speed session</strong>
                <p>Warm-up, sprint work, and recovery guidance in one clear session plan.</p>
              </div>
              <div className={styles.sceneStatTriplet}>
                <span data-depth />
                <span data-depth />
                <span data-depth />
              </div>
              <div className={styles.sceneList}>
                <div data-depth />
                <div data-depth />
                <div data-depth />
              </div>
            </>
          ) : null}
          {screen === "schedule" ? (
            <>
              <div className={styles.sceneCalendarStrip} data-depth />
              <div className={styles.sceneCalendarGrid}>
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={index} data-depth />
                ))}
              </div>
              <div className={styles.sceneAgendaCards}>
                <div data-depth />
                <div data-depth />
              </div>
            </>
          ) : null}
          {screen === "messages" ? (
            <>
              <div className={styles.sceneThreadHero} data-depth />
              <div className={styles.sceneChatBubbles}>
                <span data-depth />
                <span data-depth />
                <span data-depth />
                <span data-depth />
              </div>
              <div className={styles.sceneComposerBar} data-depth />
            </>
          ) : null}
        </div>
      </div>
      <div className={styles.sceneFloatCard} data-depth>
        <p>Quick view</p>
        <strong>{screen === "home" ? "Session ready" : screen === "schedule" ? "2 bookings" : "4 unread"}</strong>
      </div>
    </article>
  );
}
