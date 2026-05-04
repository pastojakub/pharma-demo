import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
  Network,
} from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from './prisma.service';
import { IpfsService } from './ipfs.service';

@Injectable()
export class FabricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);
  private client: grpc.Client | null = null;
  private gateway: any = null;
  private contract: Contract | null = null;
  private network: Network | null = null;
  private config: any;
  private initPromise: Promise<void> | null = null;

  // Identity Info
  private mspId: string;
  private orgName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private ipfsService: IpfsService
  ) {
    this.mspId = this.configService.get<string>('FABRIC_MSP_ID') || 'VyrobcaMSP';
    this.orgName = this.getOrgName(this.mspId);
  }

  async onModuleInit() {
    this.initPromise = this.internalInit();
    await this.initPromise;
  }

  private async internalInit() {
    try {
      await this.loadConfig();
      await this.initGateway();
    } catch (error) {
      this.logger.error(`Initial initialization failed: ${error.message}`);
      // We don't rethrow here to allow the app to start, but subsequent calls will fail if not retried
    }
  }

  private async loadConfig() {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configData);
  }

  private getOrgName(mspId: string): string {
    switch (mspId) {
      case 'VyrobcaMSP': return 'vyrobca';
      case 'LekarenAMSP': return 'lekarena';
      case 'LekarenBMSP': return 'lekarenb';
      case 'SUKLMSP': return 'sukl';
      default: return 'vyrobca';
    }
  }

  private async initGateway() {
    try {
      const endpoint = this.configService.get<string>('FABRIC_PEER_ENDPOINT') || 'localhost:7051';
      const hostAlias = this.configService.get<string>('FABRIC_PEER_HOST_ALIAS') || 'peer0.vyrobca.example.com';
      const channelName = this.configService.get<string>('FABRIC_CHANNEL') || this.config.channel;
      const chaincodeName = this.configService.get<string>('FABRIC_CHAINCODE') || this.config.cc;

      this.client = await this.newGrpcConnection(this.orgName, endpoint, hostAlias);
      this.gateway = connect({
        client: this.client,
        identity: await this.newIdentity(this.orgName, this.mspId),
        signer: await this.newSigner(this.orgName),
      });

      this.network = this.gateway.getNetwork(channelName);
      if (!this.network) throw new Error('Failed to get network');
      this.contract = this.network.getContract(chaincodeName);

      this.logger.log(`✔ Isolated Fabric Gateway connected for ${this.mspId} to ${endpoint}.`);
    } catch (error) {
      this.logger.error(`Failed to connect for ${this.mspId}: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.gateway) this.gateway.close();
    if (this.client) this.client.close();
  }

  private async newGrpcConnection(orgName: string, endpoint: string, hostAlias: string): Promise<grpc.Client> {
    const tlsCertPath = path.resolve(process.cwd(), this.config.walletPath, `ca/${orgName}-ca.crt`);
    const tlsRootCert = await fs.readFile(tlsCertPath);
    
    // Optional: Load global TLS CA if it exists for extra compatibility
    let combinedCerts = tlsRootCert;
    try {
      const globalTlsPath = path.resolve(process.cwd(), this.config.walletPath, 'ca/tls-ca.crt');
      const globalTlsCert = await fs.readFile(globalTlsPath);
      combinedCerts = Buffer.concat([tlsRootCert, Buffer.from('\n'), globalTlsCert]);
    } catch (e) {}

    return new grpc.Client(endpoint, grpc.credentials.createSsl(combinedCerts), { 
      'grpc.ssl_target_name_override': hostAlias,
      'grpc.keepalive_time_ms': 120000,
      'grpc.keepalive_timeout_ms': 20000,
      'grpc.keepalive_permit_without_calls': 1
    });
  }

  private async newIdentity(orgName: string, mspId: string): Promise<Identity> {
    const certPath = path.resolve(process.cwd(), this.config.walletPath, `${orgName}/admin/msp/signcerts/cert.pem`);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
  }

  private async newSigner(orgName: string): Promise<Signer> {
    const keyPath = path.resolve(process.cwd(), this.config.walletPath, `${orgName}/admin/msp/keystore/admin.key`);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  public async getContract(): Promise<Contract> {
    if (this.initPromise) await this.initPromise;
    if (!this.contract) {
       // Try one more time if it's null but we need it
       await this.internalInit();
       if (!this.contract) throw new Error('Contract not initialized');
    }
    return this.contract;
  }

  public async getNetwork(): Promise<Network> {
    if (this.initPromise) await this.initPromise;
    if (!this.network) {
       await this.internalInit();
       if (!this.network) throw new Error('Network not initialized');
    }
    return this.network;
  }

  public getLocalMspId(): string {
    return this.mspId;
  }

  public getChaincodeName(): string {
    return this.configService.get<string>('FABRIC_CHAINCODE') || this.config?.cc || 'drug-traceability';
  }

  async executeTransaction(name: string, args: string[], userID: number, isQuery = false, transientData?: Record<string, Uint8Array>): Promise<any> {
    const contract = await this.getContract();
    try {
      if (isQuery) {
        const resultBytes = await contract.evaluateTransaction(name, ...args);
        return this.decodeResult(resultBytes);
      } else {
        const proposal = contract.newProposal(name, { arguments: args, transientData });
        const transaction = await proposal.endorse();
        const resultBytes = transaction.getResult();
        const commit = await transaction.submit();
        
        const result = this.decodeResult(resultBytes);

        const status = await commit.getStatus();
        if (!status.successful) throw new Error(`Transaction failed with status code ${status.code}`);

        if (userID) await this.createAuditLog(name, args[0], userID, args);
        return result;
      }
    } catch (error) {
      this.logger.error(`[${name}] Error: ${error.message}`);
      throw error;
    }
  }

  private async createAuditLog(action: string, batchID: string, userID: number, args: string[]) {
    try {
      await this.prisma.auditLog.create({ data: { action, batchID, userID, details: JSON.stringify(args) } });
    } catch (e) { this.logger.error(`Audit log failed: ${e.message}`); }
  }

  public decodeResult(resultBytes: Uint8Array | null, rawValue?: any): any {
    if ((!resultBytes || resultBytes.length === 0) && typeof rawValue === 'undefined') return undefined;
    
    let value = rawValue;
    if (resultBytes && resultBytes.length > 0) value = new TextDecoder().decode(resultBytes);

    if (typeof value !== 'string') {
        if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
            return this.decodeResult(Uint8Array.from(value.data));
        }
        return value;
    }

    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'string' && parsed !== value) return this.decodeResult(null, parsed);
        if (typeof parsed === 'object' && parsed !== null && (parsed as any).type === 'Buffer') return this.decodeResult(null, parsed);
        return parsed;
    } catch (e) { return value; }
  }

  public scavenger(obj: any, keys: string[]): any {
    if (!obj) return undefined;
    if (typeof obj === 'object' && obj.type === 'Buffer') return this.scavenger(this.decodeResult(null, obj), keys);
    
    const search = (item: any): any => {
        if (Array.isArray(item)) {
            for (const el of item) {
                const found = search(el);
                if (typeof found !== 'undefined') return found;
            }
        } else if (typeof item === 'object' && item !== null) {
            if (item.value && typeof item.value === 'object') {
                const inner = search(item.value);
                if (typeof inner !== 'undefined') return inner;
            }
            for (const k of keys) {
                if (typeof item[k] !== 'undefined') return item[k];
                const keyLC = k.toLowerCase();
                const foundKey = Object.keys(item).find(ak => ak.toLowerCase() === keyLC);
                if (foundKey) return item[foundKey];
            }
            for (const key of Object.keys(item)) {
                if (key !== 'value') {
                    const found = search(item[key]);
                    if (typeof found !== 'undefined') return found;
                }
            }
        }
        return undefined;
    };
    return search(obj);
  }

  // Business Logic Wrappers
  async initBatch(uID: number, bID: string, dID: string, name: string, m: string, exp: string, q: number, unit: string, p: number, meta?: string) {
    const transient = { price: Buffer.from(p.toString()), quantity: Buffer.from(q.toString()), metadata: Buffer.from(meta || '') };
    return this.executeTransaction('initBatch', [bID, dID, name, m, exp, unit], uID, false, transient);
  }

  async requestDrug(uID: number, rID: string, dID: string, name: string, mOrg: string, q: number, unit: string, files: any[] = []) {
    const transient = { quantity: Buffer.from(q.toString()) };
    return this.executeTransaction('requestDrug', [rID, dID, name, mOrg, unit, JSON.stringify(files)], uID, false, transient);
  }

  async providePriceOffer(uID: number, rID: string, p: number, pMsp: string) {
    const transient = { price: Buffer.from(p.toString()) };
    return this.executeTransaction('providePriceOffer', [rID, pMsp], uID, false, transient);
  }

  async finalizeAgreement(uID: number, rID: string, p: number) {
    const transient = { price: Buffer.from(p.toString()) };
    return this.executeTransaction('finalizeAgreement', [rID], uID, false, transient);
  }

  async transferOwnership(uID: number, bID: string, nOrg: string, q: number, price?: number, requestID?: string) {
    const transient: any = { quantity: Buffer.from(q.toString()) };
    if (price) transient.price = Buffer.from(price.toString());
    const args = [bID, nOrg, requestID || ''];
    return this.executeTransaction('transferOwnership', args, uID, false, transient);
  }

  async sellToConsumer(uID: number, bID: string, q: number) {
    const transient = { quantity: Buffer.from(q.toString()) };
    return this.executeTransaction('sellToConsumer', [bID], uID, false, transient);
  }

  async confirmDelivery(uID: number, bID: string) { return this.executeTransaction('confirmDelivery', [bID], uID, false); }
  async returnToManufacturer(uID: number, bID: string, mOrg: string) { return this.executeTransaction('returnToManufacturer', [bID, mOrg], uID, false); }
  async emergencyRecall(uID: number, bID: string) { return this.executeTransaction('emergencyRecall', [bID], uID, false); }
  async rejectRequest(uID: number, rID: string, pMsp: string, reason: string = '') {
    return this.executeTransaction('rejectRequest', [rID, pMsp, reason], uID, false);
  }

  async addDrugDefinition(uID: number, drug: any) {
    const gallery = drug.files.filter(f => f.category === 'GALLERY').map(f => ({
      cid: f.cid, name: f.name, type: f.type, size: f.size
    }));
    const leafletRaw = drug.files.find(f => f.category === 'LEAFLET');
    const leaflet = leafletRaw ? {
      cid: leafletRaw.cid, name: leafletRaw.name, type: leafletRaw.type, size: leafletRaw.size
    } : null;

    return this.executeTransaction('addDrugDefinition', [
      String(drug.id), 
      drug.name, 
      drug.composition, 
      drug.recommendedDosage, 
      drug.intakeInfo || '', 
      drug.metadata || '', 
      JSON.stringify(leaflet), 
      JSON.stringify(gallery)
    ], uID, false);
  }

  async readDrugDefinition(uID: number, id: string) { return this.executeTransaction('readDrugDefinition', [id], uID, true); }
  async getAllDrugDefinitions(uID: number) { return this.executeTransaction('GetAllDrugDefinitions', [], uID, true); }

  async queryHistory(bID: string, mspId: string) {
     const results = await this.executeTransaction('queryHistory', [bID], 1, true);
     if (Array.isArray(results)) return results.map(r => ({ ...r, sourceMsp: mspId }));
     return results;
  }

  async querySubBatches(bID: string) {
    return this.executeTransaction('querySubBatches', [bID], 1, true);
  }

  // Restore missing public API methods
  async getAllDrugs(user: any) {
    if (user.role === 'regulator') return await this.prisma.drug.findMany({ orderBy: { createdAt: 'desc' } });
    return await this.prisma.drug.findMany({ 
      where: { 
        ownerOrg: user.org,
        NOT: [
          { status: 'SOLD' },
          { quantity: 0 }
        ]
      }, 
      orderBy: { createdAt: 'desc' } 
    });
  }

  async getBatchPrice(batchID: string, mspId: string) {
     return this.executeTransaction('getBatchPrice', [batchID], 1, true);
  }

  async verifyBatch(batchID: string, mspId: string) {
     return this.executeTransaction('verifyBatch', [batchID], 1, true);
  }

  async readBatchWithMsp(batchID: string, mspId: string) {
     return this.executeTransaction('readBatch', [batchID], 1, true);
  }

  async readPrivateOrder(requestID: string, userID: number, pharmacyMsp: string) {
     return this.executeTransaction('readPrivateOrder', [requestID, pharmacyMsp], userID, true);
  }

  async verifyOrderIntegrity(requestId: string, mspId: string, userID: number) {
    const db = await this.prisma.orderRequest.findUnique({ where: { requestId } });
    if (!db) return { isValid: false, message: 'Objednávka nebola nájdená v databáze.' };
    
    const bc = await this.readPrivateOrder(requestId, userID, db.pharmacyOrg);
    if (!bc) return { isValid: false, message: 'Blockchain dáta nedostupné.', db };

    const mismatches: string[] = [];
    if (Number(db.quantity) !== Number(bc.quantity)) {
      mismatches.push(`Množstvo: DB(${db.quantity}) vs BC(${bc.quantity})`);
    }
    if (db.drugName !== bc.drugName) {
      mismatches.push(`Názov lieku: DB(${db.drugName}) vs BC(${bc.drugName})`);
    }
    if (db.status !== bc.status) {
      mismatches.push(`Stav: DB(${db.status}) vs BC(${bc.status})`);
    }
    if (db.manufacturerOrg !== bc.manufacturerOrg) {
      mismatches.push(`Výrobca: DB(${db.manufacturerOrg}) vs BC(${bc.manufacturerOrg})`);
    }

    return { 
      isValid: mismatches.length === 0, 
      message: mismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Zistený nesúlad údajov!',
      mismatches,
      db, 
      bc 
    };
  }

  async syncDrugWithDB(batchID: string, mspId: string) {
    try {
      const drugJSON = await this.readBatchWithMsp(batchID, mspId);
      if (!drugJSON) return;

      let privateData: any = null;
      try {
        const pRes = await this.getBatchPrice(batchID, mspId);
        privateData = this.decodeResult(null, pRes);
        // Explicitly check for error response from chaincode
        if (privateData && privateData.error) {
          privateData = null;
        }
      } catch (e) {}

      // If private data (quantity) is missing for the current org, we try to use what's in the DB 
      // or default to 0 if it's not the owner org. 
      // But if we are syncing, we want the truth from the blockchain.
      const actualQty = (privateData && typeof privateData.quantity !== 'undefined') 
        ? Number(privateData.quantity) 
        : (drugJSON.status === 'SOLD' ? 0 : Number(this.scavenger(drugJSON, ['quantity']) || 0));
        
      const price = (privateData && typeof privateData.price !== 'undefined') ? Number(privateData.price) : null;

      const dID = this.scavenger(drugJSON, ['drugID', 'drugId', 'id']);
      const dName = this.scavenger(drugJSON, ['drugName', 'name']) || 'Unknown';

      await this.prisma.drug.upsert({
        where: { batchID },
        update: {
          drugID: String(dID), drugName: String(dName), manufacturer: drugJSON.manufacturer,
          ownerOrg: drugJSON.ownerOrg, quantity: isFinite(actualQty) ? actualQty : 0,
          unit: drugJSON.unit, expiryDate: drugJSON.expiryDate, status: drugJSON.status,
          price: isFinite(Number(price)) ? Number(price) : null, metadata: drugJSON.metadata
        },
        create: {
          batchID, drugID: String(dID), drugName: String(dName), manufacturer: drugJSON.manufacturer,
          ownerOrg: drugJSON.ownerOrg, quantity: isFinite(actualQty) ? actualQty : 0,
          unit: drugJSON.unit, expiryDate: drugJSON.expiryDate, status: drugJSON.status,
          price: isFinite(Number(price)) ? Number(price) : null, metadata: drugJSON.metadata
        }
      });
    } catch (e) {
      this.logger.error(`Sync error: ${e.message}`);
    }
  }

  async verifyIntegrity(batchID: string, mspId?: string) {
    const db = await this.prisma.drug.findUnique({ where: { batchID } });
    if (!db) return { isValid: false, message: 'Nenájdené v DB', mismatches: [] };

    const bc = await this.executeTransaction('readBatch', [batchID], 1, true);
    if (!bc) return { isValid: false, message: 'Blockchain dáta nedostupné', mismatches: [] };

    const mismatches: string[] = [];
    if (String(db.status) !== String(bc.status)) {
      mismatches.push(`Stav: DB(${db.status}) vs BC(${bc.status})`);
    }
    if (Number(db.quantity) !== Number(bc.quantity)) {
      mismatches.push(`Množstvo: DB(${db.quantity}) vs BC(${bc.quantity})`);
    }
    if (db.drugName !== bc.drugName) {
      mismatches.push(`Názov: DB(${db.drugName}) vs BC(${bc.drugName})`);
    }
    if (db.ownerOrg !== bc.ownerOrg) {
      mismatches.push(`Vlastník: DB(${db.ownerOrg}) vs BC(${bc.ownerOrg})`);
    }

    return { 
      isValid: mismatches.length === 0, 
      message: mismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Zistený nesúlad údajov!',
      db, 
      bc, 
      mismatches 
    }; 
  }

  async syncOrderWithDB(requestId: string, userID: number) {
    const dbOrder = await this.prisma.orderRequest.findUnique({ where: { requestId } });
    if (!dbOrder) return;

    try {
      const o = await this.readPrivateOrder(requestId, userID, dbOrder.pharmacyOrg);
      if (!o) return;

      const order = await this.prisma.orderRequest.update({
        where: { requestId: o.requestId },
        data: { 
          status: o.status, 
          rejectionReason: o.rejectionReason || null,
          quantity: Number(o.quantity || 0),
          drugName: o.drugName,
          manufacturerOrg: o.manufacturerOrg,
          pharmacyOrg: o.pharmacyOrg
        },
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
      return order;
    } catch (e) {
      this.logger.error(`Order sync error: ${e.message}`);
      throw e;
    }
  }

}
