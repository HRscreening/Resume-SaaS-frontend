import { request } from "@/lib/api";
import { Screening } from "@/modules/screening/types/screening.type";


export async function getScreening(id: string): Promise<Screening> {
  return request<Screening>(`/api/screenings/${id}`);
}
