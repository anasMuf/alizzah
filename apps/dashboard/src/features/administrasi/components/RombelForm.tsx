import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	getGetV1ClassGroupsQueryKey,
	usePostV1ClassGroups,
	usePutV1ClassGroupsId,
} from "@alizzah/api-client/endpoints/class-groups/class-groups";
import type {
	DtoClassGroupResponse,
	DtoCreateClassGroupRequest,
} from "@alizzah/api-client/model";
import { ApiError } from "@alizzah/api-client/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";

interface RombelFormProps {
	initialData?: DtoClassGroupResponse | null;
	academicYearId: number;
	onSuccess?: (data?: any) => void;
	onClose?: () => void;
}

export function RombelForm({
	initialData,
	academicYearId,
	onSuccess,
	onClose,
}: RombelFormProps) {
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const navigate = useNavigate();
	const isEditing = !!initialData;

	const [formData, setFormData] = useState<DtoCreateClassGroupRequest>({
		academic_year_id: academicYearId,
		name: initialData?.name || "",
		level: initialData?.level || ("mutiara" as any),
		schedule: {
			weekdays: {
				days: initialData?.schedule?.weekdays?.days || [
					"Senin",
					"Rabu",
					"Jumat",
				],
				time_in: initialData?.schedule?.weekdays?.time_in || "07:15",
				time_out: initialData?.schedule?.weekdays?.time_out || "10:00",
				time_out_calisan:
					initialData?.schedule?.weekdays?.time_out_calisan || undefined,
			},
			weekend: {
				days: initialData?.schedule?.weekend?.days || [],
				time_in: initialData?.schedule?.weekend?.time_in || "",
				time_out: initialData?.schedule?.weekend?.time_out || "",
			},
		},
	});

	// Level specific handling
	useEffect(() => {
		if (!isEditing) {
			if (formData.level === "mutiara") {
				// Reset weekend for Mutiara
				setFormData((prev) => ({
					...prev,
					schedule: {
						...prev.schedule,
						weekdays: {
							...prev.schedule.weekdays,
							days: ["Senin", "Rabu", "Jumat"],
						},
						weekend: { days: [], time_in: "", time_out: "" },
					},
				}));
			} else {
				// Intan/Berlian defaults
				setFormData((prev) => ({
					...prev,
					schedule: {
						...prev.schedule,
						weekdays: {
							...prev.schedule.weekdays,
							days: ["Senin", "Selasa", "Rabu", "Kamis"],
						},
						weekend: {
							days: ["Jumat", "Sabtu"],
							time_in: "07:15",
							time_out: "09:00",
						},
					},
				}));
			}
		}
	}, [formData.level, isEditing]);

	const createMutation = usePostV1ClassGroups({
		mutation: {
			onSuccess: (res) => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Rombel berhasil ditambahkan.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ClassGroupsQueryKey(),
				});
				if (onClose) onClose();
				if (onSuccess) onSuccess((res as any)?.data?.data);
				else
					navigate({
						to: "/administrasi/rombel/$id",
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

	const updateMutation = usePutV1ClassGroupsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Rombel berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1ClassGroupsQueryKey(),
				});
				if (onSuccess) onSuccess();
				if (onClose) onClose();
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
		// Normalize calisan time
		const payload = { ...formData };
		if (
			payload.schedule &&
			payload.schedule.weekdays &&
			!payload.schedule.weekdays.time_out_calisan
		) {
			delete payload.schedule.weekdays.time_out_calisan;
		}

		if (isEditing && initialData) {
			updateMutation.mutate({
				id: initialData?.id || 0,
				data: payload as any,
			});
		} else {
			createMutation.mutate({ data: payload });
		}
	};

	const handleMutiaraDaysChange = (days: string[]) => {
		setFormData((prev) => ({
			...prev,
			schedule: {
				...prev.schedule,
				weekdays: { ...prev.schedule.weekdays, days },
			},
		}));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
				<div className="sm:col-span-2">
					<FormField
						id="name"
						name="name"
						label="Nama Rombel"
						placeholder="e.g. Mutiara 1"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
					/>
				</div>

				<div className="sm:col-span-2">
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
						Jenjang
					</label>
					<div className="flex gap-4">
						{["mutiara", "intan", "berlian"].map((level) => (
							<label
								key={level}
								className="flex items-center gap-2 cursor-pointer"
							>
								<input
									type="radio"
									name="level"
									value={level}
									checked={formData.level === level}
									onChange={(e) =>
										setFormData({ ...formData, level: e.target.value as any })
									}
									className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
								/>
								<span className="text-sm text-gray-700 capitalize">
									{level}
								</span>
							</label>
						))}
					</div>
				</div>

				{/* Schedule Configuration */}
				<div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-200">
					<h3 className="text-sm font-medium leading-6 text-gray-900 mb-4">
						Pengaturan Jadwal
					</h3>

					{formData.level === "mutiara" ? (
						<div className="space-y-4">
							<div>
								<label className="block text-sm text-gray-700 mb-2">
									Grup Hari (Weekdays)
								</label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="mutiara_days"
											checked={formData.schedule!.weekdays!.days!.includes(
												"Senin",
											)}
											onChange={() =>
												handleMutiaraDaysChange(["Senin", "Rabu", "Jumat"])
											}
											className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
										/>
										<span className="text-sm text-gray-700">
											Senin, Rabu, Jumat
										</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="mutiara_days"
											checked={formData.schedule!.weekdays!.days!.includes(
												"Selasa",
											)}
											onChange={() =>
												handleMutiaraDaysChange(["Selasa", "Kamis", "Sabtu"])
											}
											className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
										/>
										<span className="text-sm text-gray-700">
											Selasa, Kamis, Sabtu
										</span>
									</label>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 mt-4">
								<FormField
									id="wd_in"
									type="time"
									label="Jam Masuk"
									value={formData.schedule!.weekdays!.time_in}
									onChange={(e) =>
										setFormData({
											...formData,
											schedule: {
												...formData.schedule,
												weekdays: {
													...formData.schedule.weekdays,
													time_in: e.target.value,
												},
											},
										})
									}
									required
								/>
								<FormField
									id="wd_out"
									type="time"
									label="Jam Pulang"
									value={formData.schedule!.weekdays!.time_out}
									onChange={(e) =>
										setFormData({
											...formData,
											schedule: {
												...formData.schedule,
												weekdays: {
													...formData.schedule.weekdays,
													time_out: e.target.value,
												},
											},
										})
									}
									required
								/>
								<div className="col-span-2">
									<FormField
										id="wd_out_calisan"
										type="time"
										label="Jam Pulang (Jika ikut Calisan) - Opsional"
										value={formData.schedule!.weekdays!.time_out_calisan || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												schedule: {
													...formData.schedule,
													weekdays: {
														...formData.schedule.weekdays,
														time_out_calisan: e.target.value,
													},
												},
											})
										}
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-6">
							{/* Sen-Kam */}
							<div className="bg-gray-50 p-4 rounded-md">
								<p className="text-sm font-medium text-gray-900 mb-3">
									Senin - Kamis
								</p>
								<div className="grid grid-cols-2 gap-4">
									<FormField
										id="wd_in"
										type="time"
										label="Jam Masuk"
										value={formData.schedule!.weekdays!.time_in}
										onChange={(e) =>
											setFormData({
												...formData,
												schedule: {
													...formData.schedule,
													weekdays: {
														...formData.schedule.weekdays,
														time_in: e.target.value,
													},
												},
											})
										}
										required
									/>
									<FormField
										id="wd_out"
										type="time"
										label="Jam Pulang"
										value={formData.schedule!.weekdays!.time_out}
										onChange={(e) =>
											setFormData({
												...formData,
												schedule: {
													...formData.schedule,
													weekdays: {
														...formData.schedule.weekdays,
														time_out: e.target.value,
													},
												},
											})
										}
										required
									/>
									<div className="col-span-2">
										<FormField
											id="wd_out_calisan"
											type="time"
											label="Jam Pulang (Jika ikut Calisan) - Opsional"
											value={
												formData.schedule!.weekdays!.time_out_calisan || ""
											}
											onChange={(e) =>
												setFormData({
													...formData,
													schedule: {
														...formData.schedule,
														weekdays: {
															...formData.schedule.weekdays,
															time_out_calisan: e.target.value,
														},
													},
												})
											}
										/>
									</div>
								</div>
							</div>

							{/* Jum-Sab */}
							<div className="bg-gray-50 p-4 rounded-md">
								<p className="text-sm font-medium text-gray-900 mb-3">
									Jumat - Sabtu
								</p>
								<div className="grid grid-cols-2 gap-4">
									<FormField
										id="we_in"
										type="time"
										label="Jam Masuk"
										value={formData.schedule!.weekend!.time_in}
										onChange={(e) =>
											setFormData({
												...formData,
												schedule: {
													...formData.schedule,
													weekend: {
														...formData.schedule.weekend,
														time_in: e.target.value,
													},
												},
											})
										}
										required
									/>
									<FormField
										id="we_out"
										type="time"
										label="Jam Pulang"
										value={formData.schedule!.weekend!.time_out}
										onChange={(e) =>
											setFormData({
												...formData,
												schedule: {
													...formData.schedule,
													weekend: {
														...formData.schedule.weekend,
														time_out: e.target.value,
													},
												},
											})
										}
										required
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<Button
					type="button"
					variant="secondary"
					onClick={onClose || (() => navigate({ to: "/administrasi/rombel" }))}
					disabled={isPending}
				>
					Batal
				</Button>
				<Button type="submit" variant="primary" disabled={isPending}>
					{isPending ? "Menyimpan..." : "Simpan Rombel"}
				</Button>
			</div>
		</form>
	);
}
