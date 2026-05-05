'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import {
  Batch, DrugDefinition, TransactionHistory, IntegrityStatus,
  FileMetadata, NewDrug, NewBatch, Offer, Fulfillment, PricingSummary,
  OrderRequest, User,
} from '../types';
import { DashboardData } from './useDashboardData';

type ToastType = 'success' | 'error' | 'info';
type ModalTab = 'details' | 'batches' | 'pricing';
type CheckDoneFn = (data: DashboardData, attempts: number) => boolean;

interface Params {
  user: User | null;
  catalog: DrugDefinition[];
  batches: Batch[];
  orders: OrderRequest[];
  fetchData: () => Promise<DashboardData | null>;
  showToast: (msg: string, type?: ToastType) => void;
  startPolling: (checkDone: CheckDoneFn) => void;
}

const EMPTY_BATCH: NewBatch = {
  id: '', drugID: '', name: '', manufacturer: '',
  expiryDate: '', price: 0, quantity: 1, unit: 'ks',
};

const EMPTY_DRUG: NewDrug = {
  name: '', composition: '', recommendedDosage: '', intakeInfo: '', leaflet: null, gallery: [],
};

export function useDashboardActions({
  user, catalog, batches, orders, fetchData, showToast, startPolling,
}: Params) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('INFO');
  const [modalTab, setModalTab] = useState<ModalTab>('details');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugDefinition | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
  const [newBatch, setNewBatch] = useState<NewBatch>(EMPTY_BATCH);
  const [newDrug, setNewDrug] = useState<NewDrug>(EMPTY_DRUG);
  const [transferQuantity, setTransferQuantity] = useState(0);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [offerPrice, setOfferPrice] = useState(0);
  const [targetOrg, setTargetOrg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fulfillmentBatches, setFulfillmentBatches] = useState<Fulfillment[]>([{ batchID: '', quantity: 0 }]);
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [pricingSummary, setPricingSummary] = useState<PricingSummary[]>([]);

  const [viewerGallery, setViewerGallery] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const backendUrl = api.defaults.baseURL || 'http://localhost:3001';

  useEffect(() => {
    if (!isModalOpen) return;
    const id = (selectedBatch as any)?.requestId || selectedBatch?.batchID;
    if (!id) return;
    if (modalType === 'ORDER_DETAILS' || modalType === 'APPROVE_OFFER' || modalType === 'OFFER') {
      api.get(`/drugs/offers/${id}`).then((res) => setOffers(res.data)).catch(() => {});
    }
  }, [orders]);

  const openViewer = (url: string, gallery: FileMetadata[]) => {
    const urls = gallery.map((f) => (f.url.startsWith('http') ? f.url : backendUrl + f.url));
    const idx = urls.indexOf(url);
    setViewerGallery(urls);
    setViewerIndex(idx >= 0 ? idx : 0);
    setIsViewerOpen(true);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'leaflet' | 'gallery',
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      if (type === 'leaflet') {
        formData.append('file', files[0]);
        const res = await api.post('/upload/file', formData);
        setNewDrug((prev) => ({ ...prev, leaflet: { ...res.data, category: 'LEAFLET' } }));
      } else {
        Array.from(files).forEach((f: File) => formData.append('files', f));
        const res = await api.post('/upload/multiple', formData);
        const newImages = res.data.map((img: FileMetadata) => ({ ...img, category: 'GALLERY' }));
        setNewDrug((prev) => ({ ...prev, gallery: [...prev.gallery, ...newImages] }));
      }
      showToast('Súbor bol úspešne nahraný.', 'success');
    } catch {
      showToast('Chyba pri nahrávaní.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAction = async (
    type: string,
    batch?: Batch,
    drug?: DrugDefinition,
    tab?: ModalTab,
  ) => {
    const finalType = type === 'INFO' && batch ? 'BATCH_INFO' : type;

    setModalType(finalType);
    setModalTab(tab || 'details');

    if (type === 'SYNC_ORDER' && batch) {
      try {
        const id = batch.batchID || (batch as any).requestId;
        await api.post(`/drugs/orders/${id}/sync`);
        showToast('Dáta boli úspešne zosynchronizované z blockchainu.', 'success');
        await fetchData();
        setModalType('');
      } catch {
        showToast('Synchronizácia zlyhala.', 'error');
      }
      return;
    }

    if (type === 'SYNC_BATCH' && batch) {
      try {
        await api.post('/drugs/sync-batch', { id: batch.batchID });
        showToast('Šarža bola úspešne zosynchronizované z blockchainu.', 'success');
        await fetchData();
        setModalType('');
      } catch {
        showToast('Synchronizácia zlyhala.', 'error');
      }
      return;
    }

    setHistory([]);
    setIntegrity(null);
    setSelectedOffer(null);
    setOffers([]);
    setFulfillmentBatches([{ batchID: '', quantity: 0 }]);
    setFulfillments([]);
    setPricingSummary([]);

    if (finalType === 'CREATE_DRUG') setNewDrug(EMPTY_DRUG);

    if (finalType === 'REQUEST') {
      setNewBatch(
        drug
          ? { ...EMPTY_BATCH, drugID: String(drug.id), name: drug.name }
          : EMPTY_BATCH,
      );
    }

    if (drug) {
      setSelectedDrug(drug);
      if (finalType === 'EDIT_DRUG' || finalType === 'CREATE_BATCH' || finalType === 'INFO') {
        setNewDrug({
          name: drug.name,
          composition: drug.composition,
          recommendedDosage: drug.recommendedDosage,
          intakeInfo: drug.intakeInfo || '',
          leaflet: drug.files?.find((f) => f.category === 'LEAFLET') || null,
          gallery: drug.files?.filter((f) => f.category === 'GALLERY') || [],
        });
      }
      if (user?.role === 'manufacturer') {
        try {
          const res = await api.get(`/drugs/catalog/${drug.id}/pricing-summary`);
          setPricingSummary(res.data);
        } catch {}
      }
      if (finalType === 'CREATE_BATCH') {
        setNewBatch({
          id: `B-${Date.now().toString().slice(-6)}`,
          drugID: String(drug.id),
          name: drug.name,
          manufacturer: user?.org || '',
          expiryDate: '',
          price: 0,
          quantity: 1,
          unit: 'ks',
        });
      }
    } else {
      setSelectedDrug(null);
    }

    if (batch) {
      setSelectedBatch(batch);
      const id = batch.batchID || (batch as any).requestId;
      const drugId = batch.drugID || (batch as any).drugId;

      if (drugId) {
        const drugInfo = catalog.find((d) => String(d.id) === String(drugId));
        if (drugInfo) setSelectedDrug(drugInfo);
      }

      setTransferQuantity(batch.quantity);
      setOfferPrice(batch.priceOffer || batch.price || 0);

      try {
        if (finalType === 'OFFER' || finalType === 'APPROVE_OFFER' || finalType === 'ORDER_DETAILS') {
          const [offersRes, integrityRes] = await Promise.all([
            api.get(`/drugs/offers/${id}`),
            api.get(`/drugs/orders/${id}/verify-integrity`),
          ]);
          setOffers(offersRes.data);
          setIntegrity(integrityRes.data);
        }
        if (finalType === 'VIEW_FULFILLMENT' || finalType === 'FULFILL') {
          const [fullRes, integrityRes] = await Promise.all([
            api.get(`/drugs/orders/${id}/fulfillments`),
            api.get(`/drugs/orders/${id}/verify-integrity`),
          ]);
          setFulfillments(fullRes.data);
          setIntegrity(integrityRes.data);
        }
      } catch {}

      if (finalType === 'HISTORY') {
        const [h, i] = await Promise.all([
          api.get(`/drugs/${id}/history`),
          api.get(`/drugs/${id}/verify-integrity`),
        ]);
        setHistory(h.data);
        setIntegrity(i.data);
      }
    } else {
      setSelectedBatch(null);
    }

    setIsModalOpen(true);
  };

  const executeAction = async () => {
    const currentModalType = modalType;
    const currentNewBatchId = newBatch.id;
    const currentSelectedBatchId = selectedBatch?.batchID;
    const currentRequestId = (selectedBatch as any)?.requestId;
    const originalQuantity = selectedBatch?.quantity || 0;
    const batchName = newBatch.name;
    const batchQty = newBatch.quantity;

    try {
      if (modalType === 'CREATE_BATCH' && !newBatch.expiryDate) {
        showToast('Prosím, zadajte dátum exspirácie.', 'error');
        return;
      }
      if (modalType === 'TRANSFER' && !targetOrg) {
        showToast('Prosím, vyberte cieľovú organizáciu.', 'error');
        return;
      }

      setIsModalOpen(false);
      showToast('Odosiela sa požiadavka na blockchain...', 'info');

      let response;
      if (modalType === 'CREATE_DRUG' || modalType === 'EDIT_DRUG') {
        const files: FileMetadata[] = [];
        if (newDrug.leaflet) files.push(newDrug.leaflet);
        newDrug.gallery.forEach((f) => files.push(f));
        const payload = {
          name: newDrug.name, composition: newDrug.composition,
          recommendedDosage: newDrug.recommendedDosage, intakeInfo: newDrug.intakeInfo, files,
        };
        if (modalType === 'CREATE_DRUG') {
          response = await api.post('/drug-catalog', payload);
        } else if (selectedDrug) {
          response = await api.patch(`/drug-catalog/${selectedDrug.id}`, payload);
        }
      } else if (modalType === 'CREATE_BATCH') {
        response = await api.post('/drugs', newBatch);
      } else if (modalType === 'REQUEST') {
        response = await api.post('/drugs/request', {
          requestID: `REQ-${Date.now().toString().slice(-6)}`,
          drugID: newBatch.drugID, name: newBatch.name,
          manufacturerOrg: newBatch.manufacturer, quantity: newBatch.quantity, unit: newBatch.unit,
        });
      } else if (modalType === 'OFFER' && selectedBatch) {
        const requestID = (selectedBatch as any).requestId || selectedBatch.batchID;
        response = await api.post('/drugs/offer', {
          requestID, price: offerPrice,
          pharmacyOrg: (selectedBatch as any).pharmacyOrg || selectedBatch.requesterOrg,
        });
      } else if (modalType === 'REJECT' && selectedBatch) {
        const requestID = (selectedBatch as any).requestId || selectedBatch.batchID;
        response = await api.post('/drugs/reject-request', {
          requestID, pharmacyOrg: (selectedBatch as any).pharmacyOrg || selectedBatch.requesterOrg,
        });
      } else if (modalType === 'APPROVE_OFFER' && selectedBatch && selectedOffer) {
        const requestID = (selectedBatch as any).requestId || selectedBatch.batchID;
        response = await api.post('/drugs/approve-offer', { requestID, offerID: selectedOffer.id });
      } else if (modalType === 'TRANSFER' && selectedBatch) {
        response = await api.post('/transfer', {
          batchID: selectedBatch.batchID, newOwnerOrg: targetOrg,
          quantity: transferQuantity, status: 'IN_TRANSIT',
        });
      } else if (modalType === 'SELL' && selectedBatch) {
        response = await api.post('/drugs/sell', { id: selectedBatch.batchID, quantity: sellQuantity });
      } else if (modalType === 'RECEIVE' && selectedBatch) {
        response = await api.post('/drugs/receive', { id: selectedBatch.batchID });
      } else if (modalType === 'FULFILL' && selectedBatch) {
        const requestId = (selectedBatch as any).requestId;
        response = await api.post('/drugs/fulfill-order', {
          requestId,
          batches: fulfillmentBatches.filter((b) => b.batchID && b.quantity > 0),
        });
      }

      showToast('Dáta boli úspešne zapísané na blockchain.', 'success');

      const returnedId = response?.data?.batchID || response?.data;

      startPolling((data, attempts) => {
        if (currentModalType === 'CREATE_BATCH') return data.batches.some((b) => b.batchID === currentNewBatchId);
        if (currentModalType === 'FULFILL') return data.orders.some((o) => o.requestId === currentRequestId && (o.status === 'FULFILLED' || o.status === 'ORDERED'));
        if (currentModalType === 'RECEIVE') { const b = data.batches.find((b) => b.batchID === currentSelectedBatchId); return !!b && (b.status === 'DELIVERED' || b.status === 'OWNED'); }
        if (currentModalType === 'SELL') { const b = data.batches.find((b) => b.batchID === currentSelectedBatchId); return !b || b.status === 'SOLD' || b.quantity < originalQuantity; }
        if (currentModalType === 'TRANSFER') { const b = data.batches.find((b) => b.batchID === currentSelectedBatchId); return !b || b.status === 'IN_TRANSIT' || b.quantity < originalQuantity; }
        if (['APPROVE_OFFER', 'REJECT', 'OFFER', 'REQUEST'].includes(currentModalType)) {
          const o = data.orders.find((o) => o.requestId === currentRequestId || o.requestId === returnedId);
          if (currentModalType === 'REQUEST') return !!data.orders.find((o) => o.drugName === batchName && o.quantity === batchQty);
          if (currentModalType === 'APPROVE_OFFER') return !!o && o.status === 'APPROVED';
          if (currentModalType === 'REJECT') return !!o && o.status === 'REJECTED';
          if (currentModalType === 'OFFER') return !!o && o.status === 'OFFER_MADE';
        }
        return attempts >= 3;
      });
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Akcia zlyhala.', 'error');
    }
  };

  return {
    isModalOpen, setIsModalOpen,
    modalType, setModalType,
    modalTab, setModalTab,
    selectedBatch, selectedDrug,
    selectedOffer, setSelectedOffer,
    offers, history, integrity,
    newBatch, setNewBatch,
    newDrug, setNewDrug,
    transferQuantity, setTransferQuantity,
    sellQuantity, setSellQuantity,
    offerPrice, setOfferPrice,
    targetOrg, setTargetOrg,
    isUploading,
    drugSearch, setDrugSearch,
    isDropdownOpen, setIsDropdownOpen,
    fulfillmentBatches, setFulfillmentBatches,
    fulfillments, pricingSummary,
    viewerGallery, viewerIndex, setViewerIndex, isViewerOpen, setIsViewerOpen,
    fileInputRef, galleryInputRef,
    backendUrl,
    openViewer,
    handleFileUpload,
    handleAction,
    executeAction,
  };
}
