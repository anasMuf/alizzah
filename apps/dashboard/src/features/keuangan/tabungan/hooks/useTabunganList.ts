import { useAtom } from "jotai";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1ClassGroups } from "#/api/endpoints/class-groups/class-groups";
import { useGetV1Students } from "#/api/endpoints/students/students";
import { academicYearAtom } from "@/store/global";

export function useTabunganList() {
	const [activeAy] = useAtom(academicYearAtom);
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 500);
	const [selectedClassGroup, setSelectedClassGroup] = useState("");
	const [page, setPage] = useState(1);
	const { data: studentsResp, isLoading } = useGetV1Students(
		{
			page,
			limit: 20,
			search: debouncedSearch,
			class_group_id: selectedClassGroup
				? Number(selectedClassGroup)
				: undefined,
			academic_year_id: activeAy?.id,
		},
		{ query: { enabled: !!activeAy?.id } },
	);
	const { data: classGroupsResp } = useGetV1ClassGroups({
		academic_year_id: activeAy?.id,
	});
	const students = (studentsResp?.data as any)?.data || [];
	const meta = (studentsResp?.data as any)?.meta;
	const classGroups = (classGroupsResp?.data as any)?.data || [];
	return {
		activeAy,
		search,
		setSearch,
		selectedClassGroup,
		setSelectedClassGroup,
		page,
		setPage,
		students,
		meta,
		classGroups,
		isLoading,
	};
}
