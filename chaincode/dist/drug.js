"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drug = void 0;
// drug.ts
class Drug {
    assetID = ''; // ID šarže 
    drugName = ''; // Názov lieku
    manufacturer = ''; // Výrobca (Org MSP ID) 
    owner = ''; // Aktuálny vlastník (napr. Lekáreň A) 
    quantity = 0; // Množstvo v šarži 
    expirationDate = ''; // Dátum exspirácie 
    status = ''; // Stav: PRODUCED, IN_TRANSIT, SOLD, RECALLED
}
exports.Drug = Drug;
//# sourceMappingURL=drug.js.map