import {
    Briefcase, Plus, BriefcaseBusiness, User,
    Building2,
    Wrench,
    GraduationCap,
    Clock3,
    FolderKanban,
    Award,
    Trophy,
    ShieldCheck,
    Languages,
    type LucideIcon
} from "lucide-react"

import type { ScreeningFilterKey } from "@/modules/screening/types/searchSchema"

type FilterDropDownOption = {
    label: string;
    value: ScreeningFilterKey;
    icon: LucideIcon;
}

export const FILTER_OPTIONS: FilterDropDownOption[] = [
    { label: "Name", value: "sName", icon: User },
    { label: "Current Role", value: "sCurrentRole", icon: Briefcase },
    { label: "Current Company", value: "sCurrentCompany", icon: Building2 },
    { label: "Skills", value: "sSkills", icon: Wrench },
    { label: "Education", value: "sEducation", icon: GraduationCap },
    { label: "Work Experience", value: "sWorkEx", icon: Clock3 },
    { label: "Project", value: "sProject", icon: FolderKanban },
    { label: "Certification", value: "sCertification", icon: Award },
    { label: "Achivements", value: "sAchivement", icon: Trophy },
    { label: "Position of Responsibility", value: "sPors", icon: ShieldCheck },
    { label: "language", value: "sLang", icon: Languages },
]


export function getFilterLabel(value: ScreeningFilterKey): string {
    const option = FILTER_OPTIONS.find((option) => option.value === value);
    return option ? option.label : value;
}
