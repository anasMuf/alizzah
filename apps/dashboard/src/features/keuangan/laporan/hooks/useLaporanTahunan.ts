import { useAtom } from "jotai";
import { useGetV1ReportsAnnual } from "#/api/endpoints/reports/reports";
import { academicYearAtom } from "@/store/global";

export function useLaporanTahunan() {
	const [activeAy] = useAtom(academicYearAtom);
	const { data, isLoading, isError } = useGetV1ReportsAnnual(
		{ academic_year_id: activeAy?.id! },
		{ query: { enabled: !!activeAy?.id } },
	);
	return {
		activeAy,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
