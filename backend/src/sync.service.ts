import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FabricService } from './fabric.service';
import { PrismaService } from './prisma.service';
import { IpfsService } from './ipfs.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

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

    // Force immediate sync to update local status
    await this.syncRecentChanges();

    // Check if this organization has any involvement with this batch or its descendants
    // We check for quantity > 0 to see if they currently have it in stock
    const localInventory = await this.prisma.drug.findMany({
      where: {
        OR: [
          { batchID: batchID },
          { batchID: { startsWith: `${batchID}-S` } } // Catches sub-batches like B-001-S12345
        ],
        quantity: { gt: 0 }
      }
    });

    const isRegulator = this.fabricService.getLocalMspId() === 'SUKLMSP';

    // Only notify if they have stock or are the regulator
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

  public async syncRecentChanges() {
     this.logger.log('Starting sync iteration...');
     try {
       const user = await this.prisma.user.findFirst();
       if (!user) {
         this.logger.warn('No user found in DB, skipping sync.');
         return;
       }

       // 1. MIRROR: Drug Catalog (Public)
       try {
         this.logger.log('Syncing Drug Catalog...');
         const bcDefs = await this.fabricService.getAllDrugDefinitions(user.id);
         const definitions = Array.isArray(bcDefs) ? bcDefs : JSON.parse(bcDefs || '[]');
         this.logger.log(`Found ${definitions.length} drug definitions on blockchain.`);
         
         for (const def of definitions) {
           if (!def.name) continue;
           const drug = await this.prisma.drugCatalog.upsert({
             where: { name: def.name },
             update: { 
               composition: def.composition, recommendedDosage: def.recommendedDosage,
               intakeInfo: def.intakeInfo, metadata: def.metadata
             },
             create: { 
               name: def.name, composition: def.composition,
               recommendedDosage: def.recommendedDosage,
               intakeInfo: def.intakeInfo || '', metadata: def.metadata || ''
             }
           });
           
           await this.prisma.file.deleteMany({ where: { drugCatalogId: drug.id } });
           const filesToCreate: any[] = [];
           if (def.leaflet) {
             filesToCreate.push({
               category: 'LEAFLET', cid: def.leaflet.cid,
               url: this.ipfsService.getGatewayUrl(def.leaflet.cid),
               name: def.leaflet.name, type: def.leaflet.type, size: def.leaflet.size, drugCatalogId: drug.id
             });
           }
           if (def.gallery && def.gallery.length > 0) {
             for (const f of def.gallery) {
               filesToCreate.push({
                 category: 'GALLERY', cid: f.cid,
                 url: this.ipfsService.getGatewayUrl(f.cid),
                 name: f.name, type: f.type, size: f.size, drugCatalogId: drug.id
               });
             }
           }
           if (filesToCreate.length > 0) await this.prisma.file.createMany({ data: filesToCreate });
         }
       } catch (e) {
         this.logger.error(`Drug Catalog sync failed: ${e.message}`);
       }

       // 2. MIRROR: Physical Batches (Public/Authorized)
       try {
         this.logger.log('Syncing Physical Batches...');
         const allItems = await this.fabricService.executeTransaction('GetAllDrugs', [], user.id, true);
         const items = Array.isArray(allItems) ? allItems : JSON.parse(allItems || '[]');
         this.logger.log(`Found ${items.length} batches on blockchain.`);
         
         for (const item of items) {
           if (item.batchID) await this.syncSingleBatch(item.batchID, user.id);
         }
       } catch (e) {
         this.logger.error(`Batches sync failed: ${e.message}`);
       }

       // 3. MIRROR: Private Order Requests, Price Offers & Fulfillments
       const localMsp = this.fabricService.getLocalMspId();
       let pharmsToQuery: string[] = [];
       
       if (localMsp === 'VyrobcaMSP' || localMsp === 'SUKLMSP') {
         pharmsToQuery = ['LekarenAMSP', 'LekarenBMSP'];
       } else if (localMsp === 'LekarenAMSP') {
         pharmsToQuery = ['LekarenAMSP'];
       } else if (localMsp === 'LekarenBMSP') {
         pharmsToQuery = ['LekarenBMSP'];
       }

       this.logger.log(`Syncing Private Orders for: ${pharmsToQuery.join(', ')}`);
       for (const pMsp of pharmsToQuery) {
         try {
           this.logger.log(`Querying private orders from collection for ${pMsp}...`);
           const bcOrders = await this.fabricService.executeTransaction('queryPrivateOrders', [pMsp], user.id, true);
           const orders = Array.isArray(bcOrders) ? bcOrders : JSON.parse(bcOrders || '[]');
           this.logger.log(`Found ${orders.length} private orders for ${pMsp}.`);
           
           for (const o of orders) {
              const order = await this.prisma.orderRequest.upsert({
                where: { requestId: o.requestId },
                update: { 
                  status: o.status, 
                  rejectionReason: o.rejectionReason || null,
                  quantity: Number(o.quantity || 0),
                  drugName: o.drugName,
                  manufacturerOrg: o.manufacturerOrg,
                  pharmacyOrg: o.pharmacyOrg,
                  unit: o.unit,
                  drugId: String(o.drugID)
                },
                create: {
                  requestId: o.requestId, drugId: String(o.drugID), drugName: o.drugName,
                  manufacturerOrg: o.manufacturerOrg, pharmacyOrg: o.pharmacyOrg,
                  quantity: Number(o.quantity || 0), unit: o.unit, status: o.status,
                  rejectionReason: o.rejectionReason || null
                }
              });

              if (o.fileAttachments && o.fileAttachments.length > 0) {
                await this.prisma.file.deleteMany({ where: { orderRequestId: order.id } });
                for (const f of o.fileAttachments) {
                  await this.prisma.file.create({
                    data: {
                      category: 'OTHER', cid: f.cid,
                      url: this.ipfsService.getGatewayUrl(f.cid),
                      name: f.name, type: f.type, size: f.size, orderRequestId: order.id
                    }
                  });
                }
              }

              if (o.fulfillments && o.fulfillments.length > 0) {
                for (const f of o.fulfillments) {
                  // NEW: Better fulfillment sync
                  const existingFull = await this.prisma.fulfillment.findFirst({
                    where: { orderRequestId: order.id, batchID: f.batchID }
                  });
                  if (!existingFull) {
                    await this.prisma.fulfillment.create({
                      data: {
                        orderRequestId: order.id,
                        batchID: f.batchID,
                        quantity: f.quantity,
                        createdAt: new Date(Number(f.timestamp) * 1000)
                      }
                    });
                  }
                }
              }

              // Sync Price Offers into DB
              if (o.priceOffer) {
                const status = o.status === 'APPROVED' ? 'APPROVED' : (o.status === 'REJECTED' ? 'REJECTED' : 'PENDING');
                
                await this.prisma.priceOffer.updateMany({
                  where: { batchID: o.requestId },
                  data: { status }
                });

                const existingOffer = await this.prisma.priceOffer.findFirst({
                  where: { batchID: o.requestId, price: Number(o.priceOffer) }
                });

                if (!existingOffer) {
                  await this.prisma.priceOffer.create({
                    data: {
                      batchID: o.requestId,
                      manufacturerOrg: o.manufacturerOrg,
                      pharmacyOrg: o.pharmacyOrg,
                      price: Number(o.priceOffer),
                      status
                    }
                  });
                }
              }
           }
         } catch (e) {
           this.logger.error(`Private orders sync failed for ${pMsp}: ${e.message}`);
         }
       }
       this.logger.log('Sync iteration finished.');
     } catch (e) {
       this.logger.error(`Sync iteration failed critically: ${e.message}`);
     }
  }

  private async syncSingleBatch(batchID: string, uID: number) {
    try {
      const mspId = this.fabricService.getLocalMspId();
      await this.fabricService.syncDrugWithDB(batchID, mspId);
    } catch (e) {
      this.logger.error(`Chyba pri synchronizácii šarže ${batchID}: ${e.message}`);
    }
  }
}
