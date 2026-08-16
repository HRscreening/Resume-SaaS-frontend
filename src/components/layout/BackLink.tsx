import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

interface BackLinkProps {
  /** Where "back" goes. Always an explicit destination, never history.back():
   *  a page reached from three places must land somewhere predictable, and
   *  browser history can point at an external site or a deleted record.
   *
   *  Typed loosely because the router types `to`/`params`/`search` as a union
   *  narrowed per route, which a component generic over every route cannot
   *  satisfy. The cast happens once here rather than at each call site. */
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  /** What the destination is, e.g. "Screening". Rendered as "Back to X". */
  label: string;
  className?: string;
}

/**
 * The primary way out of a sub-page.
 *
 * Sub-pages had only a breadcrumb: 11px grey text that reads as a location
 * indicator, not a control. Recruiters landing on the voice setup screen had no
 * obvious way back to the job they came from. This is a real target — arrow,
 * body-size text, hover state — placed above the page title where the eye
 * starts, and it sits alongside the breadcrumb rather than replacing it (the
 * breadcrumb still answers "where am I in the hierarchy", which a single back
 * link cannot).
 */
export function BackLink({ to, params, search, label, className = "" }: BackLinkProps) {
  return (
    <Link
      {...({ to, params, search } as unknown as ComponentProps<typeof Link>)}
      className={`group -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-[#404040] transition-colors hover:text-[#0F0F0F] ${className}`}
    >
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        className="transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M8.5 3L4.5 7l4 4" />
      </svg>
      Back to {label}
    </Link>
  );
}
