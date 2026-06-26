import { useAtom } from "jotai";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1ClassGroups } from "#/api/endpoints/class-groups/class-groups";
import { useGetV1Invoices } from "#/api/endpoints/invoices/invoices";
import { academicYearAtom } from "@/store/global";

export function useTagihanList() {
	const [activeAy] = useAtom(academicYearAtom);
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 500);
	const [selectedType, setSelectedType] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("");
	const [selectedClassGroup, setSelectedClassGroup] = useState("");
	const [selectedMonth, setSelectedMonth] = useState("");
	const [page, setPage] = useState(1);

	const { data: invoicesData, isLoading } = useGetV1Invoices(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(debouncedSearch ? { search: debouncedSearch } : {}),
			...(selectedType ? { type: selectedType } : {}),
			...(selectedStatus ? { status: selectedStatus } : {}),
			...(selectedClassGroup
				? { class_group_id: Number(selectedClassGroup) }
				: {}),
			...(selectedMonth ? { month: Number(selectedMonth) } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const { data: classGroupsData } = useGetV1ClassGroups({
		academic_year_id: activeAy?.id,
	});
	const classGroups = (classGroupsData?.data as any)?.data || [];
	const invoices = (invoicesData?.data as any)?.data || [];
	const meta = (invoicesData?.data as any)?.meta;

	const handleReset = () => {
		setSearch("");
		setSelectedType("");
		setSelectedStatus("");
		setSelectedClassGroup("");
		setSelectedMonth("");
		setPage(1);
	};

	const translateType = (type: string) => {
		const map: Record<string, string> = {
			monthly: "Bulanan",
			registration: "Registrasi Tahunan",
			initial: "Biaya Awal",
			incidental: "Insidental",
		};
		return map[type] || type;
	};

	return {
		activeAy,
		search,
		setSearch,
		selectedType,
		setSelectedType,
		selectedStatus,
		setSelectedStatus,
		selectedClassGroup,
		setSelectedClassGroup,
		selectedMonth,
		setSelectedMonth,
		page,
		setPage,
		invoices,
		meta,
		classGroups,
		isLoading,
		handleReset,
		translateType,
	};
}
