import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
	page: number;
	limit: number;
	total: number;
	onPageChange: (page: number) => void;
}

export function Pagination({
	page,
	limit,
	total,
	onPageChange,
}: PaginationProps) {
	const totalPages = Math.ceil(total / limit);

	if (totalPages <= 1) return null;

	const from = (page - 1) * limit + 1;
	const to = Math.min(page * limit, total);

	return (
		<div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
			{/* Mobile */}
			<div className="flex flex-1 justify-between sm:hidden">
				<button
					onClick={() => onPageChange(Math.max(1, page - 1))}
					disabled={page === 1}
					className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Sebelumnya
				</button>
				<span className="inline-flex items-center text-sm text-gray-700">
					{page} / {totalPages}
				</span>
				<button
					onClick={() => onPageChange(Math.min(totalPages, page + 1))}
					disabled={page >= totalPages}
					className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Berikutnya
				</button>
			</div>

			{/* Desktop */}
			<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
						Menampilkan <span className="font-medium">{from}</span> sampai{" "}
						<span className="font-medium">{to}</span> dari{" "}
						<span className="font-medium">{total}</span> data
					</p>
				</div>
				<div>
					<nav
						className="isolate inline-flex -space-x-px rounded-md shadow-sm"
						aria-label="Pagination"
					>
						<button
							onClick={() => onPageChange(Math.max(1, page - 1))}
							disabled={page === 1}
							className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="sr-only">Sebelumnya</span>
							<ChevronLeft className="h-5 w-5" aria-hidden="true" />
						</button>

						{/* Page numbers */}
						{generatePageNumbers(page, totalPages).map((p, idx) =>
							p === "..." ? (
								<span
									key={`ellipsis-${idx}`}
									className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
								>
									…
								</span>
							) : (
								<button
									key={p}
									onClick={() => onPageChange(p as number)}
									className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
										page === p
											? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
											: "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
									}`}
								>
									{p}
								</button>
							),
						)}

						<button
							onClick={() => onPageChange(Math.min(totalPages, page + 1))}
							disabled={page >= totalPages}
							className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="sr-only">Berikutnya</span>
							<ChevronRight className="h-5 w-5" aria-hidden="true" />
						</button>
					</nav>
				</div>
			</div>
		</div>
	);
}

/**
 * Generate page number array with ellipsis.
 * e.g. [1, '...', 4, 5, 6, '...', 10]
 */
function generatePageNumbers(
	current: number,
	total: number,
): (number | string)[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const pages: (number | string)[] = [];

	if (current <= 4) {
		for (let i = 1; i <= 5; i++) pages.push(i);
		pages.push("...");
		pages.push(total);
	} else if (current >= total - 3) {
		pages.push(1);
		pages.push("...");
		for (let i = total - 4; i <= total; i++) pages.push(i);
	} else {
		pages.push(1);
		pages.push("...");
		for (let i = current - 1; i <= current + 1; i++) pages.push(i);
		pages.push("...");
		pages.push(total);
	}

	return pages;
}
