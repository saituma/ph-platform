"use client";

import { useRef } from "react";
import {
  CalendarDots,
  ChatCircleDots,
  House,
  Pulse,
  SquaresFour,
  ArrowRight,
  Clock,
  User,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { DeviceFrameset } from "react-device-frameset";

type Styles = Record<string, string>;

export function HeroDeviceShowcase({ styles }: { styles: Styles }) {
  return (
    <div className={styles.heroStoryWrap}>
      <div className={styles.heroStoryPin}>
        <div className={styles.heroStoryPhone}>
          <DeviceFrameset device="iPhone X">
            <div className={styles.heroPhoneUi}>
              <div className={styles.heroPhoneStatus}>
                <span>9:41</span>
                <Lightning size={14} weight="bold" />
              </div>

              <div className={styles.heroPhoneHeader}>
                <p className={styles.heroPhoneEyebrow}>PH PERFORMANCE</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <h4 className={styles.heroPhoneTitle}>DASHBOARD</h4>
                  <User size={24} weight="bold" color="#00FF66" />
                </div>
              </div>

              <div className={styles.heroHomeCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem" }}>NEXT SESSION</span>
                  <span style={{ color: "#00FF66", fontFamily: "var(--font-mono)", fontSize: "0.6rem" }}>17:30</span>
                </div>
                <strong style={{ display: "block", fontSize: "1.25rem", marginBottom: "0.5rem" }}>EXPLOSIVE DRIVE</strong>
                <p style={{ fontSize: "0.8rem", color: "#666" }}>Focus on acceleration mechanics and block clearance.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ border: "1px solid var(--border)", padding: "1rem" }}>
                  <span style={{ display: "block", fontSize: "0.5rem", color: "#666" }}>DRIVE SCORE</span>
                  <strong style={{ fontSize: "1.5rem", color: "#00FF66" }}>98</strong>
                </div>
                <div style={{ border: "1px solid var(--border)", padding: "1rem" }}>
                  <span style={{ display: "block", fontSize: "0.5rem", color: "#666" }}>RECOVERY</span>
                  <strong style={{ fontSize: "1.5rem" }}>OPT</strong>
                </div>
              </div>

              <div className={styles.heroInfoCard}>
                <Clock size={16} />
                <div style={{ marginLeft: "0.75rem" }}>
                  <strong style={{ display: "block", fontSize: "0.8rem" }}>VIDEO REVIEW READY</strong>
                  <p style={{ fontSize: "0.7rem", color: "#666" }}>Coach David left 4 notes.</p>
                </div>
              </div>

              <div className={styles.heroPhoneTabbar}>
                <TabItem icon={<House size={18} weight="fill" />} label="HOME" active />
                <TabItem icon={<Pulse size={18} />} label="PROGRAMS" />
                <TabItem icon={<ChatCircleDots size={18} />} label="MESSAGES" />
                <TabItem icon={<Sparkle size={18} />} label="PARENTS" />
                <TabItem icon={<CalendarDots size={18} />} label="SCHEDULE" />
                <TabItem icon={<SquaresFour size={18} />} label="MORE" />
              </div>
            </div>
          </DeviceFrameset>
        </div>
      </div>
    </div>
  );
}

function TabItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      color: active ? "#00FF66" : "#333",
      padding: "0.25rem",
      gap: "2px"
    }}>
      {icon}
      <span style={{ fontSize: "0.4rem", fontWeight: 800 }}>{label}</span>
    </div>
  );
}
