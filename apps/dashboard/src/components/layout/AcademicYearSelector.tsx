import { useGetV1AcademicYears } from "@alizzah/api-client/endpoints/academic-years/academic-years";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { academicYearAtom } from "../../store/global";

export function AcademicYearSelector() {
	const [academicYear, setAcademicYear] = useAtom(academicYearAtom);

	const { data: resp } = useGetV1AcademicYears();
	const academicYears = ((resp?.data as any)?.data || []).map((ay: any) => ({
		id: ay.id as number,
		name: ay.name as string,
		is_active: ay.is_active as boolean,
	}));

	// Set default ke tahun ajaran aktif saat pertama kali data dimuat
	useEffect(() => {
		if (!academicYear && academicYears.length > 0) {
			const active =
				academicYears.find((ay: any) => ay.is_active) || academicYears[0];
			setAcademicYear(active);
		}
	}, [academicYears.length]);

	return (
		<div>
			<label
				htmlFor="academic-year"
				className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
			>
				Tahun Ajaran
			</label>
			<select
				id="academic-year"
				className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
				value={academicYear?.id || ""}
				onChange={(e) => {
					const selected = academicYears.find(
						(ay: any) => ay.id === Number(e.target.value),
					);
					if (selected) setAcademicYear(selected);
				}}
			>
				{academicYears.map((ay: any) => (
					<option key={ay.id} value={ay.id}>
						TA: {ay.name}
					</option>
				))}
			</select>
		</div>
	);
}
