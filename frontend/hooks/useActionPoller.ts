import { useRef, useEffect } from 'react';
import { DashboardData } from './useDashboardData';

type CheckDoneFn = (data: DashboardData, attempts: number) => boolean;

type ToastType = 'success' | 'error' | 'info';

export function useActionPoller(
  fetchData: () => Promise<DashboardData | null>,
  showToast: (msg: string, type?: ToastType) => void,
) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (checkDone: CheckDoneFn) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      const newData = await fetchData();
      attempts++;
      const isDone = newData ? checkDone(newData, attempts) : false;
      if (isDone) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      } else if (attempts >= 12) {
        showToast('Blockchain potvrdenie trvá dlhšie. Dáta sa aktualizujú na pozadí.', 'info');
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 3000);
  };

  return { startPolling };
}
