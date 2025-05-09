// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import QueryProvider from "@/components/query-provider";
import { Analytics } from "@vercel/analytics/react";
import NavBar from "@/components/NavBar";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { RecruitmentCycleProvider } from "@/contexts/RecruitmentCycleContext";

export const metadata: Metadata = {
  title: "Recruitify",
  description: "Simplify your Orgs Recruitment Today",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <Analytics />
        <head>
          <link
            rel="icon"
            href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👥</text></svg>"
          />
        </head>
        <body>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <OrganizationProvider>
                <RecruitmentCycleProvider>
                  <main className=" min-h-screen mx-auto py-10">
                    {children}
                  </main>
                </RecruitmentCycleProvider>
              </OrganizationProvider>
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </>
  );
}
