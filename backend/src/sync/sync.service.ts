import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FabricService } from '../fabric/fabric.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { PHARMACY_MSP_IDS, MANUFACTURER_MSP_IDS, REGULATOR_MSP_IDS } from '../constants/msp.constants';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private isSyncing = false;

  constructor(
    private fabricService: FabricService,
    private prisma: PrismaService,
    private ipfsService: IpfsService,
  ) {}

  async onModuleInit() {
    this.logger.log('⏳ Starting Full Blockchain Sync...');
    this.initialSyncWithRetry();
    this.startLedgerListener();
    this.startContractEventListener();
  }

  // ─── Blockchain listeners ─────────────────────────────────────────────────

  private async initialSyncWithRetry() {
    try {
      await this.syncRecentChanges();
      this.logger.log('✅ Initial Blockchain Sync completed successfully.');
    } catch (error) {
      this.logger.error(`Initial sync failed: ${error.message}. Retrying in 15s...`);
      setTimeout(() => this.initialSyncWithRetry(), 15000);
    }
  }

  private async startContractEventListener() {
    try {
      const network = await this.fabricService.getNetwork();
      const events = await network.getChaincodeEvents(this.fabricService.getChaincodeName());
      this.logger.log(`🔔 Contract Event Listener started for ${this.fabricService.getChaincodeName()}`);
      for await (const event of events) {
        this.logger.log(`📢 Received Contract Event: ${event.eventName}`);
        if (event.eventName === 'EmergencyRecall') {
          try {
            const payload = JSON.parse(new TextDecoder().decode(event.payload));
            await this.handleEmergencyRecall(payload);
          } catch (e) {
            this.logger.error(`Error processing EmergencyRecall event: ${e.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Contract listener failed: ${error.message}. Retrying in 10s...`);
      setTimeout(() => this.startContractEventListener(), 10000);
    }
  }

  private async handleEmergencyRecall(payload: any) {
    const { batchID } = payload;
    this.logger.warn(`🚨 EMERGENCY RECALL DETECTED for batch ${batchID}`);
    await this.syncRecentChanges();

    const localInventory = await this.prisma.drug.findMany({
      where: {
        OR: [
          { batchID },
          { batchID: { startsWith: `${batchID}-S` } },
        ],
        quantity: { gt: 0 },
      },
    });

    const isRegulator = REGULATOR_MSP_IDS.includes(this.fabricService.getLocalMspId());

    if (localInventory.length > 0 || isRegulator) {
      const users = await this.prisma.user.findMany();
      for (const user of users) {
        await this.prisma.notification.create({
          data: {
            type: 'URGENT_RECALL',
            message: `POZOR: Šarža ${batchID} bola stiahnutá z obehu regulačným úradom ŠÚKL! Okamžite zastavte predaj a vráťte zásoby výrobcovi.`,
            userId: user.id,
          },
        });
      }
    }
  }

  private async startLedgerListener() {
    try {
      const network = await this.fabricService.getNetwork();
      const blocks = await network.getBlockEvents();
      for await (const block of blocks) {
        const blockNumber = (block as any).header?.number || 'unknown';
        this.logger.log(`📦 Block #${blockNumber} committed - Triggering Full Mirror Sync`);
        await this.syncRecentChanges();
      }
    } catch (error) {
      this.logger.error(`Ledger listener failed: ${error.message}. Retrying in 10s...`);
      setTimeout(() => this.startLedgerListener(), 10000);
    }
  }

  // ─── Full mirror sync ─────────────────────────────────────────────────────

  public async syncRecentChanges() {
    if (this.isSyncing) {
      this.logger.log('Sync already in progress, skipping.');
      return;
    }
    this.isSyncing = true;
    this.logger.log('Starting sync iteration...');
    try {
      const user = await this.prisma.user.findFirst();
      if (!user) {
        this.logger.warn('No user found in DB, skipping sync.');
        return;
      }
      await this.syncCatalog(user.id);
      await this.syncBatches(user.id);
      await this.syncPrivateOrders(user.id);
      this.logger.log('Sync iteration finished.');
    } catch (e) {
      this.logger.error(`Sync iteration failed critically: ${e.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncCatalog(userId: number) {
    try {
      this.logger.log('Syncing Drug Catalog...');
      const bcDefs = await this.fabricService.getAllDrugDefinitions(userId);
      const definitions = Array.isArray(bcDefs) ? bcDefs : JSON.parse(bcDefs || '[]');
      this.logger.log(`Found ${definitions.length} drug definitions on blockchain.`);

      for (const def of definitions) {
        if (!def.name) continue;
        const drug = await this.prisma.drugCatalog.upsert({
          where: { name: def.name },
          update: {
            composition: def.composition, recommendedDosage: def.recommendedDosage,
            intakeInfo: def.intakeInfo, metadata: def.metadata,
          },
          create: {
            name: def.name, composition: def.composition,
            recommendedDosage: def.recommendedDosage,
            intakeInfo: def.intakeInfo || '', metadata: def.metadata || '',
          },
        });

        await this.prisma.file.deleteMany({ where: { drugCatalogId: drug.id } });
        const filesToCreate: any[] = [];
        if (def.leaflet) {
          filesToCreate.push({
            category: 'LEAFLET', cid: def.leaflet.cid,
            url: this.ipfsService.getGatewayUrl(def.leaflet.cid),
            name: def.leaflet.name, type: def.leaflet.type, size: def.leaflet.size, drugCatalogId: drug.id,
          });
        }
        for (const f of (def.gallery || [])) {
          filesToCreate.push({
            category: 'GALLERY', cid: f.cid,
            url: this.ipfsService.getGatewayUrl(f.cid),
            name: f.name, type: f.type, size: f.size, drugCatalogId: drug.id,
          });
        }
        if (filesToCreate.length > 0) await this.prisma.file.createMany({ data: filesToCreate });
      }
    } catch (e) {
      this.logger.error(`Drug Catalog sync failed: ${e.message}`);
    }
  }

  private async syncBatches(userId: number) {
    try {
      this.logger.log('Syncing Physical Batches...');
      const allItems = await this.fabricService.executeTransaction('GetAllDrugs', [], userId, true);
      const items = Array.isArray(allItems) ? allItems : JSON.parse(allItems || '[]');
      this.logger.log(`Found ${items.length} batches on blockchain.`);
      for (const item of items) {
        if (item.batchID) await this.syncDrugWithDB(item.batchID);
      }
    } catch (e) {
      this.logger.error(`Batches sync failed: ${e.message}`);
    }
  }

  private async syncPrivateOrders(userId: number) {
    const localMsp = this.fabricService.getLocalMspId();
    let pharmsToQuery: string[] = [];

    if ([...MANUFACTURER_MSP_IDS, ...REGULATOR_MSP_IDS].includes(localMsp)) {
      pharmsToQuery = PHARMACY_MSP_IDS;
    } else if (PHARMACY_MSP_IDS.includes(localMsp)) {
      pharmsToQuery = [localMsp];
    }

    this.logger.log(`Syncing Private Orders for: ${pharmsToQuery.join(', ')}`);
    for (const pMsp of pharmsToQuery) {
      try {
        await this.syncPrivateOrdersForPharmacy(pMsp, userId);
      } catch (e) {
        this.logger.error(`Private orders sync failed for ${pMsp}: ${e.message}`);
      }
    }
  }

  private async syncPrivateOrdersForPharmacy(pMsp: string, userId: number) {
    this.logger.log(`Querying private orders from collection for ${pMsp}...`);
    const bcOrders = await this.fabricService.executeTransaction('queryPrivateOrders', [pMsp], userId, true);
    const orders = Array.isArray(bcOrders) ? bcOrders : JSON.parse(bcOrders || '[]');
    this.logger.log(`Found ${orders.length} private orders for ${pMsp}.`);

    for (const o of orders) {
      const order = await this.prisma.orderRequest.upsert({
        where: { requestId: o.requestId },
        update: {
          status: o.status, rejectionReason: o.rejectionReason || null,
          quantity: Number(o.quantity || 0), drugName: o.drugName,
          manufacturerOrg: o.manufacturerOrg, pharmacyOrg: o.pharmacyOrg,
          unit: o.unit, drugId: String(o.drugID),
        },
        create: {
          requestId: o.requestId, drugId: String(o.drugID), drugName: o.drugName,
          manufacturerOrg: o.manufacturerOrg, pharmacyOrg: o.pharmacyOrg,
          quantity: Number(o.quantity || 0), unit: o.unit, status: o.status,
          rejectionReason: o.rejectionReason || null,
        },
      });

      if (o.fileAttachments?.length > 0) {
        await this.prisma.file.deleteMany({ where: { orderRequestId: order.id } });
        await this.prisma.file.createMany({
          data: o.fileAttachments.map((f: any) => ({
            category: 'OTHER', cid: f.cid, url: this.ipfsService.getGatewayUrl(f.cid),
            name: f.name, type: f.type, size: f.size, orderRequestId: order.id,
          })),
        });
      }

      for (const f of (o.fulfillments || [])) {
        const exists = await this.prisma.fulfillment.findFirst({
          where: { orderRequestId: order.id, batchID: f.batchID },
        });
        if (!exists) {
          await this.prisma.fulfillment.create({
            data: {
              orderRequestId: order.id, batchID: f.batchID,
              quantity: f.quantity, createdAt: new Date(Number(f.timestamp) * 1000),
            },
          });
        }
      }

      if (o.priceOffer) await this.upsertPriceOffer(o);
    }
  }

  private async upsertPriceOffer(o: any) {
    const finalStatus = o.status === 'APPROVED' ? 'APPROVED' : (o.status === 'REJECTED' ? 'REJECTED' : 'PENDING');
    const currentPrice = Number(o.priceOffer);
    
    // Get the exact history from blockchain
    const bcOffers = o.priceOffers || [];
    
    // Fallback if array is missing but price exists
    if (bcOffers.length === 0 && currentPrice) {
       bcOffers.push({ price: currentPrice, timestamp: Math.floor(Date.now() / 1000) });
    }

    // Load existing offers efficiently
    const dbOffers = await this.prisma.priceOffer.findMany({
      where: { batchID: o.requestId }
    });
    
    const validDbIds = new Set<number>();

    for (let i = 0; i < bcOffers.length; i++) {
       const po = bcOffers[i];
       const priceVal = Number(po.price);
       
       let offerStatus = 'PENDING';
       if (finalStatus === 'APPROVED' || finalStatus === 'REJECTED') {
          offerStatus = priceVal === currentPrice ? finalStatus : 'HISTORY';
       }

       // Find matching DB offer that hasn't been claimed yet
       const matchIndex = dbOffers.findIndex(db => Number(db.price) === priceVal && !validDbIds.has(db.id));
       
       if (matchIndex !== -1) {
         const existing = dbOffers[matchIndex];
         validDbIds.add(existing.id);
         
         if (existing.status !== offerStatus) {
           await this.prisma.priceOffer.update({
             where: { id: existing.id },
             data: { status: offerStatus }
           });
         }
       } else {
         await this.prisma.priceOffer.create({
           data: {
             batchID: o.requestId,
             manufacturerOrg: o.manufacturerOrg,
             pharmacyOrg: o.pharmacyOrg,
             price: priceVal,
             status: offerStatus,
             createdAt: po.timestamp ? new Date(Number(po.timestamp) * 1000) : new Date()
           }
         });
       }
    }

    // Sweep any leftover DB rows that weren't matched to the blockchain array
    const idsToDelete = dbOffers.filter(db => !validDbIds.has(db.id)).map(db => db.id);
    if (idsToDelete.length > 0) {
      await this.prisma.priceOffer.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }
  }

  // ─── Drug / order sync ────────────────────────────────────────────────────

  public async syncDrugWithDB(batchID: string) {
    try {
      const drugJSON = await this.fabricService.readBatch(batchID);
      if (!drugJSON) return;

      let privateData: any = null;
      try {
        const pRes = await this.fabricService.getBatchPrice(batchID);
        privateData = this.fabricService.decodeResult(null, pRes);
        if (privateData?.error) privateData = null;
      } catch (e) {}

      const actualQty =
        privateData && typeof privateData.quantity !== 'undefined'
          ? Number(privateData.quantity)
          : (drugJSON.status === 'SOLD' ? 0 : Number(this.fabricService.scavenger(drugJSON, ['quantity']) || 0));

      const price = privateData && typeof privateData.price !== 'undefined' ? Number(privateData.price) : null;
      const dID = this.fabricService.scavenger(drugJSON, ['drugID', 'drugId', 'id']);
      const dName = this.fabricService.scavenger(drugJSON, ['drugName', 'name']) || 'Unknown';

      await this.prisma.drug.upsert({
        where: { batchID },
        update: {
          drugID: String(dID), drugName: String(dName), manufacturer: drugJSON.manufacturer,
          ownerOrg: drugJSON.ownerOrg, quantity: isFinite(actualQty) ? actualQty : 0,
          unit: drugJSON.unit, expiryDate: drugJSON.expiryDate, status: drugJSON.status,
          price: isFinite(Number(price)) ? Number(price) : null, metadata: drugJSON.metadata,
        },
        create: {
          batchID, drugID: String(dID), drugName: String(dName), manufacturer: drugJSON.manufacturer,
          ownerOrg: drugJSON.ownerOrg, quantity: isFinite(actualQty) ? actualQty : 0,
          unit: drugJSON.unit, expiryDate: drugJSON.expiryDate, status: drugJSON.status,
          price: isFinite(Number(price)) ? Number(price) : null, metadata: drugJSON.metadata,
        },
      });
    } catch (e) {
      this.logger.error(`Sync error for ${batchID}: ${e.message}`);
    }
  }

  public async syncOrderWithDB(requestId: string, userID: number) {
    const dbOrder = await this.prisma.orderRequest.findUnique({ where: { requestId } });
    if (!dbOrder) return;

    try {
      const o = await this.fabricService.readPrivateOrder(requestId, userID, dbOrder.pharmacyOrg);
      if (!o) return;

      const order = await this.prisma.orderRequest.update({
        where: { requestId: o.requestId },
        data: {
          status: o.status, rejectionReason: o.rejectionReason || null,
          quantity: Number(o.quantity || 0), drugName: o.drugName,
          manufacturerOrg: o.manufacturerOrg, pharmacyOrg: o.pharmacyOrg,
        },
      });

      if (o.fileAttachments?.length > 0) {
        await this.prisma.file.deleteMany({ where: { orderRequestId: order.id } });
        for (const f of o.fileAttachments) {
          await this.prisma.file.create({
            data: {
              category: 'OTHER', cid: f.cid, url: this.ipfsService.getGatewayUrl(f.cid),
              name: f.name, type: f.type, size: f.size, orderRequestId: order.id,
            },
          });
        }
      }

      for (const f of (o.fulfillments || [])) {
        const exists = await this.prisma.fulfillment.findFirst({
          where: { orderRequestId: order.id, batchID: f.batchID },
        });
        if (!exists) {
          await this.prisma.fulfillment.create({
            data: {
              orderRequestId: order.id, batchID: f.batchID,
              quantity: f.quantity, createdAt: new Date(Number(f.timestamp) * 1000),
            },
          });
        }
      }

      if (o.priceOffer) await this.upsertPriceOffer(o);

      return order;
    } catch (e) {
      this.logger.error(`Order sync error: ${e.message}`);
      throw e;
    }
  }

  // ─── Integrity checks ─────────────────────────────────────────────────────

  public async verifyIntegrity(batchID: string) {
    const db = await this.prisma.drug.findUnique({ where: { batchID } });
    if (!db) return { isValid: false, message: 'Nenájdené v DB', mismatches: [] };

    const bc = await this.fabricService.executeTransaction('readBatch', [batchID], 1, true);
    if (!bc) return { isValid: false, message: 'Blockchain dáta nedostupné', mismatches: [] };

    const mismatches: string[] = [];
    if (String(db.status) !== String(bc.status)) mismatches.push(`Stav: DB(${db.status}) vs BC(${bc.status})`);
    if (Number(db.quantity) !== Number(bc.quantity)) mismatches.push(`Množstvo: DB(${db.quantity}) vs BC(${bc.quantity})`);
    if (db.drugName !== bc.drugName) mismatches.push(`Názov: DB(${db.drugName}) vs BC(${bc.drugName})`);
    if (db.ownerOrg !== bc.ownerOrg) mismatches.push(`Vlastník: DB(${db.ownerOrg}) vs BC(${bc.ownerOrg})`);

    return {
      isValid: mismatches.length === 0,
      message: mismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Zistený nesúlad údajov!',
      db, bc, mismatches,
    };
  }

  public async verifyOrderIntegrity(requestId: string, userID: number) {
    const db = await this.prisma.orderRequest.findUnique({ where: { requestId } });
    if (!db) return { isValid: false, message: 'Objednávka nebola nájdená v databáze.' };

    const bc = await this.fabricService.readPrivateOrder(requestId, userID, db.pharmacyOrg);
    if (!bc) return { isValid: false, message: 'Blockchain dáta nedostupné.', db };

    const mismatches: string[] = [];
    if (Number(db.quantity) !== Number(bc.quantity)) mismatches.push(`Množstvo: DB(${db.quantity}) vs BC(${bc.quantity})`);
    if (db.drugName !== bc.drugName) mismatches.push(`Názov lieku: DB(${db.drugName}) vs BC(${bc.drugName})`);
    if (db.manufacturerOrg !== bc.manufacturerOrg) mismatches.push(`Výrobca: DB(${db.manufacturerOrg}) vs BC(${bc.manufacturerOrg})`);

    // DB has post-approval statuses that don't exist on BC (BC stays APPROVED after fulfillment)
    const POST_APPROVAL = ['ORDERED', 'FULFILLED', 'PROCESSING_FULFILLMENT'];
    const effectiveDbStatus = POST_APPROVAL.includes(db.status) ? 'APPROVED' : db.status;
    if (effectiveDbStatus !== bc.status) mismatches.push(`Stav: DB(${db.status}) vs BC(${bc.status})`);

    // Price offer checks
    const dbOffers = await this.prisma.priceOffer.findMany({ where: { batchID: requestId }, orderBy: { createdAt: 'asc' } });
    const bcOffers: { price: number; timestamp?: string }[] = bc.priceOffers || [];

    if (dbOffers.length !== bcOffers.length) {
      mismatches.push(`Počet cenových ponúk: DB(${dbOffers.length}) vs BC(${bcOffers.length})`);
    }

    const dbPrices = dbOffers.map(o => Number(o.price));
    const bcPrices = bcOffers.map(o => Number(o.price));
    const priceSetMatches = dbPrices.length === bcPrices.length && dbPrices.every((p, i) => p === bcPrices[i]);
    if (!priceSetMatches) {
      mismatches.push(`Cenové ponuky: DB(${dbPrices.join(', ')}) vs BC(${bcPrices.join(', ')})`);
    }

    if (bc.priceOffer) {
      const currentInDb = dbOffers.length > 0 ? dbOffers[dbOffers.length - 1] : null;
      if (!currentInDb) {
        mismatches.push(`Aktuálna ponuka BC(${bc.priceOffer}) chýba v DB`);
      } else if (Number(currentInDb.price) !== Number(bc.priceOffer)) {
        mismatches.push(`Aktuálna cena: DB(${currentInDb.price}) vs BC(${bc.priceOffer})`);
      } else if (bc.status === 'APPROVED' && currentInDb.status !== 'APPROVED') {
        mismatches.push(`Stav ponuky: DB(${currentInDb.status}) vs BC(APPROVED)`);
      }
    }

    return {
      isValid: mismatches.length === 0,
      message: mismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Zistený nesúlad údajov!',
      mismatches, db, bc,
    };
  }
}
