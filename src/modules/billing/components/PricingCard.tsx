import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion"
import { PlanSpec, SubscriptionPlan } from "@/types"
import { Link } from "@tanstack/react-router";
import ConfirmDowngradeDialog from '@/modules/billing/components/DowngradeModal';
import { useNavigate } from "@tanstack/react-router";

interface PricingCardProp {
    planIdx: number;
    plan: PlanSpec;
    isSubscriptionActive: boolean
    isYearly: boolean;
    currentPlanIdx: number;
    currentPlan: SubscriptionPlan;
    isLoggedIn: boolean;
}


const ease = [0.22, 1, 0.36, 1] as const;

const PLAN_SLUG: Record<'LITE' | 'PLUS' | 'PRO', 'lite' | 'plus' | 'pro'> = {
    LITE: 'lite',
    PLUS: 'plus',
    PRO: 'pro'
};

type PlanButtonAction = "GET_STARTED" | "RENEW" | "DOWNGRADE" | "UPGRADE" | "CONTACT_SALES" | "CURRENT_PLAN";

const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
    FREE: "Try it on one active role.",
    LITE: "Occasional hiring",
    PLUS: "Regular hiring",
    BUSINESS: "Tailored to your team",
    PRO: 'High-volume hiring',
    ENTERPRISE: "Tailored to your team",
    UNLIMITED: 'Unlimited Hiring',
};

const Check = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0 text-[#2d8f6f]">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/**
 * A plan the catalog gives no USD price is contact-sales. Keyed off the
 * payload rather than off a plan name, so adding a custom-priced tier needs
 * no change here.
 */
function isCustomPriced(plan: PlanSpec, isYearly: boolean): boolean {
    const amount = isYearly ? plan.yearly_price_monthly_usd : plan.price_monthly_usd;
    return amount === undefined || amount === null;
}

function formatPrice(plan: PlanSpec, isYearly: boolean): string {
    if (isCustomPriced(plan, isYearly)) return 'Custom';
    const amount = (isYearly ? plan.yearly_price_monthly_usd : plan.price_monthly_usd) as number;
    // Yearly rates carry cents ($39.20); monthly ones don't ($49). Rendering
    // the raw number would print "$39.2".
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** "billed at $470.40/year" — the annual total behind a monthly yearly rate. */
function formatAnnualTotal(plan: PlanSpec): string | null {
    const monthly = plan.yearly_price_monthly_usd;
    if (monthly === undefined || monthly === null || monthly === 0) return null;
    return `billed at $${(monthly * 12).toFixed(2)}/year`;
}



const PriceAmount = ({ amount }: { amount: string }) => (
    <AnimatePresence mode="wait">
        <motion.span
            key={amount}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease }}
            className="inline-block text-[34px] sm:text-[40px] font-extrabold tracking-[-1.5px] text-[#2c2c2c]"
        >
            {amount}
        </motion.span>
    </AnimatePresence>
);

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease } },
};

const cardBaseClass =
    'flex h-full flex-col rounded-xl border border-[#ebe8e2] bg-white p-6 sm:p-7 transition-all hover:shadow-lg';
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



