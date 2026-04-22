export interface User {
  email: string;
  role: string;
  org: string;
}

export interface Batch {
  batchID: string;
  drugID: string;
  drugName: string;
  manufacturer: string;
  ownerOrg: string;
  expiryDate: string;
  status: string;
  quantity: number;
  unit: string;
  price?: number;
  priceOffer?: number;
  metadata?: string;
  requesterOrg?: string;
  pharmacyOrg?: string;
}

export interface OrderRequest {
  id: number;
  requestId: string;
  drugId: string;
  drugName: string;
  manufacturerOrg: string;
  pharmacyOrg: string;
  quantity: number;
  unit: string;
  status: string;
  createdAt: string;
  bcVerified?: boolean;
  integrity?: IntegrityStatus;
}

export interface FileMetadata {
  id?: number;
  url: string;
  name: string;
  type: string;
  size: number;
  category: 'GALLERY' | 'LEAFLET' | 'OTHER';
}

export interface DrugDefinition {
  id: number;
  name: string;
  composition: string;
  recommendedDosage: string;
  intakeInfo?: string;
  files: FileMetadata[];
}

export interface TransactionHistory {
  txId: string;
  timestamp: { seconds: { low: number } | number, nanos: number };
  isDelete: boolean;
  data: any;
}

export interface IntegrityStatus {
  isValid: boolean;
  mismatchFields?: string[];
  dbData?: any;
  bcData?: any;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  createdAt: string;
}
