import axios, { AxiosInstance } from "axios"

const getDefaultApiBaseUrl = () => {
    if (typeof window === "undefined") {
        return "http://localhost:3000"
    }

    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
        return "http://localhost:3000"
    }

    return window.location.origin
}

const pistonBaseUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_PISTON_API_URL ||
    getDefaultApiBaseUrl()

const instance: AxiosInstance = axios.create({
    baseURL: pistonBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
})

export default instance
