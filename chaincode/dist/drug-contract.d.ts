import { Context, Contract } from 'fabric-contract-api';
export declare class DrugContract extends Contract {
    CreateDrugBatch(ctx: Context, id: string, name: string, manufacturer: string, quantity: number, expiration: string): Promise<void>;
    TransferOwnership(ctx: Context, id: string, newOwner: string): Promise<void>;
    ReadDrug(ctx: Context, id: string): Promise<string>;
    GetAllDrugs(ctx: Context): Promise<string>;
    GetDrugHistory(ctx: Context, id: string): Promise<string>;
}
//# sourceMappingURL=drug-contract.d.ts.map