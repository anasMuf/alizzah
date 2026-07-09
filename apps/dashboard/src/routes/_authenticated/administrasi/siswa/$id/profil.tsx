import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePostV1Guardians } from "#/api/endpoints/guardians/guardians";
import {
	getGetV1StudentsIdGuardiansQueryKey,
	getGetV1StudentsIdQueryKey,
	useDeleteV1StudentsIdGuardiansGuardianId,
	useGetV1StudentsId,
	useGetV1StudentsIdGuardians,
	usePatchV1StudentsIdGuardiansGuardianIdPrimary,
	usePostV1StudentsIdGuardians,
	usePutV1StudentsId,
} from "#/api/endpoints/students/students";
import { ApiError } from "#/api/mutator/custom-instance";
import {
	Button,
	ConfirmDialog,
	Input,
	Label,
	SlideOver,
	useToast,
} from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/profil",
)({
	component: ProfilSiswaPage,
});

function ProfilSiswaPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [isDeleteGuardianOpen, setIsDeleteGuardianOpen] = useState(false);
	const [guardianToDelete, setGuardianToDelete] = useState<any>(null);

	// Edit student form state
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editForm, setEditForm] = useState({
		full_name: "",
		birth_place: "",
		birth_date: "",
		gender: "L" as "L" | "P",
		religion: "",
		is_daycare_only: false,
	});
	const [editErrors, setEditErrors] = useState<Record<string, string>>({});

	// Add guardian form state
	const [isAddGuardianOpen, setIsAddGuardianOpen] = useState(false);
	const [guardianForm, setGuardianForm] = useState({
		full_name: "",
		phone: "",
		relationship: "wali" as "ayah" | "ibu" | "wali",
		address: "",
		is_primary: false,
	});
	const [guardianErrors, setGuardianErrors] = useState<Record<string, string>>(
		{},
	);

	const { data: response, isLoading } = useGetV1StudentsId(studentId);
	const student = (response?.data as any)?.data;

	const { data: guardiansResponse, isLoading: isLoadingGuardians } =
		useGetV1StudentsIdGuardians(studentId);
	const guardians = (guardiansResponse?.data as any)?.data || [];

	// --- Edit Student --- //
	const openEditForm = () => {
		if (!student) return;
		setEditForm({
			full_name: student.full_name || "",
			birth_place: student.birth_place || "",
			birth_date: student.birth_date || "",
			gender: student.gender || "L",
			religion: student.religion || "",
			is_daycare_only: student.is_daycare_only || false,
		});
		setEditErrors({});
		setIsEditOpen(true);
	};

	const updateMutation = usePutV1StudentsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Data siswa berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdQueryKey(studentId),
				});
				setIsEditOpen(false);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui data siswa.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleEditSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const errors: Record<string, string> = {};
		if (!editForm.full_name || editForm.full_name.length < 3)
			errors.full_name = "Nama minimal 3 karakter";
		if (!editForm.birth_place) errors.birth_place = "Tempat lahir wajib diisi";
		if (!editForm.birth_date) errors.birth_date = "Tanggal lahir wajib diisi";
		if (Object.keys(errors).length > 0) {
			setEditErrors(errors);
			return;
		}
		updateMutation.mutate({
			id: studentId,
			data: {
				full_name: editForm.full_name,
				birth_place: editForm.birth_place,
				birth_date: editForm.birth_date,
				gender: editForm.gender,
				religion: editForm.religion || undefined,
				is_daycare_only: editForm.is_daycare_only,
			},
		});
	};

	// --- Add Guardian --- //
	const createGuardianMutation = usePostV1Guardians();
	const linkGuardianMutation = usePostV1StudentsIdGuardians();

	const openAddGuardianForm = () => {
		setGuardianForm({
			full_name: "",
			phone: "",
			relationship: "wali",
			address: "",
			is_primary: guardians.length === 0,
		});
		setGuardianErrors({});
		setIsAddGuardianOpen(true);
	};

	const handleAddGuardianSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const errors: Record<string, string> = {};
		if (!guardianForm.full_name || guardianForm.full_name.length < 3)
			errors.full_name = "Nama minimal 3 karakter";
		if (!guardianForm.phone) errors.phone = "No. telepon wajib diisi";

		if (Object.keys(errors).length > 0) {
			setGuardianErrors(errors);
			return;
		}

		try {
			// Step 1: Create guardian
			const created = await createGuardianMutation.mutateAsync({
				data: {
					full_name: guardianForm.full_name,
					phone: guardianForm.phone,
					relationship: guardianForm.relationship,
					address: guardianForm.address || undefined,
				},
			});

			// Extract guardian ID from response
			const guardianId = (created?.data as any)?.data?.id;
			if (!guardianId) throw new Error("Gagal mendapatkan ID wali");

			// Step 2: Link to student
			await linkGuardianMutation.mutateAsync({
				id: studentId,
				data: {
					guardian_id: guardianId,
					is_primary: guardianForm.is_primary,
				},
			});

			addToast({
				variant: "success",
				title: "Berhasil",
				message: "Wali murid berhasil ditambahkan.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1StudentsIdGuardiansQueryKey(studentId),
			});
			setIsAddGuardianOpen(false);
		} catch (error: any) {
			const msg =
				error instanceof ApiError
					? error.message
					: error?.message || "Gagal menambahkan wali murid.";
			addToast({ variant: "error", title: "Gagal", message: msg });
		}
	};

	// --- Set Primary / Delete Guardian --- //
	const setPrimaryMutation = usePatchV1StudentsIdGuardiansGuardianIdPrimary({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Kontak utama berhasil diubah.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdGuardiansQueryKey(studentId),
				});
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal mengubah kontak utama.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const deleteGuardianMutation = useDeleteV1StudentsIdGuardiansGuardianId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Wali murid berhasil dihapus dari daftar.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdGuardiansQueryKey(studentId),
				});
				setIsDeleteGuardianOpen(false);
				setGuardianToDelete(null);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal menghapus wali murid.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsDeleteGuardianOpen(false);
			},
		},
	});

	if (isLoading || isLoadingGuardians) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>
		);
	}

	if (!student) {
		return (
			<div className="p-8 text-center bg-white rounded-xl shadow-sm">
				<p className="text-gray-500">
					Siswa tidak ditemukan atau gagal dimuat.
				</p>
			</div>
		);
	}

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	const calculateAge = (dateStr: string) => {
		const birthDate = new Date(dateStr);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const m = today.getMonth() - birthDate.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	};

	return (
		<div className="space-y-6">
			{/* === Informasi Pribadi === */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
					<h3 className="text-base font-semibold leading-6 text-gray-900">
						Informasi Pribadi
					</h3>
					<Button variant="secondary" size="sm" onClick={openEditForm}>
						Edit Data
					</Button>
				</div>
				<div className="px-4 py-5 sm:p-6">
					<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8">
						<div className="sm:col-span-1">
							<dt className="text-sm font-medium text-gray-500">
								Tempat, Tanggal Lahir
							</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{student.birth_place}, {formatDate(student.birth_date)} (
								{calculateAge(student.birth_date)} tahun)
							</dd>
						</div>
						<div className="sm:col-span-1">
							<dt className="text-sm font-medium text-gray-500">Agama</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{student.religion || "-"}
							</dd>
						</div>
						<div className="sm:col-span-1">
							<dt className="text-sm font-medium text-gray-500">
								Jenis Kelamin
							</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{student.gender === "L" ? "Laki-laki" : "Perempuan"}
							</dd>
						</div>
						<div className="sm:col-span-1">
							<dt className="text-sm font-medium text-gray-500">
								Tanggal Terdaftar
							</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{formatDate(student.created_at)}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{/* === SlideOver: Edit Data Siswa === */}
			<SlideOver
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				title="Edit Data Siswa"
				footer={
					<>
						<Button variant="secondary" onClick={() => setIsEditOpen(false)}>
							Batal
						</Button>
						<Button
							variant="primary"
							onClick={handleEditSubmit}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "Menyimpan..." : "Simpan"}
						</Button>
					</>
				}
			>
				<form onSubmit={handleEditSubmit} className="space-y-4">
					<div>
						<Label htmlFor="edit-full-name">Nama Lengkap</Label>
						<Input
							id="edit-full-name"
							value={editForm.full_name}
							onChange={(e) =>
								setEditForm({ ...editForm, full_name: e.target.value })
							}
							className={editErrors.full_name ? "ring-1 ring-red-500" : ""}
						/>
						{editErrors.full_name && (
							<p className="mt-1 text-sm text-red-600">
								{editErrors.full_name}
							</p>
						)}
					</div>
					<div>
						<Label htmlFor="edit-birth-place">Tempat Lahir</Label>
						<Input
							id="edit-birth-place"
							value={editForm.birth_place}
							onChange={(e) =>
								setEditForm({ ...editForm, birth_place: e.target.value })
							}
							className={editErrors.birth_place ? "ring-1 ring-red-500" : ""}
						/>
						{editErrors.birth_place && (
							<p className="mt-1 text-sm text-red-600">
								{editErrors.birth_place}
							</p>
						)}
					</div>
					<div>
						<Label htmlFor="edit-birth-date">Tanggal Lahir</Label>
						<Input
							id="edit-birth-date"
							type="date"
							value={
								editForm.birth_date ? editForm.birth_date.slice(0, 10) : ""
							}
							onChange={(e) =>
								setEditForm({ ...editForm, birth_date: e.target.value })
							}
							className={editErrors.birth_date ? "ring-1 ring-red-500" : ""}
						/>
						{editErrors.birth_date && (
							<p className="mt-1 text-sm text-red-600">
								{editErrors.birth_date}
							</p>
						)}
					</div>
					<div>
						<Label htmlFor="edit-gender">Jenis Kelamin</Label>
						<select
							id="edit-gender"
							value={editForm.gender}
							onChange={(e) =>
								setEditForm({
									...editForm,
									gender: e.target.value as "L" | "P",
								})
							}
							className="mt-2 block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
						>
							<option value="L">Laki-laki</option>
							<option value="P">Perempuan</option>
						</select>
					</div>
					<div>
						<Label htmlFor="edit-religion">Agama</Label>
						<Input
							id="edit-religion"
							value={editForm.religion}
							onChange={(e) =>
								setEditForm({ ...editForm, religion: e.target.value })
							}
							placeholder="Contoh: Islam"
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="edit-daycare"
							checked={editForm.is_daycare_only}
							onChange={(e) =>
								setEditForm({
									...editForm,
									is_daycare_only: e.target.checked,
								})
							}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
						/>
						<Label htmlFor="edit-daycare">Daycare Only</Label>
					</div>
				</form>
			</SlideOver>

			{/* === Data Wali Murid === */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5">
				<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
					<h3 className="text-base font-semibold leading-6 text-gray-900">
						Data Wali Murid
					</h3>
					<Button variant="secondary" size="sm" onClick={openAddGuardianForm}>
						Tambah Wali
					</Button>
				</div>
				<div className="px-4 py-5 sm:p-6">
					{guardians.length === 0 ? (
						<p className="text-sm text-gray-500 italic text-center py-4">
							Belum ada data wali murid.
						</p>
					) : (
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{guardians.map((g: any) => (
								<div
									key={g.id}
									className={`rounded-lg border p-5 ${g.is_primary ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white"}`}
								>
									<div className="flex justify-between items-start mb-4">
										<div>
											<h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
												{g.full_name || "(tanpa nama)"}
												{g.is_primary && (
													<Star className="h-4 w-4 text-amber-400 fill-amber-400" />
												)}
											</h4>
											<p className="text-xs text-gray-500 capitalize">
												{g.relationship || "-"}
											</p>
										</div>
										<div className="flex gap-2">
											{!g.is_primary && (
												<button
													onClick={() =>
														setPrimaryMutation.mutate({
															id: studentId,
															guardianId: g.id,
														})
													}
													className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
													title="Jadikan Utama"
												>
													Utama
												</button>
											)}
											{guardians.length > 1 && (
												<button
													onClick={() => {
														setGuardianToDelete(g);
														setIsDeleteGuardianOpen(true);
													}}
													className="text-gray-400 hover:text-red-600"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											)}
										</div>
									</div>
									<div className="space-y-3 mt-4 text-sm text-gray-600">
										<div className="flex items-center gap-3">
											<Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
											<span>{g.phone || "-"}</span>
										</div>
										<div className="flex items-start gap-3">
											<MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
											<span className="line-clamp-2">{g.address || "-"}</span>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* === SlideOver: Tambah Wali === */}
			<SlideOver
				isOpen={isAddGuardianOpen}
				onClose={() => setIsAddGuardianOpen(false)}
				title="Tambah Wali Murid"
				footer={
					<>
						<Button
							variant="secondary"
							onClick={() => setIsAddGuardianOpen(false)}
						>
							Batal
						</Button>
						<Button
							variant="primary"
							onClick={handleAddGuardianSubmit}
							disabled={
								createGuardianMutation.isPending ||
								linkGuardianMutation.isPending
							}
						>
							{createGuardianMutation.isPending ||
							linkGuardianMutation.isPending
								? "Menyimpan..."
								: "Simpan"}
						</Button>
					</>
				}
			>
				<form onSubmit={handleAddGuardianSubmit} className="space-y-4">
					<div>
						<Label htmlFor="guardian-full-name">Nama Lengkap</Label>
						<Input
							id="guardian-full-name"
							value={guardianForm.full_name}
							onChange={(e) =>
								setGuardianForm({
									...guardianForm,
									full_name: e.target.value,
								})
							}
							className={guardianErrors.full_name ? "ring-1 ring-red-500" : ""}
						/>
						{guardianErrors.full_name && (
							<p className="mt-1 text-sm text-red-600">
								{guardianErrors.full_name}
							</p>
						)}
					</div>
					<div>
						<Label htmlFor="guardian-phone">No. Telepon</Label>
						<Input
							id="guardian-phone"
							type="tel"
							value={guardianForm.phone}
							onChange={(e) =>
								setGuardianForm({ ...guardianForm, phone: e.target.value })
							}
							className={guardianErrors.phone ? "ring-1 ring-red-500" : ""}
						/>
						{guardianErrors.phone && (
							<p className="mt-1 text-sm text-red-600">
								{guardianErrors.phone}
							</p>
						)}
					</div>
					<div>
						<Label htmlFor="guardian-relation">Hubungan</Label>
						<select
							id="guardian-relation"
							value={guardianForm.relationship}
							onChange={(e) =>
								setGuardianForm({
									...guardianForm,
									relationship: e.target.value as "ayah" | "ibu" | "wali",
								})
							}
							className="mt-2 block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
						>
							<option value="ayah">Ayah</option>
							<option value="ibu">Ibu</option>
							<option value="wali">Wali</option>
						</select>
					</div>
					<div>
						<Label htmlFor="guardian-address">Alamat</Label>
						<Input
							id="guardian-address"
							value={guardianForm.address}
							onChange={(e) =>
								setGuardianForm({ ...guardianForm, address: e.target.value })
							}
							placeholder="Opsional"
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="guardian-primary"
							checked={guardianForm.is_primary}
							onChange={(e) =>
								setGuardianForm({
									...guardianForm,
									is_primary: e.target.checked,
								})
							}
							className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
						/>
						<Label htmlFor="guardian-primary">Jadikan kontak utama</Label>
					</div>
				</form>
			</SlideOver>

			{/* === ConfirmDialog: Hapus Wali === */}
			<ConfirmDialog
				open={isDeleteGuardianOpen}
				onCancel={() => setIsDeleteGuardianOpen(false)}
				onConfirm={() => {
					if (guardianToDelete) {
						deleteGuardianMutation.mutate({
							id: Number(id),
							guardianId: guardianToDelete.id,
						});
					}
				}}
				title="Hapus Wali Murid"
				variant="danger"
			>
				<p>
					Anda yakin ingin menghapus data wali murid{" "}
					<strong>{guardianToDelete?.full_name}</strong>?
				</p>
			</ConfirmDialog>
		</div>
	);
}
