import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { DrugBatch, DrugDefinition, PrivateOrderData, PrivateBatchData, FileMetadata, FulfillmentLink, PriceOfferHistory } from './drug';

@Info({ title: 'DrugContract', description: 'Smart kontrakt pre sledovanie šarží liečiv' })
export class DrugContract extends Contract {

    private getCollectionName(ctx: Context, pharmacyMsp?: string): string {
        const mspId = (pharmacyMsp || ctx.clientIdentity.getMSPID()).trim();
        if (mspId === 'LekarenAMSP') return 'collectionLekarenA';
        if (mspId === 'LekarenBMSP') return 'collectionLekarenB';
        if (mspId === 'VyrobcaMSP') return 'collectionPricing';
        throw new Error(`MSP ID ${mspId} nemá priradenú žiadnu súkromnú kolekciu.`);
    }

    private getTransientValue(ctx: Context, key: string): string {
        const transientMap = ctx.stub.getTransient();
        if (!transientMap.has(key)) {
            throw new Error(`Chýbajúce transientné dáta: ${key}`);
        }
        return transientMap.get(key)!.toString();
    }

    private async addToRegistry(ctx: Context, registryKey: string, id: string, collection?: string): Promise<void> {
        let registryBytes;
        if (collection) {
            registryBytes = await ctx.stub.getPrivateData(collection, registryKey);
        } else {
            registryBytes = await ctx.stub.getState(registryKey);
        }
        
        let registry: string[] = [];
        if (registryBytes && registryBytes.length > 0) {
            try {
                registry = JSON.parse(registryBytes.toString());
            } catch (e) { registry = []; }
        }
        if (!registry.includes(id)) {
            registry.push(id);
            if (collection) {
                await ctx.stub.putPrivateData(collection, registryKey, Buffer.from(JSON.stringify(registry)));
            } else {
                await ctx.stub.putState(registryKey, Buffer.from(JSON.stringify(registry)));
            }
        }
    }

    private emitEvent(ctx: Context, name: string, payload: any): void {
        ctx.stub.setEvent(name, Buffer.from(JSON.stringify(payload)));
    }

    @Transaction()
    public async addDrugDefinition(ctx: Context, id: string, name: string, composition: string, dosage: string, intake: string, meta: string, leafletJSON: string, galleryJSON: string): Promise<void> {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Iba výrobca môže pridávať definície liekov.');
        }

