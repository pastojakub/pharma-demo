// drug.ts
export class Drug {
    public assetID: string = '';          // ID šarže 
    public drugName: string = '';         // Názov lieku
    public manufacturer: string = '';      // Výrobca (Org MSP ID) 
    public owner: string = '';            // Aktuálny vlastník (napr. Lekáreň A) 
    public quantity: number = 0;          // Množstvo v šarži 
    public expirationDate: string = '';    // Dátum exspirácie 
    public status: string = '';           // Stav: PRODUCED, IN_TRANSIT, SOLD, RECALLED
}