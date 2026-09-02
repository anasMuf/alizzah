import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HandCoins, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	CurrencyFormField,
	FormField,
	useToast,
} from "#/components/ui";
import {
	currentPeriode,
	useAttachHR,
	useDetachHR,
	useEmployee,
	useFungsional,
	useLainlain,
	usePenanggungJawab,
	useTugasTambahan,
} from "#/features/sdm/api";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/guru/$id")({
	component: GuruDetailPage,
});

function GuruDetailPage() {
	const { id } = Route.useParams();
	const employeeId = Number(id);
	const { data: emp, isLoading, isError } = useEmployee(employeeId);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat karyawan...</p>;
	}
	if (isError || !emp) {
		return <p className="text-sm text-red-600">Gagal memuat karyawan.</p>;
	}

	return (
		<div className="space-y-6">
			<Link
				to="/sdm/guru"
				className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
			>
				<ArrowLeft className="h-4 w-4 mr-1" /> Data Karyawan
			</Link>

			<div className="rounded-lg border border-gray-200 bg-white p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{emp.nama}</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							<span>Masuk {formatDate(emp.tgl_masuk ?? undefined)}</span>
							<Badge variant="info">Golongan {emp.golongan?.kode ?? "-"}</Badge>
							{emp.sertifikasi && <Badge variant="warning">Sertifikasi</Badge>}
							{emp.impasing && <Badge variant="danger">Impasing</Badge>}
							{!emp.is_active && <Badge variant="secondary">Nonaktif</Badge>}
						</div>
					</div>
					<div className="flex gap-2">
						<Link
							to="/sdm/penggajian/$id"
							params={{ id: String(employeeId) }}
							search={{ periode: currentPeriode() }}
							className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
						>
							<Wallet className="h-4 w-4 mr-1.5" /> Slip Gaji
						</Link>
						<Link
							to="/sdm/pinjaman"
							search={{ employee_id: employeeId }}
							className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							<HandCoins className="h-4 w-4 mr-1.5" /> Pinjaman
						</Link>
					</div>
				</div>
			</div>

			<HRSection
				employeeId={employeeId}
				title="Fungsional"
				items={emp.hr.fungsional.map((x) => ({
					id: x.id,
					nama: x.nama,
					nilai: x.nilai,
				}))}
				attachType="fungsional"
				placeholder="Pilih jabatan fungsional"
			/>
			<HRSection
				employeeId={employeeId}
				title="Tugas Tambahan"
				items={emp.hr.tugas_tambahan.map((x) => ({
					id: x.id,
					nama: x.nama,
					nilai: x.nilai,
				}))}
				attachType="tugas_tambahan"
				placeholder="Pilih bidang tugas"
				withNilai
			/>
			<HRSection
				employeeId={employeeId}
				title="Penanggung Jawab"
				items={emp.hr.penanggung_jawab.map((x) => ({
					id: x.id,
					nama: x.nama,
					nilai: x.nilai,
				}))}
				attachType="penanggung_jawab"
				placeholder="Pilih peran penanggung jawab"
			/>
			<HRSection
				employeeId={employeeId}
				title="Lain-lain"
				items={emp.hr.lainlain.map((x) => ({
					id: x.id,
					nama: x.nama,
					nilai: x.nilai,
				}))}
				attachType="lainlain"
				placeholder="Nama pendapatan tambahan"
				withNilai
				freeText
			/>
		</div>
	);
}

type AttachType =
	| "fungsional"
	| "tugas_tambahan"
	| "penanggung_jawab"
	| "lainlain";

