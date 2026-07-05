/**
 * apiFetch — thin wrapper around fetch that automatically injects the
 * Authorization: Bearer <token> header from localStorage.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
}
