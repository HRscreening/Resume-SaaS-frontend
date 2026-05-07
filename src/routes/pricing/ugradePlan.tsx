'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { PlanSpec, SubscriptionPlan } from '@/types/index';
import { Link } from '@tanstack/react-router';
import { getProfile, getPlans } from '@/lib/api';

const ease = [0.22, 1, 0.36, 1] as const;
const home_page_url = import.meta.env.VITE_HOME_PAGE_URL || 'https://resumeware.com';

const headerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const gridVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.15, delayChildren: 0.15 } },
};
const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease } },
};

const Check = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0 text-[#2d8f6f]">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const cardBaseClass =
    'flex h-full flex-col rounded-xl border border-[#ebe8e2] bg-white p-7 transition-all hover:shadow-lg';
const cardFeaturedClass =
    'relative shadow-[0_8px_40px_rgba(0,0,0,0.10)] !border-[#2c2c2c]';
const featuredBadgeAfter =
    'after:absolute after:left-1/2 after:-top-3 after:-translate-x-1/2 after:rounded-full after:bg-[#2c2c2c] after:px-4 after:py-1 after:text-[11.5px] after:font-bold after:tracking-[0.5px] after:text-white after:content-["Most_Popular"]';
const planNameClass = 'mb-2 text-[15px] font-semibold text-[#7a7a7a]';
const planDescClass = 'mb-6 text-[13.5px] leading-[1.5] text-[#7a7a7a]';
const planFeatureClass = 'flex items-start gap-2 text-[13.5px] leading-[1.5] text-[#4a4a4a]';
const ctaButtonBase =
    'mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-center text-[14.5px] font-semibold no-underline transition-all';
const ctaPrimary = `${ctaButtonBase} border border-[#1a1a1a] bg-[#1a1a1a] text-white hover:bg-black `;
const ctaSecondary = `${ctaButtonBase} border border-[#e0dcd4] bg-white text-[#2c2c2c] hover:border-[#a0a0a0] hover:bg-[#faf9f6]`;

const PriceAmount = ({ amount }: { amount: string }) => (
    <AnimatePresence mode="wait">
        <motion.span
            key={amount}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease }}
            className="inline-block text-[40px] font-extrabold tracking-[-1.5px] text-[#2c2c2c]"
        >
            {amount}
        </motion.span>
    </AnimatePresence>
);

const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
    FREE: 'Perfect for individuals and small teams getting started with AI-powered resume screening.',
    PLUS: 'Built for teams that hire regularly and need faster, higher-volume screening.',
    PRO: 'Designed for high-volume hiring teams that need scale, flexibility, and greater control over screening workflows.',
    ENTERPRISE: 'Built for large organizations that need advanced security, customization, and dedicated support at scale.',
};

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'PLUS', 'PRO', 'ENTERPRISE'];

const PLAN_SLUG: Record<'PLUS' | 'PRO', 'plus' | 'pro'> = {
    PLUS: 'plus',
    PRO: 'pro',
};

function formatPrice(plan: PlanSpec, isYearly: boolean): string {
    if (plan.key === 'ENTERPRISE') return 'Custom';
    const amount = isYearly ? plan.yearly_price_monthly_usd : plan.price_monthly_usd;
    return `$${amount}`;
}

