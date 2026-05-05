"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateOrderData = exports.PrivateBatchData = exports.DrugBatch = exports.DrugDefinition = exports.PriceOfferHistory = exports.FulfillmentLink = exports.FileMetadata = void 0;
// drug.ts
const fabric_contract_api_1 = require("fabric-contract-api");
let FileMetadata = class FileMetadata {
    cid = "";
    name = "";
    type = "";
    size = 0;
};
exports.FileMetadata = FileMetadata;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], FileMetadata.prototype, "cid", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], FileMetadata.prototype, "name", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], FileMetadata.prototype, "type", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], FileMetadata.prototype, "size", void 0);
exports.FileMetadata = FileMetadata = __decorate([
    (0, fabric_contract_api_1.Object)()
], FileMetadata);
let FulfillmentLink = class FulfillmentLink {
    batchID = "";
    quantity = 0;
    timestamp = "";
};
exports.FulfillmentLink = FulfillmentLink;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], FulfillmentLink.prototype, "batchID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], FulfillmentLink.prototype, "quantity", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], FulfillmentLink.prototype, "timestamp", void 0);
exports.FulfillmentLink = FulfillmentLink = __decorate([
    (0, fabric_contract_api_1.Object)()
], FulfillmentLink);
let PriceOfferHistory = class PriceOfferHistory {
    price = 0;
    timestamp = "";
};
exports.PriceOfferHistory = PriceOfferHistory;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], PriceOfferHistory.prototype, "price", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PriceOfferHistory.prototype, "timestamp", void 0);
exports.PriceOfferHistory = PriceOfferHistory = __decorate([
    (0, fabric_contract_api_1.Object)()
], PriceOfferHistory);
let DrugDefinition = class DrugDefinition {
    id = "";
    name = "";
    composition = "";
    recommendedDosage = "";
    intakeInfo;
    metadata;
    leaflet;
    gallery = [];
    manufacturer = "";
    createdAt = "";
};
exports.DrugDefinition = DrugDefinition;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "id", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "name", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "composition", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "recommendedDosage", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], DrugDefinition.prototype, "intakeInfo", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], DrugDefinition.prototype, "metadata", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], DrugDefinition.prototype, "leaflet", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Array)
], DrugDefinition.prototype, "gallery", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "manufacturer", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugDefinition.prototype, "createdAt", void 0);
exports.DrugDefinition = DrugDefinition = __decorate([
    (0, fabric_contract_api_1.Object)()
], DrugDefinition);
let DrugBatch = class DrugBatch {
    batchID = "";
    drugID = "";
    drugName = "";
    manufacturer = "";
    ownerOrg = "";
    quantity = 0;
    parentBatchID;
    unit = "ks";
    expiryDate = "";
    status = "INITIALIZED";
};
exports.DrugBatch = DrugBatch;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "batchID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "drugID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "drugName", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "manufacturer", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "ownerOrg", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], DrugBatch.prototype, "quantity", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], DrugBatch.prototype, "parentBatchID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "unit", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "expiryDate", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], DrugBatch.prototype, "status", void 0);
exports.DrugBatch = DrugBatch = __decorate([
    (0, fabric_contract_api_1.Object)()
], DrugBatch);
let PrivateBatchData = class PrivateBatchData {
    batchID = "";
    quantity = 0;
    price = 0;
    metadata;
};
exports.PrivateBatchData = PrivateBatchData;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateBatchData.prototype, "batchID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], PrivateBatchData.prototype, "quantity", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], PrivateBatchData.prototype, "price", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], PrivateBatchData.prototype, "metadata", void 0);
exports.PrivateBatchData = PrivateBatchData = __decorate([
    (0, fabric_contract_api_1.Object)()
], PrivateBatchData);
let PrivateOrderData = class PrivateOrderData {
    requestId = "";
    drugID = "";
    drugName = "";
    manufacturerOrg = "";
    pharmacyOrg = "";
    quantity = 0;
    unit = "";
    status = "REQUESTED";
    createdAt = "";
    fileAttachments = [];
    priceOffer;
    finalAgreedPrice;
    rejectionReason;
    priceOffers = [];
    fulfillments = [];
};
exports.PrivateOrderData = PrivateOrderData;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "requestId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "drugID", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "drugName", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "manufacturerOrg", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "pharmacyOrg", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], PrivateOrderData.prototype, "quantity", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "unit", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "status", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], PrivateOrderData.prototype, "createdAt", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Array)
], PrivateOrderData.prototype, "fileAttachments", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], PrivateOrderData.prototype, "priceOffer", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], PrivateOrderData.prototype, "finalAgreedPrice", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Object)
], PrivateOrderData.prototype, "rejectionReason", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Array)
], PrivateOrderData.prototype, "priceOffers", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Array)
], PrivateOrderData.prototype, "fulfillments", void 0);
exports.PrivateOrderData = PrivateOrderData = __decorate([
    (0, fabric_contract_api_1.Object)()
], PrivateOrderData);
//# sourceMappingURL=drug.js.map