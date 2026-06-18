import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, FormField, SlideOver, useToast } from "#/components/ui";
import { academicYearAtom } from "#/store/global";
import { formatCurrency } from "#/utils/format";
import { useMembers } from "../anggota/api";
import { type LoanInput, type RepaymentMethod, useCreateLoan } from "./api";

interface PinjamanFormProps {
	isOpen: boolean;
	onClose: () => void;
	initialMemberId?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function PinjamanForm({
	isOpen,
	onClose,
	initialMemberId,
}: PinjamanFormProps) {
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);
	const { data: members = [] } = useMembers();

	const [memberId, setMemberId] = useState(0);
	const [purpose, setPurpose] = useState("");
	const [principal, setPrincipal] = useState(0);
	const [tenor, setTenor] = useState(1);
	const [method, setMethod] = useState<RepaymentMethod>("potong_gaji");
	const [loanDate, setLoanDate] = useState(today());
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (isOpen) {
			setMemberId(initialMemberId || 0);
			setPurpose("");
			setPrincipal(0);
			setTenor(1);
			setMethod("potong_gaji");
			setLoanDate(today());
			setNotes("");
		}
	}, [isOpen, initialMemberId]);

	const createL = useCreateLoan();
	const perInstallment = tenor > 0 ? principal / tenor : 0;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeAy?.id) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih tahun ajaran aktif terlebih dahulu.",
			});
			return;
		}
		if (memberId <= 0) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Pilih anggota terlebih dahulu.",
			});
			return;
		}
		if (principal <= 0 || tenor < 1 || !purpose.trim()) {
			addToast({
				variant: "error",
				title: "Gagal",
				message: "Lengkapi keperluan, pokok (> 0), dan tenor (≥ 1).",
			});
			return;
		}
		const payload: LoanInput = {
			academic_year_id: activeAy.id,
			member_id: memberId,
			purpose: purpose.trim(),
			principal,
			tenor,
			repayment_method: method,
			loan_date: loanDate,
			notes: notes || undefined,
		};
		createL.mutate(payload, {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pinjaman berhasil dicatat.",
				});
				onClose();
			},
			onError: (err: Error) =>
				addToast({
					variant: "error",
					title: "Gagal",
					message: err instanceof ApiError ? err.message : "Terjadi kesalahan",
				}),
		});
	};

	return (
		<SlideOver
			isOpen={isOpen}
			onClose={onClose}
			title="Catat Pinjaman"
			footer={
				<>
					<Button
						variant="secondary"
						onClick={onClose}
						disabled={createL.isPending}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						disabled={createL.isPending}
					>
						{createL.isPending ? "Menyimpan..." : "Simpan"}
					</Button>
				</>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="member_id"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Anggota
					</label>
					<select
						id="member_id"
						value={memberId}
						onChange={(e) => setMemberId(Number(e.target.value))}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
						required
					>
						<option value={0}>Pilih anggota…</option>
						{members.map((m) => (
							<option key={m.id} value={m.id}>
								{m.full_name}
							</option>
						))}
					</select>
				</div>

				<FormField
					id="purpose"
					name="purpose"
					label="Keperluan"
					placeholder="mis. biaya berobat"
					value={purpose}
					onChange={(e) => setPurpose(e.target.value)}
					required
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						id="principal"
						name="principal"
						type="number"
						min={1}
						step="any"
						label="Pokok Pinjaman"
						placeholder="0"
						value={principal}
						onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
						required
					/>
					<FormField
						id="tenor"
						name="tenor"
						type="number"
						min={1}
						step="1"
						label="Tenor (bulan)"
						placeholder="1"
						value={tenor}
						onChange={(e) => setTenor(Number(e.target.value) || 0)}
						required
					/>
				</div>

				<div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
					<span className="text-sm font-medium text-gray-700">
						Angsuran / bulan
					</span>
					<span className="text-sm font-bold text-gray-900">
						{formatCurrency(perInstallment)}
					</span>
				</div>

				<div>
					<label
						htmlFor="repayment_method"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Metode Pelunasan
					</label>
					<select
						id="repayment_method"
						value={method}
						onChange={(e) => setMethod(e.target.value as RepaymentMethod)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
					>
						<option value="potong_gaji">Potong Gaji</option>
						<option value="manual">Manual</option>
					</select>
				</div>

				<FormField
					id="loan_date"
					name="loan_date"
					type="date"
					label="Tanggal Pinjaman"
					value={loanDate}
					onChange={(e) => setLoanDate(e.target.value)}
					required
				/>

				<div>
					<label
						htmlFor="notes"
						className="block text-sm font-medium leading-6 text-gray-900 mb-2"
					>
						Catatan
					</label>
					<textarea
						id="notes"
						name="notes"
						rows={2}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
					/>
				</div>
			</form>
		</SlideOver>
	);
}
