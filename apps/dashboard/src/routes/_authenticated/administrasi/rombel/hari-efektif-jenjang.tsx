import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Calendar, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "#/components/ui";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/rombel/hari-efektif-jenjang",
)({
	component: HariEfektifJenjangPage,
});

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "alizzah_token";

const LEVELS = [
	{ value: "mutiara", label: "Mutiara (KB)" },
	{ value: "intan", label: "Intan (TK A)" },
	{ value: "berlian", label: "Berlian (TK B)" },
];

const MONTH_NAMES = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

function HariEfektifJenjangPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const year = new Date().getFullYear();

	const [effectiveDays, setEffectiveDays] = useState<
		Record<string, Record<number, any>>
	>({});
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState<{
		level: string;
		month: number;
		year: number;
		data: any | null;
	} | null>(null);

	const monthsList = useMemo(() => {
		const list: { month: number; year: number }[] = [];
		// Juli-Desember tahun ajaran berjalan
		for (let m = 7; m <= 12; m++) {
			list.push({ month: m, year });
		}
		// Januari-Juni tahun berikutnya
		for (let m = 1; m <= 6; m++) {
			list.push({ month: m, year: year + 1 });
		}
		return list;
	}, [year]);

	const loadData = async () => {
		if (!activeAy?.id) return;
		setLoading(true);
		const token = localStorage.getItem(TOKEN_KEY);
		const newData: Record<string, Record<number, any>> = {};

		for (const level of LEVELS) {
			try {
				const res = await fetch(
					`${API_URL}/v1/levels/${level.value}/effective-days?academic_year_id=${activeAy.id}`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (res.ok) {
					const json = await res.json();
					const items = json.data || [];
					newData[level.value] = {};
					for (const item of items) {
						if (!newData[level.value][item.month]) {
							newData[level.value][item.month] = {};
						}
						newData[level.value][item.month][item.year] = item;
					}
				}
			} catch {}
		}

		setEffectiveDays(newData);
		setLoading(false);
	};

	// Load on mount
	useEffect(() => {
		loadData();
	}, [activeAy?.id]);

	const handleEdit = (level: string, month: number, year: number) => {
		const existing = effectiveDays[level]?.[month]?.[year] || null;
		setEditing({ level, month, year, data: existing });
	};

	const handleSave = async () => {
		if (!editing) return;
		const { level, month, year } = editing;
		const token = localStorage.getItem(TOKEN_KEY);
		const form = document.getElementById("ed-form") as HTMLFormElement;
		const formData = new FormData(form);

		const body = {
			academic_year_id: activeAy?.id,
			month,
			year,
			total_days: Number(formData.get("total_days")) || 0,
			total_mondays: Number(formData.get("total_mondays")) || 0,
		};

		try {
			const res = await fetch(`${API_URL}/v1/levels/${level}/effective-days`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new Error("Gagal menyimpan");
			setEditing(null);
			loadData();
		} catch (e: any) {
			alert(e.message);
		}
	};

	const getEd = (level: string, month: number, year: number) => {
		return effectiveDays[level]?.[month]?.[year] || null;
	};

	if (loading) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64 max-w-5xl mx-auto mt-6" />
		);
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<a
							href="/administrasi/rombel"
							className="text-gray-400 hover:text-gray-500 text-sm"
						>
							Rombel
						</a>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight className="h-5 w-5 text-gray-400" />
							<span className="ml-2 text-sm font-medium text-gray-900">
								Hari Efektif Per Jenjang
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
				<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
					<Calendar className="h-6 w-6 text-indigo-600" />
					Hari Efektif Per Jenjang
				</h1>
				<p className="text-sm text-gray-500 mb-6">
					Setting hari efektif per jenjang berlaku untuk semua rombel di level
					tersebut, kecuali rombel yang sudah di-set manual (per rombel override
					per jenjang).
				</p>

				{LEVELS.map((level) => (
					<div key={level.value} className="mb-8">
						<h2 className="text-lg font-semibold text-gray-900 mb-3">
							{level.label}
						</h2>
						<div className="overflow-hidden rounded-lg ring-1 ring-gray-200">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
											Bulan
										</th>
										<th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
											Total Hari
										</th>
										<th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
											Total Senin
										</th>
										<th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 bg-white">
									{monthsList.map((m) => {
										const ed = getEd(level.value, m.month, m.year);
										return (
											<tr key={`${m.year}-${m.month}`}>
												<td className="py-3 px-4 text-sm text-gray-900">
													{MONTH_NAMES[m.month - 1]} {m.year}
												</td>
												<td className="py-3 px-4 text-sm text-center text-gray-900">
													{ed ? ed.total_days : "-"}
												</td>
												<td className="py-3 px-4 text-sm text-center text-gray-900">
													{ed ? ed.total_mondays : "-"}
												</td>
												<td className="py-3 px-4 text-center">
													<Button
														variant="secondary"
														size="sm"
														onClick={() =>
															handleEdit(level.value, m.month, m.year)
														}
													>
														{ed ? "Edit" : "Isi"}
													</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				))}
			</div>

			{/* Modal Form */}
			{editing && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
						<h3 className="text-lg font-semibold mb-4">
							Hari Efektif —{" "}
							{LEVELS.find((l) => l.value === editing.level)?.label} —{" "}
							{MONTH_NAMES[editing.month - 1]} {editing.year}
						</h3>
						<form id="ed-form" className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Total Hari Efektif
								</label>
								<input
									name="total_days"
									type="number"
									min={0}
									max={31}
									defaultValue={editing.data?.total_days || 0}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Total Hari Senin
								</label>
								<input
									name="total_mondays"
									type="number"
									min={0}
									max={5}
									defaultValue={editing.data?.total_mondays || 0}
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
									required
								/>
							</div>
						</form>
						<div className="flex justify-end gap-3 mt-6">
							<Button variant="secondary" onClick={() => setEditing(null)}>
								Batal
							</Button>
							<Button variant="primary" onClick={handleSave}>
								Simpan
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
