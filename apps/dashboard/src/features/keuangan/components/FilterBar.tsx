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
	payment_method: string; // "" = semua, "tunai", "tabungan"
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
	const now = new Date();
	return formatDateInput(now);
}

function getMonthStartString(): string {
	const now = new Date();
	return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function getAcademicYearDateRange(
	ay: { start_date: string } | null,
): { from: string; to: string } | null {
	if (!ay?.start_date) return null;
	const start = new Date(ay.start_date);
	const from = formatDateInput(start);
	// Tahun ajaran biasanya ~1 tahun, ambil akhir sebagai start + 364 hari
	const end = new Date(start);
	end.setDate(end.getDate() + 364);
	const to = formatDateInput(end);
	return { from, to };
}

export function FilterBar({
	onGenerate,
	isLoading = false,
	children,
}: FilterBarProps) {
	const [activeAy] = useAtom(academicYearAtom);

	// Fetch academic years list for dropdown
	const { data: ayData } = useGetV1AcademicYears({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const academicYears = useMemo(() => {
		const list = (ayData?.data as any)?.data;
		return Array.isArray(list) ? list : [];
	}, [ayData]);

	// Filter state
	const [academicYearId, setAcademicYearId] = useState<number | undefined>(
		activeAy?.id,
	);
	const [dateFrom, setDateFrom] = useState(() => getMonthStartString());
	const [dateTo, setDateTo] = useState(() => getTodayString());
	const [paymentMethod, setPaymentMethod] = useState("");

	// Sync academic year when atom changes
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

	return (
		<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
			{/* Filter Row 1: TA + Date Range + Payment Method + Generate */}
			<div className="flex flex-wrap gap-4 items-end">
				{/* Academic Year */}
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Tahun Ajaran
					</label>
					<select
						value={effectiveAyId ?? ""}
						onChange={(e) =>
							setAcademicYearId(
								e.target.value ? Number(e.target.value) : undefined,
							)
						}
						className="block w-full sm:w-44 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						{academicYears.map((ay: any) => (
							<option key={ay.id} value={ay.id}>
								{ay.name}
							</option>
						))}
					</select>
				</div>

				{/* Date From */}
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Dari
					</label>
					<input
						type="date"
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>

				{/* Date To */}
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Sampai
					</label>
					<input
						type="date"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>

				{/* Payment Method */}
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Metode Bayar
					</label>
					<select
						value={paymentMethod}
						onChange={(e) => setPaymentMethod(e.target.value)}
						className="block w-full sm:w-36 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					>
						{PAYMENT_METHODS.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
				</div>

				{/* Generate Button */}
				<Button
					variant="primary"
					onClick={handleGenerate}
					disabled={!canGenerate || isLoading}
				>
					<Search className="w-4 h-4 mr-2" />
					{isLoading ? "Memuat..." : "Generate"}
				</Button>
			</div>

			{/* Shortcut Buttons */}
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => {
						setDateFrom(getTodayString());
						setDateTo(getTodayString());
					}}
					className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
				>
					Hari Ini
				</button>
				<button
					type="button"
					onClick={() => {
						setDateFrom(getMonthStartString());
						setDateTo(getTodayString());
					}}
					className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
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
						className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
					>
						TA Saat Ini
					</button>
				)}
				{(dateFrom !== getMonthStartString() ||
					dateTo !== getTodayString()) && (
					<button
						type="button"
						onClick={() => {
							setDateFrom(getMonthStartString());
							setDateTo(getTodayString());
						}}
						className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
					>
						Reset
					</button>
				)}
			</div>

			{/* Children slot — for per-page multi-select filters */}
			{children && (
				<div className="border-t border-gray-100 pt-4">{children}</div>
			)}
		</div>
	);
}
