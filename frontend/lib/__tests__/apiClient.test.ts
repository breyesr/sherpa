import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../apiClient';
import { useAuthStore } from '../../store/authStore';

// Mock the authStore
vi.mock('../../store/authStore', () => {
  const mockStore = {
    token: null as string | null,
    logout: vi.fn(),
  };
  return {
    useAuthStore: {
      getState: () => mockStore,
    },
  };
});

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    useAuthStore.getState().token = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs basic GET requests successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    (global.fetch as any).mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    });

    const result = await apiClient.get<typeof mockData>('/test');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      })
    );
  });

  it('injects Authorization header when token is present', async () => {
    const mockToken = 'mock-jwt-token';
    useAuthStore.getState().token = mockToken;

    (global.fetch as any).mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    await apiClient.get('/test');

    const fetchCall = (global.fetch as any).mock.calls[0];
    const headers = fetchCall[1].headers as Headers;
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
  });

  it('redirects to /auth/login and logs out on 401 response', async () => {
    const logoutMock = vi.fn();
    useAuthStore.getState().logout = logoutMock;
    
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;

    (global.fetch as any).mockResolvedValueOnce({
      status: 401,
      ok: false,
      headers: new Headers(),
      text: async () => 'Unauthorized',
    });

    await expect(apiClient.get('/test')).rejects.toThrow('Unauthorized');
    expect(logoutMock).toHaveBeenCalled();
    expect(window.location.href).toBe('/auth/login');

    (window as any).location = originalLocation;
  });
});
