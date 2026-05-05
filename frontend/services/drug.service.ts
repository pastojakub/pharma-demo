import api from '../lib/api';
import type { Batch, OrderRequest, TransactionHistory, IntegrityStatus } from '../types';

export const drugService = {
  getAll: () => api.get<Batch[]>('/drugs/all'),

  getOrders: () => api.get<OrderRequest[]>('/drugs/orders'),

  verify: (batchID: string) => api.get<Batch>(`/drugs/${batchID}/verify`),

  verifyIntegrity: (batchID: string) =>
    api.get<IntegrityStatus>(`/drugs/${batchID}/verify-integrity`),

  verifyOrderIntegrity: (requestId: string) =>
    api.get<IntegrityStatus>(`/drugs/orders/${requestId}/verify-integrity`),

  getHistory: (batchID: string) =>
    api.get<TransactionHistory[]>(`/drugs/${batchID}/history`),

  getSubBatches: (batchID: string) => api.get(`/drugs/${batchID}/sub-batches`),

  getOffers: (requestId: string) => api.get(`/drugs/offers/${requestId}`),

  getFulfillments: (requestId: string) =>
    api.get(`/drugs/orders/${requestId}/fulfillments`),

  getPrivateOrder: (requestId: string) =>
    api.get(`/drugs/orders/${requestId}/private`),

  getPrice: (batchID: string) => api.get(`/drugs/${batchID}/price`),

  createBatch: (payload: {
    id: string;
    drugID: string;
    name: string;
    manufacturer: string;
    expiryDate: string;
    price: number;
    quantity: number;
    unit: string;
    metadata?: string;
  }) => api.post<Batch>('/drugs', payload),

  requestDrug: (payload: {
    requestID: string;
    drugID: string;
    name: string;
    manufacturerOrg: string;
    quantity: number;
    unit: string;
    fileCIDs?: string[];
  }) => api.post<OrderRequest>('/drugs/request', payload),

  provideOffer: (payload: {
    requestID: string;
    price: number;
    pharmacyOrg: string;
  }) => api.post('/drugs/offer', payload),

  approveOffer: (payload: { requestID: string; offerID: number }) =>
    api.post('/drugs/approve-offer', payload),

  rejectRequest: (payload: {
    requestID: string;
    pharmacyOrg: string;
    reason?: string;
  }) => api.post('/drugs/reject-request', payload),

  fulfillOrder: (payload: {
    requestId: string;
    batches: { batchID: string; quantity: number }[];
  }) => api.post('/drugs/fulfill-order', payload),

  sell: (payload: { id: string; quantity: number }) =>
    api.post('/drugs/sell', payload),

  receive: (id: string) => api.post('/drugs/receive', { id }),

  recall: (id: string) => api.post('/drugs/recall', { id }),

  syncBatch: (id: string) => api.post('/drugs/sync-batch', { id }),

  syncOrder: (requestId: string) =>
    api.post(`/drugs/orders/${requestId}/sync`),
};
