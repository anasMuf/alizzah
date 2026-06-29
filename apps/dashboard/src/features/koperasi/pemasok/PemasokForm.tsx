import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import {
	type Supplier,
	type SupplierInput,
	useCreateSupplier,
	useUpdateSupplier,
} from "./api";

interface PemasokFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Supplier | null;
}

const EMPTY: SupplierInput = {
	name: "",
	contact_person: "",
	phone: "",
	address: "",
};

export function PemasokForm({
	isOpen,
	onClose,
	initialData,
}: PemasokFormProps) {
	const { addToast } = useToast();
	const isEditing = !!initialData;
	const [form, setForm] = useState<SupplierInput>(EMPTY);

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setForm({
				name: initialData.name,
				contact_person: initialData.contact_person ?? "",
				phone: initialData.phone ?? "",
				address: initialData.address ?? "",
			});
		} else {
			setForm(EMPTY);
		}
	}, [isOpen, initialData]);

	const createS = useCreateSupplier();
	const updateS = useUpdateSupplier();
	const isPending = createS.isPending || updateS.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const cbs = {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Pemasok berhasil ${isEditing ? "diperbarui" : "ditambahkan"}.`,
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
			updateS.mutate({ id: initialData.id, data: form }, cbs);
		} else {
			createS.mutate(form, cbs);
		}
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? "Edit Pemasok" : "Tambah Pemasok"}
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
					id="name"
					name="name"
					label="Nama Pemasok"
					placeholder="e.g. CV Sumber Rejeki"
					value={form.name}
					onChange={(e) => setForm({ ...form, name: e.target.value })}
					required
				/>

				<FormField
					id="contact_person"
					name="contact_person"
					label="Narahubung"
					placeholder="e.g. Pak Andi"
					value={form.contact_person ?? ""}
					onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
				/>

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
			</form>
		</SlideOver>
	);
}
