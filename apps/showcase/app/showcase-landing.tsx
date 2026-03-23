"use client";

import { useEffect, useRef } from "react";
import {
  AppleLogo,
  ArrowRight,
  GooglePlayLogo,
  SoccerBall,
  Sparkle,
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
  { label: "App Store", href: "https://apps.apple.com" },
  { label: "Google Play", href: "https://play.google.com" },
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
      // Hero Entrance
      const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
      heroTl
        .from("[data-hero-line]", { scaleX: 0, duration: 1.5, stagger: 0.2 })
        .from("[data-hero-text]", { y: 100, opacity: 0, duration: 1.2, stagger: 0.1 }, "-=1")
        .from("[data-hero-scene]", { scale: 0.8, opacity: 0, duration: 1.5 }, "-=1");

      // Marquee
      gsap.to("[data-marquee]", {
        xPercent: -50,
        repeat: -1,
        duration: 20,
        ease: "none",
      });

      // Sticky Narrative transitions
      gsap.utils.toArray<HTMLElement>("[data-panel]").forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top center",
          onEnter: () => {
            gsap.to("[data-device-stage]", {
              backgroundColor: i % 2 === 0 ? "#050505" : "#0a0a0a",
              duration: 0.6,
            });
          },
          onEnterBack: () => {
            gsap.to("[data-device-stage]", {
              backgroundColor: i % 2 === 0 ? "#050505" : "#0a0a0a",
              duration: 0.6,
            });
          }
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className={styles.pageShell}>
      <div className="grain" />
      <div className={styles.structuralGrid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} />
        ))}
      </div>

      <div className={styles.stageContainer}>
        <section className={styles.heroStage}>
          <header className={styles.topBar}>
            <div className={styles.brandLockup} data-hero-text>
              <div className={styles.brandMark}>
                <SoccerBall size={32} weight="fill" />
              </div>
              <div>
                <p className={styles.kicker}>LIFT LAB / PHP</p>
                <h1 className={styles.topBarTitle}>PIERS HATCLIFF</h1>
              </div>
            </div>
            <nav className={styles.headerNav} data-hero-text>
              <a href="#platform">SYSTEM</a>
              <a href="#memberships">TIERS</a>
              <a href="#access">ACCESS</a>
            </nav>
            <div className={styles.headerActions} data-hero-text>
              <a href="#download" className={styles.headerDownload}>
                <span>GET THE APP</span>
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>
          </header>

          <div className={styles.mainHero}>
            <div className={styles.heroCopy}>
              <h2 className={styles.heroTitle} data-hero-text>
                PH-PERFORMANCE
              </h2>
              <p className={styles.heroBody} data-hero-text>
                Professional-grade athletic development by Piers Hatcliff. 
                Bridging the gap between amateur play and elite professional 
                standards through science-grounded coaching.
              </p>
              <div className={styles.ctaRow} data-hero-text>
                <a href="#platform" className={styles.primaryCta}>SEE THE HUB</a>
                <a href="#memberships" className={styles.secondaryCta}>ACCESS DATA</a>
              </div>
              <div className={styles.statsGrid}>
                {heroStats.map((stat) => (
                  <div key={stat.label} className={styles.statCard} data-hero-text>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.heroSceneWrap} data-hero-scene>
              <HeroDeviceShowcase styles={styles} />
            </div>
          </div>
        </section>

        <section className={styles.marqueeStrip}>
          <div className={styles.marqueeTrack} data-marquee>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i}>
                PRECISION TRAINING • ELITE MENTORSHIP • VIDEO ANALYSIS • RECOVERY SCIENCE • PERFORMANCE ANALYTICS •
              </span>
            ))}
          </div>
        </section>

        <section id="platform" className={styles.sectionBlock}>
          <div className={styles.stickyStage}>
            <div className={styles.narrativeColumn}>
              <article className={styles.screenPanel} data-panel>
                <p className={styles.screenLabel}>01. DASHBOARD</p>
                <h3 className={styles.screenTitle}>INTELLIGENCE<br />IN FOCUS.</h3>
                <p className={styles.screenBody}>
                  The central hub prioritizes sessions, coach updates, and recovery 
                  protocols so you\'re always prepared for the next level.
                </p>
                <div className={styles.screenChipRow}>
                  {["LIVE SESSION", "COACH NOTES", "DRIVE SCORE"].map(c => (
                    <span key={c} className={styles.screenChip}>{c}</span>
                  ))}
                </div>
              </article>

              <article className={styles.screenPanel} data-panel>
                <p className={styles.screenLabel}>02. PROGRAMS</p>
                <h3 className={styles.screenTitle}>STRUCTURED<br />DELIVERY.</h3>
                <p className={styles.screenBody}>
                  Phased training with top-tab navigation for Warmups, Sessions, and Cooldowns. 
                  Every exercise features integrated pro-grade video demonstrations.
                </p>
                <div className={styles.screenChipRow}>
                  {["PHASED", "TOP TABS", "VIDEO LIBRARY"].map(c => (
                    <span key={c} className={styles.screenChip}>{c}</span>
                  ))}
                </div>
              </article>

              <article className={styles.screenPanel} data-panel>
                <p className={styles.screenLabel}>03. CONNECT</p>
                <h3 className={styles.screenTitle}>ELITE FEEDBACK<br />LOOP.</h3>
                <p className={styles.screenBody}>
                  Direct pathways to Piers Hatcliff. Secure 1:1 messaging and 
                  video review loops that bridge the gap to elite performance.
                </p>
                <div className={styles.screenChipRow}>
                  {["VIDEO REVIEW", "DIRECT CHAT", "PRO TIPS"].map(c => (
                    <span key={c} className={styles.screenChip}>{c}</span>
                  ))}
                </div>
              </article>

              <article className={styles.screenPanel} data-panel>
                <p className={styles.screenLabel}>04. PARENT HUB</p>
                <h3 className={styles.screenTitle}>SCIENCE FOR<br />FAMILIES.</h3>
                <p className={styles.screenBody}>
                  A dedicated environment for growth, nutrition, and injury prevention education. 
                  Empowering guardians to support the athletic journey.
                </p>
                <div className={styles.screenChipRow}>
                  {["MATURATION", "NUTRITION", "LOAD MGMT"].map(c => (
                    <span key={c} className={styles.screenChip}>{c}</span>
                  ))}
                </div>
              </article>

              <article className={styles.screenPanel} data-panel>
                <p className={styles.screenLabel}>05. SCHEDULER</p>
                <h3 className={styles.screenTitle}>PRO-GRADE<br />PRECISION.</h3>
                <p className={styles.screenBody}>
                  A frictionless calendar for booking 1:1 Lift Lab sessions, 
                  calls, and role model meetings in one unified view.
                </p>
                <div className={styles.screenChipRow}>
                  {["BOOKING", "CALENDAR", "SESSION SYNC"].map(c => (
                    <span key={c} className={styles.screenChip}>{c}</span>
                  ))}
                </div>
              </article>
            </div>

            <div className={styles.deviceColumn} data-device-stage>
              <div className={styles.browserMock}>
                <HeroDeviceShowcase styles={styles} />
              </div>
            </div>
          </div>
        </section>

        <section id="memberships" className={styles.sectionBlock}>
          <p className={styles.screenLabel}>THE TIERS</p>
          <h2 className={styles.heroTitle}>MEMBERSHIP DATA</h2>
          <div className={styles.planGrid}>
            {planTiers.map((tier) => (
              <article key={tier.name} className={styles.planCard}>
                <div className={styles.planHeader}>
                  <p className={styles.planBadge}>{tier.label}</p>
                  <h4 className={styles.planTitle}>{tier.name}</h4>
                  <p className={styles.planPrice}>{tier.price}</p>
                </div>
                <p className={styles.planSummary}>{tier.summary}</p>
                <ul className={styles.planList}>
                  {tier.features.map((feature) => (
                    <li key={feature} className={styles.planItem}>
                      <div className={styles.planDot} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <footer id="access" className={styles.footerSection}>
          <div className={styles.footerCard}>
            <p className={styles.footerKicker}>DEPLOYMENT v1.0.0</p>
            <h3 className={styles.footerTitle}>GET THE HUB.</h3>
            <p className={styles.footerBody}>
              Download the PH Performance mobile environment to begin your 
              coaching journey. Available on all major platforms.
            </p>
            <div className={styles.downloadActions}>
              {storeLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={styles.storeButtonLarge}>
                  <span className={styles.storeGlyphLarge}>
                    {link.label === "App Store" ? <AppleLogo weight="fill" /> : <GooglePlayLogo weight="fill" />}
                  </span>
                  <strong>{link.label}</strong>
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
