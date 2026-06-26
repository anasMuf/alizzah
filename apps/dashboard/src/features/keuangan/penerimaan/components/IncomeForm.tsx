import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Button, FormField } from "#/components/ui";
import { CATEGORY_OPTIONS } from "#/features/keuangan/penerimaan/hooks/useIncomeForm";

interface IncomeFormProps {
	category: string;
	onCategoryChange: (v: string) => void;
	sourceName: string;
	onSourceNameChange: (v: string) => void;
	amount: string;
	onAmountChange: (v: string) => void;
	transactionDate: string;
	onTransactionDateChange: (v: string) => void;
	referenceNumber: string;
	onReferenceNumberChange: (v: string) => void;
	notes: string;
	onNotesChange: (v: string) => void;
	isPending: boolean;
	canSubmit: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

export function IncomeForm({
	category,
	onCategoryChange,
	sourceName,
	onSourceNameChange,
	amount,
	onAmountChange,
	transactionDate,
	onTransactionDateChange,
	referenceNumber,
	onReferenceNumberChange,
	notes,
	onNotesChange,
	isPending,
	canSubmit,
	onSubmit,
}: IncomeFormProps) {
	return (
		<div className="space-y-6 max-w-2xl mx-auto">
			<nav className="flex items-center text-sm text-gray-500">
				<Link
					to="/keuangan/penerimaan"
					className="hover:text-indigo-600 transition-colors"
				>
					Penerimaan
				</Link>
				<ChevronRight className="w-4 h-4 mx-1" />
				<span className="text-gray-900 font-medium">Catat Baru</span>
			</nav>
			<div>
				<h2 className="text-2xl font-bold leading-7 text-gray-900">
					Catat Penerimaan Baru
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Catat penerimaan dana bantuan dari BOS, donasi, hibah, atau sumber
					lainnya.
				</p>
			</div>
			<form
				onSubmit={onSubmit}
				className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
			>
				<div className="px-4 py-6 sm:p-8 space-y-6">
					<div>
						<label
							htmlFor="inc-category"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Kategori <span className="text-red-500">*</span>
						</label>
						<select
							id="inc-category"
							value={category}
							onChange={(e) => onCategoryChange(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							{CATEGORY_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<FormField
						id="sourceName"
						label="Sumber / Pengirim"
						value={sourceName}
						onChange={(e: any) => onSourceNameChange(e.target.value)}
						required
						placeholder='Contoh: "BOS Reguler Semester 1"'
					/>
					<FormField
						id="amount"
						type="number"
						label="Nominal (Rp)"
						value={amount}
						onChange={(e: any) => onAmountChange(e.target.value)}
						required
						min="1"
						placeholder="Masukkan nominal"
					/>
					<FormField
						id="transactionDate"
						type="date"
						label="Tanggal Transaksi"
						value={transactionDate}
						onChange={(e: any) => onTransactionDateChange(e.target.value)}
						required
					/>
					<FormField
						id="referenceNumber"
						label="Nomor Referensi / Dokumen"
						value={referenceNumber}
						onChange={(e: any) => onReferenceNumberChange(e.target.value)}
						placeholder="Opsional"
					/>
					<div>
						<label
							htmlFor="inc-notes"
							className="block text-sm font-medium leading-6 text-gray-900 mb-2"
						>
							Catatan
						</label>
						<textarea
							id="inc-notes"
							rows={3}
							value={notes}
							onChange={(e) => onNotesChange(e.target.value)}
							className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							placeholder="Catatan tambahan (opsional)"
						/>
					</div>
				</div>
				<div className="flex items-center justify-end gap-x-4 border-t border-gray-200 px-4 py-4 sm:px-8">
					<Link to="/keuangan/penerimaan">
						<Button type="button" variant="secondary">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={!canSubmit || isPending}
					>
						{isPending ? "Menyimpan..." : "Simpan Penerimaan"}
					</Button>
				</div>
			</form>
		</div>
	);
}
