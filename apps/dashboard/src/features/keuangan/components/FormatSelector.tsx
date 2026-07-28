import { Database } from "lucide-react";

type Format = "dump" | "sql" | "sql-compat";

const FORMAT_LABELS: Record<Format, string> = {
	dump: ".dump (Custom — pg_restore)",
	sql: ".sql (Plain SQL)",
	"sql-compat": ".sql Kompatibel (tanpa restrict)",
};

interface FormatSelectorProps {
	format: Format;
	onChange: (format: Format) => void;
}

export function FormatSelector({ format, onChange }: FormatSelectorProps) {
	return (
		<div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-4">
			<h3 className="text-sm font-semibold text-gray-900 mb-3">
				Format Backup
			</h3>
			<div className="flex flex-wrap gap-2">
				{(Object.keys(FORMAT_LABELS) as Format[]).map((fmt) => (
					<button
						key={fmt}
						type="button"
						onClick={() => onChange(fmt)}
						className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
							format === fmt
								? "bg-indigo-50 text-indigo-700 ring-indigo-700/20"
								: "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
						}`}
					>
						<Database
							className={`mr-2 h-4 w-4 ${format === fmt ? "text-indigo-500" : "text-gray-400"}`}
						/>
						{FORMAT_LABELS[fmt]}
					</button>
				))}
			</div>
		</div>
	);
}
