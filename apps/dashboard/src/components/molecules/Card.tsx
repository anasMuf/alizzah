import { twMerge } from "tailwind-merge";

// Kartu permukaan standar (latar putih + border + radius). Dipakai untuk
// membungkus tabel, panel, dan kartu info agar tampilan konsisten.

interface CardProps {
	children: React.ReactNode;
	className?: string;
}

export function Card({ children, className }: CardProps) {
	return (
		<div
			className={twMerge(
				"rounded-lg border border-gray-200 bg-white",
				className,
			)}
		>
			{children}
		</div>
	);
}

interface CardHeaderProps {
	children: React.ReactNode;
	className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
	return (
		<div
			className={twMerge(
				"flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5",
				className,
			)}
		>
			{children}
		</div>
	);
}

interface CardTitleProps {
	children: React.ReactNode;
	className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
	return (
		<h3 className={twMerge("text-sm font-semibold text-gray-900", className)}>
			{children}
		</h3>
	);
}

interface CardBodyProps {
	children: React.ReactNode;
	className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
	return <div className={twMerge("p-4 sm:p-5", className)}>{children}</div>;
}
