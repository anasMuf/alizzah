import { useAtom } from "jotai";
import { useState } from "react";
import { useGetV1ReportsDaily } from "#/api/endpoints/reports/reports";
import { academicYearAtom } from "@/store/global";

function getTodayString() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useLaporanHarian() {
	const [activeAy] = useAtom(academicYearAtom);
	const [date, setDate] = useState(getTodayString());

	const {
		data: reportData,
		isLoading,
		isError,
	} = useGetV1ReportsDaily(
		{ date, academic_year_id: activeAy?.id },
		{ query: { enabled: !!date && !!activeAy?.id } },
	);

	const report = (reportData?.data as any)?.data || null;
	return {
		activeAy,
		date,
		setDate,
		report,
		isLoading,
		isError,
		getTodayString,
	};
}
