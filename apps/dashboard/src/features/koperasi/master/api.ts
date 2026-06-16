import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kopGet, kopSend } from "../lib/client";

export interface MasterItem {
	id: number;
	name: string;
}

// Sesuai segmen path endpoint master koperasi.
export type MasterKind = "categories" | "units";

export const masterKeys = {
	all: ["koperasi", "master"] as const,
	list: (kind: MasterKind) => ["koperasi", "master", kind] as const,
};

export function useMasterList(kind: MasterKind) {
	return useQuery({
		queryKey: masterKeys.list(kind),
		queryFn: () => kopGet<MasterItem[]>(`/${kind}`),
	});
}

export function useCreateMaster(kind: MasterKind) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			kopSend<MasterItem>("POST", `/${kind}`, { name }),
		onSuccess: () => qc.invalidateQueries({ queryKey: masterKeys.list(kind) }),
	});
}
