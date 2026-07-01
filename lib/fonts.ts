import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontHeading = Geist({
  subsets: ["latin"],
  variable: "--font-heading",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fontVariables = cn(
  fontSans.variable,
  fontHeading.variable,
  fontMono.variable,
);
