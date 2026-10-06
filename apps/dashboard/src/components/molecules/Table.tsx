import { twMerge } from "tailwind-merge";

// Tabel standar dengan pembungkus yang dapat di-scroll horizontal.
// Pembungkus `overflow-x-auto` penting untuk perangkat mobile: tanpa itu tabel
// yang lebih lebar dari layar akan terpotong karena `<main>` memakai
// `overflow-x-hidden`.

interface TableProps {
	children: React.ReactNode;
	className?: string;
}

export function Table({ children, className }: TableProps) {
	return (
		<div
			className={twMerge(
				"overflow-x-auto rounded-lg border border-gray-200 bg-white",
				className,
			)}
		>
			<table className="min-w-full divide-y divide-gray-200">{children}</table>
		</div>
	);
}

interface TableHeadProps {
	children: React.ReactNode;
	className?: string;
}

export function TableHead({ children, className }: TableHeadProps) {
	return <thead className={twMerge("bg-gray-50", className)}>{children}</thead>;
}

interface TableBodyProps {
	children: React.ReactNode;
	className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
	return (
		<tbody className={twMerge("divide-y divide-gray-100", className)}>
			{children}
		</tbody>
	);
}
