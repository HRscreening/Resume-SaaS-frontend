import { z } from "zod";
import { Sections,sectionTabs } from "@/modules/screening/routes/screening";


export const searchSchema = z.object({
   tab: z.enum(sectionTabs).default("Applications"),
  saved: z.union([z.literal(1), z.literal("1")]).optional(),
});


type SearchSchema = z.infer<typeof searchSchema>;
export default SearchSchema;