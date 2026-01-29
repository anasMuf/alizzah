import { useMutation } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useLogin() {
    return useMutation({
        mutationFn: async ({ username, password }: any) => {
            const res = await client.auth.login.$post({
                json: { username, password },
            });
            const result = (await res.json()) as unknown as APIResponse<{ token: string; user: any }>;
            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || result.message || 'Login failed');
            }
            return result.data;
        },
    });
}
