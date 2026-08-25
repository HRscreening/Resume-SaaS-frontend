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
import type { ApplicationFilterKey } from "@/modules/screening/types/searchSchema"

type FilterDropDownOption = {
    label: string;
    value: ApplicationFilterKey;
    icon: LucideIcon;
}

export const FILTER_OPTIONS: FilterDropDownOption[] = [
    { label: "Name", value: "appName", icon: User },
    { label: "Current Role", value: "appCurrentRole", icon: Briefcase },
    { label: "Current Company", value: "appCurrentCompany", icon: Building2 },
    { label: "Skills", value: "skills", icon: Wrench },
    { label: "Education", value: "education", icon: GraduationCap },
    { label: "Work Experience", value: "workEx", icon: Clock3 },
    { label: "Project", value: "project", icon: FolderKanban },
    { label: "Certification", value: "certification", icon: Award },
    { label: "Achivements", value: "achivement", icon: Trophy },
    { label: "Position of Responsibility", value: "pors", icon: ShieldCheck },
    { label: "language", value: "lang", icon: Languages },
]


export function getFilterLabel(value: ApplicationFilterKey): string {
    const option = FILTER_OPTIONS.find((option) => option.value === value);
    return option ? option.label : value;
}

