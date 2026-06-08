import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
	const [amount, setAmount] = useState("");
	const [savingsAmount, setSavingsAmount] = useState("");

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
		const amt = Number(savingsAmount);
		if (amt <= 0) return;
		onChange([
			...items,
			{ id: nextId, name: "Tabungan Umum", amount: amt, isSavings: true },
		]);
		setNextId((n) => n + 1);
		setSavingsAmount("");
	};

	const addIncidental = () => {
		const n = name.trim();
		const amt = Number(amount);
		if (!n || amt <= 0) return;
		onChange([
			...items,
			{ id: nextId, name: n, amount: amt, isSavings: false },
		]);
		setNextId((n) => n + 1);
		saveName(n);
		setName("");
		setAmount("");
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
			<div className="flex gap-2">
				<input
					type="number"
					className="flex-1 rounded border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-green-300 focus:ring-2 focus:ring-green-600 text-right"
					placeholder="Tab. Umum (Rp)"
					value={savingsAmount}
					onChange={(e) => setSavingsAmount(e.target.value)}
					min={0}
				/>
				<button
					type="button"
					onClick={addSavings}
					disabled={Number(savingsAmount) <= 0}
					className="px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 text-xs font-medium"
				>
					<Plus className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* Insidental */}
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
				<input
					type="number"
					className="w-24 rounded border-0 py-1.5 px-2 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right"
					placeholder="Nominal"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					min={0}
				/>
				<button
					type="button"
					onClick={addIncidental}
					disabled={!name.trim() || Number(amount) <= 0}
					className="px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 text-xs font-medium"
				>
					<Plus className="w-3.5 h-3.5" />
				</button>
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
