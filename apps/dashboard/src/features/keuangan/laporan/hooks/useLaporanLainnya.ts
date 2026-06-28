import { useAtom } from "jotai";
import { useState } from "react";
import {
	useGetV1ReportsByClassGroup,
	useGetV1ReportsByStudent,
	useGetV1ReportsPosisiKas,
	useGetV1ReportsSaldo,
	useGetV1ReportsTabungan,
	useGetV1ReportsTransaksiPengeluaran,
} from "#/api/endpoints/reports/reports";
import { academicYearAtom } from "@/store/global";

export function usePosisiKas() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const { data, isLoading, isError } = useGetV1ReportsPosisiKas(
		{ month, year, academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	return {
		activeAy,
		month,
		setMonth,
		year,
		setYear,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
export function useSaldo() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const [category, setCategory] = useState("");
	const { data, isLoading, isError } = useGetV1ReportsSaldo(
		{
			month,
			year,
			category: category || undefined,
			academic_year_id: activeAy?.id,
		},
		{ query: { enabled: !!activeAy?.id } },
	);
	return {
		activeAy,
		month,
		setMonth,
		year,
		setYear,
		category,
		setCategory,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
export function useTransaksiPengeluaran() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const { data, isLoading, isError } = useGetV1ReportsTransaksiPengeluaran(
		{ month, year, academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } },
	);
	return {
		activeAy,
		month,
		setMonth,
		year,
		setYear,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
export function useTabunganReport() {
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const [type, setType] = useState("");
	const { data, isLoading, isError } = useGetV1ReportsTabungan(
		{ month, year, type: type || undefined },
		{ query: { enabled: true } },
	);
	return {
		month,
		setMonth,
		year,
		setYear,
		type,
		setType,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
export function useLaporanSiswa(studentId: number) {
	const [activeAy] = useAtom(academicYearAtom);
	const { data, isLoading, isError } = useGetV1ReportsByStudent(
		studentId,
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!studentId } },
	);
	return {
		activeAy,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
export function useLaporanKelas(classGroupId: number) {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const { data, isLoading, isError } = useGetV1ReportsByClassGroup(
		classGroupId,
		{ month, year, academic_year_id: activeAy?.id },
		{ query: { enabled: !!classGroupId && !!activeAy?.id } },
	);
	return {
		activeAy,
		month,
		setMonth,
		year,
		setYear,
		report: (data?.data as any)?.data || null,
		isLoading,
		isError,
	};
}
