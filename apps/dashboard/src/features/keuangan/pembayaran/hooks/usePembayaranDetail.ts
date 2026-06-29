import { useState } from "react";
import { useGetV1PaymentsId } from "#/api/endpoints/payments/payments";

export function usePembayaranDetail(id: number) {
	const [showItems, setShowItems] = useState(false);
	const { data, isLoading, isError } = useGetV1PaymentsId(id);
	const payment = (data?.data as any)?.data;
	return { payment, isLoading, isError, showItems, setShowItems };
}
