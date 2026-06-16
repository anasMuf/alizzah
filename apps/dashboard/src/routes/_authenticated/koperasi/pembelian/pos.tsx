import { createFileRoute } from "@tanstack/react-router";
import { POSPembelianPage } from "#/features/koperasi/pembelian/POSPembelianPage";

export const Route = createFileRoute("/_authenticated/koperasi/pembelian/pos")({
	component: POSPembelianPage,
});
