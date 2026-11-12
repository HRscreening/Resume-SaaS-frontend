'use client';

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { PlanSpec, SubscriptionPlan } from '@/types/index';
import { Link } from '@tanstack/react-router';
import { getProfile, getPlans } from '@/lib/api';
import EnterprisePlanCard from "@/modules/billing/components/EnterpriseCard"
import { CreditUsageSection, ManagedRecruitmentPricing } from "@/modules//billing/components/Utils"
import { PricingCard } from "@/modules/billing/components/PricingCard"
import { useUserSubscription } from '@/modules/subscription/useSubscription';

const ease = [0.22, 1, 0.36, 1] as const;

const headerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const gridVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.15, delayChildren: 0.15 } },
};
const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'LITE', 'PLUS', 'PRO', 'ENTERPRISE'];





const Pricing = () => {
    // All hooks must run on every render in the same order. Hooks are above
    // any conditional return; do not move them. (Earlier version had useState
    // below an isError early-return, dropping the hook count and surfacing as
    // minified React error #300 once the parent re-rendered.)
    const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile, staleTime: 60_000 });
    const plansQuery = useQuery({ queryKey: ['plans'], queryFn: getPlans, staleTime: 1000 * 60 * 60 * 24 });
    const [isYearly, setIsYearly] = useState(false);
    const {data:userSubscription} = useUserSubscription()

    const profile = profileQuery.data;
    const plansData = plansQuery.data ?? [];
    const isLoggedIn = !!profile;
    const currentPlan: SubscriptionPlan = profile?.plan ?? 'FREE';

    // Show the spinner only on the FIRST load (no data yet). React Query
    // surfaces isLoading=true exclusively for that case; background refetches
    // do not flip it true again.
    if (plansQuery.isLoading && plansData.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-6 w-6 rounded-full border-2 border-[#2c2c2c] border-t-transparent animate-spin" />
            </div>
        );
    }

    // Bail to full-page error only when we genuinely cannot render any cards
    // (plans never loaded). A profile fetch failing is non-fatal — the page
    // already treats `!profile` as anonymous via `isLoggedIn`.
    if (plansQuery.isError && plansData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4 text-center">
                <p className="text-red-500">Couldn't load pricing. Please try again.</p>
                <button
                    onClick={() => plansQuery.refetch()}
                    className="h-10 px-4 rounded-xl bg-[#0F0F0F] text-white text-sm font-medium hover:bg-[#1C1C1C] transition-colors"
                >
                    Retry
                </button>
            </div>
        )
    }

    


    const EXCLUDED_PLANS: SubscriptionPlan[] = ["ENTERPRISE", "BUSINESS", "ENTERPRISE"];

    const isSubscriptionActive = userSubscription?.status.toLowerCase() === 'active'
    const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan)


    
    const orderedPlans = PLAN_ORDER
        .map((k) => plansData.find((p) => p.key === k))
        .filter(
            (p): p is PlanSpec =>
                !!p && !EXCLUDED_PLANS.includes(p.key)
        );

    return (
        <section id="pricing" className="mx-auto max-w-315 px-4 py-8 sm:px-6 sm:py-12 md:py-16">
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
                // Mobile gap-6 leaves room for the featured card's "Most
                // Popular" pseudo-badge ('after:-top-3') to overhang
                // cleanly when cards stack. md+ tightens to gap-4 to keep
                // the comparison row visually unified.
                className="mx-auto mt-10 sm:mt-14 grid max-w-105 grid-cols-1 gap-6 md:max-w-none md:grid-cols-4 md:gap-4"
            >
                {orderedPlans.map((plan, planIdx) => (
                    <PricingCard
                        key={plan.key}
                        isSubscriptionActive={isSubscriptionActive}
                        planIdx={planIdx}
                        plan={plan}
                        currentPlan={currentPlan}
                        currentPlanIdx={currentPlanIdx}
                        isLoggedIn={isLoggedIn}
                        isYearly={isYearly}
                    />
                ))}
            </motion.div>

            <EnterprisePlanCard />
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-12 lg:grid-cols-2">
                <ManagedRecruitmentPricing />
                <CreditUsageSection />
            </div>
        </section>
    );
};

export default Pricing;
