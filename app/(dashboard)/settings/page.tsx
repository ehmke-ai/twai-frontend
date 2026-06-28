import Link from "next/link";

import { GuardrailsForm } from "@/components/guardrails-form";
import { PhaseControl } from "@/components/phase-control";

// Settings landing (PRD Section 12): integrations + the server-enforced
// guardrails view (guardrails-form, M5).
const SECTIONS = [
  {
    href: "/settings/integrations",
    title: "Integrations",
    desc: "Connect your Robinhood Agentic account (Phase 2, read-only).",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Account connections and agent configuration.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-black/[.08] p-5 transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:hover:border-white/[.3]"
          >
            <div className="font-medium">{s.title}</div>
            <div className="mt-1 text-sm text-zinc-500">{s.desc}</div>
          </Link>
        ))}
      </div>

      <PhaseControl />
      <GuardrailsForm />
    </div>
  );
}
