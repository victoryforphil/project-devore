import { treaty } from '@elysiajs/eden';
import type { App } from '../../../cursed-server/src/index';
import { API_URL } from '../constants';

// Type for API response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}

// Create Eden Treaty client
export const api = treaty<App>(API_URL);

// Helper to wrap API calls with proper typing
export async function apiCall<T>(
  promise: Promise<{ data?: T; error?: any }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await promise;
    
    if (error) {
      return {
        success: false,
        error: {
          message: error.value?.message || error.message || 'An unexpected error occurred',
          status: error.status || 500
        }
      };
    }
    
    return {
      success: true,
      data: data.data as T
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        status: 500
      }
    };
  }
}

// Type for API error responses
export interface ApiError {
  message: string;
  status: number;
}

// Add a helper that automatically unwraps the ApiResponse and throws an error if not successful
export async function safeApiCall<T>(
  promise: Promise<{ data?: T; error?: any }>
): Promise<T> {
  const result = await apiCall(promise);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'API call failed');
  }
  return result.data;
}

// Typed API client for LogEntry endpoints
export const logEntryApi = {
  getAll: () => api.logs.get(),
  getById: (id: string) => api.logs[':id'].get({ params: { id } }),
  create: (message: string) => api.logs.post({ message }),
  delete: (id: string) => api.logs[':id'].delete({ params: { id } })
};