import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export const fetchAuth = createServerFn({ method: 'GET' })
    .handler(async () => {
        let token: string | null = null;
        let user: any = null;

        try {
            token = getCookie('token') || null
            const userCookie = getCookie('user')
            if (userCookie) {
                try {
                    user = JSON.parse(decodeURIComponent(userCookie))
                } catch (e) {
                    // Handle potential errors
                }
            }
        } catch (e) {
            // Handle potential errors
        }

        return {
            token,
            user
        }
    })
