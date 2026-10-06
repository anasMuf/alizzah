import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, HandCoins, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	CurrencyFormField,
	EmptyState,
	SlideOver,
	useToast,
} from "#/components/ui";
import {
	useCreatePinjaman,
	useEmployees,
	usePinjaman,
} from "#/features/sdm/api";
import { formatCurrency, formatDate } from "#/utils/format";

export const Route = createFileRoute("/_authenticated/sdm/pinjaman/")({
	component: PinjamanPage,
	validateSearch: (search: Record<string, unknown>) => ({
		employee_id: search.employee_id as number | undefined,
	}),
});

function PinjamanPage() {
	const search = Route.useSearch();
	const { addToast } = useToast();
	const [status, setStatus] = useState("");
	const [formOpen, setFormOpen] = useState(false);
	const { data: loans = [], isLoading, isError } = usePinjaman(status);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pinjaman</h1>
					<p className="text-sm text-gray-500">
						Pinjaman karyawan — akumulatif per guru, dipotong dari gaji per
						periode.
					</p>
				</div>
				<Button variant="primary" onClick={() => setFormOpen(true)}>
					<Plus className="h-4 w-4 mr-1.5" /> Catat Pinjaman
				</Button>
			</div>

			<div className="flex gap-2">
				{[
					{ value: "", label: "Semua" },
					{ value: "belum_lunas", label: "Belum Lunas" },
					{ value: "lunas", label: "Lunas" },
				].map((s) => (
					<button
						key={s.value}
						type="button"
						onClick={() => setStatus(s.value)}
						className={`rounded-md px-3 py-1 text-sm ${
							status === s.value
								? "bg-indigo-600 text-white"
								: "bg-gray-100 text-gray-600 hover:bg-gray-200"
						}`}
					>
						{s.label}
					</button>
				))}
			</div>

			{isLoading ? (
				<p className="text-sm text-gray-500">Memuat pinjaman...</p>
			) : isError ? (
				<p className="text-sm text-red-600">Gagal memuat pinjaman.</p>
			) : loans.length === 0 ? (
				<EmptyState
					icon={<HandCoins className="h-10 w-10 text-gray-400" />}
					title="Belum ada pinjaman"
					description="Catat pinjaman karyawan untuk mulai memotong angsuran dari gaji."
				/>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Karyawan
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Tanggal
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Jumlah
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Dibayar
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Sisa
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
									Status
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
									Detail
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{loans.map((l) => (
								<tr key={l.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 text-sm font-medium text-gray-900">
										{l.nama}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
										{formatDate(l.tgl_pinjam)}
									</td>
									<td className="px-4 py-3 text-sm text-gray-900 text-right">
										{formatCurrency(l.jumlah)}
									</td>
									<td className="px-4 py-3 text-sm text-emerald-600 text-right">
										{formatCurrency(l.angsuran_terbayar)}
									</td>
									<td className="px-4 py-3 text-sm text-right font-medium">
										<span
											className={
												l.is_lunas ? "text-gray-400" : "text-amber-600"
											}
										>
											{formatCurrency(l.sisa)}
										</span>
									</td>
									<td className="px-4 py-3">
										<Badge variant={l.is_lunas ? "success" : "warning"}>
											{l.is_lunas ? "Lunas" : "Belum Lunas"}
										</Badge>
									</td>
									<td className="px-4 py-3 text-right">
										<Link
											to="/sdm/pinjaman/$id"
											params={{ id: String(l.id) }}
											className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
										>
											Lihat <ChevronRight className="h-4 w-4" />
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<PinjamanForm
				isOpen={formOpen}
				onClose={() => setFormOpen(false)}
				initialEmployeeId={search.employee_id}
				onSaved={() => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Pinjaman dicatat.",
					});
					setFormOpen(false);
				}}
			/>
		</div>
	);
}

function PinjamanForm({
	isOpen,
	onClose,
	initialEmployeeId,
	onSaved,
}: {
	isOpen: boolean;
	onClose: () => void;
	initialEmployeeId?: number;
	onSaved: () => void;
}) {
	const { addToast } = useToast();
	const { data: employees = [] } = useEmployees("", true);
	const create = useCreatePinjaman();
	const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? 0);
	const [jumlah, setJumlah] = useState(0);
	const [dirty, setDirty] = useState(false);

	// Reset saat dibuka.
	useEffect(() => {
		if (isOpen && !dirty) {
			setEmployeeId(initialEmployeeId ?? 0);
			setJumlah(0);
			setDirty(true);
		}
	}, [isOpen, initialEmployeeId, dirty]);

	const submit = () => {
		if (employeeId <= 0 || jumlah <= 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih karyawan dan isi jumlah (> 0).",
			});
			return;
		}
		create.mutate(
			{ employee_id: employeeId, jumlah },
			{
				onSuccess: () => {
					setDirty(false);
					onSaved();
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
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Catat Pinjaman"
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Batal
					</Button>
					<Button variant="primary" onClick={submit}>
						Simpan
					</Button>
				</>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
				className="space-y-6"
			>
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
						Karyawan
					</label>
					<select
						value={employeeId}
						onChange={(e) => setEmployeeId(Number(e.target.value))}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
						required
					>
						<option value={0}>Pilih karyawan…</option>
						{employees.map((e) => (
							<option key={e.id} value={e.id}>
								{e.nama}
							</option>
						))}
					</select>
				</div>
				<CurrencyFormField
					id="pinjam-jumlah"
					label="Jumlah Pinjaman"
					placeholder="0"
					value={jumlah}
					onChange={setJumlah}
					required
				/>
				<p className="text-xs text-gray-500">
					Pinjaman bersifat akumulatif per karyawan dan otomatis ditambahkan ke
					saldo pinjaman yang belum lunas.
				</p>
			</form>
		</SlideOver>
	);
}
