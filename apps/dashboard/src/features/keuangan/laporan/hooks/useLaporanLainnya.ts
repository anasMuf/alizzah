import { useAtom } from "jotai";
import { useState } from "react";
import { useGetReportsPosisiKas } from "#/api/endpoints/reports/posisi-kas";
import {
	useGetV1ReportsClassGroupsId,
	useGetV1ReportsStudentsId,
} from "#/api/endpoints/reports/reports";
import { useGetReportsSaldo } from "#/api/endpoints/reports/saldo";
import { useGetReportsTabungan } from "#/api/endpoints/reports/tabungan";
import { useGetReportsTransaksiPengeluaran } from "#/api/endpoints/reports/transaksi-pengeluaran";
import { academicYearAtom } from "@/store/global";

export function usePosisiKas() {
	const [activeAy] = useAtom(academicYearAtom);
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const { data, isLoading, isError } = useGetReportsPosisiKas(
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
	const { data, isLoading, isError } = useGetReportsSaldo(
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
	const { data, isLoading, isError } = useGetReportsTransaksiPengeluaran(
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
	const { data, isLoading, isError } = useGetReportsTabungan(
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
export function useLaporanSiswa(studentId: number, allTA?: boolean) {
	const [activeAy] = useAtom(academicYearAtom);
	const { data, isLoading, isError } = useGetV1ReportsStudentsId(
		studentId,
		{
			academic_year_id: allTA ? undefined : activeAy?.id,
			all: allTA || undefined,
		},
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
	const { data, isLoading, isError } = useGetV1ReportsClassGroupsId(
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
