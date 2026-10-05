import { Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ApiError } from "#/api/mutator/custom-instance";
import { Badge, Button, SlideOver, useToast } from "#/components/ui";
import {
	type Employee,
	type ImportRow,
	useImportEmployees,
} from "#/features/sdm/api";
import { sdmGet } from "#/features/sdm/lib/client";

interface PreviewRow {
	row: ImportRow;
	status: "baru" | "update" | "gagal";
	error?: string;
}

/**
 * EmployeeImportDialog — import karyawan dari Excel. Preview tiap baris sebagai
 * Baru / Update / Gagal sebelum disimpan. Baris dengan ID yang ada diperbarui;
 * tanpa ID ditambah baru. Kolom: ID, Nama, No. Telp, Tgl. Masuk, Golongan,
 * Sertifikasi, Impasing, Aktif.
 */
export function EmployeeImportDialog({
	isOpen,
	onClose,
	onDone,
	golongans,
}: {
	isOpen: boolean;
	onClose: () => void;
	onDone?: () => void;
	golongans: Array<{ kode: string }>;
}) {
	const { addToast } = useToast();
	const importEmp = useImportEmployees();
	const fileRef = useRef<HTMLInputElement>(null);

	const [rawRows, setRawRows] = useState<ImportRow[]>([]);
	const [fileName, setFileName] = useState("");
	const [existingIds, setExistingIds] = useState<Set<number>>(new Set());

	const kodeSet = useMemo(
		() => new Set(golongans.map((g) => g.kode.toUpperCase())),
		[golongans],
	);

	// Reset & muat daftar ID karyawan tiap kali dibuka (untuk deteksi Baru/Update).
	useEffect(() => {
		if (!isOpen) return;
		setRawRows([]);
		setFileName("");
		let cancelled = false;
		sdmGet<Employee[]>("/employees", { all: true })
			.then((all) => {
				if (!cancelled) setExistingIds(new Set(all.map((e) => e.id)));
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [isOpen]);

	const preview = useMemo(
		() => rawRows.map((row) => validateRow(row, existingIds, kodeSet)),
		[rawRows, existingIds, kodeSet],
	);
	const validRows = preview
		.filter((p) => p.status !== "gagal")
		.map((p) => p.row);
	const gagalCount = preview.length - validRows.length;

	const handleFile = async (file: File) => {
		try {
			const buf = await file.arrayBuffer();
			const wb = XLSX.read(buf, { cellDates: true });
			const ws = wb.Sheets[wb.SheetNames[0]];
			const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
				defval: "",
				raw: true,
			});
			const parsed = raw.map(toImportRow);
			setRawRows(parsed);
			setFileName(file.name);
			if (parsed.length === 0) {
				addToast({
					variant: "warning",
					title: "Kosong",
					message: "Tidak ada baris pada file.",
				});
			}
		} catch {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "File Excel tidak valid.",
			});
		}
	};

	const submit = () => {
		if (validRows.length === 0) {
			addToast({
				variant: "warning",
				title: "Tidak ada data",
				message: "Tidak ada baris valid untuk diimpor.",
			});
			return;
		}
		importEmp.mutate(validRows, {
			onSuccess: (res) => {
				addToast({
					variant: res.failed > 0 ? "warning" : "success",
					title: "Import selesai",
					message: `${res.created} ditambah, ${res.updated} diperbarui${
						res.failed ? `, ${res.failed} gagal` : ""
					}.`,
				});
				onDone?.();
				onClose();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		});
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Import Karyawan"
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={submit}
						disabled={validRows.length === 0 || importEmp.isPending}
					>
						{importEmp.isPending
							? "Menyimpan..."
							: `Import ${validRows.length} baris`}
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<p className="text-sm text-gray-500">
					Baris dengan <b>ID</b> yang ada akan <b>diperbarui</b>; tanpa ID akan{" "}
					<b>ditambah</b> baru (kosongkan ID untuk karyawan baru). Nomor telepon
					otomatis dinormalisasi ke format +62.
				</p>

				<input
					ref={fileRef}
					type="file"
					accept=".xlsx,.xls"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) handleFile(f);
						e.target.value = "";
					}}
				/>
				<Button variant="secondary" onClick={() => fileRef.current?.click()}>
					<Upload className="h-4 w-4 mr-1" /> Pilih File Excel
				</Button>

				{fileName && (
					<p className="text-sm text-gray-600">
						{fileName} — {preview.length} baris terbaca
						{gagalCount > 0 ? `, ${gagalCount} bermasalah` : ""}.
					</p>
				)}

				{preview.length > 0 && (
					<div className="overflow-x-auto rounded-lg border border-gray-200">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
										Nama
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
										No. Telp
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
										Masuk
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
										Gol.
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{preview.map((p) => (
									<tr key={`${p.row.id}-${p.row.nama}`}>
										<td className="px-3 py-2 text-gray-900">
											{p.row.nama || (
												<span className="text-red-500">(nama kosong)</span>
											)}
										</td>
										<td className="px-3 py-2 text-gray-600 whitespace-nowrap">
											{p.row.no_telp || "-"}
										</td>
										<td className="px-3 py-2 text-gray-600 whitespace-nowrap">
											{p.row.tgl_masuk || "-"}
										</td>
										<td className="px-3 py-2 text-gray-600">
											{p.row.golongan_kode || "auto"}
										</td>
										<td className="px-3 py-2">
											{p.status === "gagal" ? (
												<Badge variant="danger">{p.error}</Badge>
											) : p.status === "update" ? (
												<Badge variant="warning">Update</Badge>
											) : (
												<Badge variant="success">Baru</Badge>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</SlideOver>
	);
}

function validateRow(
	row: ImportRow,
	existingIds: Set<number>,
	kodeSet: Set<string>,
): PreviewRow {
	if (!row.nama) return { row, status: "gagal", error: "Nama kosong" };
	if (row.golongan_kode && !kodeSet.has(row.golongan_kode)) {
		return {
			row,
			status: "gagal",
			error: `Golongan ${row.golongan_kode} tidak dikenal`,
		};
	}
	if (row.id > 0 && !existingIds.has(row.id)) {
		return { row, status: "gagal", error: `ID ${row.id} tidak ditemukan` };
	}
	return { row, status: row.id > 0 ? "update" : "baru" };
}

function toImportRow(r: Record<string, unknown>): ImportRow {
	const aktifRaw = r["Aktif"] ?? r.aktif ?? r.is_active;
	return {
		id: Number(r["ID"] ?? r.id ?? 0) || 0,
		nama: String(r["Nama"] ?? r.nama ?? "").trim(),
		no_telp: String(r["No. Telp"] ?? r["No Telp"] ?? r.no_telp ?? "").trim(),
		tgl_masuk: toISODate(r["Tgl Masuk"] ?? r["Tanggal Masuk"] ?? r.tgl_masuk),
		golongan_kode: String(r["Golongan"] ?? r.golongan ?? "")
			.trim()
			.toUpperCase(),
		sertifikasi: toBool(r["Sertifikasi"] ?? r.sertifikasi),
		impasing: toBool(r["Impasing"] ?? r.impasing),
		is_active:
			aktifRaw === undefined || aktifRaw === "" ? true : toBool(aktifRaw),
	};
}

function toBool(v: unknown): boolean {
	const s = String(v ?? "")
		.trim()
		.toLowerCase();
	return ["ya", "yes", "true", "1", "y", "v", "aktif", "✓"].includes(s);
}

function toISODate(v: unknown): string {
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
	}
	if (typeof v === "number" && v > 0) {
		// Serial date Excel → UTC date.
		const d = new Date(Math.round((v - 25569) * 86400 * 1000));
		return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
	}
	const s = String(v ?? "").trim();
	if (!s) return "";
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;
	const d = new Date(s);
	if (!Number.isNaN(d.getTime())) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}
	return "";
}
