import { useAtom } from "jotai";
import { useState } from "react";
import { useGetV1ReportsMonthly } from "#/api/endpoints/reports/reports";
import { academicYearAtom } from "@/store/global";

export function useLaporanBulanan() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());

	const { data, isLoading, isError } = useGetV1ReportsMonthly(
		{ month, year, academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);

	const report = (data?.data as any)?.data || null;
	return {
		activeAy,
		month,
		setMonth,
		year,
		setYear,
		report,
		isLoading,
		isError,
	};
}
