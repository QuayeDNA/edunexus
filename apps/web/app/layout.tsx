import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/layouts/providers";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth/auth.config";
import { db } from "@/lib/db";
import { profiles } from "@edunexus/database";
import { eq } from "drizzle-orm";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

async function getThemeClass(): Promise<string> {
  try {
    const session = await auth();
    if (!session?.user?.id) return "";

    const row = await db
      .select({ themePreference: profiles.themePreference })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .then((rows) => rows[0] ?? null);

    const pref = row?.themePreference ?? "system";
    if (pref === "light") return "light";
    if (pref === "dark") return "dark";
    // "system" — let next-themes handle it on the client; no server class
    return "";
  } catch {
    return "";
  }
}

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeClass = await getThemeClass();

  return (
    <html
      lang="en-GH"
      className={cn(
        "font-sans",
        plexSans.variable,
        fraunces.variable,
        plexMono.variable,
        themeClass,
      )}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
