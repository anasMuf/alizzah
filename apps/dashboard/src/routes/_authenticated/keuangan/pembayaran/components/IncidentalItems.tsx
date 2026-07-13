import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencyInput } from "#/components/ui";
import { formatCurrency } from "../../../../../utils/format";

type IncidentalItem = {
	id: number;
	name: string;
	amount: number;
	isSavings: boolean;
};

interface IncidentalItemsProps {
	items: IncidentalItem[];
	onChange: (items: IncidentalItem[]) => void;
}

export function IncidentalItems({ items, onChange }: IncidentalItemsProps) {
	const [nextId, setNextId] = useState(1);
	const [name, setName] = useState("");
	const [amount, setAmount] = useState(0);
	const [savingsAmount, setSavingsAmount] = useState(0);

	const suggestions = useMemo(() => {
		const stored = localStorage.getItem("incidental_item_names");
		const names: string[] = stored ? JSON.parse(stored) : [];
		return names.filter((n) => n !== "Tabungan Umum");
	}, []);

	const saveName = (n: string) => {
		if (n === "Tabungan Umum") return;
		const stored = localStorage.getItem("incidental_item_names");
		const names: string[] = stored ? JSON.parse(stored) : [];
		if (!names.includes(n)) {
			names.push(n);
			localStorage.setItem("incidental_item_names", JSON.stringify(names));
		}
	};

	const addSavings = () => {
		if (savingsAmount <= 0) return;
		onChange([
			...items,
			{
				id: nextId,
				name: "Tabungan Umum",
				amount: savingsAmount,
				isSavings: true,
			},
		]);
		setNextId((n) => n + 1);
		setSavingsAmount(0);
	};

	const addIncidental = () => {
		const n = name.trim();
		if (!n || amount <= 0) return;
		onChange([
			...items,
			{ id: nextId, name: n, amount: amount, isSavings: false },
		]);
		setNextId((n) => n + 1);
		saveName(n);
		setName("");
		setAmount(0);
	};

	const remove = (id: number) => {
		onChange(items.filter((item) => item.id !== id));
	};

	return (
		<div className="space-y-3">
			<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
				Item Tambahan
			</p>

			{/* Tabungan Umum */}
			<div>
				<label className="block text-xs font-medium text-gray-600 mb-1">
					Tabungan Umum (Rp)
				</label>
				<div className="flex gap-2">
					<CurrencyInput
						className="flex-1 rounded border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-green-300 focus:ring-2 focus:ring-green-600 text-right"
						placeholder="Nominal"
						value={savingsAmount}
						onChange={setSavingsAmount}
					/>
					<button
						type="button"
						onClick={addSavings}
						disabled={savingsAmount <= 0}
						className="px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 text-xs font-medium self-end"
					>
						<Plus className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Insidental */}
			<div>
				<label className="block text-xs font-medium text-gray-600 mb-1">
					Item Tambahan
				</label>
				<div className="flex gap-2">
					<input
						list="incidental-suggestions"
						type="text"
						className="flex-1 rounded border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
						placeholder="Nama item"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<datalist id="incidental-suggestions">
						{suggestions.map((s) => (
							<option key={s} value={s} />
						))}
					</datalist>
					<CurrencyInput
						className="w-24 rounded border-0 py-1.5 px-2 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right"
						placeholder="Nominal"
						value={amount}
						onChange={setAmount}
					/>
					<button
						type="button"
						onClick={addIncidental}
						disabled={!name.trim() || amount <= 0}
						className="px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 text-xs font-medium self-end"
					>
						<Plus className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{/* Added items */}
			{items.length > 0 && (
				<div className="space-y-1">
					{items.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between text-xs py-1"
						>
							<span
								className={item.isSavings ? "text-green-700" : "text-gray-700"}
							>
								{item.isSavings ? "💰" : "📌"} {item.name}
							</span>
							<div className="flex items-center gap-2">
								<span className="font-medium tabular-nums">
									{formatCurrency(item.amount)}
								</span>
								<button
									type="button"
									onClick={() => remove(item.id)}
									className="text-red-400 hover:text-red-600"
								>
									<Trash2 className="w-3 h-3" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
