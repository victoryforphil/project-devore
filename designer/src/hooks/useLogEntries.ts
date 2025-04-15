import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { safeApiCall, logEntryApi } from '../api/api_client';

// Query keys for log entries
const logEntryKeys = {
  all: ['logEntries'] as const,
  lists: () => [...logEntryKeys.all, 'list'] as const,
  list: (filters: string) => [...logEntryKeys.lists(), { filters }] as const,
  details: () => [...logEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...logEntryKeys.details(), id] as const,
};

// Types
export interface LogEntry {
  id: string;
  message: string;
  createdAt: Date;
}

// API calls
const getLogEntries = async (limit?: number): Promise<LogEntry[]> => {
  const response = await safeApiCall<LogEntry[]>(logEntryApi.getAll());

  return limit ? response.slice(0, limit) : response;
};

const getLogEntryById = async (id: string): Promise<LogEntry> => {
  const response = await safeApiCall<LogEntry>(logEntryApi.getById(id));
  return response;
};

const createLogEntry = async (message: string): Promise<LogEntry> => {
  const response = await logEntryApi.create(message);
  return response;
};

const deleteLogEntry = async (id: string): Promise<void> => {
  await safeApiCall<void>(logEntryApi.delete(id));
};

// Hooks
export const useLogEntries = (limit?: number) => {
  return useQuery({
    queryKey: limit ? [...logEntryKeys.lists(), { limit }] : logEntryKeys.lists(),
    queryFn: () => getLogEntries(limit),
  });
};

export const useLogEntry = (id: string) => {
  return useQuery({
    queryKey: logEntryKeys.detail(id),
    queryFn: () => getLogEntryById(id),
    enabled: !!id,
  });
};

export const useCreateLogEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => createLogEntry(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logEntryKeys.lists() });
    },
  });
};

export const useDeleteLogEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLogEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logEntryKeys.lists() });
    },
  });
};