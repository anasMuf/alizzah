import { useAtom } from "jotai";
import { Search } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useGetV1AcademicYears } from "#/api/endpoints/academic-years/academic-years";
import { Button } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatDateInput } from "#/utils/format";

export interface FilterBarValues {
	academic_year_id?: number;
	date_from: string;
	date_to: string;
	payment_method: string;
}

interface FilterBarProps {
	onGenerate: (filters: FilterBarValues) => void;
	isLoading?: boolean;
	children?: ReactNode;
}

const PAYMENT_METHODS = [
	{ value: "", label: "Semua" },
	{ value: "tunai", label: "Tunai" },
	{ value: "tabungan", label: "Tabungan" },
];

function getTodayString(): string {
	return formatDateInput(new Date());
}

function getMonthStartString(): string {
	const now = new Date();
	return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function getAcademicYearDateRange(ay: { start_date: string } | null) {
	if (!ay?.start_date) return null;
	const start = new Date(ay.start_date);
	const end = new Date(start);
	end.setDate(end.getDate() + 364);
	return { from: formatDateInput(start), to: formatDateInput(end) };
}

export function FilterBar({
	onGenerate,
	isLoading = false,
	children,
}: FilterBarProps) {
	const [activeAy] = useAtom(academicYearAtom);

	const { data: ayData } = useGetV1AcademicYears({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const academicYears = useMemo(() => {
		const list = (ayData?.data as any)?.data;
		return Array.isArray(list) ? list : [];
	}, [ayData]);

	const [academicYearId, setAcademicYearId] = useState<number | undefined>(
		activeAy?.id,
	);
	const [dateFrom, setDateFrom] = useState(() => getMonthStartString());
	const [dateTo, setDateTo] = useState(() => getTodayString());
	const [paymentMethod, setPaymentMethod] = useState("");
	const effectiveAyId = academicYearId ?? activeAy?.id;

	const handleGenerate = useCallback(() => {
		onGenerate({
			academic_year_id: effectiveAyId,
			date_from: dateFrom,
			date_to: dateTo,
			payment_method: paymentMethod,
		});
	}, [onGenerate, effectiveAyId, dateFrom, dateTo, paymentMethod]);

	const canGenerate = dateFrom !== "" && dateTo !== "";
	const ayRange = getAcademicYearDateRange(activeAy);

	const inputClass =
		"block w-full rounded-md border-0 py-1.5 px-2.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600";
	const selectClass =
		"block w-full rounded-md border-0 py-1.5 pl-2.5 pr-8 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600";
	const labelClass = "block text-xs font-medium text-gray-500 mb-1";

	return (
		<div className="flex flex-col h-full">
			{/* ── Scrollable content ── */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* TA */}
				<div>
					<label className={labelClass}>Tahun Ajaran</label>
					<select
						value={effectiveAyId ?? ""}
						onChange={(e) =>
							setAcademicYearId(
								e.target.value ? Number(e.target.value) : undefined,
							)
						}
						className={selectClass}
					>
						{academicYears.map((ay: any) => (
							<option key={ay.id} value={ay.id}>
								{ay.name}
							</option>
						))}
					</select>
				</div>

				{/* Date range */}
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className={labelClass}>Dari</label>
						<input
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							className={inputClass}
						/>
					</div>
					<div>
						<label className={labelClass}>Sampai</label>
						<input
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							className={inputClass}
						/>
					</div>
				</div>

				{/* Shortcuts */}
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						onClick={() => {
							setDateFrom(getTodayString());
							setDateTo(getTodayString());
						}}
						className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
					>
						Hari Ini
					</button>
					<button
						type="button"
						onClick={() => {
							setDateFrom(getMonthStartString());
							setDateTo(getTodayString());
						}}
						className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
					>
						Bulan Ini
					</button>
					{ayRange && (
						<button
							type="button"
							onClick={() => {
								setDateFrom(ayRange.from);
								setDateTo(ayRange.to);
							}}
							className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
						>
							TA Ini
						</button>
					)}
				</div>

				{/* Payment Method */}
				<div>
					<label className={labelClass}>Metode Bayar</label>
					<select
						value={paymentMethod}
						onChange={(e) => setPaymentMethod(e.target.value)}
						className={selectClass}
					>
						{PAYMENT_METHODS.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
				</div>

				{/* Children: per-page multi-select */}
				{children && (
					<div className="border-t border-gray-100 pt-3 flex-1 flex flex-col min-h-0">
						{children}
					</div>
				)}
			</div>

			{/* ── Fixed bottom: Generate ── */}
			<div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
				<Button
					variant="primary"
					className="w-full justify-center"
					onClick={handleGenerate}
					disabled={!canGenerate || isLoading}
				>
					<Search className="w-4 h-4 mr-2" />
					{isLoading ? "Memuat..." : "Generate"}
				</Button>
			</div>
		</div>
	);
}
