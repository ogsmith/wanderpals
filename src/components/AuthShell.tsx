import Link from "next/link";
import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { POPULATION } from "@/lib/population";

/** Friendly frame around Clerk's sign-in / sign-up forms. */
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-10 gap-6">
      <Link href="/" className="font-display text-2xl font-bold flex items-center gap-2">
        <Logo /> Wanderpals
      </Link>
      <div className="flex items-end gap-1" aria-hidden>
        {POPULATION.slice(0, 3).map((p, i) => (
          <Avatar key={p.id} look={p.look} size={i === 1 ? 96 : 80} waving={i === 1} />
        ))}
      </div>
      <h1 className="font-display text-3xl font-bold text-center">{title}</h1>
      {children}
    </div>
  );
}
