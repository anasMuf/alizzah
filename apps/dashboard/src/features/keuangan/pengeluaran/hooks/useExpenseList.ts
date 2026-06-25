import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { useGetV1ExpenseCategories } from "#/api/endpoints/expense-categories/expense-categories";
import { useGetV1Expenses } from "#/api/endpoints/expenses/expenses";
import { academicYearAtom } from "@/store/global";

export type ExpenseItem = any;

export function useExpenseList() {
	const [activeAy] = useAtom(academicYearAtom);

	const [search, setSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(1);

	const {
		data: expensesData,
		isLoading,
		isError,
	} = useGetV1Expenses(
		{
			page,
			limit: 20,
			academic_year_id: activeAy?.id,
			...(selectedCategory
				? { expense_category_id: Number(selectedCategory) }
				: {}),
			...(dateFrom ? { start_date: dateFrom } : {}),
			...(dateTo ? { end_date: dateTo } : {}),
		},
		{ query: { enabled: !!activeAy?.id } },
	);

	const { data: categoriesData } = useGetV1ExpenseCategories();

	const categories: any[] = (categoriesData?.data as any)?.data || [];
	const expenses: any[] = (expensesData?.data as any)?.data || [];
	const meta = (expensesData?.data as any)?.meta;

	const categoryMap = useMemo(() => {
		const map: Record<number, { parentName: string; childName: string }> = {};
		for (const parent of categories) {
			if (parent.children) {
				for (const child of parent.children) {
					map[child.id] = { parentName: parent.name, childName: child.name };
				}
			}
			map[parent.id] = { parentName: parent.name, childName: "" };
		}
		return map;
	}, [categories]);

	const filteredExpenses = useMemo(() => {
		if (!search) return expenses;
		const q = search.toLowerCase();
		return expenses.filter((e: any) =>
			e.description?.toLowerCase().includes(q),
		);
	}, [expenses, search]);

	const totalAmount = useMemo(
		() =>
			filteredExpenses.reduce(
				(sum: number, e: any) => sum + Number(e.amount || 0),
				0,
			),
		[filteredExpenses],
	);

	const handleReset = () => {
		setSearch("");
		setSelectedCategory("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	};

	const getCategoryLabel = (expense: any) => {
		const catId = expense.expense_category_id;
		const mapped = categoryMap[catId];
		if (mapped) {
			return mapped.childName
				? `${mapped.parentName} > ${mapped.childName}`
				: mapped.parentName;
		}
		if (expense.expense_category) {
			const cat = expense.expense_category;
			return cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
		}
		return "-";
	};

	return {
		activeAy,
		expenses: filteredExpenses,
		meta,
		categories,
		categoryMap,
		isLoading,
		isError,
		search,
		setSearch,
		selectedCategory,
		setSelectedCategory,
		dateFrom,
		setDateFrom,
		dateTo,
		setDateTo,
		page,
		setPage,
		totalAmount,
		handleReset,
		getCategoryLabel,
	};
}
