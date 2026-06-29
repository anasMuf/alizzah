import { Search, User, X } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useGetV1Students } from "#/api/endpoints/students/students";

export interface PickedStudent {
	id: number;
	full_name: string;
}

interface StudentPickerProps {
	selected: PickedStudent | null;
	onSelect: (student: PickedStudent) => void;
	onClear: () => void;
}

// Pemilih siswa untuk menautkan penjualan ke siswa (D6, opsional). Memakai
// endpoint sekolah (GET /students) — admin_koperasi diberi akses baca.
export function StudentPicker({
	selected,
	onSelect,
	onClear,
}: StudentPickerProps) {
	const [query, setQuery] = useState("");
	const [debounced] = useDebounce(query, 400);

	const { data, isLoading } = useGetV1Students(
		{ page: 1, limit: 8, search: debounced },
		{ query: { enabled: debounced.trim().length > 1 && !selected } },
	);
	const students = ((data?.data as { data?: PickedStudent[] })?.data ??
		[]) as PickedStudent[];

	if (selected) {
		return (
			<div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
				<User className="h-4 w-4 shrink-0 text-indigo-600" />
				<span className="flex-1 text-sm font-medium text-gray-900">
					{selected.full_name}
				</span>
				<button
					type="button"
					onClick={onClear}
					className="text-gray-400 hover:text-gray-600"
					title="Lepas tautan siswa"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		);
	}

	return (
		<div className="relative">
			<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
			<input
				type="text"
				placeholder="Cari nama siswa…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600"
			/>
			{debounced.trim().length > 1 && (
				<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
					{isLoading ? (
						<p className="px-3 py-2 text-sm text-gray-500">Mencari…</p>
					) : students.length === 0 ? (
						<p className="px-3 py-2 text-sm text-gray-500">
							Tidak ada siswa cocok.
						</p>
					) : (
						students.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => {
									onSelect({ id: s.id, full_name: s.full_name });
									setQuery("");
								}}
								className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
							>
								{s.full_name}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
