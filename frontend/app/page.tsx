'use client';

import { useState, useEffect } from 'react';

interface Drug {
  assetID: string;
  drugName: string;
  manufacturer: string;
  owner: string;
  quantity: number;
  expirationDate: string;
  status: string;
}

export default function DrugDashboard() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newDrug, setNewDrug] = useState({
    id: '',
    name: '',
    manufacturer: 'Vyrobca',
    quantity: 100,
    expiration: '2026-12-31',
  });

  const [transfer, setTransfer] = useState({
    id: '',
    newOwner: '',
  });

  const API_URL = 'http://localhost:3000/drugs';

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch drugs');
      const data = await response.json();
      setDrugs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugs();
  }, []);

  const handleCreateDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDrug),
      });
      if (!response.ok) throw new Error('Failed to create drug');
      await fetchDrugs();
      setNewDrug({ id: '', name: '', manufacturer: 'Vyrobca', quantity: 100, expiration: '2026-12-31' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transfer),
      });
      if (!response.ok) throw new Error('Failed to transfer drug');
      await fetchDrugs();
      setTransfer({ id: '', newOwner: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <main className="container mx-auto p-8 font-sans">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">PharmaTrack Blockchain</h1>
        <p className="text-gray-600">Produkčný demo systém na sledovanie distribúcie liečiv</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: Forms */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">Pridať novú šaržu</h2>
            <form onSubmit={handleCreateDrug} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Šarže</label>
                <input
                  type="text"
                  value={newDrug.id}
                  onChange={(e) => setNewDrug({ ...newDrug, id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 p-2"
                  placeholder="BATCH-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Názov Lieku</label>
                <input
                  type="text"
                  value={newDrug.name}
                  onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 p-2"
                  placeholder="Paracetamol"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Vytvoriť v Blockchaine
              </button>
            </form>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">Prevod vlastníctva</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID Šarže</label>
                <input
                  type="text"
                  value={transfer.id}
                  onChange={(e) => setTransfer({ ...transfer, id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 p-2"
                  placeholder="BATCH-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nový Vlastník</label>
                <select
                  value={transfer.newOwner}
                  onChange={(e) => setTransfer({ ...transfer, newOwner: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 p-2"
                  required
                >
                  <option value="">Vyberte organizáciu</option>
                  <option value="LekarenA">Lekáreň A</option>
                  <option value="LekarenB">Lekáreň B</option>
                  <option value="SUKL">ŠÚKL (Audit)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200"
              >
                Previesť vlastníctvo
              </button>
            </form>
          </section>
        </div>

        {/* Main: Drug List */}
        <div className="lg:col-span-2">
          <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100 min-h-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Aktuálny stav Ledgeru</h2>
              <button
                onClick={fetchDrugs}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Obnoviť dáta
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                Chyba: {error}. Uistite sa, že backend beží a blockchain sieť je aktívna.
              </div>
            ) : drugs.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                Žiadne liečivá v blockchaine. Pridajte novú šaržu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Názov</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vlastník</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expirácia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {drugs.map((drug) => (
                      <tr key={drug.assetID} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-600">{drug.assetID}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{drug.drugName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{drug.owner}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            drug.status === 'PRODUCED' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {drug.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drug.expirationDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
