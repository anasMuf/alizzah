import { useGetV1Students } from "@alizzah/api-client/endpoints/students/students";
import { Search, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface StudentSearchProps {
	selectedStudent: any;
	onSelect: (student: any) => void;
	onClear: () => void;
}

export function StudentSearch({
	selectedStudent,
	onSelect,
	onClear,
}: StudentSearchProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [searchStudent, setSearchStudent] = useState("");
	const [debouncedSearch] = useDebounce(searchStudent, 500);

	const { data: studentsResp, isLoading } = useGetV1Students(
		{ page: 1, limit: 10, search: debouncedSearch },
		{ query: { enabled: debouncedSearch.length > 1 && !selectedStudent } },
	);
	const students = (studentsResp?.data as any)?.data || [];

	const handleSelect = (student: any) => {
		onSelect(student);
		setSearchStudent("");
	};

	if (selectedStudent) {
		return (
			<div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
				<User className="w-5 h-5 text-indigo-600 flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<span className="text-sm font-semibold text-gray-900">
						{selectedStudent.full_name}
					</span>
					<span className="text-xs text-gray-500 ml-2">
						{selectedStudent.active_enrollment?.class_group?.name || "-"}
					</span>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="text-gray-400 hover:text-gray-600"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		);
	}

	return (
		<>
			<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<Search className="h-4 w-4 text-gray-400" />
			</div>
			<input
				ref={searchInputRef}
				type="text"
				className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
				placeholder="Cari nama siswa..."
				value={searchStudent}
				onChange={(e) => setSearchStudent(e.target.value)}
				autoFocus
			/>
			{isLoading && (
				<p className="absolute left-0 top-full mt-1 text-xs text-gray-500 bg-white px-3 py-1 rounded shadow">
					Mencari...
				</p>
			)}
			{!isLoading && students.length > 0 && debouncedSearch.length > 1 && (
				<ul className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
					{students.map((s: any) => (
						<li
							key={s.id}
							className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
							onClick={() => handleSelect(s)}
						>
							<span className="font-medium">{s.full_name}</span>
							<span className="text-gray-500 ml-2">
								— {s.active_enrollment?.class_group?.name || "-"}
							</span>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
