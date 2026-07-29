import { useCallback, useMemo } from "react";

export interface MultiSelectOption {
	id: number;
	label: string;
}

interface MultiSelectCheckboxProps {
	label: string;
	options: MultiSelectOption[];
	selected: number[];
	onChange: (ids: number[]) => void;
	/** Show "Semua" toggle at top. Default true. */
	showSelectAll?: boolean;
}

export function MultiSelectCheckbox({
	label,
	options,
	selected,
	onChange,
	showSelectAll = true,
}: MultiSelectCheckboxProps) {
	const allIds = useMemo(() => options.map((o) => o.id), [options]);
	const allSelected =
		allIds.length > 0 && allIds.every((id) => selected.includes(id));

	const handleToggleAll = useCallback(() => {
		if (allSelected) {
			onChange([]);
		} else {
			onChange(allIds);
		}
	}, [allSelected, allIds, onChange]);

	const handleToggle = useCallback(
		(id: number) => {
			if (selected.includes(id)) {
				onChange(selected.filter((s) => s !== id));
			} else {
				onChange([...selected, id]);
			}
		},
		[selected, onChange],
	);

	return (
		<div>
			<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
				{label}
				{selected.length > 0 && (
					<span className="ml-1 text-xs font-normal text-gray-500">
						({selected.length} terpilih)
					</span>
				)}
			</label>
			<div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 space-y-1">
				{showSelectAll && options.length > 0 && (
					<label className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-gray-50 cursor-pointer">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={handleToggleAll}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
						/>
						<span className="text-sm font-medium text-gray-700">Semua</span>
					</label>
				)}
				{options.length === 0 && (
					<p className="text-sm text-gray-400 px-1.5 py-1">Tidak ada opsi</p>
				)}
				{options.map((option) => (
					<label
						key={option.id}
						className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-gray-50 cursor-pointer"
					>
						<input
							type="checkbox"
							checked={selected.includes(option.id)}
							onChange={() => handleToggle(option.id)}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
						/>
						<span className="text-sm text-gray-700">{option.label}</span>
					</label>
				))}
			</div>
		</div>
	);
}
