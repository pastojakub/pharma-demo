import api from '../lib/api';
import type { DrugDefinition, FileMetadata } from '../types';

export const catalogService = {
  getAll: () => api.get<DrugDefinition[]>('/drug-catalog'),

  create: (payload: {
    name: string;
    composition: string;
    recommendedDosage: string;
    intakeInfo?: string;
    metadata?: string;
    files: FileMetadata[];
  }) => api.post<DrugDefinition>('/drug-catalog', payload),

  update: (id: number, payload: {
    name: string;
    composition: string;
    recommendedDosage: string;
    intakeInfo?: string;
    metadata?: string;
    files?: FileMetadata[];
  }) => api.patch<DrugDefinition>(`/drug-catalog/${id}`, payload),

  sync: () => api.post<{ success: boolean; count?: number; error?: string }>('/drug-catalog/sync'),

  getPricingSummary: (drugId: number | string) =>
    api.get(`/drugs/catalog/${drugId}/pricing-summary`),
};
