import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	Calendar,
	ChevronDown,
	ChevronRight,
	Clock,
	Pencil,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/rombel/hari-efektif-grid",
)({
	component: HariEfektifGridPage,
});

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "alizzah_token";

const LEVELS = [
	{ value: "mutiara", label: "Mutiara (KB)" },
	{ value: "intan", label: "Intan (TK A)" },
	{ value: "berlian", label: "Berlian (TK B)" },
];

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Ags",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

type MonthCell = {
	total_days: number;
	total_mondays: number;
} | null;

type LevelRow = {
	level: string;
	months: Record<number, { total_days: number; total_mondays: number }>;
};

type CGRow = {
	id: number;
	name: string;
	level: string;
	months: Record<number, MonthCell>;
};

type GridData = {
	levels: LevelRow[];
	class_groups: CGRow[];
};

function getAuthHeaders() {
	const token = localStorage.getItem(TOKEN_KEY);
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

function generateMonthsList(
	startDate: string,
): { month: number; year: number }[] {
	const list: { month: number; year: number }[] = [];
	const start = new Date(startDate);
	for (let i = 0; i < 12; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		list.push({ month: d.getMonth() + 1, year: d.getFullYear() });
	}
	return list;
}

function HariEfektifGridPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const monthsList = useMemo(
		() => (activeAy?.start_date ? generateMonthsList(activeAy.start_date) : []),
		[activeAy?.start_date],
	);

	const [data, setData] = useState<GridData | null>(null);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<"days" | "mondays">("days");
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
	const [editing, setEditing] = useState<{
		level?: string;
		cgId?: number;
		month: number;
		year: number;
		currentValue: number;
	} | null>(null);
	const [editValue, setEditValue] = useState("");
	const [saving, setSaving] = useState(false);
	const [pendingLevelEdit, setPendingLevelEdit] = useState<{
		level: string;
		month: number;
		year: number;
		totalDays: number;
		totalMondays: number;
		affectedCount: number;
		resetMode: string;
	} | null>(null);

	const loadData = useCallback(async () => {
		if (!activeAy?.id) return;
		setLoading(true);
		try {
			const res = await fetch(
				`${API_URL}/v1/effective-days/grid?academic_year_id=${activeAy.id}`,
				{ headers: getAuthHeaders() },
			);
			if (res.ok) {
				const json = await res.json();
				setData(json.data);
			}
		} catch (e) {
			console.error("Failed to load grid", e);
		}
		setLoading(false);
	}, [activeAy?.id]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const toggleCollapse = (level: string) => {
		setCollapsed((prev) => ({ ...prev, [level]: !prev[level] }));
	};

	const getLevelValue = (level: string, month: number): MonthCell => {
		const lv = data?.levels.find((l) => l.level === level);
		const cell = lv?.months[month];
		if (!cell) return null;
		return { total_days: cell.total_days, total_mondays: cell.total_mondays };
	};

	const getCGValue = (cg: CGRow, month: number): MonthCell => {
		const cell = cg.months[month];
		return cell ?? null;
	};

	const getDisplayValue = (cg: CGRow, month: number): string => {
		const override = getCGValue(cg, month);
		if (override) {
			return mode === "days"
				? String(override.total_days)
				: String(override.total_mondays);
		}
		const lv = getLevelValue(cg.level, month);
		if (lv) {
			return mode === "days" ? String(lv.total_days) : String(lv.total_mondays);
		}
		return "-";
	};

	const isOverridden = (cg: CGRow, month: number): boolean => {
		return getCGValue(cg, month) !== null;
	};

	const startEdit = (
		month: number,
		year: number,
		currentValue: string,
		level?: string,
		cgId?: number,
	) => {
		if (currentValue === "-") return;
		setEditing({
			level,
			cgId,
			month,
			year,
			currentValue: Number(currentValue),
		});
		setEditValue(currentValue);
	};

	const handleSave = async () => {
		if (!editing || !activeAy?.id) return;
		const val = Number(editValue);
		if (isNaN(val) || val < 0) return;

		setSaving(true);

		if (editing.level) {
			// Editing level → check for affected overrides first
			const affectedCGs =
				data?.class_groups.filter(
					(cg) => cg.level === editing.level && isOverridden(cg, editing.month),
				) || [];

			if (affectedCGs.length > 0 && !pendingLevelEdit) {
				// Show confirmation first
				const existing = getLevelValue(editing.level, editing.month);
				setPendingLevelEdit({
					level: editing.level,
					month: editing.month,
					year: editing.year,
					totalDays: mode === "days" ? val : (existing?.total_days ?? 0),
					totalMondays:
						mode === "mondays" ? val : (existing?.total_mondays ?? 0),
					affectedCount: affectedCGs.length,
					resetMode: mode,
				});
				setEditing(null);
				setSaving(false);
				return;
			}

			const levelOk = await saveLevelEdit(
				editing.level,
				editing.month,
				editing.year,
				mode === "days"
					? val
					: (getLevelValue(editing.level, editing.month)?.total_days ?? 0),
				mode === "mondays"
					? val
					: (getLevelValue(editing.level, editing.month)?.total_mondays ?? 0),
				mode,
			);
			if (!levelOk) {
				setEditing(null);
				setSaving(false);
				return;
			}
		} else if (editing.cgId) {
			// Editing class group
			const existing = getCGValue(
				data!.class_groups.find((cg) => cg.id === editing.cgId)!,
				editing.month,
			);
			const cgRes = await fetch(
				`${API_URL}/v1/class-groups/${editing.cgId}/effective-days`,
				{
					method: "POST",
					headers: getAuthHeaders(),
					body: JSON.stringify({
						academic_year_id: activeAy.id,
						month: editing.month,
						year: editing.year,
						total_days:
							mode === "days"
								? val
								: (existing?.total_days ??
									getLevelValue(
										data!.class_groups.find((cg) => cg.id === editing.cgId)!
											.level,
										editing.month,
									)?.total_days ??
									0),
						total_mondays:
							mode === "mondays"
								? val
								: (existing?.total_mondays ??
									getLevelValue(
										data!.class_groups.find((cg) => cg.id === editing.cgId)!
											.level,
										editing.month,
									)?.total_mondays ??
									0),
					}),
				},
			);
			if (!cgRes.ok) {
				const err = await cgRes
					.json()
					.catch(() => ({ message: "Gagal menyimpan" }));
				addToast({
					variant: "error",
					title: "Gagal",
					message: err.message || "Gagal menyimpan override",
				});
				setEditing(null);
				setSaving(false);
				return;
			}
		}

		setEditing(null);
		setSaving(false);
		loadData();
		addToast({
			variant: "success",
			title: "Tersimpan",
			message: "Hari efektif berhasil diperbarui.",
		});
	};

	const saveLevelEdit = async (
		level: string,
		month: number,
		year: number,
		totalDays: number,
		totalMondays: number,
		resetMode: string = "",
	): Promise<boolean> => {
		const body: Record<string, unknown> = {
			academic_year_id: activeAy!.id,
			month,
			year,
			total_days: totalDays,
			total_mondays: totalMondays,
		};
		if (resetMode) body.reset_mode = resetMode;
		const res = await fetch(`${API_URL}/v1/levels/${level}/effective-days`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const err = await res
				.json()
				.catch(() => ({ message: "Gagal menyimpan" }));
			addToast({
				variant: "error",
				title: "Gagal",
				message: err.message || "Gagal menyimpan hari efektif",
			});
			return false;
		}
		return true;
	};

	const confirmLevelEdit = async () => {
		if (!pendingLevelEdit || !activeAy?.id) return;
		setSaving(true);
		const ok = await saveLevelEdit(
			pendingLevelEdit.level,
			pendingLevelEdit.month,
			pendingLevelEdit.year,
			pendingLevelEdit.totalDays,
			pendingLevelEdit.totalMondays,
			pendingLevelEdit.resetMode,
		);
		setPendingLevelEdit(null);
		setSaving(false);
		if (ok) {
			loadData();
			addToast({
				variant: "success",
				title: "Tersimpan",
				message: `${pendingLevelEdit.affectedCount} rombel di-reset ke nilai jenjang.`,
			});
			queryClient.invalidateQueries({ queryKey: ["/v1/invoices"] });
		}
	};

	if (loading) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64 max-w-full mx-auto mt-6" />
		);
	}

	return (
		<div className="space-y-6 max-w-full mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/rombel"
							className="text-gray-400 hover:text-gray-500 text-sm"
						>
							Rombel
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight className="h-5 w-5 text-gray-400" />
							<span className="ml-2 text-sm font-medium text-gray-900">
								Grid Hari Efektif
							</span>
						</div>
					</li>
				</ol>
			</nav>

			{/* Header */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<Calendar className="h-6 w-6 text-indigo-600" />
						Grid Hari Efektif
					</h1>

					{/* Toggle mode */}
					<div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
						<button
							type="button"
							onClick={() => setMode("days")}
							className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
								mode === "days"
									? "bg-white text-indigo-700 shadow-sm"
									: "text-gray-600 hover:text-gray-900"
							}`}
						>
							<Calendar className="h-4 w-4 inline mr-1" />
							Total Hari
						</button>
						<button
							type="button"
							onClick={() => setMode("mondays")}
							className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
								mode === "mondays"
									? "bg-white text-indigo-700 shadow-sm"
									: "text-gray-600 hover:text-gray-900"
							}`}
						>
							<Clock className="h-4 w-4 inline mr-1" />
							Total Senin
						</button>
					</div>
				</div>

				<p className="text-sm text-gray-500 mb-6">
					Baris jenjang adalah default, berlaku untuk semua rombel. Klik cell
					rombel untuk override.{" "}
					<span className="inline-block w-3 h-3 bg-emerald-200 rounded ml-1 align-middle" />{" "}
					= override aktif.
				</p>

				{/* Grid */}
				<div className="overflow-x-auto">
					<table className="min-w-full border-collapse text-sm">
						<thead>
							<tr>
								<th className="text-left py-2 px-3 bg-gray-50 border-b border-gray-200 w-44 sticky left-0 z-10">
									Rombel / Jenjang
								</th>
								{monthsList.map((m) => (
									<th
										key={`${m.year}-${m.month}`}
										className="text-center py-2 px-3 bg-gray-50 border-b border-gray-200 min-w-[4rem]"
									>
										<div className="text-xs text-gray-500">
											{MONTH_NAMES[m.month - 1]}
										</div>
										<div className="text-xs text-gray-400">{m.year}</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{LEVELS.map((lv) => {
								const isCollapsed = collapsed[lv.value] ?? false;
								const cgs =
									data?.class_groups.filter((cg) => cg.level === lv.value) ||
									[];
								return (
									<LevelGroup
										key={lv.value}
										level={lv}
										isCollapsed={isCollapsed}
										onToggle={() => toggleCollapse(lv.value)}
										classGroups={cgs}
										monthsList={monthsList}
										mode={mode}
										isOverridden={isOverridden}
										getDisplayValue={getDisplayValue}
										getLevelValue={getLevelValue}
										onEdit={startEdit}
										editing={editing}
										editValue={editValue}
										onEditValueChange={setEditValue}
										onSave={handleSave}
										saving={saving}
										onCancel={() => {
											setEditing(null);
											setPendingLevelEdit(null);
										}}
									/>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Confirmation Dialog for Level Edit */}
			{pendingLevelEdit && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							confirmLevelEdit();
						}
						if (e.key === "Escape") {
							e.preventDefault();
							setPendingLevelEdit(null);
						}
					}}
				>
					<div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
						<h3 className="text-lg font-semibold mb-2">
							Konfirmasi Ubah Jenjang
						</h3>
						<p className="text-sm text-gray-600 mb-4">
							Ada <strong>{pendingLevelEdit.affectedCount} rombel</strong>{" "}
							dengan override di bulan {MONTH_NAMES[pendingLevelEdit.month - 1]}{" "}
							{pendingLevelEdit.year}. Override akan <strong>dihapus</strong>{" "}
							dan mengikuti nilai jenjang baru.
						</p>
						<div className="flex justify-end gap-3">
							<Button
								variant="secondary"
								onClick={() => setPendingLevelEdit(null)}
								disabled={saving}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								onClick={confirmLevelEdit}
								disabled={saving}
								autoFocus
							>
								{saving ? "Menyimpan..." : "Ya, Lanjutkan"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Sub-component: a collapsible level group
function LevelGroup({
	level,
	isCollapsed,
	onToggle,
	classGroups,
	monthsList,
	mode,
	isOverridden,
	getDisplayValue,
	getLevelValue,
	onEdit,
	editing,
	editValue,
	onEditValueChange,
	onSave,
	saving,
	onCancel,
}: {
	level: { value: string; label: string };
	isCollapsed: boolean;
	onToggle: () => void;
	classGroups: CGRow[];
	monthsList: { month: number; year: number }[];
	mode: "days" | "mondays";
	isOverridden: (cg: CGRow, month: number) => boolean;
	getDisplayValue: (cg: CGRow, month: number) => string;
	getLevelValue: (level: string, month: number) => MonthCell;
	onEdit: (
		month: number,
		year: number,
		val: string,
		level?: string,
		cgId?: number,
	) => void;
	editing: any;
	editValue: string;
	onEditValueChange: (v: string) => void;
	onSave: () => void;
	saving: boolean;
	onCancel: () => void;
}) {
	const getLevelCell = (month: number): string => {
		const cell = getLevelValue(level.value, month);
		if (!cell) return "-";
		return mode === "days"
			? String(cell.total_days)
			: String(cell.total_mondays);
	};

	return (
		<>
			{/* Level row */}
			<tr className="bg-blue-50/60 border-b border-blue-100">
				<td className="py-2.5 px-3 sticky left-0 bg-blue-50/60 z-10">
					<button
						type="button"
						onClick={onToggle}
						className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm hover:text-indigo-700"
					>
						{isCollapsed ? (
							<ChevronRight className="h-4 w-4 text-gray-400" />
						) : (
							<ChevronDown className="h-4 w-4 text-gray-400" />
						)}
						{level.label}
					</button>
				</td>
				{monthsList.map((m) => {
					const val = getLevelCell(m.month);
					const isEditing =
						editing?.level === level.value && editing?.month === m.month;
					return (
						<td key={`${m.year}-${m.month}`} className="text-center py-2 px-2">
							{isEditing ? (
								<InlineEdit
									value={editValue}
									onChange={onEditValueChange}
									onSave={onSave}
									onCancel={onCancel}
									saving={saving}
								/>
							) : (
								<button
									type="button"
									onClick={() => onEdit(m.month, m.year, val, level.value)}
									className="w-full text-center font-semibold text-blue-700 hover:bg-blue-100 rounded px-2 py-1 min-w-[3rem] transition-colors"
									title="Klik untuk edit hari efektif jenjang"
								>
									{val}
								</button>
							)}
						</td>
					);
				})}
			</tr>

			{/* Class group rows */}
			{!isCollapsed &&
				classGroups.map((cg) => (
					<tr
						key={cg.id}
						className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
					>
						<td className="py-2 px-3 pl-10 text-sm text-gray-700 sticky left-0 bg-white z-10">
							{cg.name}
						</td>
						{monthsList.map((m) => {
							const val = getDisplayValue(cg, m.month);
							const overridden = isOverridden(cg, m.month);
							const isEditing =
								editing?.cgId === cg.id && editing?.month === m.month;
							return (
								<td
									key={`${m.year}-${m.month}`}
									className={`text-center py-1.5 px-2 ${
										overridden ? "bg-emerald-50" : ""
									}`}
								>
									{isEditing ? (
										<InlineEdit
											value={editValue}
											onChange={onEditValueChange}
											onSave={onSave}
											onCancel={onCancel}
											saving={saving}
										/>
									) : (
										<button
											type="button"
											onClick={() =>
												onEdit(m.month, m.year, val, undefined, cg.id)
											}
											className={`w-full text-center rounded px-2 py-1 min-w-[3rem] transition-colors text-sm ${
												overridden
													? "font-semibold text-emerald-700 hover:bg-emerald-100"
													: val === "-"
														? "text-gray-300"
														: "text-gray-500 hover:bg-gray-100"
											}`}
											title={
												overridden
													? "Override — klik untuk edit"
													: val === "-"
														? "Jenjang belum di-set"
														: "Mengikuti jenjang — klik untuk override"
											}
										>
											{val !== "-" && overridden && (
												<Pencil className="h-3 w-3 inline mr-1 text-emerald-400" />
											)}
											{val}
										</button>
									)}
								</td>
							);
						})}
					</tr>
				))}

			{!isCollapsed && classGroups.length === 0 && (
				<tr>
					<td colSpan={13} className="py-4 text-center text-sm text-gray-400">
						Tidak ada rombel di jenjang ini
					</td>
				</tr>
			)}
		</>
	);
}

// Inline number input for cell editing
function InlineEdit({
	value,
	onChange,
	onSave,
	onCancel,
	saving,
}: {
	value: string;
	onChange: (v: string) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
}) {
	return (
		<div className="flex items-center gap-1 justify-center">
			<input
				type="number"
				min={0}
				max={31}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onSave();
					}
					if (e.key === "Escape") {
						e.preventDefault();
						onCancel();
					}
				}}
				className="w-14 text-center border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				autoFocus
				disabled={saving}
			/>
		</div>
	);
}
