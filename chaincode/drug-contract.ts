import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Drug } from './drug';

@Info({ title: 'DrugContract', description: 'Smart kontrakt pre sledovanie liečiv' })
export class DrugContract extends Contract {

    // Funkcia na vytvorenie novej šarže (volá Výrobca) [cite: 260]
    @Transaction()
    public async CreateDrugBatch(ctx: Context, id: string, name: string, manufacturer: string, quantity: number, expiration: string): Promise<void> {
        const drug: Drug = {
            assetID: id,
            drugName: name,
            manufacturer: manufacturer,
            owner: manufacturer, // Na začiatku je vlastníkom výrobca [cite: 260]
            quantity: quantity,
            expirationDate: expiration,
            status: 'PRODUCED'
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(drug)));
    }

    // Funkcia na prevod vlastníctva (napr. z Výrobcu na Lekáreň) [cite: 260, 261]
    @Transaction()
    public async TransferOwnership(ctx: Context, id: string, newOwner: string): Promise<void> {
        const drugJSON = await ctx.stub.getState(id);
        if (!drugJSON || drugJSON.length === 0) {
            throw new Error(`Šarža ${id} neexistuje.`);
        }
        const drug = JSON.parse(drugJSON.toString()) as Drug;
        drug.owner = newOwner;
        drug.status = 'IN_STOCK';
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(drug)));
    }

    // Funkcia na načítanie detailov jednej šarže [cite: 260]
    @Transaction(false)
    public async ReadDrug(ctx: Context, id: string): Promise<string> {
        const drugJSON = await ctx.stub.getState(id);
        if (!drugJSON || drugJSON.length === 0) {
            throw new Error(`Šarža ${id} neexistuje.`);
        }
        return drugJSON.toString();
    }

    // Funkcia na načítanie všetkých šarží [cite: 260]
    @Transaction(false)
    public async GetAllDrugs(ctx: Context): Promise<string> {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // Funkcia pre ŠÚKL na audit histórie pohybu šarže [cite: 262, 274]
    @Transaction(false)
    public async GetDrugHistory(ctx: Context, id: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(id);
        const results = [];
        
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value) {
                // 1. Premena bajtov na čitateľný string (JSON formát)
                const recordString = new TextDecoder().decode(res.value.value);
                
                // 2. Vložíme to do poľa ako objekt, aby to NestJS vedel spracovať
                results.push({
                    txId: res.value.txId,
                    data: JSON.parse(recordString)
                });
            }
            res = await iterator.next();
        }
        
        // Vrátime celé pole histórie ako jeden JSON string
        return JSON.stringify(results);
    }
}