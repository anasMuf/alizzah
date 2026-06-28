import { useAtom } from "jotai";
import { useState } from "react";
import { useGetV1Payments } from "#/api/endpoints/payments/payments";
import { academicYearAtom } from "@/store/global";
import { extractListData, extractMeta } from "@/utils/api-helpers";

export function usePembayaranList() {
	const [activeAy] = useAtom(academicYearAtom);
	const [selectedSource, setSelectedSource] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [page, setPage] = useState(1);
	const { data, isLoading } = useGetV1Payments(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(selectedSource ? { source: selectedSource } : {}),
			...(startDate ? { start_date: startDate } : {}),
			...(endDate ? { end_date: endDate } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);
	return {
		payments: extractListData(data),
		meta: extractMeta(data),
		isLoading,
		selectedSource,
		setSelectedSource,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		page,
		setPage,
	};
}
