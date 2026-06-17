import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Button,
	SlideOver,
	EmptyState,
	useToast,
} from "#/components/ui";
import { useAvailableEmployees, useBulkCreateMembers, type MemberInput } from "./api";

interface BulkRegisterDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function BulkRegisterDialog({ isOpen, onClose }: BulkRegisterDialogProps) {
	const { addToast } = useToast();
	const [search, setSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	const { data: employees = [], isLoading } = useAvailableEmployees(search);
	const bulkCreate = useBulkCreateMembers();

	const filtered = useMemo(() => employees, [employees]);

	const toggleSelection = (id: number) => {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedIds(newSet);
	};

	const toggleAll = () => {
		if (selectedIds.size === filtered.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(filtered.map((e) => e.id)));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedIds.size === 0) return;

		const membersToCreate: MemberInput[] = Array.from(selectedIds).map((id) => {
			const emp = employees.find((e) => e.id === id);
			return {
				full_name: emp?.full_name || "",
				member_type: "pegawai",
				is_active: true,
				employee_id: id,
			};
		});

		bulkCreate.mutate(
			{ members: membersToCreate },
			{
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: `${membersToCreate.length} anggota berhasil didaftarkan.`,
					});
					handleClose();
				},
				onError: (err: Error) => {
					addToast({
						variant: "error",
						title: "Gagal mendaftar",
						message: err.message,
					});
				},
			},
		);
	};

	const handleClose = () => {
		setSearch("");
		setSelectedIds(new Set());
		onClose();
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={handleClose}
			title="Bulk Register Pegawai"
			size="xl"
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<p className="text-sm text-gray-500">
					Pilih pegawai yang belum terdaftar untuk ditambahkan sebagai anggota koperasi (tipe Pegawai).
				</p>

				<div className="relative max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Cari nama pegawai..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
					/>
				</div>

				<div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 flex flex-col">
					{isLoading ? (
						<div className="p-8 text-center text-sm text-gray-500">
							Memuat data pegawai...
						</div>
					) : filtered.length === 0 ? (
						<div className="p-4">
							<EmptyState
								icon={<Users className="h-10 w-10 text-gray-400" />}
								title="Tidak ada pegawai"
								description="Semua pegawai sudah menjadi anggota atau tidak ada hasil pencarian."
							/>
						</div>
					) : (
						<div className="overflow-y-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50 sticky top-0 z-10">
									<tr>
										<th className="px-4 py-3 text-left w-12">
											<input
												type="checkbox"
												checked={
													filtered.length > 0 &&
													selectedIds.size === filtered.length
												}
												onChange={toggleAll}
												className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Nama Pegawai
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											ID Legacy
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
											Tgl Masuk
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 bg-white">
									{filtered.map((emp) => (
										<tr
											key={emp.id}
											className="hover:bg-gray-50 cursor-pointer"
											onClick={() => toggleSelection(emp.id)}
										>
											<td className="px-4 py-3">
												<input
													type="checkbox"
													checked={selectedIds.has(emp.id)}
													onChange={() => toggleSelection(emp.id)}
													onClick={(e) => e.stopPropagation()}
													className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
												/>
											</td>
											<td className="px-4 py-3 text-sm font-medium text-gray-900">
												{emp.full_name}
											</td>
											<td className="px-4 py-3 text-sm text-gray-500">
												{emp.legacy_id}
											</td>
											<td className="px-4 py-3 text-sm text-gray-500">
												{emp.join_date || "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between">
					<p className="text-sm text-gray-600">
						{selectedIds.size} pegawai terpilih
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="secondary" type="button" onClick={handleClose}>
							Batal
						</Button>
						<Button
							variant="primary"
							type="submit"
							disabled={selectedIds.size === 0 || bulkCreate.isPending}
						>
							{bulkCreate.isPending ? "Mendaftarkan..." : "Daftarkan"}
						</Button>
					</div>
				</div>
			</form>
		</SlideOver>
	);
}
