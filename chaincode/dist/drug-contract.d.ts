import { Context, Contract } from 'fabric-contract-api';
export declare class DrugContract extends Contract {
    private getCollectionName;
    private getTransientValue;
    private addToRegistry;
    private emitEvent;
    addDrugDefinition(ctx: Context, id: string, name: string, composition: string, dosage: string, intake: string, meta: string, leafletJSON: string, galleryJSON: string): Promise<void>;
    initBatch(ctx: Context, batchID: string, drugID: string, drugName: string, manufacturer: string, expiryDate: string, unit: string): Promise<void>;
    requestDrug(ctx: Context, requestID: string, drugID: string, drugName: string, manufacturerOrg: string, unit: string, fileAttachmentsJSON: string): Promise<void>;
    providePriceOffer(ctx: Context, requestID: string, pharmacyMsp: string): Promise<void>;
    finalizeAgreement(ctx: Context, requestID: string): Promise<void>;
    transferOwnership(ctx: Context, batchID: string, newOwnerOrg: string, requestID?: string): Promise<string>;
    confirmDelivery(ctx: Context, batchID: string): Promise<void>;
    sellToConsumer(ctx: Context, batchID: string): Promise<void>;
    returnToManufacturer(ctx: Context, batchID: string, manufacturerOrg: string): Promise<void>;
    emergencyRecall(ctx: Context, batchID: string): Promise<void>;
    rejectRequest(ctx: Context, requestID: string, pharmacyMsp: string, reason: string): Promise<void>;
    queryHistory(ctx: Context, batchID: string): Promise<string>;
    readDrugDefinition(ctx: Context, id: string): Promise<Uint8Array>;
    readBatch(ctx: Context, batchID: string): Promise<Uint8Array>;
    readPrivateOrder(ctx: Context, requestID: string, pharmacyMsp: string): Promise<Uint8Array>;
    GetAllDrugDefinitions(ctx: Context): Promise<string>;
    GetAllDrugs(ctx: Context): Promise<string>;
    queryPrivateOrders(ctx: Context, pharmacyMsp: string): Promise<string>;
    RegisterExistingKey(ctx: Context, registryKey: string, id: string, collection?: string): Promise<void>;
    getBatchPrice(ctx: Context, batchID: string): Promise<string>;
}
//# sourceMappingURL=drug-contract.d.ts.map