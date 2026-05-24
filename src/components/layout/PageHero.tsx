import type { Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

type EyebrowProps = {
  icon: ReactNode;
  label: string;
};

export const Eyebrow = ({ icon, label }: EyebrowProps) => (
  <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(200,90,23,0.18)] bg-[rgba(200,90,23,0.08)] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.6px] text-accent">
    {icon}
    <span>{label}</span>
  </div>
);

type PageHeroProps = {
  icon: ReactNode;
  eyebrow: string;
  /** The headline with an optional <span className="text-accent"> inside. */
  title: ReactNode;
  lead: ReactNode;
  /** Rendered below the lead (search bar, updated chip, etc.). */
  children?: ReactNode;
};

export const PageHero = ({ icon, eyebrow, title, lead, children }: PageHeroProps) => (
  <section className="relative mx-auto max-w-300 overflow-hidden px-6 pt-16 pb-8 text-center">
    {/* Subtle grid background with radial fade */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(200,180,160,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(200,180,160,0.18) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage:
          'radial-gradient(ellipse 70% 80% at 50% 40%, black 10%, transparent 75%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 70% 80% at 50% 40%, black 10%, transparent 75%)',
      }}
    />
    <div className="relative z-1 mx-auto max-w-180">
      <Eyebrow icon={icon} label={eyebrow} />
      <h1 className="my-4 text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.12] tracking-[-1.5px] text-charcoal">
        {title}
      </h1>
      <p className="mx-auto max-w-155 text-base leading-[1.65] text-charcoal-lt">
        {lead}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  </section>
);

export const pageFadeUp = fadeUp;
export const pageStagger = stagger;
export const pageEase = ease;
