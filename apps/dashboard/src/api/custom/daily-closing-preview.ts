/**
 * Custom hook (bukan generated orval) untuk pratinjau tutup buku:
 * hitung kas sistem terkoreksi untuk tanggal terpilih tanpa menyimpan.
 * Endpoint: GET /v1/daily-closings/preview
 */
import { useQuery } from "@tanstack/react-query";
import type { DtoDailyClosingPreviewResponse } from "../model/dtoDailyClosingPreviewResponse";
import { customInstance } from "../mutator/custom-instance";

type PreviewEnvelope = {
	data: { message: string; data: DtoDailyClosingPreviewResponse };
	status: number;
};

export function getDailyClosingPreviewQueryKey(
	academicYearId?: number,
	closingDate?: string,
) {
	return ["/v1/daily-closings/preview", academicYearId, closingDate] as const;
}

export function useGetDailyClosingPreview(
	academicYearId: number | undefined,
	closingDate: string | undefined,
	enabled: boolean,
) {
	return useQuery({
		queryKey: getDailyClosingPreviewQueryKey(academicYearId, closingDate),
		queryFn: async ({ signal }) => {
			const res = await customInstance<PreviewEnvelope>(
				`/v1/daily-closings/preview?academic_year_id=${academicYearId}&closing_date=${closingDate}`,
				{ signal, method: "GET" },
			);
			return res.data.data; // unwrap → DtoDailyClosingPreviewResponse
		},
		enabled,
	});
}
