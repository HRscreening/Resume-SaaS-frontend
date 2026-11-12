import React from "react";
import { Link } from "@tanstack/react-router";
import { UsageQuotas } from "@/modules/subscription/UsageQuotas";
import { ArrowLeft } from "lucide-react";

export default function Usage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation / Breadcrumb */}

      {/* Usage Quotas Component */}
      <UsageQuotas />
    </div>
  );
}
