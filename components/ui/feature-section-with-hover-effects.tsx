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
import { motion } from "framer-motion";

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
      "Move applicants between rounds and mark accepted, rejected, or maybe in a few clicks.",
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
      "Designed for collaborative, high-input recruiting workflows used by boards, not public job board pipelines.",
    icon: <IconTerminal2 />,
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
      staggerChildren: 0.05,
    },
  },
};

export function FeaturesSectionWithHoverEffects() {
  return (
    <motion.div
      className="relative z-10 py-4 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </motion.div>
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
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl p-5 md:p-6 transition-all duration-200",
        // Light mode: card matches app surfaces
        "border border-black/5 bg-white/90 shadow-sm",
        // Dark mode: keep glassy dark surface
        "dark:border-white/10 dark:bg-black/40 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
      )}
    >
      <div className="flex items-center text-[0.7rem] uppercase tracking-[0.24em] text-neutral-400">
        <span className="flex items-center gap-2">
          <span className="h-1 w-4 rounded-full bg-emerald-400/90" />
          <span>{`Feature ${String(index + 1).padStart(2, "0")}`}</span>
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="mt-1 text-2xl text-emerald-500 dark:text-emerald-300">
          {icon}
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
            {title}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.article>
  );
};
