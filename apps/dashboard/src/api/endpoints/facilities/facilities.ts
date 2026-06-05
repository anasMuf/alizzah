/**
 * Custom hooks for Facilities (Antar Jemput, etc.)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationOptions, UseQueryOptions, QueryClient } from '@tanstack/react-query';
import { customInstance } from '../../mutator/custom-instance';

// ─── Types ───────────────────────────────────────────────────────────

export interface FacilityResponse {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface CreateFacilityRequest {
  name: string;
  description?: string;
}

export interface StudentFacilityResponse {
  id: number;
  facility: FacilityResponse;
  start_date: string;
  end_date?: string;
}

export interface EnrollFacilityRequest {
  facility_id: number;
  academic_year_id: number;
  start_date: string;
}

// ─── API Functions ───────────────────────────────────────────────────

const getFacilities = async () =>
  customInstance<any>('/v1/facilities', { method: 'GET' });

const createFacility = async (data: CreateFacilityRequest) =>
  customInstance<any>('/v1/facilities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

const updateFacility = async (id: number, data: CreateFacilityRequest) =>
  customInstance<any>(`/v1/facilities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

const deleteFacility = async (id: number) =>
  customInstance<any>(`/v1/facilities/${id}`, { method: 'DELETE' });

const getStudentFacilities = async (studentId: number, params?: { academic_year_id?: number }) =>
  customInstance<any>(`/v1/students/${studentId}/facilities`, {
    method: 'GET',
    params: params as Record<string, unknown>,
  });

const enrollFacility = async (studentId: number, data: EnrollFacilityRequest) =>
  customInstance<any>(`/v1/students/${studentId}/facilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

const unenrollFacility = async (studentId: number, sfId: number) =>
  customInstance<any>(`/v1/students/${studentId}/facilities/${sfId}`, { method: 'DELETE' });

// ─── Query Keys ──────────────────────────────────────────────────────

export const facilityKeys = {
  all: ['/v1/facilities'] as const,
  studentList: (studentId: number) => [`/v1/students/${studentId}/facilities`] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

export const useGetFacilities = (options?: { query?: Partial<UseQueryOptions> }) =>
  useQuery({ queryKey: facilityKeys.all, queryFn: () => getFacilities(), ...options?.query } as any);

export const useCreateFacility = (options?: { mutation?: UseMutationOptions<any, Error, CreateFacilityRequest> }, qc?: QueryClient) =>
  useMutation({ mutationFn: (data: CreateFacilityRequest) => createFacility(data), ...options?.mutation }, qc);

export const useUpdateFacility = (options?: { mutation?: UseMutationOptions<any, Error, { id: number; data: CreateFacilityRequest }> }, qc?: QueryClient) =>
  useMutation({ mutationFn: ({ id, data }: { id: number; data: CreateFacilityRequest }) => updateFacility(id, data), ...options?.mutation }, qc);

export const useDeleteFacility = (options?: { mutation?: UseMutationOptions<any, Error, number> }, qc?: QueryClient) =>
  useMutation({ mutationFn: (id: number) => deleteFacility(id), ...options?.mutation }, qc);

export const useGetStudentFacilities = (studentId: number, params?: { academic_year_id?: number }, options?: { query?: Partial<UseQueryOptions> }) =>
  useQuery({ queryKey: [...facilityKeys.studentList(studentId), params], queryFn: () => getStudentFacilities(studentId, params), enabled: !!studentId, ...options?.query } as any);

export const useEnrollFacility = (options?: { mutation?: UseMutationOptions<any, Error, { studentId: number; data: EnrollFacilityRequest }> }, qc?: QueryClient) =>
  useMutation({ mutationFn: ({ studentId, data }: { studentId: number; data: EnrollFacilityRequest }) => enrollFacility(studentId, data), ...options?.mutation }, qc);

export const useUnenrollFacility = (options?: { mutation?: UseMutationOptions<any, Error, { studentId: number; sfId: number }> }, qc?: QueryClient) =>
  useMutation({ mutationFn: ({ studentId, sfId }: { studentId: number; sfId: number }) => unenrollFacility(studentId, sfId), ...options?.mutation }, qc);
