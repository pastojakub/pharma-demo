import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
  GatewayError,
} from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from './prisma.service';

@Injectable()
export class FabricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);
  private clients: Map<string, grpc.Client> = new Map();
  private gateways: Map<string, any> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private config: any;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadConfig();
    await this.getContract('VyrobcaMSP');
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
      case 'PublicMSP': return 'public';
      default: return 'vyrobca';
    }
  }

  private getOrgEndpoint(mspId: string): { endpoint: string; hostAlias: string; } {
    switch (mspId) {
      case 'VyrobcaMSP': return { endpoint: 'localhost:7051', hostAlias: 'peer0.vyrobca.example.com' };
      case 'LekarenAMSP': return { endpoint: 'localhost:9051', hostAlias: 'peer0.lekarena.example.com' };
      case 'LekarenBMSP': return { endpoint: 'localhost:11051', hostAlias: 'peer0.lekarenb.example.com' };
      case 'SUKLMSP': return { endpoint: 'localhost:13051', hostAlias: 'peer0.sukl.example.com' };
      case 'PublicMSP': return { endpoint: 'localhost:15051', hostAlias: 'peer0.public.example.com' };
      default: return { endpoint: 'localhost:7051', hostAlias: 'peer0.vyrobca.example.com' };
    }
  }

  private async getContract(mspId: string): Promise<Contract> {
    const existingContract = this.contracts.get(mspId);
    if (existingContract) return existingContract;

    try {
      const orgName = this.getOrgName(mspId);
      const { endpoint, hostAlias } = this.getOrgEndpoint(mspId);
      const channelName = process.env.FABRIC_CHANNEL || this.config.channel;
      const chaincodeName = process.env.FABRIC_CHAINCODE || this.config.cc;

      const client = await this.newGrpcConnection(orgName, endpoint, hostAlias);
      const gateway = connect({
        client,
        identity: await this.newIdentity(orgName, mspId),
        signer: await this.newSigner(orgName),
      });

      const network = gateway.getNetwork(channelName);
      const contract = network.getContract(chaincodeName);

      this.clients.set(mspId, client);
      this.gateways.set(mspId, gateway);
      this.contracts.set(mspId, contract);

      this.logger.log(`✔ Fabric Gateway connected for ${mspId}.`);
      return contract;
    } catch (error) {
      this.logger.error(`Failed to connect for ${mspId}`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    for (const gateway of this.gateways.values()) gateway.close();
    for (const client of this.clients.values()) client.close();
  }

  private async newGrpcConnection(orgName: string, endpoint: string, hostAlias: string): Promise<grpc.Client> {
    const tlsCertPath = path.resolve(process.cwd(), this.config.walletPath, `ca/${orgName}-ca.crt`);
    const tlsRootCert = await fs.readFile(tlsCertPath);
    return new grpc.Client(endpoint, grpc.credentials.createSsl(tlsRootCert), { 'grpc.ssl_target_name_override': hostAlias });
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

  private async executeTransaction(name: string, args: string[], userID: number, isQuery = false, transientData?: Record<string, Uint8Array>): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: Number(userID) } });
    if (!user) throw new Error(`User ${userID} not found`);
    const contract = await this.getContract(user.org);

    try {
      if (isQuery) {
        const resultBytes = await contract.evaluateTransaction(name, ...args);
        return this.decodeResult(resultBytes);
      } else {
        const proposal = contract.newProposal(name, { arguments: args, transientData });
        const transaction = await proposal.endorse();
        const submittedTransaction = await transaction.submit();
        const resultBytes = submittedTransaction.getResult();
        const result = this.decodeResult(resultBytes);

        const status = await submittedTransaction.getStatus();
        if (!status.successful) throw new Error(`Transaction failed with status code ${status.code}`);

        if (userID) await this.createAuditLog(name, args[0], userID, args);
        await this.handlePostTxSync(name, args, user.org, result);
        return result;
      }
    } catch (error) {
      this.handleError(error, name);
    }
  }

  private async handlePostTxSync(name: string, args: string[], mspId: string, result?: any) {
    const batchOps = ['initBatch', 'transferOwnership', 'confirmDelivery', 'sellToConsumer', 'returnToManufacturer', 'emergencyRecall'];
    if (batchOps.includes(name) && args[0]) {
      await this.syncDrugWithDB(args[0], mspId);
      if (name === 'transferOwnership' && typeof result === 'string' && result !== args[0]) {
        await this.syncDrugWithDB(result, mspId);
      }
    }
  }

  private async createAuditLog(action: string, batchID: string, userID: number, args: string[]) {
    try {
      await this.prisma.auditLog.create({ data: { action, batchID, userID, details: JSON.stringify(args) } });
    } catch (e) { this.logger.error(`Audit log failed: ${e.message}`); }
  }

  private scavenger(obj: any, keys: string[]): any {
    if (!obj) return undefined;
    
    if (typeof obj === 'object' && obj.type === 'Buffer' && Array.isArray(obj.data)) {
        return this.scavenger(this.decodeResult(Uint8Array.from(obj.data)), keys);
    }
    if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
        return this.scavenger(this.decodeResult(obj), keys);
    }

    if (typeof obj === 'string') {
        try {
            const parsed = JSON.parse(obj);
            if (typeof parsed === 'object') return this.scavenger(parsed, keys);
        } catch (e) {}
    }

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

    const res = search(obj);
    if (typeof res !== 'undefined') return res;

    try {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        for (const k of keys) {
            const regex = new RegExp(`"${k}"\\s*:\\s*["']?([^"',}]+)["']?`, 'i');
            const match = str.match(regex);
            if (match && match[1]) return match[1];
        }
    } catch (e) {}

    return undefined;
  }

  async syncDrugWithDB(batchID: string, mspId: string, retryCount = 0) {
    try {
      const drugJSON = await this.readBatchWithMsp(batchID, mspId);
      if (!drugJSON) throw new Error(`Batch ${batchID} not found on ledger yet.`);

      let privateData: any = null;
      try {
        const pRes = await this.getBatchPriceWithMsp(batchID, mspId);
        privateData = this.decodeResult(null, pRes);
      } catch (e) {
        if (mspId !== 'PublicMSP') {
           this.logger.warn(`Private data for ${batchID} not indexed yet. Retrying...`);
           throw new Error('Private data indexing delay');
        }
      }

      const actualQty = (privateData && typeof privateData.quantity !== 'undefined') ? Number(privateData.quantity) : Number(this.scavenger(drugJSON, ['quantity']) || 0);
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
      this.logger.log(`✔ Synced ${batchID} to DB.`);
      
      // NEW: After syncing drug, check if any orders associated with this batch are now fulfilled
      await this.checkAndUpdateOrderStatus(batchID);
    } catch (e) {
      if (retryCount < 5) {
        const delay = 1000 * Math.pow(2, retryCount);
        this.logger.warn(`Sync retry ${retryCount + 1} for ${batchID} after ${delay}ms: ${e.message}`);
        await new Promise(res => setTimeout(res, delay));
        return this.syncDrugWithDB(batchID, mspId, retryCount + 1);
      }
    }
  }

  private async checkAndUpdateOrderStatus(batchID: string) {
    try {
      const fulfillments = await this.prisma.fulfillment.findMany({
        where: { batchID },
        include: { orderRequest: { include: { fulfillments: true } } }
      });

      for (const f of fulfillments) {
        const order = f.orderRequest;
        if (order.status === 'FULFILLED') continue;

        // Check all batches in this order
        const allBatchIDs = order.fulfillments.map(of => of.batchID);
        const batchesInDB = await this.prisma.drug.findMany({
          where: { batchID: { in: allBatchIDs } }
        });

        const allDelivered = allBatchIDs.every(id => {
          const b = batchesInDB.find(bdb => bdb.batchID === id);
          // Batch must exist and have a status that implies it was received
          return b && (b.status === 'DELIVERED' || b.status === 'SOLD' || b.status === 'OWNED');
        });

        if (allDelivered && allBatchIDs.length > 0) {
          await this.prisma.orderRequest.update({
            where: { id: order.id },
            data: { status: 'FULFILLED' }
          });
          this.logger.log(`✔ Order ${order.requestId} marked as FULFILLED.`);
        }
      }
    } catch (e) {
      this.logger.error(`Failed to update order status: ${e.message}`);
    }
  }

  async verifyIntegrity(batchID: string, mspId: string) {
    const db = await this.prisma.drug.findUnique({ where: { batchID } });
    if (!db) return { isValid: false, message: 'Šarža nebola nájdená v lokálnej databáze.', db: null, bc: null, mismatches: [] as string[] };
    
    let bc;
    try {
      bc = await this.readBatchWithMsp(batchID, mspId);
    } catch (bcError) {
      return { isValid: false, message: 'Šarža nebola nájdená na blockchaine.', db, bc: null, error: bcError.message, mismatches: [] as string[] };
    }
    
    const mismatches: string[] = [];
    const bcDrugID = this.scavenger(bc, ['drugID', 'drugId', 'id']);
    const bcDrugName = this.scavenger(bc, ['drugName', 'name']);

    if (String(db.drugID) !== String(bcDrugID)) mismatches.push(`Liek ID: DB(${db.drugID}) vs BC(${bcDrugID})`);
    if (String(db.drugName) !== String(bcDrugName)) mismatches.push(`Názov: DB(${db.drugName}) vs BC(${bcDrugName})`);
    if (String(db.manufacturer) !== String(bc.manufacturer)) mismatches.push(`Výrobca: DB(${db.manufacturer}) vs BC(${bc.manufacturer})`);
    if (String(db.ownerOrg) !== String(bc.ownerOrg)) mismatches.push(`Vlastník: DB(${db.ownerOrg}) vs BC(${bc.ownerOrg})`);
    if (String(db.unit) !== String(bc.unit)) mismatches.push(`Jednotka: DB(${db.unit}) vs BC(${bc.unit})`);
    if (String(db.expiryDate) !== String(bc.expiryDate)) mismatches.push(`Exspirácia: DB(${db.expiryDate}) vs BC(${bc.expiryDate})`);
    if (String(db.status) !== String(bc.status)) mismatches.push(`Stav: DB(${db.status}) vs BC(${bc.status})`);

    return { isValid: mismatches.length === 0, mismatches, db, bc };
  }

  async verifyOrderIntegrity(requestId: string, mspId: string, userID: number) {
    const db = await this.prisma.orderRequest.findUnique({ where: { requestId } });
    if (!db) return { isValid: false, message: 'Objednávka nebola nájdená v databáze.' };
    
    let bc;
    try {
      bc = await this.readPrivateOrder(requestId, userID, db.pharmacyOrg);
    } catch (e) {
      this.logger.error(`[ERROR] Verify Order ${requestId} failed: ${e.message}`);
      return { isValid: false, message: `Chyba pri čítaní z blockchainu: ${e.message}`, db, bc: null };
    }

    if (!bc) {
      return { isValid: false, message: 'Súkromné dáta objednávky neboli na blockchaine nájdené.', db, bc: null };
    }

    const mismatches: string[] = [];
    const bcDrugID = this.scavenger(bc, ['drugID', 'drugId', 'id']);
    const bcDrugName = this.scavenger(bc, ['drugName', 'name']);
    const bcQty = this.scavenger(bc, ['quantity', 'qty']);

    if (typeof bcDrugID === 'undefined') mismatches.push('Liek ID: Chýba na blockchaine');
    else if (String(db.drugId) !== String(bcDrugID)) mismatches.push(`Liek ID: DB(${db.drugId}) vs BC(${bcDrugID})`);

    if (typeof bcDrugName === 'undefined') mismatches.push('Názov: Chýba na blockchaine');
    else if (String(db.drugName) !== String(bcDrugName)) mismatches.push(`Názov: DB(${db.drugName}) vs BC(${bcDrugName})`);

    if (typeof bcQty === 'undefined') mismatches.push('Množstvo: Chýba na blockchaine');
    else if (Math.abs(Number(db.quantity) - Number(bcQty)) > 0.0001) mismatches.push(`Množstvo: DB(${db.quantity}) vs BC(${bcQty})`);
    
    return { isValid: mismatches.length === 0, mismatches, db, bc };
  }

  private decodeResult(resultBytes: Uint8Array | null, rawValue?: any): any {
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

  public async readBatchWithMsp(batchID: string, mspId: string): Promise<any> {
    const contract = await this.getContract(mspId);
    const resultBytes = await contract.evaluateTransaction('readBatch', batchID);
    return this.decodeResult(resultBytes);
  }

  private async getBatchPriceWithMsp(batchID: string, mspId: string): Promise<any> {
    const contract = await this.getContract(mspId);
    const resultBytes = await contract.evaluateTransaction('getBatchPrice', batchID);
    return this.decodeResult(resultBytes);
  }

  async initBatch(uID: number, bID: string, dID: string, name: string, m: string, exp: string, q: number, unit: string, p: number, meta?: string) {
    const transient = { price: Buffer.from(p.toString()), quantity: Buffer.from(q.toString()), metadata: Buffer.from(meta || '') };
    return this.executeTransaction('initBatch', [bID, dID, name, m, exp, unit], uID, false, transient);
  }

  async requestDrug(uID: number, rID: string, dID: string, name: string, mOrg: string, q: number, unit: string) {
    const transient = { quantity: Buffer.from(q.toString()) };
    return this.executeTransaction('requestDrug', [rID, dID, name, mOrg, unit], uID, false, transient);
  }

  async providePriceOffer(uID: number, rID: string, p: number, pMsp: string) {
    const transient = { price: Buffer.from(p.toString()) };
    return this.executeTransaction('providePriceOffer', [rID, pMsp], uID, false, transient);
  }

  async finalizeAgreement(uID: number, rID: string, p: number) {
    const transient = { price: Buffer.from(p.toString()) };
    return this.executeTransaction('finalizeAgreement', [rID], uID, false, transient);
  }

  async transferOwnership(uID: number, bID: string, nOrg: string, q: number, price?: number) {
    const transient: any = { quantity: Buffer.from(q.toString()) };
    if (price) transient.price = Buffer.from(price.toString());
    return this.executeTransaction('transferOwnership', [bID, nOrg], uID, false, transient);
  }

  async sellToConsumer(uID: number, bID: string, q: number) {
    const transient = { quantity: Buffer.from(q.toString()) };
    return this.executeTransaction('sellToConsumer', [bID], uID, false, transient);
  }

  async confirmDelivery(uID: number, bID: string) { return this.executeTransaction('confirmDelivery', [bID], uID, false); }
  async returnToManufacturer(uID: number, bID: string, mOrg: string) { return this.executeTransaction('returnToManufacturer', [bID, mOrg], uID, false); }
  async emergencyRecall(uID: number, bID: string) { return this.executeTransaction('emergencyRecall', [bID], uID, false); }
  async rejectRequest(uID: number, rID: string, pMsp: string, reason?: string) {
    const args = [rID, pMsp];
    if (reason) args.push(reason);
    return this.executeTransaction('rejectRequest', args, uID, false);
  }

  async queryHistoryWithMsp(bID: string, mspId: string) {
    const contract = await this.getContract(mspId);
    const res = await contract.evaluateTransaction('queryHistory', bID);
    const result = this.decodeResult(res);
    if (Array.isArray(result)) {
        return result.map(entry => ({ ...entry, sourceMsp: mspId }));
    }
    return result;
  }

  async queryHistory(bID: string, mspId: string) {
    const result = await this.queryHistoryWithMsp(bID, mspId);
    if (Array.isArray(result) && result.length === 0 && mspId !== 'VyrobcaMSP') {
        this.logger.warn(`History for ${bID} empty on ${mspId} peer. Falling back to VyrobcaMSP...`);
        return this.queryHistoryWithMsp(bID, 'VyrobcaMSP');
    }
    return result;
  }

  async verifyBatch(bID: string, mspId: string) {
    const contract = await this.getContract(mspId);
    const res = await contract.evaluateTransaction('verifyBatch', bID);
    return this.decodeResult(res);
  }

  async getAllDrugs(user: any) {
    if (user.role === 'regulator') return await this.prisma.drug.findMany({ orderBy: { createdAt: 'desc' } });
    return await this.prisma.drug.findMany({ where: { ownerOrg: user.org }, orderBy: { createdAt: 'desc' } });
  }

  async getBatchPrice(bID: string, mspId: string) { return this.getBatchPriceWithMsp(bID, mspId); }
  
  async readPrivateOrder(rID: string, uID: number, pMsp: string) { 
    try {
      const result = await this.executeTransaction('readPrivateOrder', [rID, pMsp], uID, true); 
      if (!result) throw new Error('NOT_FOUND_ON_LOCAL_PEER');
      return result;
    } catch (e) {
      if (e.message.includes('NOT_FOUND_ON_LOCAL_PEER') || e.message.includes('nie sú dostupné') || e.message.includes('not available')) {
        this.logger.warn(`Private data for order ${rID} not found on local peer. Attempting direct query to ${pMsp} peer...`);
        const contract = await this.getContract(pMsp);
        const resultBytes = await contract.evaluateTransaction('readPrivateOrder', rID, pMsp);
        return this.decodeResult(resultBytes);
      }
      throw e;
    }
  }

  private handleError(error: any, context: string) {
    this.logger.error(`[${context}] Error: ${error.message}`);
    throw error;
  }
}
