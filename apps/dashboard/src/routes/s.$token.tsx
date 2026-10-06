import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Badge } from "#/components/ui";
import {
	formatPeriode,
	type RiwayatBulan,
	type Slip,
} from "#/features/sdm/api";
import { SlipDetailView } from "#/features/sdm/components/SlipDetailView";
import { publicGet } from "#/features/sdm/lib/client";
import { formatCurrency } from "#/utils/format";

// Halaman publik slip gaji (diakses lewat tautan ber-token dari WA).
// Berada DI LUAR grup _authenticated — tanpa login. Token stateless berlaku
// sementara (default 3 hari); lihat docs/sdm/kirim-wa-plan.md.

interface PublicEmployee {
	id: number;
	nama: string;
	golongan_kode: string;
	tgl_masuk: string | null;
	sertifikasi: boolean;
	impasing: boolean;
}

interface PublicSlip {
	employee: PublicEmployee;
	riwayat: RiwayatBulan[];
}

export const Route = createFileRoute("/s/$token")({
	component: PublicSlipPage,
});

function PublicSlipPage() {
	const { token } = Route.useParams();
	const [periode, setPeriode] = useState<string | null>(null);

	const profil = useQuery({
		queryKey: ["public-slip", token],
		queryFn: () => publicGet<PublicSlip>("/slip", { token }),
		retry: false,
	});

	const riwayat = [...(profil.data?.riwayat ?? [])].sort((a, b) =>
		b.periode.localeCompare(a.periode),
	);

	// Pilih periode terbaru yang punya data begitu profil termuat.
	useEffect(() => {
		if (periode !== null || riwayat.length === 0) return;
		setPeriode(riwayat.find((r) => r.ada_data)?.periode ?? riwayat[0].periode);
	}, [periode, riwayat]);

	const detail = useQuery({
		queryKey: ["public-slip-detail", token, periode],
		queryFn: () => publicGet<Slip>("/slip/detail", { token, periode }),
		enabled: periode !== null,
		retry: false,
	});

	const expired = isUnauthorized(profil.error) || isUnauthorized(detail.error);

	if (profil.isLoading) {
		return (
			<Center>
				<Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
				<p className="mt-3 text-sm text-gray-500">Memuat data slip…</p>
			</Center>
		);
	}

	if (expired) {
		return (
			<Center>
				<AlertTriangle className="h-8 w-8 text-amber-500" />
				<h1 className="mt-3 text-lg font-semibold text-gray-900">
					Tautan tidak valid atau kedaluwarsa
				</h1>
				<p className="mt-2 max-w-sm text-center text-sm text-gray-500">
					Tautan slip gaji ini sudah tidak berlaku. Silakan minta tautan baru
					kepada bagian kepegawaian.
				</p>
			</Center>
		);
	}

	if (profil.isError || !profil.data) {
		return (
			<Center>
				<AlertTriangle className="h-8 w-8 text-red-500" />
				<h1 className="mt-3 text-lg font-semibold text-gray-900">
					Gagal memuat data
				</h1>
				<p className="mt-2 text-sm text-gray-500">
					Terjadi kesalahan. Coba muat ulang halaman ini.
				</p>
			</Center>
		);
	}

	const emp = profil.data.employee;

	return (
		<div className="min-h-screen bg-gray-50 px-4 py-8">
			{/* React 19 menaikkan tag ini ke <head>. */}
			<title>Slip Gaji — {emp.nama}</title>
			<meta name="robots" content="noindex, nofollow" />

			<div className="mx-auto max-w-3xl space-y-6">
				<div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
								Slip Gaji Karyawan
							</p>
							<h1 className="mt-1 text-xl font-bold text-gray-900">
								{emp.nama}
							</h1>
							<p className="text-sm text-gray-500">
								Golongan {emp.golongan_kode || "-"}
								{emp.tgl_masuk
									? ` · Masuk ${formatTanggal(emp.tgl_masuk)}`
									: ""}
							</p>
						</div>
						<div className="flex gap-2">
							{emp.sertifikasi && <Badge variant="warning">Sertifikasi</Badge>}
							{emp.impasing && <Badge variant="danger">Impasing</Badge>}
						</div>
					</div>
				</div>

				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
					<p className="text-sm text-amber-800">
						Tautan ini bersifat <strong>sementara</strong>. Untuk simpanan
						pribadi, silakan <strong>unduh slip dalam bentuk PDF</strong>{" "}
						melalui tombol di bawah.
					</p>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
					<h2 className="text-sm font-semibold text-gray-900">Riwayat Gaji</h2>
					{riwayat.length === 0 ? (
						<p className="mt-3 text-sm text-gray-500">
							Belum ada riwayat penggajian.
						</p>
					) : (
						<ul className="mt-3 divide-y divide-gray-100">
							{riwayat.map((r) => {
								const aktif = r.periode === periode;
								return (
									<li key={r.periode}>
										<button
											type="button"
											onClick={() => setPeriode(r.periode)}
											className={`flex w-full flex-wrap items-center justify-between gap-2 px-2 py-3 text-left transition-colors ${
												aktif ? "bg-indigo-50" : "hover:bg-gray-50"
											}`}
										>
											<span className="text-sm font-medium text-gray-800">
												{r.label || formatPeriode(r.periode)}
											</span>
											<span className="flex items-center gap-3">
												<StatusBadge status={r.status} adaData={r.ada_data} />
												<span className="text-sm font-semibold text-gray-900">
													{r.ada_data ? formatCurrency(r.total_gaji) : "—"}
												</span>
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				{detail.isLoading && (
					<p className="text-sm text-gray-500">Menghitung slip…</p>
				)}
				{detail.isError && !expired && (
					<p className="text-sm text-red-600">Gagal memuat slip periode ini.</p>
				)}
				{detail.data && periode && (
					<>
						<div className="flex justify-end">
							<button
								type="button"
								onClick={async () => {
									const { downloadSlipPdf } = await import(
										"#/features/sdm/lib/slipPdf"
									);
									downloadSlipPdf(detail.data as Slip, periode);
								}}
								className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
							>
								<FileDown className="h-4 w-4 mr-1.5" /> Download PDF
							</button>
						</div>
						<SlipDetailView slip={detail.data} periode={periode} />
					</>
				)}
			</div>
		</div>
	);
}

function Center({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
			{children}
		</div>
	);
}

function StatusBadge({
	status,
	adaData,
}: {
	status: string;
	adaData: boolean;
}) {
	if (!adaData) return <Badge variant="secondary">Kosong</Badge>;
	if (status === "finalized") return <Badge variant="success">Final</Badge>;
	return <Badge variant="warning">Berjalan</Badge>;
}

function isUnauthorized(err: unknown): boolean {
	return err instanceof ApiError && err.status === 401;
}

function formatTanggal(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(d);
}
