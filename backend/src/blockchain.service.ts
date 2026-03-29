import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers, GatewayError } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);
  private client: grpc.Client;
  private gateway: any;
  private contract: Contract;

  private config: any;

  async onModuleInit() {
    await this.loadConfig();
    await this.connect();
  }

  private async loadConfig() {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configData);
    this.logger.log('✔ Configuration loaded from config.json');
  }

  private async connect() {
    try {
      const mspId = process.env.FABRIC_MSP_ID || this.config.mspId;
      const channelName = process.env.FABRIC_CHANNEL || this.config.channel;
      const chaincodeName = process.env.FABRIC_CHAINCODE || this.config.cc;
      
      // We use the first peer from the CCP or a default
      const peerEndpoint = process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051';
      const peerHostAlias = process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.vyrobca.example.com';
      
      this.logger.log(`Connecting to Fabric Gateway at ${peerEndpoint} for Org ${mspId}...`);
      
      this.client = await this.newGrpcConnection(peerEndpoint, peerHostAlias);
      
      this.gateway = connect({
        client: this.client,
        identity: await this.newIdentity(mspId),
        signer: await this.newSigner(),
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
      });

      const network = this.gateway.getNetwork(channelName);
      this.contract = network.getContract(chaincodeName);
      this.logger.log('✔ Fabric Gateway connected successfully.');
      
      // Wait for discovery to populate
      this.logger.log('Waiting 10s for discovery to sync...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      this.logger.log('Discovery sync wait complete.');
    } catch (error) {
      this.handleError(error, 'Connection');
    }
  }

  async onModuleDestroy() {
    if (this.gateway) this.gateway.close();
    if (this.client) this.client.close();
  }

  private async newGrpcConnection(endpoint: string, hostAlias: string): Promise<grpc.Client> {
    const tlsCertPath = path.resolve(process.cwd(), this.config.walletPath, 'ca/vyrobca-ca.crt');
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(endpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': hostAlias,
    });
  }

  private async newIdentity(mspId: string): Promise<Identity> {
    const certPath = path.resolve(process.cwd(), this.config.walletPath, 'admin/msp/signcerts/cert.pem');
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
  }

  private async newSigner(): Promise<Signer> {
    const keyPath = path.resolve(process.cwd(), this.config.walletPath, 'admin/msp/keystore/admin.key');
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  /**
   * Generic executor for transactions.
   * We use automatic discovery to satisfy the endorsement policy.
   */
  private async executeTransaction(name: string, args: string[], isQuery = false): Promise<any> {
    try {
      if (isQuery) {
        const resultBytes = await this.contract.evaluateTransaction(name, ...args);
        return this.decodeResult(resultBytes);
      } else {
        // Gateway handles discovery and endorsement automatically
        const resultBytes = await this.contract.submitTransaction(name, ...args);
        return this.decodeResult(resultBytes);
      }
    } catch (error) {
      this.handleError(error, name);
    }
  }

  private decodeResult(resultBytes: Uint8Array): any {
    if (!resultBytes || resultBytes.length === 0) {
      return { success: true };
    }
    const resultString = new TextDecoder().decode(resultBytes);
    try {
      return JSON.parse(resultString);
    } catch (e) {
      return resultString;
    }
  }

  async createDrugBatch(id: string, name: string, manufacturer: string, quantity: number, expiration: string) {
    return this.executeTransaction('CreateDrugBatch', [id, name, manufacturer, quantity.toString(), expiration]);
  }

  async getAllDrugs() {
    return this.executeTransaction('GetAllDrugs', [], true);
  }

  async readDrug(id: string) {
    return this.executeTransaction('ReadDrug', [id], true);
  }

  async getDrugHistory(id: string) {
    return this.executeTransaction('GetDrugHistory', [id], true);
  }

  async transferOwnership(id: string, newOwner: string) {
    return this.executeTransaction('TransferOwnership', [id, newOwner]);
  }

  private handleError(error: any, context: string) {
    if (error instanceof GatewayError) {
      this.logger.error(`[${context}] Fabric Error: ${error.message} (Code: ${error.code})`);
      if (error.details) this.logger.error(`Details: ${JSON.stringify(error.details)}`);
    } else {
      this.logger.error(`[${context}] Error: ${error.message}`);
    }
    throw error;
  }
}

