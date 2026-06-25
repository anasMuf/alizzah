import { Filter, Search } from "lucide-react";
import { Button } from "#/components/ui";

interface ExpenseFilterProps {
	search: string;
	onSearchChange: (v: string) => void;
	categories: any[];
	selectedCategory: string;
	onCategoryChange: (v: string) => void;
	dateFrom: string;
	onDateFromChange: (v: string) => void;
	dateTo: string;
	onDateToChange: (v: string) => void;
	onReset: () => void;
}

export function ExpenseFilter({
	search,
	onSearchChange,
	categories,
	selectedCategory,
	onCategoryChange,
	dateFrom,
	onDateFromChange,
	dateTo,
	onDateToChange,
	onReset,
}: ExpenseFilterProps) {
	return (
		<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
			<div className="flex flex-wrap gap-4 items-end">
				<div className="w-full sm:w-auto flex-1 min-w-[200px]">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Pencarian (Keterangan)
					</label>
					<div className="relative rounded-md shadow-sm">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Cari keterangan..."
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
				</div>

				<div className="w-full sm:w-auto">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Kategori
					</label>
					<select
						value={selectedCategory}
						onChange={(e) => onCategoryChange(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						<option value="">Semua Kategori</option>
						{categories.map((parent: any) => (
							<optgroup key={parent.id} label={parent.name}>
								{parent.children?.map((child: any) => (
									<option key={child.id} value={child.id}>
										{parent.name} &gt; {child.name}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>

				<div className="w-full sm:w-auto">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Dari Tanggal
					</label>
					<input
						type="date"
						value={dateFrom}
						onChange={(e) => onDateFromChange(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>

				<div className="w-full sm:w-auto">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Sampai Tanggal
					</label>
					<input
						type="date"
						value={dateTo}
						onChange={(e) => onDateToChange(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>

				<div className="w-full sm:w-auto">
					<Button variant="secondary" className="bg-white" onClick={onReset}>
						<Filter className="w-4 h-4 mr-2" />
						Reset Filter
					</Button>
				</div>
			</div>
		</div>
	);
}
