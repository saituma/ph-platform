"use client";

import { useRef, useState } from "react";
import {
  CalendarDots,
  ChatCircleDots,
  CheckCircle,
  House,
  ListChecks,
  Lightning,
  Pulse,
  SquaresFour,
} from "@phosphor-icons/react";
import { DeviceFrameset } from "react-device-frameset";

type Styles = Record<string, string>;

const HERO_STEPS = [
  {
    label: "Programs",
    title: "Plans that show the real coaching access.",
    body: "See the difference between PHP Program, PHP Plus, and PHP Premium before the first tap.",
  },
  {
    label: "Home",
    title: "The dashboard tells the athlete what happens next.",
    body: "Training, bookings, and coach updates live in one place instead of being buried across screens.",
  },
  {
    label: "Messages",
    title: "Premium support feels built into the app.",
    body: "Coach replies, clips, and feedback stay inside the same product flow.",
  },
] as const;

export function HeroDeviceShowcase({ styles }: { styles: Styles }) {
  const [activeStep, setActiveStep] = useState(0);
  const lastChangeRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);

  const moveStep = (direction: 1 | -1) => {
    const now = Date.now();
    if (now - lastChangeRef.current < 520) return;
    lastChangeRef.current = now;
    setActiveStep((current) => Math.max(0, Math.min(HERO_STEPS.length - 1, current + direction)));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const delta = event.deltaY;
    if (Math.abs(delta) < 14) return;
    event.preventDefault();
    moveStep(delta > 0 ? 1 : -1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveStep(1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveStep(-1);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const end = event.changedTouches[0]?.clientY ?? null;
    touchStartRef.current = null;
    if (start == null || end == null) return;
    const delta = start - end;
    if (Math.abs(delta) < 28) return;
    moveStep(delta > 0 ? 1 : -1);
  };

  return (
    <div
      className={styles.heroStoryWrap}
      data-active-step={activeStep}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Interactive mobile app showcase. Scroll on the phone to switch screens."
    >
      <div className={styles.heroStoryPin} data-hero-pin>
        <div className={styles.heroMockupGlow} />
        <div className={styles.heroMockupGlowSecondary} />

        <div className={styles.heroStoryPhone} data-hero-phone>
          <div className={styles.heroStoryShadow} />
          <DeviceFrameset device="iPhone X">
            <div className={styles.heroPhoneScreens}>
              <div className={styles.heroPhonePanel} data-hero-panel>
                <ProgramsScreen styles={styles} />
              </div>
              <div className={styles.heroPhonePanel} data-hero-panel>
                <HomeScreen styles={styles} />
              </div>
              <div className={styles.heroPhonePanel} data-hero-panel>
                <MessagesScreen styles={styles} />
              </div>
            </div>
          </DeviceFrameset>
        </div>

        <div className={styles.heroStoryCards}>
          {HERO_STEPS.map((step, index) => (
            <article
              key={step.label}
              className={styles.heroStoryCard}
              data-hero-card
              aria-hidden={activeStep !== index}
            >
              <span className={styles.heroStoryLabel}>{step.label}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.heroStoryProgress}>
          {HERO_STEPS.map((step, index) => (
            <button
              key={step.label}
              type="button"
              className={styles.heroStoryProgressItem}
              data-hero-progress
              aria-pressed={activeStep === index}
              onClick={() => setActiveStep(index)}
            >
              <span />
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>

        <div className={styles.heroStoryHint}>
          <span>Scroll on the phone</span>
          <strong>{activeStep + 1} / {HERO_STEPS.length}</strong>
        </div>
      </div>
    </div>
  );
}

function PhoneShell({
  styles,
  title,
  tab,
  children,
}: {
  styles: Styles;
  title: string;
  tab: "Programs" | "Messages" | "Home";
  children: React.ReactNode;
}) {
  return (
    <div className={styles.heroPhoneUi}>
      <div className={styles.heroPhoneStatus}>
        <span>9:41</span>
        <div className={styles.heroPhoneStatusDots}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.heroPhoneHeader}>
        <div>
          <p className={styles.heroPhoneEyebrow}>PHP Coaching</p>
          <h4 className={styles.heroPhoneTitle}>{title}</h4>
        </div>
        <div className={styles.heroPhoneAvatar}>PG</div>
      </div>

      {children}

      <div className={styles.heroPhoneTabbar}>
        <TabItem styles={styles} icon={<Pulse size={15} weight="fill" />} label="Programs" active={tab === "Programs"} />
        <TabItem
          styles={styles}
          icon={<ChatCircleDots size={15} weight="fill" />}
          label="Messages"
          active={tab === "Messages"}
        />
        <TabItem styles={styles} icon={<House size={15} weight="fill" />} label="Home" active={tab === "Home"} />
        <TabItem styles={styles} icon={<CalendarDots size={15} weight="fill" />} label="Schedule" active={false} />
        <TabItem styles={styles} icon={<SquaresFour size={15} weight="fill" />} label="More" active={false} />
      </div>
    </div>
  );
}

function TabItem({
  styles,
  icon,
  label,
  active,
}: {
  styles: Styles;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div className={active ? styles.heroPhoneTabActive : styles.heroPhoneTab}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ProgramsScreen({ styles }: { styles: Styles }) {
  return (
    <PhoneShell styles={styles} title="Programs" tab="Programs">
      <div className={styles.heroPlanHero}>
        <span>Choose the right level</span>
        <strong>Plans that match the way support is delivered.</strong>
      </div>

      <div className={styles.heroPlanStack}>
        <div className={styles.heroPlanCard}>
          <div>
            <strong>PHP Program</strong>
            <p>Structured weekly coaching</p>
          </div>
          <ListChecks size={18} weight="bold" />
        </div>
        <div className={`${styles.heroPlanCard} ${styles.heroPlanCardFeatured}`}>
          <div>
            <strong>PHP Plus</strong>
            <p>Recovery, nutrition, and family guidance</p>
          </div>
          <span>Popular</span>
        </div>
        <div className={styles.heroPlanCard}>
          <div>
            <strong>PHP Premium</strong>
            <p>Coach messaging and video review</p>
          </div>
          <ChatCircleDots size={18} weight="bold" />
        </div>
      </div>
    </PhoneShell>
  );
}

function HomeScreen({ styles }: { styles: Styles }) {
  return (
    <PhoneShell styles={styles} title="Home" tab="Home">
      <div className={styles.heroHomeCard}>
        <div className={styles.heroHomeCardTop}>
          <div>
            <span>Good afternoon</span>
            <strong>Training block ready</strong>
          </div>
          <div className={styles.heroHomeChip}>PHP Plus</div>
        </div>
        <p>3 sprint starts, 2 resisted runs, and 1 recovery protocol are lined up for today.</p>
      </div>

      <div className={styles.heroMetricRow}>
        <div>
          <strong>2</strong>
          <span>Bookings</span>
        </div>
        <div>
          <strong>4</strong>
          <span>Coach notes</span>
        </div>
        <div>
          <strong>1</strong>
          <span>Upgrade path</span>
        </div>
      </div>

      <div className={styles.heroInfoStack}>
        <div className={styles.heroInfoCard}>
          <Lightning size={18} weight="fill" />
          <div>
            <strong>Next session</strong>
            <p>Acceleration mechanics at 5:30 PM</p>
          </div>
        </div>
        <div className={styles.heroInfoCard}>
          <CheckCircle size={18} weight="fill" />
          <div>
            <strong>Parent update</strong>
            <p>Nutrition notes and schedule changes are ready to review.</p>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function MessagesScreen({ styles }: { styles: Styles }) {
  return (
    <PhoneShell styles={styles} title="Messages" tab="Messages">
      <div className={styles.heroMessagesSummary}>
        <span>Premium support</span>
        <strong>Coaching chat is active</strong>
        <p>Replies, clips, and guidance stay in one thread.</p>
      </div>

      <div className={styles.heroMessageList}>
        <div className={styles.heroMessageLeft}>
          <p>Upload your acceleration clip from tonight.</p>
        </div>
        <div className={styles.heroMessageRight}>
          <p>Sent. Can you check my first two strides?</p>
        </div>
        <div className={styles.heroMessageLeft}>
          <p>Yes. Push harder through the third step and keep your chest quieter.</p>
        </div>
      </div>

      <div className={styles.heroComposer}>
        <span>Video feedback attached</span>
      </div>
    </PhoneShell>
  );
}
