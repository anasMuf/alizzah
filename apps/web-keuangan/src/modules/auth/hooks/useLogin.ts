import { useMutation } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useLogin() {
    return useMutation({
        mutationFn: async ({ username, password }: any) => {
            const res = await client.auth.login.$post({
                json: { username, password },
            });

            if (!res.ok) {
                // Try to parse error as JSON, if failed use status text
                let errorMessage = 'Login failed';
                try {
                    const errorData = await res.json() as any;
                    errorMessage = errorData.message || errorData.error?.message || errorMessage;
                } catch (e) {
                    errorMessage = `Error ${res.status}: ${res.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = (await res.json()) as unknown as APIResponse<{ token: string; user: any }>;
            if (!result.success || !result.data) {
                throw new Error(result.message || 'Login failed');
            }
            return result.data;
        },
    });
}
