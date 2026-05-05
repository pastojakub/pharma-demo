// drug.ts
import { Object, Property } from "fabric-contract-api";

@Object()
export class FileMetadata {
	@Property() public cid: string = "";
	@Property() public name: string = "";
	@Property() public type: string = "";
	@Property() public size: number = 0;
}

@Object()
export class FulfillmentLink {
	@Property() public batchID: string = "";
	@Property() public quantity: number = 0;
	@Property() public timestamp: string = "";
}

@Object()
export class PriceOfferHistory {
	@Property() public price: number = 0;
	@Property() public timestamp: string = "";
}

@Object()
export class DrugDefinition {
	@Property() public id: string = "";
	@Property() public name: string = "";
	@Property() public composition: string = "";
	@Property() public recommendedDosage: string = "";
	@Property() public intakeInfo?: string | undefined;
	@Property() public metadata?: string | undefined;
	@Property() public leaflet?: FileMetadata | undefined;
	@Property() public gallery: FileMetadata[] = [];
	@Property() public manufacturer: string = "";
	@Property() public createdAt: string = "";
}

@Object()
export class DrugBatch {
	@Property() public batchID: string = "";
	@Property() public drugID: string = "";
	@Property() public drugName: string = "";
	@Property() public manufacturer: string = "";
	@Property() public ownerOrg: string = "";
	@Property() public quantity: number = 0;
	@Property() public parentBatchID?: string | undefined;
	@Property() public unit: string = "ks";
	@Property() public expiryDate: string = "";
	@Property() public status: string = "INITIALIZED";
}

@Object()
export class PrivateBatchData {
	@Property() public batchID: string = "";
	@Property() public quantity: number = 0;
	@Property() public price: number = 0;
	@Property() public metadata?: string | undefined;
}

@Object()
export class PrivateOrderData {
	@Property() public requestId: string = "";
	@Property() public drugID: string = "";
	@Property() public drugName: string = "";
	@Property() public manufacturerOrg: string = "";
	@Property() public pharmacyOrg: string = "";
	@Property() public quantity: number = 0;
	@Property() public unit: string = "";
	@Property() public status: string = "REQUESTED";
	@Property() public createdAt: string = "";
	@Property() public fileAttachments: FileMetadata[] = [];
	@Property() public priceOffer?: number | undefined;
	@Property() public finalAgreedPrice?: number | undefined;
	@Property() public rejectionReason?: string | undefined;
	@Property() public priceOffers: PriceOfferHistory[] = [];
	@Property() public fulfillments: FulfillmentLink[] = [];


}
