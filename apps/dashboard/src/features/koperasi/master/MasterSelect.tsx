import { useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, Label, useToast } from "#/components/ui";
import { type MasterKind, useCreateMaster, useMasterList } from "./api";

const ADD = "__add__";
const SELECT_CLASS =
	"block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm";

interface MasterSelectProps {
	id: string;
	label: string;
	kind: MasterKind;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

/**
 * Dropdown nilai master koperasi (kategori/satuan) dengan opsi "tambah baru" inline
 * (feedback-01 B2 — bukan input teks bebas). Nilai yang tersimpan tapi belum ada di
 * master (mis. data lama) tetap ditampilkan agar tidak hilang saat edit.
 */
export function MasterSelect({
	id,
	label,
	kind,
	value,
	onChange,
	placeholder,
}: MasterSelectProps) {
	const { data: items = [] } = useMasterList(kind);
	const createM = useCreateMaster(kind);
	const { addToast } = useToast();
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState("");

	const valueListed = !value || items.some((it) => it.name === value);

	const handleAdd = () => {
		const name = newName.trim();
		if (!name) return;
		createM.mutate(name, {
			onSuccess: (created) => {
				onChange(created.name);
				setNewName("");
				setAdding(false);
			},
			onError: (err) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		});
	};

	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			{adding ? (
				<div className="mt-2 flex gap-2">
					<input
						// biome-ignore lint/a11y/noAutofocus: fokus diharapkan saat membuka mode tambah
						autoFocus
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleAdd();
							}
						}}
						placeholder={placeholder ?? "Nama baru"}
						className={SELECT_CLASS}
					/>
					<Button
						type="button"
						variant="primary"
						onClick={handleAdd}
						disabled={createM.isPending}
					>
						{createM.isPending ? "..." : "Tambah"}
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={() => {
							setAdding(false);
							setNewName("");
						}}
					>
						Batal
					</Button>
				</div>
			) : (
				<select
					id={id}
					className={`mt-2 ${SELECT_CLASS}`}
					value={value}
					onChange={(e) => {
						if (e.target.value === ADD) {
							setAdding(true);
							return;
						}
						onChange(e.target.value);
					}}
				>
					<option value="">{placeholder ?? "— pilih —"}</option>
					{!valueListed && (
						<option value={value}>{value} (tidak terdaftar)</option>
					)}
					{items.map((it) => (
						<option key={it.id} value={it.name}>
							{it.name}
						</option>
					))}
					<option value={ADD}>+ Tambah baru…</option>
				</select>
			)}
		</div>
	);
}
