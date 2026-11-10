import React from "react";
import { Link } from "@tanstack/react-router";
import { UsageQuotas } from "@/modules/subscription/UsageQuotas";
import { ArrowLeft } from "lucide-react";

export default function Usage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation / Breadcrumb */}
      <div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#737373] hover:text-[#0F0F0F] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Profile
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">Usage & Quotas</h1>
        <p className="text-sm text-[#737373] mt-1">
          Detailed breakdown of your monthly feature usage, consumption quotas, and limits.
        </p>
      </div>

      {/* Usage Quotas Component */}
      <UsageQuotas />
    </div>
  );
}
