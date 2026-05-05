import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Batch, DrugDefinition, OrderRequest, User } from '../types';

export interface DashboardData {
  catalog: DrugDefinition[];
  orders: OrderRequest[];
  batches: Batch[];
}

type ToastType = 'success' | 'error' | 'info';

export function useDashboardData(
  user: User | null,
  isRegulator: boolean,
  showToast: (msg: string, type?: ToastType) => void,
) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [catalog, setCatalog] = useState<DrugDefinition[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (): Promise<DashboardData | null> => {
    if (!user) return null;
    setIsRefreshing(true);
    try {
      const queries: Promise<any>[] = [api.get('/drug-catalog')];
      if (!isRegulator) {
        queries.push(api.get('/drugs/orders'));
        queries.push(api.get('/drugs/all'));
      } else {
        queries.push(api.get('/drugs/all'));
      }
      const results = await Promise.all(queries);
      const data: DashboardData = {
        catalog: Array.isArray(results[0].data) ? results[0].data : [],
        orders: !isRegulator && Array.isArray(results[1]?.data) ? results[1].data : [],
        batches: Array.isArray(results[isRegulator ? 1 : 2]?.data)
          ? results[isRegulator ? 1 : 2].data
          : [],
      };
      setCatalog(data.catalog);
      setOrders(data.orders);
      setBatches(data.batches);
      return data;
    } catch (err) {
      console.error(err);
      setBatches([]);
      setCatalog([]);
      setOrders([]);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncCatalog = async () => {
    try {
      const res = await api.post('/drug-catalog/sync');
      if (res.data.success) {
        showToast(
          `Synchronizácia úspešná! Spracovaných ${res.data.count} položiek.`,
          'success',
        );
        fetchData();
      } else {
        showToast(`Chyba pri synchronizácii: ${res.data.error}`, 'error');
      }
    } catch {
      showToast('Synchronizácia zlyhala.', 'error');
    }
  };

  const verifyOrderOnBC = async (order: OrderRequest) => {
    try {
      const res = await api.get(`/drugs/orders/${order.requestId}/verify-integrity`);
      const integrityData = res.data;
      setOrders((prev) =>
        prev.map((o) =>
          o.requestId === order.requestId
            ? { ...o, bcVerified: true, integrity: integrityData }
            : o,
        ),
      );
      if (integrityData.isValid) {
        showToast(
          'Dáta overené v súkromnom kanáli. Dáta sú zhodné s blockchainom.',
          'success',
        );
      } else {
        showToast('Zistený nesúlad dát! Skontrolujte detaily auditného záznamu.', 'error');
      }
    } catch {
      showToast('Blockchain overenie zlyhalo. Dáta nemusia byť dostupné.', 'error');
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  return { batches, catalog, orders, isRefreshing, fetchData, handleSyncCatalog, verifyOrderOnBC };
}