        const drug: DrugDefinition = {
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

    @Transaction()
    public async initBatch(ctx: Context, batchID: string, drugID: string, drugName: string, manufacturer: string, expiryDate: string, unit: string): Promise<void> {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Len výrobca môže vytvoriť novú šaržu.');
        }

        const price = Number(this.getTransientValue(ctx, 'price'));
        const quantity = Number(this.getTransientValue(ctx, 'quantity'));
        const metadata = this.getTransientValue(ctx, 'metadata');

        const drugBatch: DrugBatch = {
            batchID, drugID, drugName, manufacturer,
            ownerOrg: ctx.clientIdentity.getMSPID(),
            quantity,
            unit, expiryDate, status: 'INITIALIZED'
        };

        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(drugBatch)));
        await this.addToRegistry(ctx, 'REGISTRY_BATCHES', batchID);
        
        const collection = this.getCollectionName(ctx);
        const privateData: PrivateBatchData = { batchID, price, quantity, metadata };
        await ctx.stub.putPrivateData(collection, batchID, Buffer.from(JSON.stringify(privateData)));
        await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', batchID, collection);
        
        this.emitEvent(ctx, 'BatchCreated', { batchID, drugID, drugName });
    }

    @Transaction()
    public async requestDrug(ctx: Context, requestID: string, drugID: string, drugName: string, manufacturerOrg: string, unit: string, fileAttachmentsJSON: string): Promise<void> {
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        if (!pharmacyMsp.startsWith('Lekaren')) {
            throw new Error('Iba lekárne môžu odosielať požiadavky.');
        }

        const quantity = Number(this.getTransientValue(ctx, 'quantity'));
        const collection = this.getCollectionName(ctx, pharmacyMsp);

        const order: PrivateOrderData = {
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

    @Transaction()
    public async providePriceOffer(ctx: Context, requestID: string, pharmacyMsp: string): Promise<void> {
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Iba výrobca môže poskytnúť cenovú ponuku.');
        }

        const price = Number(this.getTransientValue(ctx, 'price'));
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        
        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0) throw new Error('Požiadavka nenájdená.');
        
        const order: PrivateOrderData = JSON.parse(orderJSON.toString());
        order.status = 'OFFER_MADE';
        order.priceOffer = price;
        order.priceOffers.push({ price, timestamp: ctx.stub.getTxTimestamp().seconds.toString() });

        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'PriceOfferProvided', { requestID, pharmacyMsp });
    }

    @Transaction()
    public async finalizeAgreement(ctx: Context, requestID: string): Promise<void> {
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const price = Number(this.getTransientValue(ctx, 'price'));

        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0) throw new Error('Požiadavka neexistuje.');
        
        const order: PrivateOrderData = JSON.parse(orderJSON.toString());
        order.status = 'APPROVED';
        order.finalAgreedPrice = price;
        
        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'AgreementFinalized', { requestID, pharmacyMsp });
    }

    @Transaction()
    public async transferOwnership(ctx: Context, batchID: string, newOwnerOrg: string, requestID?: string): Promise<string> {
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);
        const qSent = Number(this.getTransientValue(ctx, 'quantity'));
        
        let price: number | undefined;
        try { price = Number(this.getTransientValue(ctx, 'price')); } catch (e) {}

        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0) throw new Error('Šarža nenájdená.');
        const batch: DrugBatch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId) throw new Error('Nie ste vlastníkom šarže.');

        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0) throw new Error('Súkromné dáta nenájdené.');
        const priv: PrivateBatchData = JSON.parse(privJSON.toString());
        
        if (qSent > priv.quantity) throw new Error('Nedostatok zásob.');
        const effectivePrice = price !== undefined ? price : priv.price;

        // Ak ide o fulfillment objednávky, zaznamenáme to on-chain
        if (requestID) {
            const orderCol = this.getCollectionName(ctx, newOwnerOrg.startsWith('Lekaren') ? newOwnerOrg : mspId);
            const orderJSON = await ctx.stub.getPrivateData(orderCol, requestID);
            if (orderJSON && orderJSON.length > 0) {
                const order: PrivateOrderData = JSON.parse(orderJSON.toString());
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
            const newBatch: DrugBatch = { 
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
            const targetPriv: PrivateBatchData = { batchID: newID, price: effectivePrice, quantity: qSent, metadata: priv.metadata };
            await ctx.stub.putPrivateData(targetCol, newID, Buffer.from(JSON.stringify(targetPriv)));
            await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', newID, targetCol);
            resultingBatchID = newID;
        } else {
            batch.ownerOrg = newOwnerOrg;
            batch.status = 'IN_TRANSIT';
            batch.quantity = qSent;
            await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
            await ctx.stub.deletePrivateData(collection, batchID);

            const targetCol = this.getCollectionName(ctx, newOwnerOrg);
            const targetPriv: PrivateBatchData = { batchID: batchID, price: effectivePrice, quantity: qSent, metadata: priv.metadata };
            await ctx.stub.putPrivateData(targetCol, batchID, Buffer.from(JSON.stringify(targetPriv)));
            await this.addToRegistry(ctx, 'REGISTRY_MY_BATCHES', batchID, targetCol);
            resultingBatchID = batchID;
        }
        
        this.emitEvent(ctx, 'BatchTransferred', { batchID: resultingBatchID, from: mspId, to: newOwnerOrg });
        return resultingBatchID;
    }

    @Transaction()
    public async confirmDelivery(ctx: Context, batchID: string): Promise<void> {
        const mspId = ctx.clientIdentity.getMSPID();
        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0) throw new Error('Šarža nenájdená.');
        
        const batch: DrugBatch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId) throw new Error('Nie ste vlastníkom tejto šarže.');
        
        batch.status = 'DELIVERED';
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        this.emitEvent(ctx, 'BatchDelivered', { batchID, owner: mspId });
    }

    @Transaction()
    public async sellToConsumer(ctx: Context, batchID: string): Promise<void> {
        const mspId = ctx.clientIdentity.getMSPID();
        const qSold = Number(this.getTransientValue(ctx, 'quantity'));
        const collection = this.getCollectionName(ctx, mspId);

        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0) throw new Error(`Šarža ${batchID} nenájdená.`);
        const batch: DrugBatch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId) throw new Error(`Nie ste vlastníkom šarže ${batchID}. Aktuálny vlastník: ${batch.ownerOrg}`);

        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0) throw new Error(`Súkromné dáta pre šaržu ${batchID} nenájdené.`);
        const priv: PrivateBatchData = JSON.parse(privJSON.toString());

        if (qSold > priv.quantity) throw new Error(`Nedostatok zásob. Požadované: ${qSold}, Dostupné: ${priv.quantity}`);

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

    @Transaction()
    public async returnToManufacturer(ctx: Context, batchID: string, manufacturerOrg: string): Promise<void> {
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);

        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0) throw new Error('Šarža nenájdená.');
        const batch: DrugBatch = JSON.parse(batchJSON.toString());
        if (batch.ownerOrg !== mspId) throw new Error('Iba aktuálny vlastník môže vrátiť šaržu.');

        const privJSON = await ctx.stub.getPrivateData(collection, batchID);
        if (!privJSON || privJSON.length === 0) throw new Error('Súkromné dáta nenájdené.');
        const priv: PrivateBatchData = JSON.parse(privJSON.toString());

        batch.ownerOrg = manufacturerOrg;
        batch.status = 'RETURNED';
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        await ctx.stub.deletePrivateData(collection, batchID);

        const targetCol = this.getCollectionName(ctx, manufacturerOrg);
        await ctx.stub.putPrivateData(targetCol, batchID, Buffer.from(JSON.stringify(priv)));
        
        this.emitEvent(ctx, 'BatchReturned', { batchID, from: mspId, to: manufacturerOrg });
    }

    @Transaction()
    public async emergencyRecall(ctx: Context, batchID: string): Promise<void> {
        if (ctx.clientIdentity.getMSPID() !== 'SUKLMSP') {
            throw new Error('Iba regulátor (ŠÚKL) môže vyhlásiť sťahovanie z trhu.');
        }

        const batchJSON = await ctx.stub.getState(batchID);
        if (!batchJSON || batchJSON.length === 0) throw new Error('Šarža nenájdená.');
        
        const batch: DrugBatch = JSON.parse(batchJSON.toString());
        batch.status = 'RECALLED';
        
        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(batch)));
        this.emitEvent(ctx, 'EmergencyRecall', { batchID });
    }

    @Transaction()
    public async rejectRequest(ctx: Context, requestID: string, pharmacyMsp: string, reason: string): Promise<void> {
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'VyrobcaMSP' && mspId !== pharmacyMsp) throw new Error('Nedostatočné oprávnenia.');

        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const orderJSON = await ctx.stub.getPrivateData(collection, requestID);
        if (!orderJSON || orderJSON.length === 0) throw new Error('Požiadavka neexistuje.');

        const order: PrivateOrderData = JSON.parse(orderJSON.toString());
        order.status = 'REJECTED';
        order.rejectionReason = reason;

        await ctx.stub.putPrivateData(collection, requestID, Buffer.from(JSON.stringify(order)));
        this.emitEvent(ctx, 'RequestRejected', { requestID, pharmacyMsp });
    }

    @Transaction(false)
    public async queryHistory(ctx: Context, batchID: string): Promise<string> {
        const allResults = [];
        let currentID = batchID;
        const processedIDs = new Set<string>();

        while (currentID && !processedIDs.has(currentID)) {
            processedIDs.add(currentID);
            const historyIterator = await ctx.stub.getHistoryForKey(currentID);
            let res = await historyIterator.next();
            let parentID: string | undefined = undefined;

            while (!res.done) {
                if (res.value) {
                    const jsonRes: any = {};
                    jsonRes.txId = res.value.txId;
                    
                    const ts = res.value.timestamp;
                    jsonRes.timestamp = {
                        seconds: (ts as any).seconds?.low || (ts as any).seconds || 0,
                        nanos: (ts as any).nanos || 0
                    };
                    
                    jsonRes.isDelete = res.value.isDelete;
                    try {
                        const data = JSON.parse(res.value.value.toString('utf8'));
                        jsonRes.data = data;
                        if (data.parentBatchID && !parentID) {
                            parentID = data.parentBatchID;
                        }
                    } catch (err) {
                        jsonRes.data = res.value.value.toString('utf8');
                    }
                    allResults.push(jsonRes);
                }
                res = await historyIterator.next();
            }
            await historyIterator.close();
            
            if (parentID && parentID !== currentID) {
                currentID = parentID;
            } else {
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

    @Transaction(false)
    public async readDrugDefinition(ctx: Context, id: string): Promise<Uint8Array> {
        return await ctx.stub.getState(`DEF_${id}`);
    }

    @Transaction(false)
    public async readBatch(ctx: Context, batchID: string): Promise<Uint8Array> {
        return await ctx.stub.getState(batchID);
    }

    @Transaction(false)
    public async readPrivateOrder(ctx: Context, requestID: string, pharmacyMsp: string): Promise<Uint8Array> {
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        return await ctx.stub.getPrivateData(collection, requestID);
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllDrugDefinitions(ctx: Context): Promise<string> {
        const registryBytes = await ctx.stub.getState('REGISTRY_DEFINITIONS');
        if (!registryBytes || registryBytes.length === 0) return JSON.stringify([]);
        const keys: string[] = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getState(key);
            if (val && val.length > 0) results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllDrugs(ctx: Context): Promise<string> {
        const registryBytes = await ctx.stub.getState('REGISTRY_BATCHES');
        if (!registryBytes || registryBytes.length === 0) return JSON.stringify([]);
        const keys: string[] = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getState(key);
            if (val && val.length > 0) results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }

    @Transaction(false)
    @Returns('string')
    public async queryPrivateOrders(ctx: Context, pharmacyMsp: string): Promise<string> {
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const registryBytes = await ctx.stub.getPrivateData(collection, 'REGISTRY_ORDERS');
        if (!registryBytes || registryBytes.length === 0) return JSON.stringify([]);
        const keys: string[] = JSON.parse(registryBytes.toString());
        const results = [];
        for (const key of keys) {
            const val = await ctx.stub.getPrivateData(collection, key);
            if (val && val.length > 0) results.push(JSON.parse(val.toString()));
        }
        return JSON.stringify(results);
    }

    @Transaction()
    public async RegisterExistingKey(ctx: Context, registryKey: string, id: string, collection?: string): Promise<void> {
        await this.addToRegistry(ctx, registryKey, id, collection);
    }

    @Transaction(false)
    @Returns('string')
    public async getBatchPrice(ctx: Context, batchID: string): Promise<string> {
        try {
            const collection = this.getCollectionName(ctx);
            const privJSON = await ctx.stub.getPrivateData(collection, batchID);
            if (!privJSON || privJSON.length === 0) return JSON.stringify({ error: 'Data not available' });
            return privJSON.toString();
        } catch (e: any) {
            return JSON.stringify({ error: e.message });
        }
    }
}
