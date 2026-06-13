import { ApiError } from "@alizzah/api-client/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "@alizzah/ui";
import { useEffect, useState } from "react";
import {
	type Member,
	type MemberInput,
	type MemberType,
	useCreateMember,
	useUpdateMember,
} from "./api";

interface AnggotaFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Member | null;
}

const EMPTY: MemberInput = {
	full_name: "",
	member_type: "pegawai",
	phone: "",
	address: "",
	is_active: true,
};

export function AnggotaForm({
	isOpen,
	onClose,
	initialData,
}: AnggotaFormProps) {
	const { addToast } = useToast();
	const isEditing = !!initialData;
	const [form, setForm] = useState<MemberInput>(EMPTY);

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setForm({
				full_name: initialData.full_name,
				member_type: initialData.member_type,
				phone: initialData.phone ?? "",
				address: initialData.address ?? "",
				is_active: initialData.is_active,
			});
		} else {
			setForm(EMPTY);
		}
	}, [isOpen, initialData]);

	const createM = useCreateMember();
	const updateM = useUpdateMember();
	const isPending = createM.isPending || updateM.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const cbs = {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Anggota berhasil ${isEditing ? "diperbarui" : "ditambahkan"}.`,
				});
				onClose();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		};
		if (isEditing && initialData) {
			updateM.mutate({ id: initialData.id, data: form }, cbs);
		} else {
			createM.mutate(form, cbs);
		}
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? "Edit Anggota" : "Tambah Anggota"}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={isPending}>
						Batal
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={isPending}>
						{isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="full_name"
					name="full_name"
					label="Nama Lengkap"
					placeholder="e.g. Budi Santoso"
					value={form.full_name}
					onChange={(e) => setForm({ ...form, full_name: e.target.value })}
					required
				/>

				<div>
					<label
						htmlFor="member_type"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Tipe Anggota
					</label>
					<select
						id="member_type"
						name="member_type"
						value={form.member_type}
						onChange={(e) =>
							setForm({ ...form, member_type: e.target.value as MemberType })
						}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						required
					>
						<option value="pegawai">Pegawai (guru/OB)</option>
						<option value="pengurus_yayasan">Pengurus Yayasan</option>
						<option value="pihak_luar">Pihak Luar</option>
					</select>
				</div>

				<FormField
					id="phone"
					name="phone"
					label="No. Telepon"
					placeholder="08xxxxxxxxxx"
					value={form.phone ?? ""}
					onChange={(e) => setForm({ ...form, phone: e.target.value })}
				/>

				<div>
					<label
						htmlFor="address"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Alamat
					</label>
					<textarea
						id="address"
						name="address"
						rows={3}
						value={form.address ?? ""}
						onChange={(e) => setForm({ ...form, address: e.target.value })}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>

				<label className="flex items-center gap-2 text-sm text-gray-900">
					<input
						type="checkbox"
						checked={form.is_active ?? true}
						onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
						className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
					/>
					Anggota aktif
				</label>
			</form>
		</SlideOver>
	);
}