function HRSection({
	employeeId,
	title,
	items,
	attachType,
	placeholder,
	withNilai = false,
	freeText = false,
}: {
	employeeId: number;
	title: string;
	items: Array<{ id: number; nama: string; nilai: number }>;
	attachType: AttachType;
	placeholder: string;
	withNilai?: boolean;
	freeText?: boolean;
}) {
	const { addToast } = useToast();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState(0);
	const [text, setText] = useState("");
	const [nilai, setNilai] = useState(0);

	const masters = useMasterForType(attachType);
	const attach = useAttachHR(employeeId);
	const detach = useDetachHR(employeeId);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const body: Record<string, unknown> = freeText
			? { nama: text.trim(), nilai }
			: withNilai
				? { tugas_tambahan_id: selected, nilai }
				: {
						[attachType === "fungsional"
							? "fungsional_id"
							: `${attachType}_id`]: selected,
					};
		if (!body.nama && !selected) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih/isi item terlebih dahulu.",
			});
			return;
		}
		attach.mutate(
			{ type: attachType, body },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `${title} dilampirkan.`,
					});
					setOpen(false);
					setSelected(0);
					setText("");
					setNilai(0);
				},
				onError: (err: Error) =>
					addToast({
						variant: "error",
						title: "Gagal",
						message:
							err instanceof ApiError ? err.message : "Terjadi kesalahan",
					}),
			},
		);
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<h2 className="text-sm font-semibold text-gray-900">{title}</h2>
				<Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
					<Plus className="h-4 w-4 mr-1" /> Lampirkan
				</Button>
			</div>

			{open && (
				<form
					onSubmit={submit}
					className="border-b border-gray-100 bg-gray-50 px-5 py-4 space-y-4"
				>
					{freeText ? (
						<FormField
							id={`text-${attachType}`}
							label="Nama Item"
							placeholder={placeholder}
							value={text}
							onChange={(e) => setText(e.target.value)}
							required
						/>
					) : (
						<div>
							<label
								htmlFor={`select-${attachType}`}
								className="block text-sm font-medium leading-6 text-gray-900 mb-2"
							>
								{placeholder}
							</label>
							<select
								id={`select-${attachType}`}
								value={selected}
								onChange={(e) => setSelected(Number(e.target.value))}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
								required
							>
								<option value={0}>Pilih…</option>
								{(masters ?? []).map((m) => (
									<option key={m.id} value={m.id}>
										{m.nama}
										{m.nilai ? ` — ${formatCurrency(m.nilai)}` : ""}
									</option>
								))}
							</select>
						</div>
					)}
					{withNilai && (
						<CurrencyFormField
							id={`nilai-${attachType}`}
							label="Nominal"
							placeholder="0"
							value={nilai}
							onChange={setNilai}
							required
						/>
					)}
					<Button variant="primary" type="submit" size="sm">
						Simpan
					</Button>
				</form>
			)}

			{items.length === 0 ? (
				<p className="px-5 py-4 text-sm text-gray-400">
					Belum ada {title.toLowerCase()}.
				</p>
			) : (
				<ul className="divide-y divide-gray-100">
					{items.map((it) => (
						<li
							key={it.id}
							className="flex items-center justify-between px-5 py-3"
						>
							<div>
								<p className="text-sm font-medium text-gray-900">{it.nama}</p>
								<p className="text-sm text-gray-500">
									{formatCurrency(it.nilai)}
								</p>
							</div>
							<button
								type="button"
								onClick={() =>
									detach.mutate(
										{ type: attachType, detailId: it.id },
										{
											onSuccess: () =>
												addToast({
													variant: "success",
													title: "Berhasil",
													message: `${title} dilepas.`,
												}),
											onError: (err: Error) =>
												addToast({
													variant: "error",
													title: "Gagal",
													message:
														err instanceof ApiError
															? err.message
															: "Terjadi kesalahan",
												}),
										},
									)
								}
								className="text-gray-400 hover:text-red-600"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function useMasterForType(type: AttachType) {
	const f = useFungsional();
	const t = useTugasTambahan();
	const p = usePenanggungJawab();
	const l = useLainlain();
	switch (type) {
		case "fungsional":
			return f.data;
		case "tugas_tambahan":
			return t.data;
		case "penanggung_jawab":
			return p.data;
		case "lainlain":
			return l.data;
		default:
			return [];
	}
}