const Pricing = () => {
    const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile, staleTime: 60_000 });
    const plansQuery = useQuery({ queryKey: ['plans'], queryFn: getPlans, staleTime: 1000 * 60 * 60 * 24 });

    const profile = profileQuery.data;
    const plansData = plansQuery.data ?? [];

    if (profileQuery.isError || plansQuery.isError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">Failed to load data. Please refresh the page.</p>
            </div>
        )
    }

    const isLoggedIn = !!profile;
    const currentPlan: SubscriptionPlan = profile?.plan ?? 'FREE';

    const [isYearly, setIsYearly] = useState(false);

    const isDowngrade = (plan: SubscriptionPlan) =>
        isLoggedIn && plan !== currentPlan && PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan);
    const isCurrent = (plan: SubscriptionPlan) => isLoggedIn && plan === currentPlan;

    function handleBtnTitle(plan: PlanSpec) {
        if (!isLoggedIn) return 'Get started';
        if (plan.key === currentPlan) return 'Current Plan';
        if (isDowngrade(plan.key)) return `Downgrade to ${plan.display_name}`;
        if (plan.key === 'ENTERPRISE') return 'Contact Us';
        return plan.key === 'FREE' ? 'Get started' : 'Upgrade Now';
    }

    if (plansQuery.isLoading || profileQuery.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-6 w-6 rounded-full border-2 border-[#2c2c2c] border-t-transparent animate-spin" />
            </div>
        );
    }

    const orderedPlans = PLAN_ORDER
        .map((k) => plansData.find((p) => p.key === k))
        .filter((p): p is PlanSpec => !!p);

    return (
        <section id="pricing" className="mx-auto max-w-315 px-6 py-16">
            <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0F0F0F] mb-6"
            >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3l-4 4 4 4" />
                </svg>
                Back to dashboard
            </Link>

            <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={headerVariants}
                className="mx-auto mb-8 max-w-150 text-center"
            >
                <h2 className="mb-3 text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.15] tracking-[-1px] text-[#2c2c2c]">
                    Simple, <span className="text-[#c85a17]">transparent</span> pricing
                </h2>
                <p className="text-base leading-[1.6] text-[#7a7a7a]">
                    Start free. Upgrade as your hiring volume grows. No hidden fees.
                </p>
            </motion.div>

            {/* Toggle */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease }}
                className="mt-8 flex items-center justify-center gap-4"
            >
                <span
                    onClick={() => setIsYearly(false)}
                    className={`cursor-pointer text-[14.5px] font-semibold transition-colors ${isYearly ? 'text-[#7a7a7a]' : 'text-[#2c2c2c]'}`}
                >
                    Monthly
                </span>
                <motion.div
                    onClick={() => setIsYearly((v) => !v)}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className={`relative h-6 w-12 cursor-pointer rounded-full p-0.5 transition-colors ${isYearly ? 'bg-[#1a1a1a]' : 'bg-[#e5e0d8]'}`}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform ${isYearly ? 'translate-x-6' : ''}`}
                    />
                </motion.div>
                <span
                    onClick={() => setIsYearly(true)}
                    className={`cursor-pointer text-[14.5px] font-semibold transition-colors ${isYearly ? 'text-[#2c2c2c]' : 'text-[#7a7a7a]'}`}
                >
                    Yearly
                </span>
                <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 320, damping: 14 }}
                    className="-ml-2 whitespace-nowrap rounded-full bg-[#e6f5ef] px-2.5 py-0.5 text-[11px] font-bold text-[#2d8f6f]"
                >
                    Save 20%
                </motion.span>
            </motion.div>

            {/* Cards */}
            <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={gridVariants}
                className="mx-auto mt-14 grid max-w-105 grid-cols-1 gap-4 md:max-w-none md:grid-cols-4"
            >
                {orderedPlans.map((plan, planIdx) => {
                    const isFeatured = plan.key === 'PLUS' && (!isLoggedIn || currentPlan === 'FREE');
                    const isEnterprise = plan.key === 'ENTERPRISE';
                    const isFree = plan.key === 'FREE';
                    const isPaidYearly = isYearly && !isFree && !isEnterprise;

                    return (
                        <motion.div
                            key={plan.key}
                            variants={cardVariants}
                            whileHover={{ y: isFeatured ? -14 : -10, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                            animate={isFeatured ? {
                                boxShadow: [
                                    '0 10px 30px rgba(0,0,0,0.08)',
                                    '0 18px 42px rgba(0,0,0,0.12)',
                                    '0 10px 30px rgba(0,0,0,0.08)',
                                ],
                            } : undefined}
                            transition={isFeatured ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                            className={[
                                cardBaseClass,
                                isEnterprise ? 'bg-[#faf9f6]' : '',
                                isFeatured ? `${cardFeaturedClass} ${featuredBadgeAfter}` : '',
                                isCurrent(plan.key) ? '!border-[#2c2c2c]' : '',
                            ].filter(Boolean).join(' ')}
                        >
                            <div className={planNameClass}>{plan.display_name}</div>
                            <div className="mb-1.5 flex items-baseline gap-1">
                                <PriceAmount amount={formatPrice(plan, isYearly)} />
                                {!isEnterprise && <span className="text-sm text-[#a0a0a0]">/month</span>}
                            </div>
                            <p className={planDescClass}>
                                {PLAN_DESCRIPTIONS[plan.key]} {isPaidYearly && '(billed yearly)'}
                            </p>
                            <ul className="mb-7 flex flex-1 list-none flex-col gap-2.5">
                                {plan.display_features.map((f, i) => (
                                    <motion.li
                                        key={f}
                                        initial={{ opacity: 0, x: -12 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + planIdx * 0.1 + i * 0.06, duration: 0.4, ease }}
                                        className={planFeatureClass}
                                    >
                                        <Check />
                                        <span dangerouslySetInnerHTML={{ __html: f.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#2c2c2c]">$1</strong>') }} />
                                    </motion.li>
                                ))}
                            </ul>

                            {isCurrent(plan.key) ? (
                                <span className={`${ctaPrimary} cursor-default opacity-70`}>
                                    {handleBtnTitle(plan)}
                                </span>
                            ) : isEnterprise ? (
                                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className="mt-auto">
                                    <a href={home_page_url + '/contact'} className={ctaSecondary}>
                                        {handleBtnTitle(plan)}
                                    </a>
                                </motion.div>
                            ) : isFree ? (
                                <Link to="/dashboard">
                                    <motion.span whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} className={ctaSecondary}>
                                        {handleBtnTitle(plan)}
                                    </motion.span>
                                </Link>
                            ) : (
                                <Link
                                    to="/checkout/$plan"
                                    params={{ plan: PLAN_SLUG[plan.key as 'PLUS' | 'PRO'] }}
                                    search={{ cycle: isYearly ? 'yearly' : 'monthly', from: 'app' } as any}
                                >
                                    <motion.span whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className={isFeatured ? ctaPrimary : ctaSecondary}>
                                        {handleBtnTitle(plan)}
                                    </motion.span>
                                </Link>
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
};

export default Pricing;
