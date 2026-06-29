import { createFileRoute } from "@tanstack/react-router";
import { POSPage } from "../../../../features/koperasi/penjualan/POSPage";

export const Route = createFileRoute("/_authenticated/koperasi/penjualan/pos")({
	component: POSPage,
});
