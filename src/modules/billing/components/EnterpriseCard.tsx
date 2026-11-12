
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

const EnterprisePlanCard = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="
                mt-8 flex flex-col gap-6
                rounded-2xl border border-[#ebe8e2]
                bg-[#faf9f6] p-6 sm:p-8
                md:flex-row md:items-center md:justify-between
            "
        >
            <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-[#2c2c2c]">
                        Enterprise
                    </h2>

                    <span className="text-sm font-semibold text-[#c85a17]">
                        Custom Pricing
                    </span>
                </div>

                <p className="mb-2 text-sm leading-normal text-[#7a7a7a]">
                    Tailored to your team
                </p>

                <p className="max-w-3xl text-sm leading-relaxed text-[#7a7a7a] sm:text-base">
                    Custom credit volumes, security reviews, ATS integrations,
                    SSO, custom integrations and automations, and a dedicated
                    team to support your recruitment operations at enterprise scale.
                </p>
            </div>

            <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0"
            >
                <Link
                    to="/contact"
                    search={{ from: "upgradePlan" } as any}
                    className="
                        inline-flex min-w-45 items-center
                        justify-center rounded-full
                        bg-[#1a1a1a] px-8 py-4
                        text-sm font-semibold text-white
                        transition-colors hover:bg-[#c85a17]
                    "
                >
                    Talk to Sales
                </Link>
            </motion.div>
        </motion.div>
    );
};

export default EnterprisePlanCard;
