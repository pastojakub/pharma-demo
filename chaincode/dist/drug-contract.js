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
exports.DrugContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let DrugContract = class DrugContract extends fabric_contract_api_1.Contract {
    getCollectionName(ctx, pharmacyMsp) {
        const mspId = (pharmacyMsp || ctx.clientIdentity.getMSPID()).trim();
        if (mspId === 'LekarenAMSP')
            return 'collectionLekarenA';
        if (mspId === 'LekarenBMSP')
            return 'collectionLekarenB';
        if (mspId === 'VyrobcaMSP')
            return 'collectionPricing';
        throw new Error(`MSP ID ${mspId} nemá priradenú žiadnu súkromnú kolekciu.`);
    }
    getTransientValue(ctx, key) {
        const transientMap = ctx.stub.getTransient();
        if (!transientMap.has(key)) {
            throw new Error(`Chýbajúce transientné dáta: ${key}`);
        }
        return transientMap.get(key).toString();
    }
    async addToRegistry(ctx, registryKey, id, collection) {
        let registryBytes;
        if (collection) {
            registryBytes = await ctx.stub.getPrivateData(collection, registryKey);
        }
        else {
            registryBytes = await ctx.stub.getState(registryKey);
        }
        let registry = [];
        if (registryBytes && registryBytes.length > 0) {
            try {
                registry = JSON.parse(registryBytes.toString());
            }
            catch (e) {
                registry = [];
            }
        }
        if (!registry.includes(id)) {
            registry.push(id);
            if (collection) {
                await ctx.stub.putPrivateData(collection, registryKey, Buffer.from(JSON.stringify(registry)));
            }
            else {
                await ctx.stub.putState(registryKey, Buffer.from(JSON.stringify(registry)));
            }
        }
    }
    emitEvent(ctx, name, payload) {
        ctx.stub.setEvent(name, Buffer.from(JSON.stringify(payload)));
    }
    async addDrugDefinition(ctx, id, name, composition, dosage, intake, meta, leafletJSON, galleryJSON) {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Iba výrobca môže pridávať definície liekov.');
        }
        const drug = {
            id, name, composition, recommendedDosage: dosage,
            intakeInfo: intake, metadata: meta,
            leaflet: JSON.parse(leafletJSON),
            gallery: JSON.parse(galleryJSON),
            manufacturer: ctx.clientIdentity.getMSPID(),
            createdAt: ctx.stub.getTxTimestamp().seconds.toString()
        };
        const key = `DEF_${id}`;
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(drug)));
        await this.addToRegistry(ctx, 'REGISTRY_DEFINITIONS', key);
        this.emitEvent(ctx, 'DrugDefinitionAdded', { id, name });
    }
    async initBatch(ctx, batchID, drugID, drugName, manufacturer, expiryDate, unit) {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Len výrobca môže vytvoriť novú šaržu.');
        }
        const price = Number(this.getTransientValue(ctx, 'price'));
        const quantity = Number(this.getTransientValue(ctx, 'quantity'));
        const metadata = this.getTransientValue(ctx, 'metadata');
        const drugBatch = {
            batchID, drugID, drugName, manufacturer,
            ownerOrg: ctx.clientIdentity.getMSPID(),
            quantity,
            unit, expiryDate, status: 'INITIALIZED'
        };
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(drugBatch)));
        await this.addToRegistry(ctx, 'REGISTRY_BATCHES', batchID);
        const collection = this.getCollectionName(ctx);
        const privateData = { batchID, price, quantity, metadata };
        await ctx.stub.putPrivateData(collection, batchID, Buffer.from(JSON.stringify(privateData)));
        await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', batchID, collection);
        this.emitEvent(ctx, 'BatchCreated', { batchID, drugID, drugName });
    }
    async requestDrug(ctx, requestID, drugID, drugName, manufacturerOrg, unit, fileAttachmentsJSON) {
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        if (!pharmacyMsp.startsWith('Lekaren')) {
            throw new Error('Iba lekárne môžu odosielať požiadavky.');
        }
        const quantity = Number(this.getTransientValue(ctx, 'quantity'));
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const order = {
            requestId: requestID, drugID, drugName, manufacturerOrg, pharmacyOrg: pharmacyMsp,
            quantity, unit, status: 'REQUESTED',
            createdAt: ctx.stub.getTxTimestamp().seconds.toString(),
            fileAttachments: JSON.parse(fileAttachmentsJSON),
            priceOffers: [], fulfillments: []
        };
        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        await this.addToRegistry(ctx, 'REGISTRY_ORDERS', requestID, collection);
        this.emitEvent(ctx, 'OrderRequested', { requestID, pharmacyMsp, drugName });
    }
    async providePriceOffer(ctx, requestID, pharmacyMsp) {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Iba výrobca môže poskytnúť cenovú ponuku.');
        }
        const price = Number(this.getTransientValue(ctx, 'price'));
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0)
            throw new Error('Požiadavka nenájdená.');
        const order = JSON.parse(orderJSON.toString());
        order.status = 'OFFER_MADE';
        order.priceOffer = price;
        order.priceOffers.push({ price, timestamp: ctx.stub.getTxTimestamp().seconds.toString() });
        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'PriceOfferProvided', { requestID, pharmacyMsp });
    }
    async finalizeAgreement(ctx, requestID) {
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const price = Number(this.getTransientValue(ctx, 'price'));
        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0)
            throw new Error('Požiadavka neexistuje.');
        const order = JSON.parse(orderJSON.toString());
        order.status = 'APPROVED';
        order.finalAgreedPrice = price;
        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'AgreementFinalized', { requestID, pharmacyMsp });
    }
    async transferOwnership(ctx, batchID, newOwnerOrg, requestID) {
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);
        const qSent = Number(this.getTransientValue(ctx, 'quantity'));
        let price;
        try {
            price = Number(this.getTransientValue(ctx, 'price'));
        }
        catch (e) { }
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0)
            throw new Error('Šarža nenájdená.');
        const batch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId)
            throw new Error('Nie ste vlastníkom šarže.');
        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0)
            throw new Error('Súkromné dáta nenájdené.');
        const priv = JSON.parse(privJSON.toString());
        if (qSent > priv.quantity)
            throw new Error('Nedostatok zásob.');
        const effectivePrice = price !== undefined ? price : priv.price;
        // Ak ide o fulfillment objednávky, zaznamenáme to on-chain
        if (requestID) {
            const orderCol = this.getCollectionName(ctx, newOwnerOrg.startsWith('Lekaren') ? newOwnerOrg : mspId);
            const orderJSON = await ctx.stub.getPrivateData(orderCol, requestID);
            if (orderJSON && orderJSON.length > 0) {
                const order = JSON.parse(orderJSON.toString());
                order.fulfillments.push({
                    batchID: batchID,
                    quantity: qSent,
                    timestamp: ctx.stub.getTxTimestamp().seconds.toString()
                });
                await ctx.stub.putPrivateData(orderCol, requestID, Buffer.from(JSON.stringify(order)));
            }
        }
        let resultingBatchID = batchID;
        if (qSent < priv.quantity) {
            priv.quantity -= qSent;
            await ctx.stub.putPrivateData(collection, batchID, Buffer.from(JSON.stringify(priv)));
            // Update original public batch quantity
            batch.quantity = priv.quantity;
            await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
            const newID = `${batchID}-S${ctx.stub.getTxID().substring(0, 6)}`;
            const newBatch = {
                ...batch,
                batchID: newID,
                ownerOrg: newOwnerOrg,
                quantity: qSent,
                status: 'IN_TRANSIT',
                parentBatchID: batchID
            };
            await ctx.stub.putState(newID, Buffer.from(JSON.stringify(newBatch)));
            await this.addToRegistry(ctx, 'REGISTRY_BATCHES', newID);
            const targetCol = this.getCollectionName(ctx, newOwnerOrg);
            const targetPriv = { batchID: newID, price: effectivePrice, quantity: qSent, metadata: priv.metadata };
            await ctx.stub.putPrivateData(targetCol, newID, Buffer.from(JSON.stringify(targetPriv)));
            await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', newID, targetCol);
            resultingBatchID = newID;
        }
        else {
            batch.ownerOrg = newOwnerOrg;
            batch.status = 'IN_TRANSIT';
            batch.quantity = qSent;
            await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
            await ctx.stub.deletePrivateData(collection, batchID);
            const targetCol = this.getCollectionName(ctx, newOwnerOrg);
            const targetPriv = { batchID: batchID, price: effectivePrice, quantity: qSent, metadata: priv.metadata };
            await ctx.stub.putPrivateData(targetCol, batchID, Buffer.from(JSON.stringify(targetPriv)));
            await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', batchID, targetCol);
            resultingBatchID = batchID;
        }
        this.emitEvent(ctx, 'BatchTransferred', { batchID: resultingBatchID, from: mspId, to: newOwnerOrg });
        return resultingBatchID;
    }
    async confirmDelivery(ctx, batchID) {
        const mspId = ctx.clientIdentity.getMSPID();
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0)
            throw new Error('Šarža nenájdená.');
        const batch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId)
            throw new Error('Nie ste vlastníkom tejto šarže.');
        batch.status = 'DELIVERED';
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        this.emitEvent(ctx, 'BatchDelivered', { batchID, owner: mspId });
    }
    async sellToConsumer(ctx, batchID) {
        const mspId = ctx.clientIdentity.getMSPID();
        const qSold = Number(this.getTransientValue(ctx, 'quantity'));
        const collection = this.getCollectionName(ctx, mspId);
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0)
            throw new Error(`Šarža ${batchID} nenájdená.`);
        const batch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId)
            throw new Error(`Nie ste vlastníkom šarže ${batchID}. Aktuálny vlastník: ${batch.ownerOrg}`);
        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0)
            throw new Error(`Súkromné dáta pre šaržu ${batchID} nenájdené.`);
        const priv = JSON.parse(privJSON.toString());
        if (qSold > priv.quantity)
            throw new Error(`Nedostatok zásob. Požadované: ${qSold}, Dostupné: ${priv.quantity}`);
        priv.quantity -= qSold;
        batch.quantity = priv.quantity;
        if (priv.quantity === 0) {
            batch.status = 'SOLD';
            batch.ownerOrg = 'CONSUMER';
        }
        // Always update both states to ensure sync works correctly
        await ctx.stub.putPrivateData(collection, batchID, Buffer.from(JSON.stringify(priv)));
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        this.emitEvent(ctx, 'DrugSold', { batchID, quantity: qSold });
    }
    async returnToManufacturer(ctx, batchID, manufacturerOrg) {
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0)
            throw new Error('Šarža nenájdená.');
        const batch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId)
            throw new Error('Iba aktuálny vlastník môže vrátiť šaržu.');
        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0)
            throw new Error('Súkromné dáta nenájdené.');
        const priv = JSON.parse(privJSON.toString());
        batch.ownerOrg = manufacturerOrg;
        batch.status = 'RETURNED';
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        await ctx.stub.deletePrivateData(collection, batchID);
        const targetCol = this.getCollectionName(ctx, manufacturerOrg);
        await ctx.stub.putPrivateData(targetCol, batchID, Buffer.from(JSON.stringify(priv)));
        this.emitEvent(ctx, 'BatchReturned', { batchID, from: mspId, to: manufacturerOrg });
    }
    async emergencyRecall(ctx, batchID) {
        if (ctx.clientIdentity.getMSPID() !== 'SUKLMSP') {
            throw new Error('Iba regulátor (ŠÚKL) môže vyhlásiť sťahovanie z trhu.');
        }
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0)
            throw new Error('Šarža nenájdená.');
        const batch = JSON.parse(batchJSON.toString());
        batch.status = 'RECALLED';
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        this.emitEvent(ctx, 'EmergencyRecall', { batchID });
    }
    async rejectRequest(ctx, requestID, pharmacyMsp, reason) {
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'VyrobcaMSP' && mspId !== pharmacyMsp)
            throw new Error('Nedostatočné oprávnenia.');
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0)
            throw new Error('Požiadavka neexistuje.');
        const order = JSON.parse(orderJSON.toString());
        order.status = 'REJECTED';
        order.rejectionReason = reason;
        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'RequestRejected', { requestID, pharmacyMsp });
    }
    async queryHistory(ctx, batchID) {
        const allResults = [];
        let currentID = batchID;
        const processedIDs = new Set();
        while (currentID && !processedIDs.has(currentID)) {
            processedIDs.add(currentID);
            const historyIterator = await ctx.stub.getHistoryForKey(currentID);
            let res = await historyIterator.next();
            let parentID = undefined;
            while (!res.done) {
                if (res.value) {
                    const jsonRes = {};
                    jsonRes.txId = res.value.txId;
                    const ts = res.value.timestamp;
                    jsonRes.timestamp = {
                        seconds: ts.seconds?.low || ts.seconds || 0,
                        nanos: ts.nanos || 0
                    };
                    jsonRes.isDelete = res.value.isDelete;
                    try {
                        const data = JSON.parse(res.value.value.toString('utf8'));
                        jsonRes.data = data;
                        if (data.parentBatchID && !parentID) {
                            parentID = data.parentBatchID;
                        }
                    }
                    catch (err) {
                        jsonRes.data = res.value.value.toString('utf8');
                    }
                    allResults.push(jsonRes);
                }
                res = await historyIterator.next();
            }
            await historyIterator.close();
            if (parentID && parentID !== currentID) {
                currentID = parentID;
            }
            else {
                currentID = '';
            }
        }
        allResults.sort((a, b) => {
            const timeA = Number(a.timestamp.seconds) + Number(a.timestamp.nanos) / 1e9;
            const timeB = Number(b.timestamp.seconds) + Number(b.timestamp.nanos) / 1e9;
            return timeB - timeA;
        });
        return JSON.stringify(allResults);
    }
    async readDrugDefinition(ctx, id) {
        return await ctx.stub.getState(`DEF_${id}`);
    }
    async readBatch(ctx, batchID) {
        return await ctx.stub.getState(batchID);
    }
    async readPrivateOrder(ctx, requestID, pharmacyMsp) {
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        return await ctx.stub.getPrivateData(collection, requestID);
    }
    async GetAllDrugDefinitions(ctx) {
        const registryBytes = await ctx.stub.getState('REGISTRY_DEFINITIONS');
        if (!registryBytes || registryBytes.length === 0)
            return JSON.stringify([]);
        const keys = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getState(key);
            if (val && val.length > 0)
                results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }
    async GetAllDrugs(ctx) {
        const registryBytes = await ctx.stub.getState('REGISTRY_BATCHES');
        if (!registryBytes || registryBytes.length === 0)
            return JSON.stringify([]);
        const keys = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getState(key);
            if (val && val.length > 0)
                results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }
    async queryPrivateOrders(ctx, pharmacyMsp) {
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const registryBytes = await ctx.stub.getPrivateData(collection, 'REGISTRY_ORDERS');
        if (!registryBytes || registryBytes.length === 0)
            return JSON.stringify([]);
        const keys = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getPrivateData(collection, key);
            if (val && val.length > 0)
                results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }
    async RegisterExistingKey(ctx, registryKey, id, collection) {
        await this.addToRegistry(ctx, registryKey, id, collection);
    }
    async getBatchPrice(ctx, batchID) {
        try {
            const collection = this.getCollectionName(ctx);
            const privJSON = await ctx.stub.getPrivateData(collection, batchID);
            if (!privJSON || privJSON.length === 0)
                return JSON.stringify({ error: 'Data not available' });
            return privJSON.toString();
        }
        catch (e) {
            return JSON.stringify({ error: e.message });
        }
    }
};
exports.DrugContract = DrugContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "addDrugDefinition", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "initBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "requestDrug", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "providePriceOffer", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "finalizeAgreement", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "transferOwnership", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "confirmDelivery", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "sellToConsumer", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "returnToManufacturer", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "emergencyRecall", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "rejectRequest", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "queryHistory", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "readDrugDefinition", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "readBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "readPrivateOrder", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "GetAllDrugDefinitions", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "GetAllDrugs", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "queryPrivateOrders", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "RegisterExistingKey", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "getBatchPrice", null);
exports.DrugContract = DrugContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'DrugContract', description: 'Smart kontrakt pre sledovanie šarží liečiv' })
], DrugContract);
//# sourceMappingURL=drug-contract.js.map