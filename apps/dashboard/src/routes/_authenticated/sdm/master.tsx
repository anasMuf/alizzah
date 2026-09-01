import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	CurrencyFormField,
	FormField,
	useToast,
} from "#/components/ui";
import {
	type Golongan,
	type GolonganInput,
	type Kedisiplinan,
	type KedisiplinanInput,
	type MasterItem,
	type MasterItemInput,
	useFungsional,
	useGolongans,
	useKedisiplinan,
	useKehadiran,
	usePenanggungJawab,
	useSaveGolongan,
	useSaveKedisiplinan,
	useSaveKehadiran,
	useSaveMasterItem,
	useTugasTambahan,
} from "#/features/sdm/api";
import { formatCurrency } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/master")({
	component: MasterPage,
});

const TABS = [
	{ id: "golongan", label: "Golongan" },
	{ id: "kehadiran", label: "Kehadiran" },
	{ id: "kedisiplinan", label: "Kedisiplinan" },
	{ id: "fungsional", label: "Fungsional" },
	{ id: "tugas", label: "Tugas Tambahan" },
	{ id: "pj", label: "Penanggung Jawab" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function MasterPage() {
	const [tab, setTab] = useState<TabId>("golongan");

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Master HR</h1>
				<p className="text-sm text-gray-500">
					Konfigurasi komponen gaji — golongan, tarif, dan item HR.
				</p>
			</div>

			<div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
				{TABS.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
							tab === t.id
								? "border-indigo-600 text-indigo-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "golongan" && <GolonganSection />}
			{tab === "kehadiran" && <KehadiranSection />}
			{tab === "kedisiplinan" && <KedisiplinanSection />}
			{tab === "fungsional" && (
				<NamedSection
					title="Fungsional"
					useItems={useFungsional}
					useSave={() =>
						useSaveMasterItem("/fungsional", ["sdm", "fungsional"])
					}
					withNilai
				/>
			)}
			{tab === "tugas" && (
				<NamedSection
					title="Tugas Tambahan"
					useItems={useTugasTambahan}
					useSave={() =>
						useSaveMasterItem("/tugas-tambahan", ["sdm", "tugas-tambahan"])
					}
				/>
			)}
			{tab === "pj" && (
				<NamedSection
					title="Penanggung Jawab"
					useItems={usePenanggungJawab}
					useSave={() =>
						useSaveMasterItem("/penanggung-jawab", ["sdm", "penanggung-jawab"])
					}
					withNilai
				/>
			)}
		</div>
	);
}

// ── Golongan ──

function GolonganSection() {
	const { addToast } = useToast();
	const { data: rows = [], isLoading } = useGolongans();
	const save = useSaveGolongan();
	const [editing, setEditing] = useState<Golongan | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [deleting, setDeleting] = useState<Golongan | null>(null);
	const [kode, setKode] = useState("A");
	const [fromDay, setFromDay] = useState("");
	const [toDay, setToDay] = useState("");
	const [ket, setKet] = useState("");
	const [nilai, setNilai] = useState(0);

	const openForm = (g: Golongan | null) => {
		setEditing(g);
		setKode(g?.kode ?? "A");
		setFromDay(g?.from_day != null ? String(g.from_day) : "");
		setToDay(g?.to_day != null ? String(g.to_day) : "");
		setKet(g?.keterangan ?? "");
		setNilai(g?.nilai ?? 0);
		setFormOpen(true);
	};

	const submit = () => {
		const body: GolonganInput = {
			kode,
			from_day: fromDay === "" ? null : Number(fromDay),
			to_day: toDay === "" ? null : Number(toDay),
			keterangan: ket,
			nilai,
		};
		save.mutate(
			{ method: editing ? "PUT" : "POST", id: editing?.id, body },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: editing ? "Golongan diperbarui." : "Golongan ditambahkan.",
					});
					setFormOpen(false);
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
		<Card
			title="Golongan Gaji Pokok"
			desc="Gaji pokok berdasarkan masa pengabdian (dipakai kalkulasi otomatis)."
			action={
				<Button variant="primary" size="sm" onClick={() => openForm(null)}>
					<Plus className="h-4 w-4 mr-1" /> Tambah Golongan
				</Button>
			}
		>
			{isLoading ? (
				<p className="px-5 py-4 text-sm text-gray-500">Memuat...</p>
			) : (
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
								Kode
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
								Masa Pengabdian
							</th>
							<th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
								Gaji Pokok
							</th>
							<th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{rows.map((g) => (
							<tr key={g.id} className="hover:bg-gray-50">
								<td className="px-4 py-3">
									<Badge variant="info">Golongan {g.kode}</Badge>
								</td>
								<td className="px-4 py-3 text-sm text-gray-600">
									{g.from_day != null && g.to_day != null
										? `${g.from_day}–${g.to_day} hari`
										: g.keterangan || "-"}
								</td>
								<td className="px-4 py-3 text-sm text-gray-900 text-right">
									{formatCurrency(g.nilai)}
								</td>
								<td className="px-4 py-3 text-right whitespace-nowrap">
									<button
										type="button"
										onClick={() => openForm(g)}
										className="text-indigo-600 hover:text-indigo-800 mr-3"
									>
										<Pencil className="h-4 w-4 inline" />
									</button>
									<button
										type="button"
										onClick={() => setDeleting(g)}
										className="text-red-600 hover:text-red-800"
									>
										<Trash2 className="h-4 w-4 inline" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{formOpen && (
				<ModalForm
					title={editing ? "Ubah Golongan" : "Tambah Golongan"}
					onClose={() => setFormOpen(false)}
					onSubmit={submit}
				>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Kode
							</label>
							<select
								value={kode}
								onChange={(e) => setKode(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							>
								{["A", "B", "C", "D", "E", "F"].map((k) => (
									<option key={k} value={k}>
										{k}
									</option>
								))}
							</select>
						</div>
						<CurrencyFormField
							id="golongan-nilai"
							label="Gaji Pokok"
							value={nilai}
							onChange={setNilai}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<FormField
							id="from_day"
							label="Dari Hari (from_day)"
							type="number"
							value={fromDay}
							onChange={(e) => setFromDay(e.target.value)}
						/>
						<FormField
							id="to_day"
							label="Sampai Hari (to_day)"
							type="number"
							value={toDay}
							onChange={(e) => setToDay(e.target.value)}
						/>
					</div>
					<FormField
						id="ket"
						label="Keterangan"
						placeholder="mis. Pengabdian 0 - 2 Tahun"
						value={ket}
						onChange={(e) => setKet(e.target.value)}
					/>
				</ModalForm>
			)}

			<ConfirmDialog
				open={!!deleting}
				title="Hapus Golongan?"
				description="Golongan yang masih dipakai karyawan tidak dapat dihapus."
				confirmLabel="Hapus"
				onConfirm={() => {
					if (!deleting) return;
					save.mutate(
						{ method: "DELETE", id: deleting.id },
						{
							onSuccess: () => {
								addToast({
									variant: "success",
									title: "Berhasil",
									message: "Golongan dihapus.",
								});
								setDeleting(null);
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
				}}
				onCancel={() => setDeleting(null)}
			/>
		</Card>
	);
}

// ── Kehadiran ──

function KehadiranSection() {
	const { addToast } = useToast();
	const { data, isLoading } = useKehadiran();
	const save = useSaveKehadiran();
	const [nilai, setNilai] = useState(0);

	if (isLoading) {
		return <p className="text-sm text-gray-500">Memuat...</p>;
	}

	return (
		<Card
			title="Tarif Kehadiran"
			desc="Nominal per hari hadir — dikalikan jumlah hadir pada slip gaji."
		>
			<div className="flex flex-wrap items-end gap-4 p-5">
				<CurrencyFormField
					id="kh"
					label="Nominal per Hari"
					value={nilai || data?.nilai_per_hari || 0}
					onChange={setNilai}
					required
				/>
				<Button
					variant="primary"
					onClick={() =>
						save.mutate(
							{ nilai_per_hari: nilai || data?.nilai_per_hari || 0 },
							{
								onSuccess: () =>
									addToast({
										variant: "success",
										title: "Berhasil",
										message: "Tarif kehadiran disimpan.",
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
				>
					Simpan
				</Button>
			</div>
		</Card>
	);
}

// ── Kedisiplinan ──

function KedisiplinanSection() {
	const { addToast } = useToast();
	const { data: rows = [], isLoading } = useKedisiplinan();
	const save = useSaveKedisiplinan();
	const [editing, setEditing] = useState<Kedisiplinan | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [kode, setKode] = useState("siaga");
	const [nama, setNama] = useState("");
	const [nilai, setNilai] = useState(0);

	const openForm = (k: Kedisiplinan | null) => {
		setEditing(k);
		setKode(k?.kode ?? "siaga");
		setNama(k?.nama ?? "");
		setNilai(k?.nilai ?? 0);
		setFormOpen(true);
	};

	const submit = () => {
		const body: KedisiplinanInput = { kode, nama, nilai };
		save.mutate(
			{ method: editing ? "PUT" : "POST", id: editing?.id, body },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Kedisiplinan disimpan.",
					});
					setFormOpen(false);
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
		<Card
			title="Item Kedisiplinan"
			desc="Kode siaga & piket dipakai kalkulasi; terlambat & pulang awal sebagai pemicu bonus."
			action={
				<Button variant="primary" size="sm" onClick={() => openForm(null)}>
					<Plus className="h-4 w-4 mr-1" /> Tambah Item
				</Button>
			}
		>
			{isLoading ? (
				<p className="px-5 py-4 text-sm text-gray-500">Memuat...</p>
			) : (
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
								Kode
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
								Nama
							</th>
							<th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
								Nominal
							</th>
							<th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{rows.map((k) => (
							<tr key={k.id} className="hover:bg-gray-50">
								<td className="px-4 py-3">
									<Badge variant="secondary">{k.kode}</Badge>
								</td>
								<td className="px-4 py-3 text-sm text-gray-900">{k.nama}</td>
								<td className="px-4 py-3 text-sm text-gray-900 text-right">
									{formatCurrency(k.nilai)}
								</td>
								<td className="px-4 py-3 text-right">
									<button
										type="button"
										onClick={() => openForm(k)}
										className="text-indigo-600 hover:text-indigo-800"
									>
										<Pencil className="h-4 w-4 inline" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{formOpen && (
				<ModalForm
					title={editing ? "Ubah Item" : "Tambah Item"}
					onClose={() => setFormOpen(false)}
					onSubmit={submit}
				>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Kode
							</label>
							<select
								value={kode}
								onChange={(e) => setKode(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
							>
								{["siaga", "terlambat", "piket", "pulang_awal"].map((k) => (
									<option key={k} value={k}>
										{k}
									</option>
								))}
							</select>
						</div>
						<FormField
							id="ks-nama"
							label="Nama"
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							required
						/>
					</div>
					<CurrencyFormField
						id="ks-nilai"
						label="Nominal"
						value={nilai}
						onChange={setNilai}
						required
					/>
				</ModalForm>
			)}
		</Card>
	);
}

// ── Named master (fungsional / tugas tambahan / PJ) ──

function NamedSection({
	title,
	useItems,
	useSave,
	withNilai = false,
}: {
	title: string;
	useItems: () => ReturnType<typeof useFungsional>;
	useSave: () => ReturnType<typeof useSaveMasterItem>;
	withNilai?: boolean;
}) {
	const { addToast } = useToast();
	const { data: rows = [], isLoading } = useItems();
	const save = useSave();
	const [editing, setEditing] = useState<MasterItem | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [deleting, setDeleting] = useState<MasterItem | null>(null);
	const [nama, setNama] = useState("");
	const [nilai, setNilai] = useState(0);

	const openForm = (it: MasterItem | null) => {
		setEditing(it);
		setNama(it?.nama ?? "");
		setNilai(it?.nilai ?? 0);
		setFormOpen(true);
	};

	const submit = () => {
		const body: MasterItemInput = {
			nama,
			...(withNilai ? { nilai } : {}),
		};
		save.mutate(
			{ method: editing ? "PUT" : "POST", id: editing?.id, body },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `${title} disimpan.`,
					});
					setFormOpen(false);
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
		<Card
			title={title}
			action={
				<Button variant="primary" size="sm" onClick={() => openForm(null)}>
					<Plus className="h-4 w-4 mr-1" /> Tambah
				</Button>
			}
		>
			{isLoading ? (
				<p className="px-5 py-4 text-sm text-gray-500">Memuat...</p>
			) : rows.length === 0 ? (
				<p className="px-5 py-4 text-sm text-gray-400">Belum ada data.</p>
			) : (
				<ul className="divide-y divide-gray-100">
					{rows.map((it) => (
						<li
							key={it.id}
							className="flex items-center justify-between px-5 py-3"
						>
							<div>
								<p className="text-sm font-medium text-gray-900">{it.nama}</p>
								{withNilai && it.nilai != null && (
									<p className="text-sm text-gray-500">
										{formatCurrency(it.nilai)}
									</p>
								)}
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => openForm(it)}
									className="text-indigo-600 hover:text-indigo-800"
								>
									<Pencil className="h-4 w-4" />
								</button>
								<button
									type="button"
									onClick={() => setDeleting(it)}
									className="text-red-600 hover:text-red-800"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			{formOpen && (
				<ModalForm
					title={editing ? `Ubah ${title}` : `Tambah ${title}`}
					onClose={() => setFormOpen(false)}
					onSubmit={submit}
				>
					<FormField
						id="nm"
						label="Nama"
						value={nama}
						onChange={(e) => setNama(e.target.value)}
						required
					/>
					{withNilai && (
						<CurrencyFormField
							id="nv"
							label="Nominal"
							value={nilai}
							onChange={setNilai}
							required
						/>
					)}
				</ModalForm>
			)}

			<ConfirmDialog
				open={!!deleting}
				title={`Hapus ${title}?`}
				description="Item yang masih dilampirkan ke karyawan tidak dapat dihapus."
				confirmLabel="Hapus"
				onConfirm={() => {
					if (!deleting) return;
					save.mutate(
						{ method: "DELETE", id: deleting.id },
						{
							onSuccess: () => {
								addToast({
									variant: "success",
									title: "Berhasil",
									message: `${title} dihapus.`,
								});
								setDeleting(null);
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
				}}
				onCancel={() => setDeleting(null)}
			/>
		</Card>
	);
}

// ── Primitives ──

function Card({
	title,
	desc,
	action,
	children,
}: {
	title: string;
	desc?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white">
			<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div>
					<h2 className="text-sm font-semibold text-gray-900">{title}</h2>
					{desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}

function ModalForm({
	title,
	onClose,
	onSubmit,
	children,
}: {
	title: string;
	onClose: () => void;
	onSubmit: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
			<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
				<div className="space-y-4">{children}</div>
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="secondary" onClick={onClose}>
						Batal
					</Button>
					<Button variant="primary" onClick={onSubmit}>
						Simpan
					</Button>
				</div>
			</div>
		</div>
	);
}
