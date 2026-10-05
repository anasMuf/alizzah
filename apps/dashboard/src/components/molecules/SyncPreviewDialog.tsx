import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, SlideOver, useToast } from "#/components/ui";

export interface SyncPreviewSummaryItem {
	label: string;
	value: string | number;
}

export interface SyncPreviewRow {
	key: string;
	/** Label utama baris (mis. nama siswa, atau bulan "Agustus 2026"). */
	title: string;
	/** Deskripsi aksi untuk baris ini (mis. nama kegiatan + nominal). */
	action: string;
	/** "change" = akan mengubah data; "skip" = dilewati tanpa perubahan. */
	status: "change" | "skip";
}

interface SyncPreviewDialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	confirmLabel?: string;
	/** Varian tombol konfirmasi — "danger" untuk aksi destruktif (mis. hapus). */
	confirmVariant?: "primary" | "danger";
	/** Label tombol saat sedang menjalankan aksi. */
	runningLabel?: string;
	/** Teks saat tidak ada baris yang perlu diubah. */
	emptyText?: string;
	/** Label badge untuk baris ber-status "change". */
	changeLabel?: string;
	/** Label badge untuk baris ber-status "skip". */
	skipLabel?: string;
	/** Memuat rencana aksi (dry-run). Dipanggil setiap dialog dibuka. */
	loadPreview: () => Promise<{
		summary: SyncPreviewSummaryItem[];
		rows: SyncPreviewRow[];
	}>;
	/** Menjalankan aksi sesungguhnya. Toast sukses/gagal ditangani pemanggil. */
	runSync: () => Promise<void>;
}

/**
 * Dialog "Preview Aksi": menampilkan rencana aksi (dry-run) sebelum dieksekusi.
 * Tombol konfirmasi dinonaktifkan bila tidak ada baris ber-status "change".
 */
export function SyncPreviewDialog({
	open,
	onClose,
	title,
	description,
	confirmLabel = "Jalankan Sinkronisasi",
	confirmVariant = "primary",
	runningLabel = "Menyinkronkan...",
	emptyText = "Tidak ada enrollment aktif. Tidak ada yang perlu disinkronkan.",
	changeLabel = "Ditambah",
	skipLabel = "Dilewati",
	loadPreview,
	runSync,
}: SyncPreviewDialogProps) {
	const { addToast } = useToast();
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [summary, setSummary] = useState<SyncPreviewSummaryItem[]>([]);
	const [rows, setRows] = useState<SyncPreviewRow[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: load hanya saat dialog dibuka
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setLoading(true);
		setSummary([]);
		setRows([]);
		loadPreview()
			.then((data) => {
				if (cancelled) return;
				setSummary(data.summary);
				setRows(data.rows);
			})
			.catch((err: Error) => {
				if (cancelled) return;
				addToast({
					variant: "error",
					title: "Gagal",
					message: err?.message || "Gagal memuat preview.",
				});
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
	}, [open]);

	const hasChanges = rows.some((r) => r.status === "change");

	const handleRun = async () => {
		setRunning(true);
		try {
			await runSync();
			onClose();
		} catch {
			// Toast error ditangani oleh mutation di halaman pemanggil
		} finally {
			setRunning(false);
		}
	};

	return (
		<SlideOver
			isOpen={open}
			onClose={onClose}
			title={title}
			size="lg"
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={running}>
						Batal
					</Button>
					<Button
						variant={confirmVariant}
						onClick={handleRun}
						disabled={loading || running || !hasChanges}
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`}
						/>
						{running ? runningLabel : confirmLabel}
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
				) : rows.length === 0 ? (
					<div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
						{emptyText}
					</div>
				) : (
					<>
						{summary.length > 0 && (
							<div className="grid grid-cols-3 gap-3">
								{summary.map((s) => (
									<div
										key={s.label}
										className="rounded-md border border-gray-200 bg-white px-3 py-2 text-center"
									>
										<p className="text-lg font-bold text-gray-900">{s.value}</p>
										<p className="text-xs text-gray-500">{s.label}</p>
									</div>
								))}
							</div>
						)}

						<ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
							{rows.map((r) => (
								<li key={r.key} className="flex items-start gap-3 px-4 py-3">
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-gray-900">
											{r.title}
										</p>
										<p className="mt-0.5 text-xs text-gray-500">{r.action}</p>
									</div>
									<Badge
										variant={r.status === "change" ? "success" : "secondary"}
									>
										{r.status === "change" ? changeLabel : skipLabel}
									</Badge>
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		</SlideOver>
	);
}
