export declare class FileMetadata {
    cid: string;
    name: string;
    type: string;
    size: number;
}
export declare class FulfillmentLink {
    batchID: string;
    quantity: number;
    timestamp: string;
}
export declare class PriceOfferHistory {
    price: number;
    timestamp: string;
}
export declare class DrugDefinition {
    id: string;
    name: string;
    composition: string;
    recommendedDosage: string;
    intakeInfo?: string | undefined;
    metadata?: string | undefined;
    leaflet?: FileMetadata | undefined;
    gallery: FileMetadata[];
    manufacturer: string;
    createdAt: string;
}
export declare class DrugBatch {
    batchID: string;
    drugID: string;
    drugName: string;
    manufacturer: string;
    ownerOrg: string;
    quantity: number;
    parentBatchID?: string | undefined;
    unit: string;
    expiryDate: string;
    status: string;
}
export declare class PrivateBatchData {
    batchID: string;
    quantity: number;
    price: number;
    metadata?: string | undefined;
}
export declare class PrivateOrderData {
    requestId: string;
    drugID: string;
    drugName: string;
    manufacturerOrg: string;
    pharmacyOrg: string;
    quantity: number;
    unit: string;
    status: string;
    createdAt: string;
    fileAttachments: FileMetadata[];
    priceOffer?: number | undefined;
    finalAgreedPrice?: number | undefined;
    rejectionReason?: string | undefined;
    priceOffers: PriceOfferHistory[];
    fulfillments: FulfillmentLink[];
}
//# sourceMappingURL=drug.d.ts.map