import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	getGetV1ClassGroupsIdEffectiveDaysQueryKey,
	usePostV1ClassGroupsIdEffectiveDays,
	usePutV1ClassGroupsIdEffectiveDaysEdId,
} from "@alizzah/api-client/endpoints/effective-days/effective-days";
import type {
	DtoEffectiveDayResponse,
	DtoUpsertEffectiveDayRequest,
} from "@alizzah/api-client/model";
import { ApiError } from "@alizzah/api-client/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { SlideOver } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";

interface EffectiveDayFormProps {
	isOpen: boolean;
	onClose: () => void;
	classGroupId: number;
	academicYearId: number;
	month: number;
	year: number;
	initialData?: DtoEffectiveDayResponse | null;
}

export function EffectiveDayForm({
	isOpen,
	onClose,
	classGroupId,
	academicYearId,
	month,
	year,
	initialData,
}: EffectiveDayFormProps) {
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const isEditing = !!initialData;

	const [formData, setFormData] = useState<DtoUpsertEffectiveDayRequest>({
		academic_year_id: academicYearId,
		month,
		year,
		total_days: initialData?.total_days || 0,
		total_mondays: initialData?.total_mondays || 0,
	});

	useEffect(() => {
		if (isOpen) {
			setFormData({
				academic_year_id: academicYearId,
				month,
				year,
				total_days: initialData?.total_days || 0,
				total_mondays: initialData?.total_mondays || 0,
			});
		}
	}, [isOpen, academicYearId, month, year, initialData]);

	const createMutation = usePostV1ClassGroupsIdEffectiveDays({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Hari efektif berhasil disimpan.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ClassGroupsIdEffectiveDaysQueryKey(classGroupId),
				});
				onClose();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const updateMutation = usePutV1ClassGroupsIdEffectiveDaysEdId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Hari efektif berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ClassGroupsIdEffectiveDaysQueryKey(classGroupId),
				});
				onClose();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isEditing && initialData) {
			updateMutation.mutate({
				id: classGroupId,
				edId: initialData.id as number,
				data: {
					...formData,
					total_days: Number(formData.total_days),
					total_mondays: Number(formData.total_mondays),
				},
			});
		} else {
			createMutation.mutate({
				id: classGroupId,
				data: {
					...formData,
					total_days: Number(formData.total_days),
					total_mondays: Number(formData.total_mondays),
				},
			});
		}
	};

	const monthName = new Date(year, month - 1).toLocaleString("id-ID", {
		month: "long",
		year: "numeric",
	});

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title={`Atur Hari Efektif - ${monthName}`}
			footer={
				<>
					<Button
						type="button"
						variant="secondary"
						onClick={onClose}
						disabled={isPending}
					>
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
					id="total_days"
					name="total_days"
					type="number"
					label="Total Hari Efektif"
					placeholder="e.g. 20"
					min={0}
					max={31}
					value={formData.total_days}
					onChange={(e) =>
						setFormData({
							...formData,
							total_days: parseInt(e.target.value) || 0,
						})
					}
					required
				/>
				<FormField
					id="total_mondays"
					name="total_mondays"
					type="number"
					label="Total Hari Senin"
					placeholder="e.g. 4"
					min={0}
					max={5}
					value={formData.total_mondays}
					onChange={(e) =>
						setFormData({
							...formData,
							total_mondays: parseInt(e.target.value) || 0,
						})
					}
					required
				/>
				<div className="rounded-md bg-indigo-50 p-4">
					<div className="flex">
						<div className="ml-3">
							<h3 className="text-sm font-medium text-indigo-800">Catatan</h3>
							<div className="mt-2 text-sm text-indigo-700">
								<p>
									Hari efektif digunakan untuk kalkulasi proporsi uang catering
									dan ekskul pada SPP/SPD.
								</p>
							</div>
						</div>
					</div>
				</div>
			</form>
		</SlideOver>
	);
}
