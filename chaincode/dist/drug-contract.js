"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let DrugContract = class DrugContract extends fabric_contract_api_1.Contract {
    // Funkcia na vytvorenie novej šarže (volá Výrobca) [cite: 260]
    async CreateDrugBatch(ctx, id, name, manufacturer, quantity, expiration) {
        const drug = {
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
    async TransferOwnership(ctx, id, newOwner) {
        const drugJSON = await ctx.stub.getState(id);
        if (!drugJSON || drugJSON.length === 0) {
            throw new Error(`Šarža ${id} neexistuje.`);
        }
        const drug = JSON.parse(drugJSON.toString());
        drug.owner = newOwner;
        drug.status = 'IN_STOCK';
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(drug)));
    }
    // Funkcia na načítanie detailov jednej šarže [cite: 260]
    async ReadDrug(ctx, id) {
        const drugJSON = await ctx.stub.getState(id);
        if (!drugJSON || drugJSON.length === 0) {
            throw new Error(`Šarža ${id} neexistuje.`);
        }
        return drugJSON.toString();
    }
    // Funkcia na načítanie všetkých šarží [cite: 260]
    async GetAllDrugs(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            }
            catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
    // Funkcia pre ŠÚKL na audit histórie pohybu šarže [cite: 262, 274]
    async GetDrugHistory(ctx, id) {
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
};
exports.DrugContract = DrugContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, Number, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "CreateDrugBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "TransferOwnership", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "ReadDrug", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "GetAllDrugs", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], DrugContract.prototype, "GetDrugHistory", null);
exports.DrugContract = DrugContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'DrugContract', description: 'Smart kontrakt pre sledovanie liečiv' })
], DrugContract);
//# sourceMappingURL=drug-contract.js.map