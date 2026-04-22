// drug.ts
import { Object, Property } from 'fabric-contract-api';

@Object()
export class DrugBatch {
    @Property()
    public batchID: string = '';

    @Property()
    public drugID: string = '';

    @Property()
    public drugName: string = '';

    @Property()
    public manufacturer: string = '';

    @Property()
    public ownerOrg: string = '';

    @Property()
    public quantity: number = 0; // New: Amount in the batch

    @Property()
    public unit: string = 'ks'; // New: Unit (pcs, boxes, etc.)

    @Property()
    public expiryDate: string = '';

    @Property()
    public status: 'INITIALIZED' | 'IN_TRANSIT' | 'DELIVERED' | 'SOLD' | 'RECALLED' | 'RETURNED' | 'REQUESTED' | 'OFFER_MADE' = 'INITIALIZED';
    
    @Property()
    public price?: number;

    @Property()
    public priceOffer?: number; // New: For the negotiation flow

    @Property()
    public metadata?: string | undefined;

    @Property()
    public requesterOrg?: string | undefined;
}
