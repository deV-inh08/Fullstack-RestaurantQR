import authApiRequest from "../apiRequests/auth.request"
import { useMutation } from "@tanstack/react-query"


// Call Client --> Next Server 
export const useLoginMutation = () => {
    return useMutation({
        mutationFn: authApiRequest.login
    })
}

export const useRefreshAccessTokenMutation = () => {
    return useMutation({
        mutationFn: authApiRequest.refreshToken
    })
}

export const useLogoutMutation = () => {
    return useMutation({
        mutationFn: authApiRequest.logout
    })
}