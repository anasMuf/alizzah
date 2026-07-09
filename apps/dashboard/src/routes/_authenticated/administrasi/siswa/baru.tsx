import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	getGetV1StudentsQueryKey,
	usePostV1Students,
} from "#/api/endpoints/students/students";
import type {
	DtoCreateGuardianInline,
	DtoCreateStudentRequest,
} from "#/api/model";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, useToast } from "#/components/ui";

export const Route = createFileRoute("/_authenticated/administrasi/siswa/baru")(
	{
		component: SiswaBaruPage,
	},
);

function SiswaBaruPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [studentData, setStudentData] = useState({
		full_name: "",
		birth_place: "",
		birth_date: "",
		gender: "L",
		religion: "Islam",
		is_daycare_only: false,
	});

	const [guardians, setGuardians] = useState<DtoCreateGuardianInline[]>([
		{
			full_name: "",
			relationship: "ayah",
			phone: "",
			address: "",
			is_primary: true,
		},
	]);

	const createMutation = usePostV1Students({
		mutation: {
			onSuccess: (res) => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil ditambahkan.",
				});
				queryClient.invalidateQueries({ queryKey: getGetV1StudentsQueryKey() });
				navigate({
					to: "/administrasi/siswa/$id/profil",
					params: { id: (res as any).data.data.id.toString() },
				});
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleStudentChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value, type } = e.target as HTMLInputElement;
		const checked = (e.target as HTMLInputElement).checked;

		setStudentData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleGuardianChange = (
		index: number,
		field: string,
		value: string | boolean,
	) => {
		setGuardians((prev) => {
			const newGuardians = [...prev];
			newGuardians[index] = { ...newGuardians[index], [field]: value };

			// If setting is_primary, unset others
			if (field === "is_primary" && value === true) {
				return newGuardians.map((g, i) => ({ ...g, is_primary: i === index }));
			}
			return newGuardians;
		});
	};

	const addGuardian = () => {
		setGuardians((prev) => [
			...prev,
			{
				full_name: "",
				relationship: "ibu",
				phone: "",
				address: "",
				is_primary: prev.length === 0,
			},
		]);
	};

	const removeGuardian = (index: number) => {
		setGuardians((prev) => {
			const newGuardians = [...prev];
			const removed = newGuardians.splice(index, 1)[0];

			// If we removed the primary, make the first one primary if exists
			if (removed.is_primary && newGuardians.length > 0) {
				newGuardians[0].is_primary = true;
			}
			return newGuardians;
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const payload: DtoCreateStudentRequest = {
			...studentData,
			gender: studentData.gender as any,
			// API expects custom datetime, append time to date
			birth_date: `${studentData.birth_date}T00:00:00Z`,
			guardians: guardians.filter((g) => g.full_name.trim() !== ""),
		};

		createMutation.mutate({ data: payload });
	};

	return (
		<div className="space-y-6 max-w-5xl mx-auto pb-12">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/siswa"
							className="text-gray-400 hover:text-gray-500"
						>
							Administrasi
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<Link
								to="/administrasi/siswa"
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Siswa
							</Link>
						</div>
					</li>
					<li>
						<div className="flex items-center">
							<ChevronRight
								className="h-5 w-5 flex-shrink-0 text-gray-400"
								aria-hidden="true"
							/>
							<span
								className="ml-2 text-sm font-medium text-gray-900"
								aria-current="page"
							>
								Buat Baru
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Tambah Siswa Baru
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Masukkan data siswa dan wali murid. Anda bisa menambahkan lebih dari
					satu wali murid.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* DATA SISWA */}
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
					<div className="px-4 py-6 sm:p-8">
						<h3 className="text-base font-semibold leading-7 text-gray-900 mb-6 border-b pb-2">
							DATA SISWA
						</h3>

						<div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
							<div className="sm:col-span-4">
								<FormField
									id="full_name"
									name="full_name"
									label="Nama Lengkap"
									value={studentData.full_name}
									onChange={handleStudentChange}
									required
								/>
							</div>

							<div className="sm:col-span-3">
								<FormField
									id="birth_place"
									name="birth_place"
									label="Tempat Lahir"
									value={studentData.birth_place}
									onChange={handleStudentChange}
									required
								/>
							</div>

							<div className="sm:col-span-3">
								<FormField
									id="birth_date"
									name="birth_date"
									type="date"
									label="Tanggal Lahir"
									value={studentData.birth_date}
									onChange={handleStudentChange}
									required
								/>
							</div>

							<div className="sm:col-span-3">
								<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
									Jenis Kelamin
								</label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="gender"
											value="L"
											checked={studentData.gender === "L"}
											onChange={handleStudentChange}
											className="h-4 w-4 text-indigo-600"
										/>
										<span>Laki-laki</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="gender"
											value="P"
											checked={studentData.gender === "P"}
											onChange={handleStudentChange}
											className="h-4 w-4 text-indigo-600"
										/>
										<span>Perempuan</span>
									</label>
								</div>
							</div>

							<div className="sm:col-span-3">
								<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
									Agama
								</label>
								<select
									name="religion"
									value={studentData.religion}
									onChange={handleStudentChange}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								>
									<option value="Islam">Islam</option>
									<option value="Kristen">Kristen</option>
									<option value="Katolik">Katolik</option>
									<option value="Hindu">Hindu</option>
									<option value="Buddha">Buddha</option>
									<option value="Konghucu">Konghucu</option>
								</select>
							</div>

							<div className="sm:col-span-6 mt-4">
								<label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
									<div className="flex h-6 items-center">
										<input
											type="checkbox"
											name="is_daycare_only"
											checked={studentData.is_daycare_only}
											onChange={handleStudentChange}
											className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
										/>
									</div>
									<div>
										<span className="font-medium text-gray-900 block">
											Siswa Daycare Saja (Luar Sekolah)
										</span>
										<span className="text-sm text-gray-500">
											Centang jika siswa ini bukan siswa reguler dan hanya
											dititipkan untuk layanan daycare.
										</span>
									</div>
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* DATA WALI MURID */}
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
					<div className="px-4 py-6 sm:p-8">
						<div className="flex justify-between items-center mb-6 border-b pb-2">
							<h3 className="text-base font-semibold leading-7 text-gray-900">
								DATA WALI MURID
							</h3>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={addGuardian}
								className="flex items-center gap-2"
							>
								<Plus className="h-4 w-4" /> Tambah Wali
							</Button>
						</div>

						<div className="space-y-8">
							{guardians.map((guardian, index) => (
								<div
									key={index}
									className="relative bg-gray-50 p-6 rounded-lg border border-gray-200"
								>
									<div className="absolute top-4 right-4 flex items-center gap-4">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												name="primary_guardian"
												checked={guardian.is_primary}
												onChange={() =>
													handleGuardianChange(index, "is_primary", true)
												}
												className="h-4 w-4 text-indigo-600 focus:ring-indigo-600"
											/>
											<span className="text-sm font-medium text-indigo-900">
												Kontak Utama
											</span>
										</label>
										{guardians.length > 1 && (
											<button
												type="button"
												onClick={() => removeGuardian(index)}
												className="text-gray-400 hover:text-red-600"
											>
												<Trash2 className="h-5 w-5" />
											</button>
										)}
									</div>

									<h4 className="text-sm font-semibold text-gray-900 mb-4">
										Wali {index + 1}
									</h4>

									<div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
										<div className="sm:col-span-3">
											<FormField
												id={`g_name_${index}`}
												label="Nama Wali"
												value={guardian.full_name}
												onChange={(e) =>
													handleGuardianChange(
														index,
														"full_name",
														e.target.value,
													)
												}
												required={index === 0}
											/>
										</div>

										<div className="sm:col-span-3">
											<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
												Hubungan
											</label>
											<select
												value={guardian.relationship}
												onChange={(e) =>
													handleGuardianChange(
														index,
														"relationship",
														e.target.value,
													)
												}
												className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
											>
												<option value="ayah">Ayah</option>
												<option value="ibu">Ibu</option>
												<option value="wali">Wali Lainnya</option>
											</select>
										</div>

										<div className="sm:col-span-3">
											<FormField
												id={`g_phone_${index}`}
												label="No. Telepon/WhatsApp"
												value={guardian.phone}
												onChange={(e) =>
													handleGuardianChange(index, "phone", e.target.value)
												}
												required={index === 0}
											/>
										</div>

										<div className="sm:col-span-6">
											<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
												Alamat (Opsional)
											</label>
											<textarea
												rows={2}
												value={guardian.address}
												onChange={(e) =>
													handleGuardianChange(index, "address", e.target.value)
												}
												className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="flex items-center justify-end gap-x-6 pb-8">
					<Link to="/administrasi/siswa">
						<Button type="button" variant="ghost">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={createMutation.isPending}
					>
						{createMutation.isPending ? "Menyimpan..." : "Simpan Siswa"}
					</Button>
				</div>
			</form>
		</div>
	);
}
