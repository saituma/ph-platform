import type { Metadata } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./fullcalendar.css";
import "./globals.css";
import { Providers } from "./providers";
import { SileoToaster } from "../components/ui/sileo-toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PH Performance Admin",
  description: "Elite Coaching Operations Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem("theme");
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var dark = stored ? stored === "dark" : prefersDark;
                  if (dark) document.documentElement.classList.add("dark");
                  else document.documentElement.classList.remove("dark");
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <Providers>
          {children}
          <SileoToaster />
        </Providers>
      </body>
    </html>
  );
}
