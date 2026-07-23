import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getGetV1ExtracurricularsQueryKey } from "#/api/endpoints/extracurriculars/extracurriculars";
import type { DtoExtracurricularResponse } from "#/api/model";
import { customInstance } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";

const LEVELS = [
	{ value: "mutiara", label: "Mutiara (KB)" },
	{ value: "intan", label: "Intan (TK A)" },
	{ value: "berlian", label: "Berlian (TK B)" },
];

interface EkskulFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: DtoExtracurricularResponse | null;
}

export function EkskulForm({ isOpen, onClose, initialData }: EkskulFormProps) {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const isEditing = !!initialData;
	const [name, setName] = useState("");
	const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				setName(initialData.name || "");
				const levels = (initialData as any).levels || "";
				setSelectedLevels(levels ? levels.split(",") : []);
			} else {
				setName("");
				setSelectedLevels([]);
			}
		}
	}, [isOpen, initialData]);

	const toggleLevel = (level: string) => {
		setSelectedLevels((prev) =>
			prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);

		const levelsStr = selectedLevels.sort().join(",");

		try {
			const method = isEditing ? "PUT" : "POST";
			const url = isEditing
				? `/v1/extracurriculars/${initialData!.id}`
				: "/v1/extracurriculars";

			await customInstance(url, {
				method,
				body: JSON.stringify({ name, type: "pasta", levels: levelsStr }),
			});

			addToast({
				variant: "success",
				title: "Berhasil",
				message: isEditing
					? "Pasta berhasil diperbarui."
					: "Pasta berhasil ditambahkan.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1ExtracurricularsQueryKey(),
			});
			onClose();
		} catch (err: any) {
			addToast({ variant: "error", title: "Gagal", message: err.message });
		} finally {
			setSaving(false);
		}
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={isEditing ? "Edit Pasta" : "Tambah Pasta"}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={saving}>
						Batal
					</Button>
					<Button variant="primary" onClick={handleSubmit} disabled={saving}>
						{saving ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<FormField
					id="name"
					name="name"
					label="Nama Pasta"
					placeholder="e.g. Robotika, Calisan"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
						Jenjang
					</label>
					<div className="space-y-2">
						{LEVELS.map((lv) => (
							<label
								key={lv.value}
								className="flex items-center gap-3 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedLevels.includes(lv.value)}
									onChange={() => toggleLevel(lv.value)}
									className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
								<span className="text-sm text-gray-700">{lv.label}</span>
							</label>
						))}
					</div>
					<p className="mt-1 text-xs text-gray-500">
						Kosongkan semua = tersedia untuk semua jenjang.
					</p>
				</div>
			</form>
		</SlideOver>
	);
}
