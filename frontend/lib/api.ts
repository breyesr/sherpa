import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/config';

export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  const cookieStore = cookies();
  const token = cookieStore.get('sherpa_token')?.value;

  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}
