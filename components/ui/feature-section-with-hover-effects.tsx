import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "Multi-Round Recruitment Management",
      description:
        "Easily create and manage recruitment cycles with multiple rounds, tailored to your organization's process.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Collaborative Scoring & Feedback",
      description:
        "Invite board and general members to leave scores and comments, with options for anonymized or named feedback.",
      icon: <IconHeart />,
    },
    {
      title: "CSV Applicant Import",
      description:
        "Bulk upload applicants from Google Forms, Tally, or any spreadsheet. Map name, email, and headshot instantly.",
      icon: <IconCloud />,
    },
    {
      title: "Anonymized & Named Feedback",
      description:
        "Collect both blind and attributed feedback for each round, supporting fair and transparent evaluations.",
      icon: <IconHelp />,
    },
    {
      title: "Demographic Analytics",
      description:
        "See demographic breakdowns by status (accepted, rejected, maybe) to support equitable recruiting decisions.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Easy Applicant Progression",
      description:
        "Move applicants between rounds, mark as accepted, rejected, or maybe—all in a few clicks.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Export Decisions & Emails",
      description:
        "Export applicant decisions and emails for streamlined communication with all candidates.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Built for Clubs, Orgs & Startups",
      description:
        "Designed for collaborative, high-input recruiting—not traditional job boards or applicant portals.",
      icon: <IconTerminal2 />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-start bg-white/80 dark:bg-neutral-900 rounded-2xl border border-transparent hover:border-blue-400 hover:bg-blue-400/10 transition-colors duration-200 shadow-sm p-8 min-h-[220px] group/feature"
      )}
    >
      <div className="mb-4 text-2xl text-blue-500 dark:text-blue-400">
        {icon}
      </div>
      <div className="text-xl font-semibold mb-2 bg-gradient-to-r from-green-400 to-blue-400 text-transparent bg-clip-text">
        {title}
      </div>
      <p className="text-base text-black dark:text-neutral-300 max-w-xs">
        {description}
      </p>
    </div>
  );
};
