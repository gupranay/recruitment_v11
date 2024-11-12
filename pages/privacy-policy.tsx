// pages/privacy-policy.tsx
import Link from "next/link";
import { Inter } from "next/font/google";
import "../app/globals.css";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function PrivacyPolicy() {
  return (
    <div className={`flex flex-col min-h-screen ${inter.className}`}>
      <header className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <Link href="/" prefetch={false}>
          <Button variant="outline">Back to main page</Button>
        </Link>
      </header>
      <main className="flex-1 py-12 md:py-24 lg:py-32 xl:py-48">
        <section className="container px-4 md:px-6">
          <div className="flex flex-col space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground md:text-xl">
              Effective Date: July 15, 2024
            </p>
            <p className="text-muted-foreground md:text-xl">
              Last Updated: July 15, 2024
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              Introduction
            </h2>
            <p className="text-muted-foreground md:text-xl">
              At Recruitify (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), we are committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              Information We Collect
            </h2>
            <p className="text-muted-foreground md:text-xl">
              We may collect and process the following data about you:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground md:text-xl">
              <li>
                <strong>Personal Identification Information:</strong> Name, email address, headshot URL, and any other details you provide when uploading your applicant data.
              </li>
              <li>
                <strong>Applicant Data:</strong> Information related to recruitment cycles, such as submitted applications, including all data fields you have provided in the CSV file.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              How We Use Your Information
            </h2>
            <p className="text-muted-foreground md:text-xl">
              We use the information we collect in the following ways:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground md:text-xl">
              <li>
                <strong>To Provide and Maintain Our Service:</strong> To create and manage your account, and to provide and maintain our recruitment platform.
              </li>
              <li>
                <strong>To Improve Our Services:</strong> To understand and analyze how you use our services and to develop new products, services, features, and functionality.
              </li>
              <li>
                <strong>To Communicate with You:</strong> To send you updates, notifications, and other information related to your account and our services.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              Data Storage and Security
            </h2>
            <p className="text-muted-foreground md:text-xl">
              We store your data securely using Supabase and ensure that your information is protected against unauthorized access, disclosure, or destruction. We implement a variety of security measures to maintain the safety of your personal information.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              Sharing Your Information
            </h2>
            <p className="text-muted-foreground md:text-xl">
              We do not sell, trade, or otherwise transfer your personal information to outside parties. Your data is not shared with third parties, except in the following situations:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground md:text-xl">
              <li>
                <strong>Legal Requirements:</strong> If required by law or in response to valid requests by public authorities (e.g., a court or a government agency).
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-2">
              Your Data Protection Rights
            </h2>
            <p className="text-muted-foreground md:text-xl">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground md:text-xl">
              <li>
                <strong>Right to Access:</strong> You have the right to request copies of your personal data.
              </li>
              <li>
                <strong>Right to Rectification:</strong> You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.
              </li>
            </ul>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 Recruit. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy-policy"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
