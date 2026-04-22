import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { DrugBatch } from './drug';

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

    @Transaction()
    public async initBatch(ctx: Context, batchID: string, drugID: string, drugName: string, manufacturer: string, expiryDate: string, unit: string): Promise<void> {
        const bID = batchID.trim();
        const role = ctx.clientIdentity.getAttributeValue('role');
        if (role !== 'manufacturer' || ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Prístup zamietnutý: Len výrobca môže vytvoriť novú šaržu.');
        }

        const price = Number(this.getTransientValue(ctx, 'price'));
        const quantity = Number(this.getTransientValue(ctx, 'quantity'));
        const metadata = this.getTransientValue(ctx, 'metadata');

        const drugBatch: DrugBatch = {
            batchID: bID, drugID, drugName, manufacturer,
            ownerOrg: ctx.clientIdentity.getMSPID(),
            quantity: 0,
            unit, expiryDate, status: 'INITIALIZED', metadata: ''
        };

        await ctx.stub.putState(bID, Buffer.from(JSON.stringify(drugBatch)));
        
        const collection = this.getCollectionName(ctx);
        const privateData = { batchID: bID, price, quantity, metadata };
        await ctx.stub.putPrivateData(collection, bID, Buffer.from(JSON.stringify(privateData)));
    }

    @Transaction()
    public async requestDrug(ctx: Context, requestID: string, drugID: string, drugName: string, manufacturerOrg: string, unit: string): Promise<void> {
        const rID = requestID.trim();
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        
        if (!pharmacyMsp.startsWith('Lekaren')) {
            throw new Error('Iba lekárne môžu odosielať požiadavky na lieky.');
        }

        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const requestedQuantity = Number(this.getTransientValue(ctx, 'quantity'));

        const orderDetails = {
            batchID: rID,
            drugID: drugID, drugId: drugID, id: drugID,
            drugName: drugName, name: drugName,
            manufacturer: manufacturerOrg,
            pharmacyOrg: pharmacyMsp,
            quantity: requestedQuantity,
            unit, status: 'REQUESTED',
            createdAt: ctx.stub.getTxTimestamp().seconds.toString()
        };

        await ctx.stub.putPrivateData(collection, rID, Buffer.from(JSON.stringify(orderDetails)));
    }

    @Transaction(false)
    public async readPrivateOrder(ctx: Context, requestID: string, pharmacyMsp: string): Promise<Uint8Array> {
        const rID = requestID.trim();
        const callerMsp = ctx.clientIdentity.getMSPID();

        if (callerMsp !== 'VyrobcaMSP' && callerMsp !== pharmacyMsp && callerMsp !== 'SUKLMSP') {
            throw new Error('Prístup k detailom súkromnej objednávky zamietnutý.');
        }

        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const detailsJSON = await ctx.stub.getPrivateData(collection, rID);
        if (!detailsJSON || detailsJSON.length === 0) {
            throw new Error(`Súkromné detaily pre ${rID} nie sú dostupné.`);
        }
        return detailsJSON;
    }

    @Transaction()
    public async providePriceOffer(ctx: Context, requestID: string, pharmacyMsp: string): Promise<void> {
        const rID = requestID.trim();
        if (ctx.clientIdentity.getMSPID() !== 'VyrobcaMSP') {
            throw new Error('Iba výrobca môže poskytnúť cenovú ponuku.');
        }

        const price = Number(this.getTransientValue(ctx, 'price'));
        const collection = this.getCollectionName(ctx, pharmacyMsp);
        
        const orderJSON = await ctx.stub.getPrivateData(collection, rID);
        if (!orderJSON || orderJSON.length === 0) throw new Error('Požiadavka nenájdená.');
        
        const order = JSON.parse(orderJSON.toString());
        order.status = 'OFFER_MADE';
        order.priceOffer = price;

        order.drugID = order.drugID || order.drugId || order.id;
        order.drugName = order.drugName || order.name;

        if (!order.priceOffers) order.priceOffers = [];
        order.priceOffers.push({ price, timestamp: ctx.stub.getTxTimestamp().seconds.toString() });

        await ctx.stub.putPrivateData(collection, rID, Buffer.from(JSON.stringify(order)));
    }

    @Transaction()
    public async finalizeAgreement(ctx: Context, requestID: string): Promise<void> {
        const rID = requestID.trim();
        const pharmacyMsp = ctx.clientIdentity.getMSPID();
        
        if (!pharmacyMsp.startsWith('Lekaren')) {
            throw new Error('Iba lekárne môžu schvaľovať cenové ponuky.');
        }

        const collection = this.getCollectionName(ctx, pharmacyMsp);
        const agreedPrice = Number(this.getTransientValue(ctx, 'price'));

        const orderJSON = await ctx.stub.getPrivateData(collection, rID);
        if (!orderJSON || orderJSON.length === 0) throw new Error('Požiadavka neexistuje.');
        
        const order = JSON.parse(orderJSON.toString());
        order.status = 'APPROVED';
        order.finalAgreedPrice = agreedPrice;
        order.updatedAt = ctx.stub.getTxTimestamp().seconds.toString();
        
        order.drugID = order.drugID || order.drugId || order.id;
        order.drugName = order.drugName || order.name;

        await ctx.stub.putPrivateData(collection, rID, Buffer.from(JSON.stringify(order)));
    }

    @Transaction()
    public async transferOwnership(ctx: Context, batchID: string, newOwnerOrg: string): Promise<string> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);

        const qSent = Number(this.getTransientValue(ctx, 'quantity'));
        let newPrice: number | undefined;
        try { newPrice = Number(this.getTransientValue(ctx, 'price')); } catch (e) {}

        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error('Batch not found');
        const drugBatch = JSON.parse(drugBatchJSON.toString());
        
        if (drugBatch.ownerOrg !== mspId) throw new Error('Prístup zamietnutý: Nie ste vlastníkom šarže.');

        const privateJSON = await ctx.stub.getPrivateData(collection, bID);
        if (!privateJSON || privateJSON.length === 0) throw new Error('Súkromné dáta šarže nenájdené.');
        const privateData = JSON.parse(privateJSON.toString());
        
        const currentQty = Number(privateData.quantity);
        if (qSent > currentQty) throw new Error('Nedostatok zásob na sklade.');

        const effectivePrice = newPrice !== undefined ? newPrice : (privateData.price || 0);

        if (qSent < currentQty) {
            privateData.quantity = currentQty - qSent;
            await ctx.stub.putPrivateData(collection, bID, Buffer.from(JSON.stringify(privateData)));

            const newBatchID = `${bID}-S${ctx.stub.getTxID().substring(0, 6)}`;
            const transferBatch: DrugBatch = {
                ...drugBatch, batchID: newBatchID, ownerOrg: newOwnerOrg, quantity: 0, status: 'IN_TRANSIT'
            };
            await ctx.stub.putState(newBatchID, Buffer.from(JSON.stringify(transferBatch)));

            const targetCollection = this.getCollectionName(ctx, newOwnerOrg);
            const targetPrivateData = { batchID: newBatchID, price: effectivePrice, quantity: qSent, metadata: privateData.metadata };
            await ctx.stub.putPrivateData(targetCollection, newBatchID, Buffer.from(JSON.stringify(targetPrivateData)));

            return newBatchID;
        } else {
            drugBatch.ownerOrg = newOwnerOrg;
            drugBatch.status = 'IN_TRANSIT';
            await ctx.stub.putState(bID, Buffer.from(JSON.stringify(drugBatch)));
            await ctx.stub.deletePrivateData(collection, bID);

            const targetCollection = this.getCollectionName(ctx, newOwnerOrg);
            const targetPrivateData = { bID, price: effectivePrice, quantity: qSent, metadata: privateData.metadata };
            await ctx.stub.putPrivateData(targetCollection, bID, Buffer.from(JSON.stringify(targetPrivateData)));

            return bID;
        }
    }

    @Transaction()
    public async confirmDelivery(ctx: Context, batchID: string): Promise<void> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();
        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error('Batch not found');
        const drugBatch = JSON.parse(drugBatchJSON.toString());

        if (drugBatch.ownerOrg !== mspId) throw new Error('Prístup zamietnutý: Iba vlastník môže potvrdiť doručenie.');
        
        drugBatch.status = 'DELIVERED';
        await ctx.stub.putState(bID, Buffer.from(JSON.stringify(drugBatch)));
    }

    @Transaction()
    public async sellToConsumer(ctx: Context, batchID: string): Promise<void> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();
        const collection = this.getCollectionName(ctx, mspId);

        const quantitySold = Number(this.getTransientValue(ctx, 'quantity'));

        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error('Batch not found');
        const drugBatch = JSON.parse(drugBatchJSON.toString());
        if (drugBatch.ownerOrg !== mspId) throw new Error('Prístup zamietnutý.');

        const privateJSON = await ctx.stub.getPrivateData(collection, bID);
        if (!privateJSON || privateJSON.length === 0) throw new Error('Súkromné dáta nenájdené.');
        const privateData = JSON.parse(privateJSON.toString());

        const currentQty = Number(privateData.quantity);
        if (quantitySold > currentQty) throw new Error('Nedostatok zásob.');

        privateData.quantity = currentQty - quantitySold;
        await ctx.stub.putPrivateData(collection, bID, Buffer.from(JSON.stringify(privateData)));

        if (privateData.quantity === 0) {
            drugBatch.status = 'SOLD';
            await ctx.stub.putState(bID, Buffer.from(JSON.stringify(drugBatch)));
        }
    }

    @Transaction()
    public async emergencyRecall(ctx: Context, batchID: string): Promise<void> {
        const bID = batchID.trim();
        if (ctx.clientIdentity.getMSPID() !== 'SUKLMSP') throw new Error('Iba regulačný orgán (ŠÚKL) môže vyvolať urgentné stiahnutie.');

        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error('Šarža nebola nájdená.');
        const drugBatch = JSON.parse(drugBatchJSON.toString());

        drugBatch.status = 'RECALLED';
        await ctx.stub.putState(bID, Buffer.from(JSON.stringify(drugBatch)));
    }

    @Transaction(false)
    public async verifyBatch(ctx: Context, batchID: string): Promise<string> {
        const bID = batchID.trim();
        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error(`Šarža ${bID} nebola nájdená.`);
        const b = JSON.parse(drugBatchJSON.toString());
        
        return JSON.stringify({
            batchID: b.batchID, drugName: b.drugName, manufacturer: b.manufacturer,
            ownerOrg: b.ownerOrg, status: b.status, expiryDate: b.expiryDate,
            isAuthentic: true
        });
    }

    @Transaction(false)
    public async queryHistory(ctx: Context, batchID: string): Promise<string> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();

        if (mspId === 'PublicMSP') {
            throw new Error('Prístup k histórii pohybu lieku zamietnutý pre verejnosť.');
        }

        const results = [];
        
        // 1. Public History
        try {
            const publicIterator = await ctx.stub.getHistoryForKey(bID);
            let res = await publicIterator.next();
            while (!res.done) {
                if (res.value) {
                    const modification = res.value;
                    const txData = modification.value && modification.value.length > 0 ? JSON.parse(modification.value.toString()) : null;
                    results.push({
                        txId: modification.txId,
                        timestamp: modification.timestamp,
                        isDelete: modification.isDelete,
                        data: txData,
                        type: 'PUBLIC'
                    });
                }
                res = await publicIterator.next();
            }
        } catch (e) {}

        // 2. Private History (Cast stub to any to use getPrivateDataHistoryForKey)
        const collections = ['collectionPricing', 'collectionLekarenA', 'collectionLekarenB'];
        for (const col of collections) {
            try {
                const privateIterator = await (ctx.stub as any).getPrivateDataHistoryForKey(col, bID);
                let pRes = await privateIterator.next();
                while (!pRes.done) {
                    if (pRes.value) {
                        const mod = pRes.value;
                        const pData = mod.value && mod.value.length > 0 ? JSON.parse(mod.value.toString()) : null;
                        results.push({
                            txId: mod.txId,
                            timestamp: mod.timestamp,
                            isDelete: mod.isDelete,
                            data: pData,
                            type: `PRIVATE (${col})`
                        });
                    }
                    pRes = await privateIterator.next();
                }
            } catch (e) {}
        }

        results.sort((a, b) => {
            const timeA = a.timestamp.seconds.low || a.timestamp.seconds;
            const timeB = b.timestamp.seconds.low || b.timestamp.seconds;
            return timeA - timeB;
        });

        return JSON.stringify(results);
    }

    @Transaction(false)
    public async getBatchPrice(ctx: Context, batchID: string): Promise<Uint8Array> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();

        if (mspId === 'PublicMSP') {
            throw new Error('Cenové údaje sú neverejné.');
        }

        const collections = ['collectionPricing', 'collectionLekarenA', 'collectionLekarenB'];
        for (const col of collections) {
            try {
                const priceBytes = await ctx.stub.getPrivateData(col, bID);
                if (priceBytes && priceBytes.length > 0) return priceBytes;
            } catch (e) {}
        }
        throw new Error('Cenové údaje pre túto šaržu nie sú prístupné vašej organizácii.');
    }

    @Transaction(false)
    public async readBatch(ctx: Context, batchID: string): Promise<Uint8Array> {
        const bID = batchID.trim();
        const mspId = ctx.clientIdentity.getMSPID();

        const drugBatchJSON = await ctx.stub.getState(bID);
        if (!drugBatchJSON || drugBatchJSON.length === 0) throw new Error('Batch not found');
        const drugBatch = JSON.parse(drugBatchJSON.toString());

        if (mspId !== 'PublicMSP' && mspId !== 'SUKLMSP' && mspId !== 'VyrobcaMSP' && mspId !== drugBatch.ownerOrg) {
             throw new Error('Prístup k dátam šarže zamietnutý.');
        }

        return drugBatchJSON;
    }

    @Transaction(false)
    public async GetAllDrugs(ctx: Context): Promise<string> {
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'SUKLMSP' && mspId !== 'VyrobcaMSP') {
            throw new Error('Prístup k celému zoznamu šarží zamietnutý.');
        }

        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            allResults.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}
