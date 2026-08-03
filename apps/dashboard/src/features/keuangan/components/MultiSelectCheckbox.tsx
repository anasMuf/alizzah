import { useCallback, useMemo, useState } from "react";

export interface MultiSelectOption {
	id: string | number;
	label: string;
}

export interface MultiSelectGroup {
	header: string;
	items: MultiSelectOption[];
}

interface MultiSelectCheckboxProps {
	label: string;
	options: MultiSelectOption[];
	groups?: MultiSelectGroup[];
	selected: (string | number)[];
	onChange: (ids: (string | number)[]) => void;
	showSelectAll?: boolean;
}

export function MultiSelectCheckbox({
	label,
	options,
	groups,
	selected,
	onChange,
	showSelectAll = true,
}: MultiSelectCheckboxProps) {
	const [search, setSearch] = useState("");

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
		(id: string | number) => {
			if (selected.includes(id)) {
				onChange(selected.filter((s) => s !== id));
			} else {
				onChange([...selected, id]);
			}
		},
		[selected, onChange],
	);

	// Filter groups/items by search query
	const filteredGroups = useMemo(() => {
		if (!groups || !search.trim()) return groups;
		const q = search.toLowerCase();
		return groups
			.map((g) => ({
				...g,
				items: g.items.filter((item) => item.label.toLowerCase().includes(q)),
			}))
			.filter((g) => g.items.length > 0);
	}, [groups, search]);

	const filteredOptions = useMemo(() => {
		if (!search.trim()) return options;
		const q = search.toLowerCase();
		return options.filter((item) => item.label.toLowerCase().includes(q));
	}, [options, search]);

	const renderItem = (option: MultiSelectOption) => (
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
	);

	return (
		<div className="flex flex-col min-h-0">
			<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
				{label}
				{selected.length > 0 && (
					<span className="ml-1 text-xs font-normal text-gray-500">
						({selected.length} terpilih)
					</span>
				)}
			</label>
			<div className="rounded-md border border-gray-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0">
				{/* Search input */}
				<input
					type="text"
					placeholder="Cari..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="block w-full border-0 border-b border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:border-gray-300"
				/>

				<div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
					{showSelectAll && options.length > 0 && !search.trim() && (
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

					{/* Grouped display */}
					{filteredGroups ? (
						filteredGroups.map((group, gi) => {
							const groupIds = group.items.map((i) => i.id);
							const allGroupSelected =
								groupIds.length > 0 &&
								groupIds.every((id) => selected.includes(id));
							const someGroupSelected = groupIds.some((id) =>
								selected.includes(id),
							);
							return (
								<div key={gi}>
									<div className="flex items-center justify-between px-1.5 py-1 bg-gray-50 -mx-2 px-2">
										<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
											{group.header}
										</span>
										<button
											type="button"
											onClick={() => {
												if (allGroupSelected) {
													onChange(
														selected.filter((id) => !groupIds.includes(id)),
													);
												} else {
													const toAdd = groupIds.filter(
														(id) => !selected.includes(id),
													);
													onChange([...selected, ...toAdd]);
												}
											}}
											className={`text-[10px] font-medium hover:underline ${someGroupSelected ? "text-indigo-600" : "text-gray-400"}`}
										>
											{allGroupSelected
												? "hapus semua"
												: someGroupSelected
													? "pilih semua"
													: "pilih semua"}
										</button>
									</div>
									{group.items.length === 0 ? (
										<p className="text-sm text-gray-400 px-1.5 py-0.5">
											(belum ada item)
										</p>
									) : (
										group.items.map(renderItem)
									)}
								</div>
							);
						})
					) : filteredOptions.length > 0 ? (
						filteredOptions.map(renderItem)
					) : search.trim() ? (
						<p className="text-sm text-gray-400 px-1.5 py-1">Tidak ditemukan</p>
					) : (
						<p className="text-sm text-gray-400 px-1.5 py-1">Tidak ada opsi</p>
					)}
				</div>
			</div>
		</div>
	);
}
