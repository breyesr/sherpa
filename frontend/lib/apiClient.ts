import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';

class ApiClientError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  // Build headers
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Only set application/json if we are not sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear auth state and redirect if in client-side environment
    if (typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.href = '/auth/login';
    }
    throw new ApiClientError('Unauthorized', 401, null);
  }

  // For 204 No Content or empty responses
  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiClientError(
      data?.detail || response.statusText || 'API Request failed',
      response.status,
      data
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestInit, 'method'>) =>
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  put: <T>(path: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  patch: <T>(path: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  delete: <T>(path: string, options?: Omit<RequestInit, 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData, options?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};
