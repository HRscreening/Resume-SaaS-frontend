
const CREDIT_RATES = [
    {
        name: "Source a Candidate Profile",
        credits: "1 credit",
        unit: "per candidate",
    },
    {
        name: "Screen a Resume",
        credits: "0.5 credits",
        unit: "per resume",
    },
    {
        name: "Run a Phone Screen",
        credits: "12 credits",
        unit: "per interview",
    },
    {
        name: "Run an AI Interview",
        credits: "100 credits",
        unit: "per 60-minute interview",
    },
];

export const CreditUsageSection = () => {
    return (
        <div id="rate"
        className="
            h-full w-full rounded-[24px]
            border border-[#ebe8e2]
            bg-white p-6
            flex flex-col
        ">

            {/* Header */}
            <h2 className="
                mb-5 text-xl font-bold
                tracking-tight text-[#2c2c2c]
            ">
                Credit rates
            </h2>

            {/* Credit Rates */}
            <div className="flex flex-col gap-2">
                {CREDIT_RATES.map((item) => (
                    <div
                        key={item.name}
                        className="
                            flex items-center justify-between
                            gap-3 rounded-xl
                            bg-[#faf9f6] px-4 py-3
                            transition-colors hover:bg-[#fff7f1]
                        "
                    >
                        <span className="
                            text-sm font-medium
                            text-[#2c2c2c]
                        ">
                            {item.name}
                        </span>

                        <div className="flex shrink-0 items-center gap-2">
                            <span className="
                                whitespace-nowrap text-sm
                                font-bold text-[#2c2c2c]
                            ">
                                {item.credits}
                            </span>

                            <span className="
                                hidden text-xs text-[#8a8a8a]
                                sm:inline
                            ">
                                {item.unit}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sample Usage */}
            <div className="mt-5">
                <SampleUsageDialog />
            </div>

            {/* Footer Note */}
            <p className="
                mt-4 text-xs leading-relaxed
                text-[#858585]
            ">
                Credit consumption is based on the action performed.
                Refer to your subscription plan for available credit allocations.
            </p>
        </div>
    );
};



import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

const SAMPLE_USAGE = [
    { plan: "Free", profiles: "16", resumes: "16", phone: "2", ai: "—" },
    { plan: "Lite", profiles: "100", resumes: "100", phone: "10", ai: "2" },
    { plan: "Plus", profiles: "600", resumes: "600", phone: "15", ai: "10" },
    { plan: "Pro", profiles: "1,700", resumes: "1,700", phone: "80", ai: "20" },
    { plan: "Enterprise", profiles: "Custom", resumes: "Custom", phone: "Custom", ai: "Custom" },
];

const SampleUsageDialog = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    className="
                        inline-flex items-center gap-2
                        rounded-full border border-[#f0d4c2]
                        bg-[#fff7f1] px-5 py-2.5
                        text-sm font-semibold text-[#c85a17]
                        transition-all hover:bg-[#fff1e8]
                    "
                >
                    View Sample Usage by Plan
                    <span aria-hidden="true">↗</span>
                </button>
            </DialogTrigger>

            <DialogContent
                className="
                    w-[calc(100%-2rem)] max-w-5xl
                    rounded-2xl border-[#ebe8e2]
                    bg-white p-6 sm:p-8
                    max-h-[85vh] overflow-y-auto
                "
            >
                <DialogHeader className="mb-5 text-left">
                    <DialogTitle className="
                        text-2xl font-extrabold tracking-tight
                        text-[#2c2c2c] sm:text-3xl
                    ">
                        Sample Usage by Plan
                    </DialogTitle>

                    <DialogDescription className="
                        max-w-2xl text-sm leading-relaxed
                        text-[#7a7a7a]
                    ">
                        These examples show how you can split your monthly
                        credits. Adjust the mix as your hiring needs change.
                    </DialogDescription>
                </DialogHeader>

                {/* Responsive table */}
                <div className="overflow-x-auto rounded-xl border border-[#ebe8e2]">
                    <table className="w-full min-w-162.5 border-collapse text-sm">
                        <thead>
                            <tr className="bg-[#fff1e8] text-[#2c2c2c]">
                                {[
                                    "Plan",
                                    "Profiles sourced",
                                    "Resume screens",
                                    "Phone screens",
                                    "AI interviews",
                                ].map((header, i) => (
                                    <th
                                        key={header}
                                        className={`
                                            border-b border-[#f0d4c2]
                                            px-4 py-3 font-bold
                                            ${i === 0 ? "text-left" : "text-center"}
                                        `}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {SAMPLE_USAGE.map((row, index) => (
                                <tr
                                    key={row.plan}
                                    className={`
                                        ${index % 2 === 0 ? "bg-[#faf9f6]" : "bg-white"}
                                        transition-colors hover:bg-[#fffaf6]
                                    `}
                                >
                                    <td className="border-b border-[#ebe8e2] px-4 py-3 font-semibold text-[#2c2c2c]">
                                        {row.plan}
                                    </td>

                                    {[row.profiles, row.resumes, row.phone, row.ai].map(
                                        (value, i) => (
                                            <td
                                                key={i}
                                                className={`
                                                    border-b border-[#ebe8e2]
                                                    px-4 py-3 text-center
                                                    ${value === "Custom"
                                                        ? "font-medium text-[#c85a17]"
                                                        : "text-[#4a4a4a]"
                                                    }
                                                `}
                                            >
                                                {value}
                                            </td>
                                        )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Note */}
                <p className="mt-5 text-xs leading-relaxed text-[#7a7a7a]">
                    Free usage shares the 50-credit balance and is subject
                    to the Free plan limits. AI interviews are shown in
                    the paid examples.
                </p>
            </DialogContent>
        </Dialog>
    );
};





import { Link } from "@tanstack/react-router";

export const ManagedRecruitmentPricing = () => {
    return (
        <div className="
            h-full w-full rounded-[24px]
            border border-[#2c2c2c]
            bg-[#252525] p-6
            flex flex-col
        ">

            {/* Header */}
            <h2 className="mb-2 text-xl font-bold text-white">
                Managed recruitment pricing
            </h2>

            {/* Description */}
            <p className="
                mb-6 text-sm leading-relaxed
                text-[#dedede]
            ">
                A specialist recruiter runs the search for your urgent or hard-to-fill role.
                We handle sourcing, outreach, and screening, and your team decides who to hire.
            </p>

            {/* Pricing */}
            <div className="
                mb-4 flex flex-wrap items-baseline
                gap-x-3 gap-y-1
            ">
                <span className="
                    text-[44px] font-extrabold
                    leading-none tracking-tight text-white
                ">
                    8–12%
                </span>

                <span className="text-base text-[#b8c5d0]">
                    of annual CTC on a successful hire
                </span>
            </div>

            {/* Setup Fee */}
            <div className="
                mb-4 flex flex-wrap items-center
                gap-2 text-sm
            ">
                <span className="text-white">
                    ₹0 upfront setup fee.
                </span>

                <Link
                    to="/contact"
                    search={{ from: "managedRecruitment" } as any}
                    className="
                        font-semibold text-[#9bc9bd]
                        underline underline-offset-2
                        hover:text-white
                    "
                >
                    Talk to HireSort about your role
                </Link>
            </div>

            {/* Terms */}
            <div className="
                flex flex-col gap-2.5
                text-sm leading-relaxed text-[#f0f0f0]
            ">
                <p>
                    <strong className="text-white">
                        Full refund guarantee.
                    </strong>{" "}
                    If a hire leaves or is dismissed in the first three months,
                    you get a full refund.
                </p>

                <p>
                    <strong className="text-white">
                        Hiring contractors?
                    </strong>{" "}
                    The success fee is 10% of total compensation over 12 months.
                </p>

                <p>
                    <strong className="text-white">
                        Already talking to someone?
                    </strong>{" "}
                    You pay no fee if HireSort introduces a candidate you're
                    already in conversation with.
                </p>
            </div>

        </div>
    );
};