export function PricingCard({
    plan,
    isSubscriptionActive,
    currentPlan,
    isLoggedIn,
    isYearly,
    planIdx,
    currentPlanIdx = 0,
}: PricingCardProp) {
    const navigate = useNavigate();

    const [openDialog, setOpenDialog] = useState<boolean>(false)

    const isCurrent = isLoggedIn && plan.key === currentPlan;
    const isEnterprise = plan.key === "ENTERPRISE";
    const isFree = plan.key === "FREE";

    const isFeatured =
        plan.key === "PLUS" &&
        (!isLoggedIn || currentPlan === "FREE");

    const isPaidYearly = isYearly && !isFree && !isEnterprise;

    // Determine button action
    function getButtonAction(): PlanButtonAction {
        if (!isLoggedIn) return "GET_STARTED";
        if (isEnterprise) return "CONTACT_SALES";
        if (isCurrent) return isFree ? "CURRENT_PLAN" : "RENEW";
        if (planIdx < currentPlanIdx) return "DOWNGRADE";
        if (planIdx > currentPlanIdx) return "UPGRADE";

        return "CONTACT_SALES";
    }

    // Button label
    function handleBtnTitle(): string {
        const action = getButtonAction();

        const titles: Record<PlanButtonAction, string> = {
            GET_STARTED: "Get started",
            RENEW: "Renew plan",
            DOWNGRADE: "Downgrade",
            UPGRADE: "Upgrade Now",
            CONTACT_SALES: "Contact Us",
            CURRENT_PLAN: "Current Plan",
        };

        return titles[action];
    }

    function navigateToCheckout() {
        const slug = PLAN_SLUG[plan.key as keyof typeof PLAN_SLUG];

        if (!slug) {
            navigate({ to: "/dashboard" });
            return;
        }

        navigate({
            to: "/checkout/$plan",
            params: { plan: slug },
            search: {
                cycle: isYearly ? "yearly" : "monthly",
                from: "app",
            } as any,
        });
    }

    // Button click handler
    function handleBtnClick() {
        // Cancelled / inactive subscription: always go to checkout
        if (!isSubscriptionActive) {
            if (isFree) {
                navigate({ to: "/dashboard" });
            } else {
                navigateToCheckout();
            }
            return;
        }

        const action = getButtonAction();

        switch (action) {
            case "CURRENT_PLAN":
                return;

            case "DOWNGRADE":
                setOpenDialog(true);
                return;

            case "CONTACT_SALES":
                navigate({
                    to: "/contact",
                    search: { from: "upgradePlan" } as any,
                });
                return;

            case "GET_STARTED":
                if (isFree) {
                    navigate({ to: "/dashboard" });
                } else {
                    navigateToCheckout();
                }
                return;

            case "RENEW":
            case "UPGRADE":
                navigateToCheckout();
                return;
        }
    }


    return <motion.div
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
        ].filter(Boolean).join(' ')}
    >
        <div className={planNameClass}>{plan.display_name}</div>
        <div className="mb-1.5 flex items-baseline gap-1">
            <PriceAmount amount={formatPrice(plan, isYearly)} />
            {!isCustomPriced(plan, isYearly) && (
                <span className="text-sm text-[#a0a0a0]">/month</span>
            )}
        </div>
        <p className={planDescClass}>
            {PLAN_DESCRIPTIONS[plan.key]}{' '}
            {isPaidYearly && `(${formatAnnualTotal(plan) ?? 'billed yearly'})`}
        </p>

        <span className="mb-4 inline-flex items-center rounded-full bg-[#fff1e8] px-3 py-1.5 text-sm font-medium text-[#c85a17]">
            {plan.credit_limit} <a href="#rate"> <span className="mx-1 underline underline-offset-2">credits</span> </a> / month
        </span>

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

        <motion.button
            type="button"
            onClick={handleBtnClick}
            disabled={getButtonAction() === "CURRENT_PLAN"}
            whileHover={
                getButtonAction() !== "CURRENT_PLAN"
                    ? { scale: 1.04, y: -2 }
                    : undefined
            }
            whileTap={{ scale: 0.97 }}
            className={`
        ${isCurrent ? ctaPrimary : ctaSecondary}
        ${getButtonAction() === "CURRENT_PLAN"
                    ? "cursor-default opacity-60"
                    : "cursor-pointer"
                }
    `}
        >
            {handleBtnTitle()}
        </motion.button>

        {currentPlanIdx > planIdx &&
            <ConfirmDowngradeDialog open={openDialog} setOpen={setOpenDialog} />
        }

    </motion.div>
}

{/* <ConfirmDowngradeDialog
            plan={plan.key}
            cycle={isYearly ? 'yearly' : 'monthly'}
            trigger={
                <motion.span
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={ctaSecondary}
                >
                    {handleBtnTitle(plan)}
                </motion.span>
            }
        /> */}