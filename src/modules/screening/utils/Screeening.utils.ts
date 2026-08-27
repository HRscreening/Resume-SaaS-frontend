import type { SingleProgressBar, CategoryScore } from "@/modules/screening/types/screening.type";



// const getColorByValue = (value: number): string => {
//     if (value >= 8) {
//         return "#70AD47"; // Green for strong match
//     } else if (value >= 5) {
//         return "#FFC000"; // Yellow for potential match
//     }
//     return "#ED7D31"; // Red for risky match
// }

const getColorByValue = (value: number): string => {
    if (value >= 8) {
        return "#9BCB7A"; // Soft green
    } else if (value >= 5) {
        return "#F6D878"; // Soft yellow
    }

    return "#F2A477"; // Soft orange
};

export function generateCategoryProgressBarsInput(
    categories: CategoryScore[]
): SingleProgressBar[] {
    return categories.map((category) => ({
        title: category.category,
        value: category.avg_score,
        color: getColorByValue(category.avg_score),
    }));
}