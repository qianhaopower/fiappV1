
import "@aws-amplify/ui-react/styles.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import AuthenticatorWrapper from "@/components/AuthenticatorWrapper";
import { Toaster } from "@/components/ui";
import ConfigureAmplifyClientSide from '@/components/ConfigureAmplifyClientSide';

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
        {/* ✅ configure Amplify on the client */}
        <ConfigureAmplifyClientSide />

        {/* ✅ then render Auth */}
        <AuthenticatorWrapper>{children}</AuthenticatorWrapper>
        <Toaster />
      </body>
    </html>
  );
}
