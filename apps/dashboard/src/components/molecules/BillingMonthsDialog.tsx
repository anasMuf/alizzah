import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, SlideOver, useToast } from "#/components/ui";

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

const monthKey = (month: number, year: number) => `${month}-${year}`;

/**
 * Membangun daftar bulan (Jul..Jun) dari rentang tanggal tahun ajaran aktif.
 * Mengembalikan array kosong bila tanggal tidak valid.
 */
export function buildAcademicYearMonths(
	startDate?: string,
	endDate?: string,
): { month: number; year: number }[] {
	if (!startDate || !endDate) return [];
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
	const months: { month: number; year: number }[] = [];
	const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
	const endKey = `${end.getFullYear()}-${end.getMonth()}`;
	while (`${cursor.getFullYear()}-${cursor.getMonth()}` <= endKey) {
		months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
		cursor.setMonth(cursor.getMonth() + 1);
	}
	return months;
}

interface BillingMonthsDialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	/** 12 bulan tahun ajaran aktif, urut berdasarkan tanggal (Jul..Jun). */
	months: { month: number; year: number }[];
	/** Bulan yang sudah dibayar (key "M-YYYY") — checkbox dinonaktifkan. */
	paidKeys: Set<string>;
	loadExclusions: () => Promise<{ month: number; year: number }[]>;
	saveExclusions: (months: { month: number; year: number }[]) => Promise<void>;
}

/**
 * Dialog "Kelola Bulan" — memilih bulan-bulan yang tagihan bulanannya di-skip
 * (PASTA/fasilitas) tanpa mengubah status enrollment. Dipakai bersama oleh
 * halaman ekskul (PASTA) dan fasilitas siswa.
 */
export function BillingMonthsDialog({
	open,
	onClose,
	title,
	description,
	months,
	paidKeys,
	loadExclusions,
	saveExclusions,
}: BillingMonthsDialogProps) {
	const { addToast } = useToast();
	const [checked, setChecked] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Centang = bulan DITAGIH (aktif). Bulan yang di-skip = tidak dicentang.
	// Saat dialog dibuka, isi checked dengan komplemen dari daftar exclusion.
	// biome-ignore lint/correctness/useExhaustiveDependencies: load hanya saat dialog dibuka
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setLoading(true);
		setChecked(new Set());
		loadExclusions()
			.then((list) => {
				if (cancelled) return;
				const excluded = new Set(list.map((m) => monthKey(m.month, m.year)));
				setChecked(
					new Set(
						months
							.map((m) => monthKey(m.month, m.year))
							.filter((key) => !excluded.has(key)),
					),
				);
			})
			.catch((err: Error) => {
				if (cancelled) return;
				addToast({
					variant: "error",
					title: "Gagal",
					message: err?.message || "Gagal memuat daftar bulan.",
				});
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const toggle = (key: string) => {
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			// Yang dikirim = bulan yang TIDAK dicentang (skip)
			const skipped = months.filter(
				(m) => !checked.has(monthKey(m.month, m.year)),
			);
			await saveExclusions(skipped);
			onClose();
		} catch {
			// Toast error ditangani oleh mutation di halaman pemanggil
		} finally {
			setSaving(false);
		}
	};

	return (
		<SlideOver
			isOpen={open}
			onClose={onClose}
			title={title}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={saving}>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSave}
						disabled={loading || saving}
					>
						{saving ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<p className="text-sm text-gray-500">{description}</p>

				{loading ? (
					<div className="flex justify-center py-10 text-gray-400">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<div className="grid grid-cols-3 gap-2">
						{months.map((m) => {
							const key = monthKey(m.month, m.year);
							const paid = paidKeys.has(key);
							const isChecked = checked.has(key);
							return (
								<label
									key={key}
									className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
										isChecked
											? "border-indigo-600 bg-indigo-50"
											: "border-gray-200 bg-white hover:bg-gray-50"
									} ${paid && isChecked ? "cursor-not-allowed opacity-50" : ""}`}
								>
									<input
										type="checkbox"
										checked={isChecked}
										disabled={saving || (paid && isChecked)}
										onChange={() => toggle(key)}
										className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
									/>
									<span className="flex flex-col leading-tight">
										<span className="font-medium text-gray-900">
											{MONTH_NAMES[m.month - 1]}
										</span>
										<span className="text-xs text-gray-400">
											{m.year}
											{paid ? " • dibayar" : ""}
										</span>
									</span>
								</label>
							);
						})}
					</div>
				)}

				<p className="text-xs text-gray-400">
					Bulan yang dicentang tetap ditagihkan (aktif). Bulan yang tidak
					dicentang akan di-skip (tidak ditagih). Bulan yang sudah dibayar tidak
					bisa di-skip.
				</p>
			</div>
		</SlideOver>
	);
}
