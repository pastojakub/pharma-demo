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
import { PrismaService } from '../prisma/prisma.service';
import { MSP_ORG_MAP } from '../constants/msp.constants';

@Injectable()
export class FabricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);
  private client: grpc.Client | null = null;
  private gateway: any = null;
  private contract: Contract | null = null;
  private network: Network | null = null;
  private config: any;
  private initPromise: Promise<void> | null = null;

  private mspId: string;
  private orgName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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
    }
  }

  private async loadConfig() {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configData);
  }

  private getOrgName(mspId: string): string {
    return MSP_ORG_MAP[mspId] ?? 'vyrobca';
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
      'grpc.keepalive_permit_without_calls': 1,
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

  // ─── Transaction execution ────────────────────────────────────────────────

  async executeTransaction(
    name: string,
    args: string[],
    userID: number,
    isQuery = false,
    transientData?: Record<string, Uint8Array>,
  ): Promise<any> {
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
    } catch (e) {
      this.logger.error(`Audit log failed: ${e.message}`);
    }
  }

  // ─── Response decoding ────────────────────────────────────────────────────

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
    } catch (e) {
      return value;
    }
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

  // ─── Business call wrappers ───────────────────────────────────────────────

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

  async finalizeAgreement(uID: number, rID: string) {
    return this.executeTransaction('finalizeAgreement', [rID], uID, false);
  }

  async transferOwnership(uID: number, bID: string, nOrg: string, q: number, price?: number, requestID?: string) {
    const transient: any = { quantity: Buffer.from(q.toString()) };
    if (price) transient.price = Buffer.from(price.toString());
    return this.executeTransaction('transferOwnership', [bID, nOrg, requestID || ''], uID, false, transient);
  }

  async sellToConsumer(uID: number, bID: string, q: number) {
    const transient = { quantity: Buffer.from(q.toString()) };
    return this.executeTransaction('sellToConsumer', [bID], uID, false, transient);
  }

  async confirmDelivery(uID: number, bID: string) { return this.executeTransaction('confirmDelivery', [bID], uID, false); }
  async returnToManufacturer(uID: number, bID: string, mOrg: string) { return this.executeTransaction('returnToManufacturer', [bID, mOrg], uID, false); }
  async emergencyRecall(uID: number, bID: string) { return this.executeTransaction('emergencyRecall', [bID], uID, false); }
  async rejectRequest(uID: number, rID: string, pMsp: string, reason = '') {
    return this.executeTransaction('rejectRequest', [rID, pMsp, reason], uID, false);
  }

  async addDrugDefinition(uID: number, drug: any) {
    const gallery = drug.files.filter((f: any) => f.category === 'GALLERY').map((f: any) => ({
      cid: f.cid, name: f.name, type: f.type, size: f.size,
    }));
    const leafletRaw = drug.files.find((f: any) => f.category === 'LEAFLET');
    const leaflet = leafletRaw
      ? { cid: leafletRaw.cid, name: leafletRaw.name, type: leafletRaw.type, size: leafletRaw.size }
      : null;

    return this.executeTransaction('addDrugDefinition', [
      String(drug.id), drug.name, drug.composition, drug.recommendedDosage,
      drug.intakeInfo || '', drug.metadata || '',
      JSON.stringify(leaflet), JSON.stringify(gallery),
    ], uID, false);
  }

  async getAllDrugDefinitions(uID: number) { return this.executeTransaction('GetAllDrugDefinitions', [], uID, true); }

  async queryHistory(bID: string, mspId: string) {
    const results = await this.executeTransaction('queryHistory', [bID], 1, true);
    if (Array.isArray(results)) return results.map(r => ({ ...r, sourceMsp: mspId }));
    return results;
  }

  async querySubBatches(bID: string) { return this.executeTransaction('querySubBatches', [bID], 1, true); }

  async getBatchPrice(batchID: string) { return this.executeTransaction('getBatchPrice', [batchID], 1, true); }
  async verifyBatch(batchID: string) { return this.executeTransaction('verifyBatch', [batchID], 1, true); }
  async readBatch(batchID: string) { return this.executeTransaction('readBatch', [batchID], 1, true); }
  async readPrivateOrder(requestID: string, userID: number, pharmacyMsp: string) {
    return this.executeTransaction('readPrivateOrder', [requestID, pharmacyMsp], userID, true);
  }
}
