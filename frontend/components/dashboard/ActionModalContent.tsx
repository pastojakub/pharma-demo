import React from 'react';
import {
  DrugDefinition,
  Batch,
  TransactionHistory,
  IntegrityStatus,
  Offer,
  Fulfillment,
  PricingSummary,
  NewDrug,
  NewBatch,
  User,
} from '../../types';
import { OrderDetailsModal } from './modals/OrderDetailsModal';
import { DrugInfoModal } from './modals/DrugInfoModal';
import { BatchInfoModal } from './modals/BatchInfoModal';
import { CreateEditDrugModal } from './modals/CreateEditDrugModal';
import { RequestModal } from './modals/RequestModal';
import { OfferModal } from './modals/OfferModal';
import { RejectModal } from './modals/RejectModal';
import { ApproveOfferModal } from './modals/ApproveOfferModal';
import { CreateBatchModal } from './modals/CreateBatchModal';
import { FulfillModal } from './modals/FulfillModal';
import { ViewFulfillmentModal } from './modals/ViewFulfillmentModal';
import { ReceiveModal } from './modals/ReceiveModal';
import { TransferModal } from './modals/TransferModal';
import { SellModal } from './modals/SellModal';
import { HistoryModal } from './modals/HistoryModal';

interface ActionModalContentProps {
  modalType: string;
  setModalType: (type: string) => void;
  modalTab: 'details' | 'batches' | 'pricing';
  setModalTab: (tab: 'details' | 'batches' | 'pricing') => void;
  selectedDrug: DrugDefinition | null;
  selectedBatch: Batch | null;
  batches: Batch[];
  newDrug: NewDrug;
  setNewDrug: (drug: NewDrug) => void;
  newBatch: NewBatch;
  setNewBatch: (batch: NewBatch) => void;
  catalog: DrugDefinition[];
  drugSearch: string;
  setDrugSearch: (search: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  offerPrice: number;
  setOfferPrice: (price: number) => void;
  offers: Offer[];
  selectedOffer: Offer | null;
  setSelectedOffer: (offer: Offer | null) => void;
  transferQuantity: number;
  setTransferQuantity: (qty: number) => void;
  sellQuantity: number;
  setSellQuantity: (qty: number) => void;
  history: TransactionHistory[];
  integrity: IntegrityStatus | null;
  backendUrl: string;
  handleFileUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'leaflet' | 'gallery',
  ) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  fulfillmentBatches: Fulfillment[];
  setFulfillmentBatches: (batches: Fulfillment[]) => void;
  fulfillments: Fulfillment[];
  user: User | null;
  pricingSummary: PricingSummary[];
  handleAction: (
    type: string,
    batch?: Batch,
    drug?: DrugDefinition,
    tab?: 'details' | 'batches' | 'pricing',
  ) => void;
  setSelectedImage?: (url: string | null) => void;
  targetOrg?: string;
  setTargetOrg?: (org: string) => void;
}

export const ActionModalContent: React.FC<ActionModalContentProps> = (props) => {
  const { modalType, selectedBatch, selectedDrug } = props;

  if (modalType === 'ORDER_DETAILS' && selectedBatch)
    return (
      <OrderDetailsModal
        selectedBatch={selectedBatch}
        integrity={props.integrity}
        offers={props.offers}
        user={props.user}
        selectedDrug={selectedDrug}
        setModalType={props.setModalType}
        setModalTab={props.setModalTab}
        handleAction={props.handleAction}
      />
    );

  if (modalType === 'INFO')
    return (
      <DrugInfoModal
        modalTab={props.modalTab}
        setModalTab={props.setModalTab}
        selectedDrug={selectedDrug}
        batches={props.batches}
        user={props.user}
        backendUrl={props.backendUrl}
        pricingSummary={props.pricingSummary}
        handleAction={props.handleAction}
        setSelectedImage={props.setSelectedImage}
      />
    );

  if (modalType === 'BATCH_INFO' && selectedBatch)
    return (
      <BatchInfoModal
        selectedBatch={selectedBatch}
        user={props.user}
        setModalType={props.setModalType}
        setModalTab={props.setModalTab}
        handleAction={props.handleAction}
      />
    );

  if (modalType === 'CREATE_DRUG' || modalType === 'EDIT_DRUG')
    return (
      <CreateEditDrugModal
        modalType={modalType}
        newDrug={props.newDrug}
        setNewDrug={props.setNewDrug}
        handleFileUpload={props.handleFileUpload}
        fileInputRef={props.fileInputRef}
        galleryInputRef={props.galleryInputRef}
        backendUrl={props.backendUrl}
      />
    );

  if (modalType === 'REQUEST')
    return (
      <RequestModal
        newBatch={props.newBatch}
        setNewBatch={props.setNewBatch}
        catalog={props.catalog}
        drugSearch={props.drugSearch}
        setDrugSearch={props.setDrugSearch}
        isDropdownOpen={props.isDropdownOpen}
        setIsDropdownOpen={props.setIsDropdownOpen}
      />
    );

  if (modalType === 'OFFER' && selectedBatch)
    return (
      <OfferModal
        selectedBatch={selectedBatch}
        offerPrice={props.offerPrice}
        setOfferPrice={props.setOfferPrice}
      />
    );

  if (modalType === 'REJECT') return <RejectModal />;

  if (modalType === 'APPROVE_OFFER')
    return (
      <ApproveOfferModal
        offers={props.offers}
        selectedOffer={props.selectedOffer}
        setSelectedOffer={props.setSelectedOffer}
      />
    );

  if (modalType === 'CREATE_BATCH')
    return <CreateBatchModal newBatch={props.newBatch} setNewBatch={props.setNewBatch} />;

  if (modalType === 'FULFILL' && selectedBatch)
    return (
      <FulfillModal
        selectedBatch={selectedBatch}
        batches={props.batches}
        fulfillmentBatches={props.fulfillmentBatches}
        setFulfillmentBatches={props.setFulfillmentBatches}
      />
    );

  if (modalType === 'VIEW_FULFILLMENT' && selectedBatch)
    return (
      <ViewFulfillmentModal
        selectedBatch={selectedBatch}
        fulfillments={props.fulfillments}
        batches={props.batches}
      />
    );

  if (modalType === 'RECEIVE' && selectedBatch)
    return <ReceiveModal selectedBatch={selectedBatch} />;

  if (modalType === 'TRANSFER' && selectedBatch)
    return (
      <TransferModal
        selectedBatch={selectedBatch}
        transferQuantity={props.transferQuantity}
        setTransferQuantity={props.setTransferQuantity}
        targetOrg={props.targetOrg}
        setTargetOrg={props.setTargetOrg}
      />
    );

  if (modalType === 'SELL')
    return (
      <SellModal
        selectedBatch={selectedBatch}
        selectedDrug={selectedDrug}
        batches={props.batches}
        user={props.user}
        sellQuantity={props.sellQuantity}
        setSellQuantity={props.setSellQuantity}
        handleAction={props.handleAction}
      />
    );

  if (modalType === 'HISTORY')
    return (
      <HistoryModal
        integrity={props.integrity}
        history={props.history}
        selectedBatch={selectedBatch}
        handleAction={props.handleAction}
      />
    );

  return null;
};
