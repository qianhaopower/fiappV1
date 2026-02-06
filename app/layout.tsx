
import "@aws-amplify/ui-react/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui";
import AmplifyProvider from "@/components/AmplifyProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FIApp - Wellbeing & Growth",
  description: "Your personal wellbeing and growth platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AmplifyProvider>{children}</AmplifyProvider>
        <Toaster />
      </body>
    </html>
  );
}
