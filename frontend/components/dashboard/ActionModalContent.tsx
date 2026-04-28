import React from "react";
import {
	ClipboardList,
	Box,
	ImageIcon,
	FileDown,
	ChevronDown,
	ShoppingCart,
	Info,
	AlertCircle,
	CheckCircle,
	RotateCcw,
	ShieldCheck,
	ShieldAlert,
	Clock,
	User,
	Package,
	Plus,
	Trash2,
	ArrowRightLeft,
	ChevronRight,
	MapPin,
	Calendar,
	Truck,
	X,
	History,
	Building,
	Tag,
} from "lucide-react";
import { FormField } from "../ui/FormField";
import { StatusBadge } from "../ui/StatusBadge";
import {
	DrugDefinition,
	Batch,
	TransactionHistory,
	IntegrityStatus,
	OrderRequest,
} from "../../types";

interface ActionModalContentProps {
	modalType: string;
	setModalType: (type: string) => void;
	modalTab: "details" | "batches" | "pricing";
	setModalTab: (tab: "details" | "batches" | "pricing") => void;
	selectedDrug: DrugDefinition | null;
	selectedBatch: Batch | null;
	batches: Batch[];
	newDrug: any;
	setNewDrug: (drug: any) => void;
	newBatch: any;
	setNewBatch: (batch: any) => void;
	catalog: DrugDefinition[];
	drugSearch: string;
	setDrugSearch: (search: string) => void;
	isDropdownOpen: boolean;
	setIsDropdownOpen: (open: boolean) => void;
	offerPrice: number;
	setOfferPrice: (price: number) => void;
	offers: any[];
	selectedOffer: any;
	setSelectedOffer: (offer: any) => void;
	transferQuantity: number;
	setTransferQuantity: (qty: number) => void;
	sellQuantity: number;
	setSellQuantity: (qty: number) => void;
	history: TransactionHistory[];
	integrity: IntegrityStatus | null;
	backendUrl: string;
	handleFileUpload: (
		e: React.ChangeEvent<HTMLInputElement>,
		type: "leaflet" | "gallery",
	) => void;
	fileInputRef: React.RefObject<HTMLInputElement>;
	galleryInputRef: React.RefObject<HTMLInputElement>;
	fulfillmentBatches: { batchID: string; quantity: number }[];
	setFulfillmentBatches: (
		batches: { batchID: string; quantity: number }[],
	) => void;
	fulfillments: any[];
	user: any;
	pricingSummary: any[];
	handleAction: (
		type: string,
		batch?: Batch,
		drug?: DrugDefinition,
		tab?: "details" | "batches" | "pricing",
	) => void;
	setSelectedImage?: (url: string | null) => void;
	targetOrg?: string;
	setTargetOrg?: (org: string) => void;
}

export const ActionModalContent: React.FC<ActionModalContentProps> = ({
	modalType,
	setModalType,
	modalTab,
	setModalTab,
	selectedDrug,
	selectedBatch,
	batches,
	newDrug,
	setNewDrug,
	newBatch,
	setNewBatch,
	catalog,
	drugSearch,
	setDrugSearch,
	isDropdownOpen,
	setIsDropdownOpen,
	offerPrice,
	setOfferPrice,
	offers,
	selectedOffer,
	setSelectedOffer,
	transferQuantity,
	setTransferQuantity,
	sellQuantity,
	setSellQuantity,
	history,
	integrity,
	backendUrl,
	handleFileUpload,
	fileInputRef,
	galleryInputRef,
	fulfillmentBatches,
	setFulfillmentBatches,
	fulfillments,
	user,
	pricingSummary,
	handleAction,
	setSelectedImage,
	targetOrg,
	setTargetOrg,
}) => {
	const canPerformAction = (batch: Batch) => {
		const isOwner = user?.org === batch.ownerOrg;
		const isStableState = ["INITIALIZED", "DELIVERED", "OWNED"].includes(
			batch.status,
		);
		return isOwner && isStableState;
	};

	if (modalType === "ORDER_DETAILS" && selectedBatch) {
		const order = selectedBatch as unknown as OrderRequest;
		const orderIntegrity = integrity || (selectedBatch as any).integrity;

		return (
			<div className="space-y-8">
				<div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex justify-between items-center">
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<ShoppingCart size={100} />
					</div>
					<div className="relative z-10">
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
							Identifikátor objednávky
						</label>
						<p className="text-4xl font-mono font-black tracking-tighter">
							{order.requestId}
						</p>
						<div className="mt-6 flex items-center">
							<StatusBadge status={order.status} />
							<span className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
								{order.drugName}
							</span>
						</div>
					</div>

					{orderIntegrity && (
						<div
							className={`p-4 rounded-2xl border-2 flex items-center space-x-3 z-10 ${orderIntegrity.isValid ? "bg-green-900/20 border-green-500/50 text-green-400" : "bg-red-900/20 border-red-500/50 text-red-400"}`}
						>
							{orderIntegrity.isValid ? (
								<ShieldCheck size={24} />
							) : (
								<AlertCircle size={24} />
							)}
							<span className="text-[10px] font-black uppercase tracking-widest">
								{orderIntegrity.isValid ? "Zhodné" : "Nesúlad"}
							</span>
						</div>
					)}
				</div>

				{!orderIntegrity?.isValid && orderIntegrity?.mismatches && (
					<div className="p-6 bg-red-50 border border-red-100 rounded-3xl animate-pulse-red flex justify-between items-center">
						<div>
							<label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
								Zistený nesúlad s blockchainom!
							</label>
							<ul className="space-y-1">
								{orderIntegrity.mismatches.map((m: string, i: number) => (
									<li
										key={i}
										className="text-xs font-bold text-red-700 flex items-center"
									>
										<div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>{" "}
										{m}
									</li>
								))}
							</ul>
						</div>
						<button
							onClick={() => handleAction("SYNC_ORDER", selectedBatch)}
							className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center"
						>
							<RotateCcw size={14} className="mr-2" /> Opraviť z blockchainu
						</button>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
							Detaily požiadavky
						</label>
						<div className="space-y-4">
							<div className="flex justify-between items-end border-b border-gray-200 pb-2">
								<span className="text-sm font-bold text-gray-500 flex items-center">
									<Package size={14} className="mr-2" /> Množstvo
								</span>
								<span className="text-xl font-black text-black">
									{order.quantity} {order.unit}
								</span>
							</div>
							<div className="flex justify-between items-end border-b border-gray-200 pb-2">
								<span className="text-sm font-bold text-gray-500 flex items-center">
									<Calendar size={14} className="mr-2" /> Vytvorené
								</span>
								<span className="text-sm font-black text-black">
									{new Date(order.createdAt).toLocaleDateString()}
								</span>
							</div>
							{order.status === 'APPROVED' && (
								<div className="flex justify-between items-end border-b border-gray-200 pb-2 text-green-600">
									<span className="text-sm font-bold flex items-center">
										<ShieldCheck size={14} className="mr-2" /> Schválené
									</span>
									<span className="text-sm font-black uppercase">
										PRIPRAVENÉ NA EXPEDÍCIU
									</span>
								</div>
							)}
						</div>
					</div>

					<div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm text-bold">
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest font-bold">
							Účastníci transakcie
						</label>
						<div className="space-y-4 font-bold">
							<div className="flex flex-col border-b border-gray-200 pb-2">
								<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
									<Building size={12} className="mr-1" /> Dodávateľ
								</span>
								<span className="text-sm font-black text-black">
									{order.manufacturerOrg}
								</span>
							</div>
							<div className="flex flex-col border-b border-gray-200 pb-2">
								<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
									<MapPin size={12} className="mr-1" /> Odberateľ
								</span>
								<span className="text-sm font-black text-black">
									{order.pharmacyOrg}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">
						História cenových ponúk
					</label>
					<div className="bg-white border-2 border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
						<table className="w-full text-left">
							<thead className="bg-gray-50 border-b border-gray-100">
								<tr>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Dátum</th>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Cena</th>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Stav</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50 font-bold">
								{offers.length > 0 ? (
									offers.map((off, idx) => (
										<tr key={idx} className="hover:bg-gray-50/50 transition-colors">
											<td className="px-8 py-4 text-xs text-gray-500">
												{new Date(off.createdAt).toLocaleString()}
											</td>
											<td className="px-8 py-4 text-right font-black text-black text-lg">
												{off.price.toFixed(2)}€
											</td>
											<td className="px-8 py-4 text-right">
												<span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${off.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
													{off.status === 'APPROVED' ? 'Akceptovaná' : 'Odoslaná'}
												</span>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={3} className="px-8 py-10 text-center text-gray-400 font-bold italic">
											Zatiaľ neboli zaslané žiadne ponuky.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex gap-4">
					<button
						onClick={() => {
							if (selectedDrug) {
								setModalType("INFO");
								setModalTab("details");
							}
						}}
						className="flex-1 p-6 bg-white border-2 border-gray-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:border-black transition-all flex items-center justify-center group"
					>
						<Info size={18} className="mr-2 text-gray-400 group-hover:text-black transition-colors" /> Karta lieku
					</button>

					{order.status === 'PENDING' && user?.role === 'manufacturer' && (
						<button
							onClick={() => handleAction("OFFER", selectedBatch)}
							className="flex-1 p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
						>
							<Tag size={18} className="mr-2" /> Poslať ponuku
						</button>
					)}

					{order.status === 'OFFER_MADE' && user?.role === 'pharmacy' && (
						<button
							onClick={() => handleAction("APPROVE_OFFER", selectedBatch)}
							className="flex-1 p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
						>
							<CheckCircle size={18} className="mr-2" /> Schváliť ponuku
						</button>
					)}

					{order.status === 'APPROVED' && user?.role === 'manufacturer' && (
						<button
							onClick={() => handleAction("FULFILL", selectedBatch)}
							className="flex-1 p-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
						>
							<Truck size={18} className="mr-2" /> Expedovať
						</button>
					)}
				</div>
			</div>
		);
	}

	if (modalType === "INFO") {
		return (
			<>
				<div className="flex bg-gray-50 p-1.5 rounded-2xl mb-10 border border-gray-100">
					<button
						onClick={() => setModalTab("details")}
						className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all ${modalTab === "details" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
					>
						<ClipboardList size={16} className="mr-2" /> Informácie
					</button>
					<button
						onClick={() => setModalTab("batches")}
						className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all ${modalTab === "batches" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
					>
						<Box size={16} className="mr-2" /> Šarže
					</button>
					{user?.role === "manufacturer" && (
						<button
							onClick={() => setModalTab("pricing")}
							className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all ${modalTab === "pricing" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
						>
							<ShoppingCart size={16} className="mr-2" /> Cenník
						</button>
					)}
				</div>

				{modalTab === "details" && (
					<div className="space-y-8">
						<div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-8 opacity-10">
								<Info size={100} />
							</div>
							<label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
								Informácie o užívaní
							</label>
							<p className="text-3xl font-black leading-tight italic">
								"
								{selectedDrug?.intakeInfo ||
									"Informácia nie je k dispozícii."}
								"
							</p>
						</div>
						{selectedDrug?.files?.filter(
							(f) => f.category === "GALLERY",
						).length ? (
							<div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
								{selectedDrug.files
									.filter((f) => f.category === "GALLERY")
									.map((f, i) => (
										<div
											key={i}
											className="flex-shrink-0 w-48 aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 relative cursor-pointer active:scale-95 transition-transform"
											onClick={() => setSelectedImage && setSelectedImage(backendUrl + f.url)}
										>
											<img
												src={backendUrl + f.url}
												className="w-full h-full object-cover transition-transform hover:scale-110"
											/>
											<div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[10px] p-2 text-center">
												KLIKNITE PRE DETAIL
											</div>
										</div>
									))}
							</div>
						) : null}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
								<label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
									Zloženie
								</label>
								<p className="font-bold text-gray-700 leading-relaxed">
									{selectedDrug?.composition || "Neuvedené."}
								</p>
							</div>
							<div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
								<label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
									Dávkovanie
								</label>
								<p className="font-bold text-gray-700 leading-relaxed">
									{selectedDrug?.recommendedDosage ||
										"Neuvedené."}
								</p>
							</div>
						</div>
						{selectedDrug?.files?.find(
							(f) => f.category === "LEAFLET",
						) && (
							<a
								href={
									backendUrl +
									selectedDrug.files.find(
										(f) => f.category === "LEAFLET",
									)!.url
								}
								target="_blank"
								className="flex items-center justify-between p-8 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] group hover:bg-black transition-all shadow-lg shadow-gray-100/50"
							>
								<div className="flex items-center">
									<div className="bg-white p-4 rounded-2xl mr-5 text-black group-hover:bg-gray-800 group-hover:text-white shadow-sm transition-colors">
										<ClipboardList size={28} />
									</div>
									<div>
										<p className="font-black text-black group-hover:text-white transition-colors uppercase tracking-tight text-sm">
											{
												selectedDrug.files.find(
													(f) =>
														f.category ===
														"LEAFLET",
												)!.name
											}
										</p>
										<p className="text-[10px] font-bold text-gray-400 group-hover:text-gray-300 transition-colors uppercase tracking-widest mt-1">
											STIAHNUŤ PRÍBALOVÝ LETÁK (PDF)
										</p>
									</div>
								</div>
								<FileDown
									className="text-gray-300 group-hover:text-white transition-colors"
									size={28}
								/>
							</a>
						)}
					</div>
				)}

				{modalTab === "batches" && (
					<div className="space-y-4">
						{user?.role === "manufacturer" && (
							<button
								onClick={() =>
									handleAction(
										"CREATE_BATCH",
										undefined,
										selectedDrug || undefined,
									)
								}
								className="w-full p-6 bg-green-50 border-2 border-dashed border-green-100 rounded-3xl font-black text-xs text-green-600 uppercase tracking-widest hover:bg-green-100 hover:border-green-200 transition-all flex items-center justify-center mb-6"
							>
								<Plus size={18} className="mr-2" /> Pridať novú
								šaržu do skladu
							</button>
						)}
						{batches
							.filter(
								(b) =>
									String(b.drugID) ===
									String(selectedDrug?.id),
							)
							.map((b) => (
								<div
									key={b.batchID}
									className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white transition-all shadow-sm group relative"
								>
									<div
										className="flex-1 cursor-pointer"
										onClick={() => handleAction("INFO", b)}
									>
										<p className="font-mono font-black text-lg leading-none mb-1">
											{b.batchID}
										</p>
										<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
											{b.quantity} {b.unit} • Exspirácia:{" "}
											{b.expiryDate}
										</p>
									</div>
									<div className="flex items-center space-x-3">
										{canPerformAction(b) &&
											user?.role === "pharmacy" && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleAction("SELL", b);
													}}
													className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-md"
												>
													PREDAŤ
												</button>
											)}
										<StatusBadge status={b.status} />
									</div>
								</div>
							))}
						{batches.filter(
							(b) =>
								String(b.drugID) === String(selectedDrug?.id),
						).length === 0 && (
							<div className="py-20 text-center text-gray-400 font-bold italic">
								Žiadne aktívne šarže pre tento liek.
							</div>
						)}
					</div>
				)}

				{modalTab === "pricing" && (
					<div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
						<table className="w-full text-left">
							<thead className="bg-gray-50 border-b">
								<tr>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">
										Lekáreň
									</th>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
										Dohodnutá Cena
									</th>
									<th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
										Celkový Objem
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50 font-bold">
								{pricingSummary.length > 0 ? (
									pricingSummary.map((p, i) => (
										<tr
											key={i}
											className="hover:bg-gray-50/50"
										>
											<td className="px-8 py-5 text-gray-900">
												{p.pharmacy}
											</td>
											<td className="px-8 py-5 text-right font-black text-green-600 text-lg">
												{p.price.toFixed(2)}€
											</td>
											<td className="px-8 py-5 text-right">
												<span className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-500">
													{p.totalQuantity} ks
												</span>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td
											colSpan={3}
											className="px-8 py-10 text-center text-gray-400 font-bold italic"
										>
											Zatiaľ neboli dohodnuté žiadne ceny.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</>
		);
	}

	if (modalType === "BATCH_INFO" && selectedBatch) {
		return (
			<div className="space-y-8">
				<div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<Package size={100} />
					</div>
					<label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
						Identifikátor šarže
					</label>
					<p className="text-4xl font-mono font-black tracking-tighter">
						{selectedBatch.batchID}
					</p>
					<div className="mt-6 flex items-center">
						<StatusBadge status={selectedBatch.status} />
						<span className="ml-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
							{selectedBatch.drugName}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
							Skladové informácie
						</label>
						<div className="space-y-4">
							<div className="flex justify-between items-end border-b border-gray-200 pb-2">
								<span className="text-sm font-bold text-gray-500">
									Množstvo
								</span>
								<span className="text-xl font-black text-black">
									{selectedBatch.quantity}{" "}
									{selectedBatch.unit}
								</span>
							</div>
							<div className="flex justify-between items-end border-b border-gray-200 pb-2">
								<span className="text-sm font-bold text-gray-500">
									Exspirácia
								</span>
								<span className="text-lg font-black text-black">
									{selectedBatch.expiryDate}
								</span>
							</div>
							{selectedBatch.price && (
								<div className="flex justify-between items-end border-b border-gray-200 pb-2">
									<span className="text-sm font-bold text-gray-500">
										Cena
									</span>
									<span className="text-xl font-black text-green-600">
										{selectedBatch.price.toFixed(2)}€
									</span>
								</div>
							)}
						</div>
					</div>

					<div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
							Pôvod a vlastníctvo
						</label>
						<div className="space-y-4">
							<div className="flex flex-col border-b border-gray-200 pb-2">
								<span className="text-xs font-bold text-gray-500 uppercase">
									Výrobca
								</span>
								<span className="text-md font-black text-black">
									{selectedBatch.manufacturer}
								</span>
							</div>
							<div className="flex flex-col border-b border-gray-200 pb-2">
								<span className="text-xs font-bold text-gray-500 uppercase">
									Aktuálny vlastník (MSP)
								</span>
								<span className="text-md font-black text-black">
									{selectedBatch.ownerOrg}
								</span>
							</div>
							{selectedBatch.metadata && (
								<div className="flex flex-col">
									<span className="text-xs font-bold text-gray-500 uppercase">
										Metadáta
									</span>
									<span className="text-sm font-bold text-gray-700 italic mt-1">
										{selectedBatch.metadata}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<button
						onClick={() => {
							setModalType("INFO");
							setModalTab("details");
						}}
						className="p-6 bg-white border-2 border-gray-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:border-black transition-all flex items-center justify-center group"
					>
						<Info
							size={18}
							className="mr-2 text-gray-400 group-hover:text-black transition-colors"
						/>{" "}
						Karta lieku
					</button>

					<button
						onClick={() => handleAction("HISTORY", selectedBatch)}
						className="p-6 bg-gray-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center shadow-lg"
					>
						<History size={18} className="mr-2" /> História
					</button>

					{canPerformAction(selectedBatch) && (
						<button
							onClick={() =>
								handleAction("TRANSFER", selectedBatch)
							}
							className="p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
						>
							<ArrowRightLeft size={18} className="mr-2" />{" "}
							Presunúť
						</button>
					)}

					{canPerformAction(selectedBatch) &&
						user?.role === "pharmacy" && (
							<button
								onClick={() =>
									handleAction("SELL", selectedBatch)
								}
								className="p-6 bg-green-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center shadow-lg"
							>
								<ShoppingCart size={18} className="mr-2" />{" "}
								Predať
							</button>
						)}

					{user?.org === selectedBatch.ownerOrg &&
						selectedBatch.status === "IN_TRANSIT" && (
							<button
								onClick={() =>
									handleAction("RECEIVE", selectedBatch)
								}
								className="p-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
							>
								<CheckCircle size={18} className="mr-2" />{" "}
								Prevziať
							</button>
						)}
				</div>
			</div>
		);
	}

	if (modalType === "CREATE_DRUG" || modalType === "EDIT_DRUG") {
		return (
			<div className="space-y-6">
				<div className="grid grid-cols-2 gap-6">
					<FormField
						label="Názov Lieku"
						value={newDrug.name}
						onChange={(v: string) =>
							setNewDrug({ ...newDrug, name: v })
						}
					/>
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
							Produktová Galéria
						</label>
						<div className="space-y-4">
							<button
								onClick={() => galleryInputRef.current?.click()}
								className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl font-bold text-gray-400 hover:border-black transition-all flex items-center justify-center"
							>
								<ImageIcon size={20} className="mr-2" />{" "}
								Pridať fotky
							</button>
							{newDrug.gallery.length > 0 && (
								<div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
									{newDrug.gallery.map((img: any, idx: number) => (
										<div key={idx} className="flex-shrink-0 w-20 h-20 relative group rounded-xl overflow-hidden border">
											<img src={backendUrl + img.url} className="w-full h-full object-cover" />
											<button 
												onClick={() => setNewDrug({...newDrug, gallery: newDrug.gallery.filter((_:any, i:number) => i !== idx)})}
												className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<X size={12} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
						<input
							type="file"
							multiple
							className="hidden"
							ref={galleryInputRef}
							onChange={(e) => handleFileUpload(e, "gallery")}
						/>
					</div>
				</div>
				<FormField
					label="Pokyny k užívaniu (Intake Info)"
					value={newDrug.intakeInfo}
					placeholder="Napr. 1 tableta ráno pred jedlom"
					onChange={(v: string) =>
						setNewDrug({ ...newDrug, intakeInfo: v })
					}
				/>
				<div className="grid grid-cols-2 gap-6">
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
							Príbalový Leták (PDF)
						</label>
						<div className="flex items-center gap-3">
							<button
								onClick={() => fileInputRef.current?.click()}
								className="flex-1 py-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl font-bold text-gray-400 hover:border-black transition-all flex items-center justify-center"
							>
								<FileDown size={20} className="mr-2" />{" "}
								{newDrug.leaflet ? "Nahradené" : "Vybrať PDF"}
							</button>
							{newDrug.leaflet && (
								<button 
									onClick={() => setNewDrug({...newDrug, leaflet: null})}
									className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
								>
									<Trash2 size={20} />
								</button>
							)}
						</div>
						<input
							type="file"
							accept=".pdf"
							className="hidden"
							ref={fileInputRef}
							onChange={(e) => handleFileUpload(e, "leaflet")}
						/>
					</div>
					<FormField
						label="Odporúčané Dávkovanie"
						value={newDrug.recommendedDosage}
						onChange={(v: string) =>
							setNewDrug({ ...newDrug, recommendedDosage: v })
						}
					/>
				</div>
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
						Zloženie
					</label>
					<textarea
						className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:border-black font-bold transition-all"
						rows={2}
						value={newDrug.composition}
						onChange={(e) =>
							setNewDrug({
								...newDrug,
								composition: e.target.value,
							})
						}
					/>
				</div>
			</div>
		);
	}

	if (modalType === "REQUEST") {
		return (
			<div className="space-y-8">
				<div className="relative">
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
						Vybrať liek z katalógu
					</label>
					<button
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
						className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl text-left font-black flex justify-between items-center hover:bg-gray-100 transition-all"
					>
						{newBatch.name || "Zvoľte produkt..."}
						<ChevronDown />
					</button>
					{isDropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-3xl shadow-2xl z-[210] overflow-hidden animate-in slide-in-from-top-2">
							<div className="p-3 bg-gray-50 border-b">
								<input
									className="w-full p-3 bg-white border rounded-xl outline-none font-bold focus:border-black"
									placeholder="Rýchle hľadanie..."
									value={drugSearch}
									onChange={(e) =>
										setDrugSearch(e.target.value)
									}
									onClick={(e) => e.stopPropagation()}
								/>
							</div>
							<div className="max-h-60 overflow-y-auto font-bold">
								{catalog
									.filter((d) =>
										d.name
											.toLowerCase()
											.includes(drugSearch.toLowerCase()),
									)
									.map((drug) => (
										<button
											key={drug.id}
											className="w-full p-4 text-left hover:bg-gray-50 hover:text-black border-b border-gray-50 last:border-0 transition-colors"
											onClick={() => {
												setNewBatch({
													...newBatch,
													drugID: String(drug.id),
													name: drug.name,
												});
												setIsDropdownOpen(false);
											}}
										>
											{drug.name}
										</button>
									))}
							</div>
						</div>
					)}
				</div>
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
						Cieľový Výrobca
					</label>
					<select
						className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none font-black appearance-none cursor-pointer"
						value={newBatch.manufacturer}
						onChange={(e) =>
							setNewBatch({
								...newBatch,
								manufacturer: e.target.value,
							})
						}
					>
						<option value="">-- Vybrať dodávateľa --</option>
						<option value="VyrobcaMSP">
							Vyrobca (Hlavný sklad)
						</option>
					</select>
				</div>
				<div className="grid grid-cols-2 gap-6">
					<FormField
						label="Množstvo"
						value={String(newBatch.quantity)}
						type="number"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, quantity: Number(v) })
						}
					/>
					<FormField
						label="Merná Jednotka"
						value={newBatch.unit}
						placeholder="ks / bal"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, unit: v })
						}
					/>
				</div>
			</div>
		);
	}

	if (modalType === "OFFER") {
		return (
			<div className="space-y-8">
				<div className="p-8 bg-gray-100 rounded-[3rem] border border-gray-200 flex justify-between items-center">
					<div className="flex-1">
						<label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
							Požadované množstvo
						</label>
						<p className="text-4xl font-black text-black">
							{selectedBatch?.quantity} {selectedBatch?.unit}
						</p>
					</div>
					<ShoppingCart size={40} className="text-gray-300" />
				</div>
				<FormField
					label="Cenová ponuka (€)"
					value={String(offerPrice)}
					type="number"
					onChange={(v: string) => setOfferPrice(Number(v))}
				/>
				<p className="text-gray-400 text-xs italic bg-gray-50 p-4 rounded-2xl border border-gray-100 font-bold">
					Dáta budú uložené v DB pre negociáciu a po akceptácii
					zapísané do súkromného BC kanála.
				</p>
			</div>
		);
	}

	if (modalType === "REJECT") {
		return (
			<div className="space-y-8">
				<div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 text-center">
					<AlertCircle
						size={60}
						className="mx-auto text-gray-900 mb-6"
					/>
					<h4 className="text-2xl font-black text-gray-900 mb-2">
						Naozaj chcete zamietnuť túto požiadavku?
					</h4>
					<p className="text-gray-500 font-bold">
						Táto akcia je nevratná a bude zaznamenaná v súkromnom
						kanáli.
					</p>
				</div>
			</div>
		);
	}

	if (modalType === "APPROVE_OFFER") {
		return (
			<div className="space-y-6">
				<p className="text-gray-500 font-bold ml-1">
					Vyberte najvhodnejšiu cenovú ponuku:
				</p>
				<div className="space-y-4">
					{offers
						.filter((o) => o.status === "PENDING")
						.map((offer) => (
							<button
								key={offer.id}
								onClick={() => setSelectedOffer(offer)}
								className={`w-full p-8 rounded-[2.5rem] border-2 transition-all text-left flex justify-between items-center ${selectedOffer?.id === offer.id ? "border-black bg-gray-50 shadow-xl shadow-gray-100/50 scale-[1.02]" : "border-gray-100 bg-white hover:border-gray-200"}`}
							>
								<div>
									<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
										Ponuka od {offer.manufacturerOrg}
									</p>
									<p className="text-4xl font-black text-black">
										{offer.price.toFixed(2)}€
									</p>
								</div>
								<div
									className={
										selectedOffer?.id === offer.id
											? "text-black"
											: "text-gray-200"
									}
								>
									<CheckCircle size={40} />
								</div>
							</button>
						))}
				</div>
			</div>
		);
	}

	if (modalType === "CREATE_BATCH") {
		return (
			<div className="space-y-6">
				<FormField
					label="ID Šarže"
					value={newBatch.id}
					placeholder="B-2026-001"
					onChange={(v: string) =>
						setNewBatch({ ...newBatch, id: v })
					}
					isMono
				/>
				<div className="grid grid-cols-2 gap-6">
					<FormField
						label="Množstvo do skladu"
						value={String(newBatch.quantity)}
						type="number"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, quantity: Number(v) })
						}
					/>
					<FormField
						label="Merná Jednotka"
						value={newBatch.unit}
						placeholder="ks / bal"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, unit: v })
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-6">
					<FormField
						label="Cena (€)"
						value={String(newBatch.price)}
						type="number"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, price: Number(v) })
						}
					/>
					<FormField
						label="Exspirácia"
						value={newBatch.expiryDate}
						type="date"
						onChange={(v: string) =>
							setNewBatch({ ...newBatch, expiryDate: v })
						}
					/>
				</div>
			</div>
		);
	}

	if (modalType === "FULFILL" && selectedBatch) {
		const availableBatches = batches.filter(
			(b) =>
				String(b.drugID) === String((selectedBatch as any).drugId) &&
				b.status !== "RECALLED" &&
				b.status !== "SOLD" &&
				b.quantity > 0,
		);

		return (
			<div className="space-y-8">
				<div className="p-8 bg-gray-100 rounded-[3rem] border border-gray-200">
					<label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
						Celková požiadavka
					</label>
					<p className="text-3xl font-black text-black">
						{selectedBatch.quantity} {selectedBatch.unit} -{" "}
						{selectedBatch.drugName}
					</p>
				</div>

				<div className="space-y-4">
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
						Vybrať šarže na expedíciu
					</label>
					{fulfillmentBatches.map((fb, idx) => (
						<div key={idx} className="flex gap-4 items-end">
							<div className="flex-1">
								<select
									className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
									value={fb.batchID}
									onChange={(e) => {
										const newFbs = [...fulfillmentBatches];
										newFbs[idx].batchID = e.target.value;
										setFulfillmentBatches(newFbs);
									}}
								>
									<option value="">-- Vybrať šaržu --</option>
									{availableBatches.map((b) => (
										<option
											key={b.batchID}
											value={b.batchID}
										>
											{b.batchID} (Dostupné: {b.quantity}{" "}
											{b.unit})
										</option>
									))}
								</select>
							</div>
							<div className="w-32">
								<input
									type="number"
									className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
									value={fb.quantity}
									onChange={(e) => {
										const newFbs = [...fulfillmentBatches];
										newFbs[idx].quantity = Number(
											e.target.value,
										);
										setFulfillmentBatches(newFbs);
									}}
								/>
							</div>
							<button
								onClick={() =>
									setFulfillmentBatches(
										fulfillmentBatches.filter(
											(_, i) => i !== idx,
										),
									)
								}
								className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
							>
								<Trash2 size={20} />
							</button>
						</div>
					))}
					<button
						onClick={() =>
							setFulfillmentBatches([
								...fulfillmentBatches,
								{ batchID: "", quantity: 0 },
							])
						}
						className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl font-bold text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center"
					>
						<Plus size={20} className="mr-2" /> PRIDAŤ ŠARŽU
					</button>
				</div>
			</div>
		);
	}

	if (modalType === "VIEW_FULFILLMENT") {
		return (
			<div className="space-y-8">
				<div className="p-8 bg-black text-white rounded-[3rem] flex justify-between items-center overflow-hidden relative">
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<Truck size={80} />
					</div>
					<div>
						<h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
							Stav doručenia
						</h4>
						<p className="text-3xl font-black">
							Informácie o expedícii
						</p>
					</div>
					{selectedBatch?.integrity && (
						<div
							className={`p-4 rounded-2xl border-2 flex items-center space-x-3 z-10 ${selectedBatch.integrity.isValid ? "bg-green-900/20 border-green-500/50 text-green-400" : "bg-red-900/20 border-red-500/50 text-red-400"}`}
						>
							{selectedBatch.integrity.isValid ? (
								<ShieldCheck size={24} />
							) : (
								<AlertCircle size={24} />
							)}
							<span className="text-[10px] font-black uppercase tracking-widest">
								{selectedBatch.integrity.isValid
									? "Zhodné"
									: "Nesúlad"}
							</span>
						</div>
					)}
				</div>

				{!selectedBatch?.integrity?.isValid &&
					selectedBatch?.integrity?.mismatches && (
						<div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
							<label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
								Zistené rozdiely
							</label>
							<ul className="space-y-1">
								{selectedBatch.integrity.mismatches.map(
									(m, i) => (
										<li
											key={i}
											className="text-xs font-bold text-red-700 flex items-center"
										>
											<div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>{" "}
											{m}
										</li>
									),
								)}
							</ul>
						</div>
					)}

				<div className="space-y-4">
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">
						Priradené šarže a ich stav
					</label>
					<div className="max-h-80 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
						{fulfillments.length > 0 ? (
							fulfillments.map((f, i) => {
								// Find the current live status of this batch from the global batches array
								const liveBatch = batches.find(b => b.batchID === f.batchID);
								const isDelivered = liveBatch && (liveBatch.status === 'DELIVERED' || liveBatch.status === 'OWNED' || liveBatch.status === 'SOLD');
								
								return (
									<div
										key={i}
										className={`flex justify-between items-center p-6 border rounded-3xl transition-all ${isDelivered ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}
									>
										<div>
											<p className="font-mono font-black text-gray-900 flex items-center">
												{f.batchID}
												{isDelivered && <CheckCircle size={14} className="ml-2 text-green-600" />}
											</p>
											<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
												{f.quantity} ks {isDelivered ? '• Doručené' : '• Na ceste'}
											</p>
										</div>
										<StatusBadge status={isDelivered ? 'DELIVERED' : 'IN_TRANSIT'} />
									</div>
								);
							})
						) : (
							<div className="py-10 text-center text-gray-400 font-bold italic">
								Žiadne informácie o doručení.
							</div>
						)}
					</div>
				</div>
				
				<p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest px-4">
					Stav sa automaticky zmení na "Doručené" po potvrdení prevzatia príslušnej šarže.
				</p>
			</div>
		);
	}

	if (modalType === "RECEIVE" && selectedBatch) {
		return (
			<div className="space-y-8">
				<div className="p-8 bg-blue-600 text-white rounded-[3rem] shadow-xl relative overflow-hidden">
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<Truck size={100} />
					</div>
					<label className="block text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">
						Prichádzajúca dodávka
					</label>
					<p className="text-3xl font-black tracking-tight">
						Potvrdiť prevzatie lieku
					</p>
				</div>

				<div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 shadow-inner">
					<div className="space-y-6">
						<div>
							<label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
								Produkt
							</label>
							<p className="text-2xl font-black text-black leading-tight">
								{selectedBatch.drugName}
							</p>
							<p className="font-mono text-xs font-bold text-gray-400 uppercase mt-1">
								#{selectedBatch.batchID}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-200">
							<div>
								<label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
									Množstvo
								</label>
								<div className="flex items-center text-2xl font-black text-black">
									<Package className="mr-2 text-blue-600" size={24} />
									{selectedBatch.quantity} {selectedBatch.unit}
								</div>
							</div>
							<div>
								<label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
									Odosielateľ
								</label>
								<div className="flex items-center text-lg font-black text-black">
									<Building className="mr-2 text-gray-400" size={20} />
									{selectedBatch.manufacturer}
								</div>
							</div>
						</div>
					</div>
				</div>

				<p className="text-gray-400 text-sm italic text-center font-bold px-4">
					Potvrdením tejto akcie zmeníte stav šarže na blockchaine na "DELIVERED" a stane sa súčasťou vášho aktívneho skladu.
				</p>
			</div>
		);
	}

	if (modalType === "TRANSFER" && selectedBatch) {
		return (
			<div className="space-y-8">
				<div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex justify-between items-center shadow-inner">
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
							Aktuálne na sklade
						</label>
						<p className="text-5xl font-black text-black leading-none">
							{selectedBatch.quantity} {selectedBatch.unit}
						</p>
					</div>
					<RotateCcw size={40} className="text-gray-300" />
				</div>
				<FormField
					label="Množstvo na expedíciu"
					value={String(transferQuantity)}
					type="number"
					onChange={(v: string) => setTransferQuantity(Number(v))}
				/>
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
						Cieľová lekáreň (Prijímateľ)
					</label>
					<select
						className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none font-black appearance-none cursor-pointer focus:border-black transition-all"
						value={targetOrg}
						onChange={(e) => setTargetOrg && setTargetOrg(e.target.value)}
					>
						<option value="">-- Vybrať --</option>
						<option value="LekarenAMSP">Lekáreň A</option>
						<option value="LekarenBMSP">Lekáreň B</option>
					</select>
				</div>
			</div>
		);
	}

	if (modalType === "SELL" && selectedDrug && !selectedBatch) {
		const availableBatches = batches.filter(
			(b) =>
				String(b.drugID) === String(selectedDrug.id) &&
				b.ownerOrg === user?.org &&
				["INITIALIZED", "DELIVERED", "OWNED"].includes(b.status) &&
				b.quantity > 0,
		);

		return (
			<div className="space-y-6">
				<p className="text-gray-500 font-bold ml-1">
					Vyberte šaržu na predaj:
				</p>
				<div className="space-y-4">
					{availableBatches.map((batch) => (
						<button
							key={batch.batchID}
							onClick={() => handleAction("SELL", batch)}
							className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all text-left flex justify-between items-center group"
						>
							<div>
								<p className="font-mono font-black text-lg group-hover:text-black">
									{batch.batchID}
								</p>
								<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
									Dostupné: {batch.quantity} {batch.unit} •
									Exspirácia: {batch.expiryDate}
								</p>
							</div>
							<ChevronRight className="text-gray-300 group-hover:text-black" />
						</button>
					))}
					{availableBatches.length === 0 && (
						<div className="py-10 text-center text-gray-400 font-bold italic">
							Žiadne dostupné šarže na predaj.
						</div>
					)}
				</div>
			</div>
		);
	}

	if (modalType === "SELL" && selectedBatch) {
		return (
			<div className="space-y-8">
				<div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex justify-between items-center shadow-inner">
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
							Skladové zásoby
						</label>
						<p className="text-5xl font-black text-black leading-none">
							{selectedBatch.quantity} {selectedBatch.unit}
						</p>
					</div>
					<ShoppingCart size={40} className="text-gray-300" />
				</div>
				<FormField
					label="Množstvo predaného lieku"
					value={String(sellQuantity)}
					type="number"
					onChange={(v: string) => setSellQuantity(Number(v))}
				/>
				<p className="text-gray-400 text-sm italic ml-1 font-bold">
					Každý predaj bude permanentne zaevidovaný na blockchaine.
				</p>
			</div>
		);
	}

	if (modalType === "HISTORY") {
		return (
			<div className="space-y-10">
				<div
					className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between space-x-5 ${integrity?.isValid ? "bg-gray-50 border-gray-200 text-black" : "bg-red-50 border-red-100 text-red-800"}`}
				>
					<div className="flex items-center space-x-5">
						{integrity?.isValid ? (
							<ShieldCheck size={48} />
						) : (
							<ShieldAlert size={48} />
						)}
						<div>
							<p className="font-black text-2xl leading-none uppercase tracking-tighter">
								{integrity?.isValid
									? "STAV JE ZHODNÝ S BLOCKCHAINOM"
									: "ZISTENÝ NESÚLAD"}
							</p>
							<p className="text-sm font-bold opacity-70 mt-2">
								{integrity?.isValid
									? "Dáta v lokálnej databáze sa zhodujú s blockchain ledgerom."
									: "Zistený nesúlad údajov medzi lokálnou databázou a blockchainom!"}
							</p>
						</div>
					</div>
					{!integrity?.isValid && selectedBatch && (
						<button
							onClick={() => handleAction("SYNC_BATCH", selectedBatch)}
							className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center"
						>
							<RotateCcw size={14} className="mr-2" /> Opraviť z blockchainu
						</button>
					)}
				</div>

				{!integrity?.isValid && integrity?.mismatches && (
					<div className="p-6 bg-red-50 border border-red-100 rounded-3xl animate-pulse-red">
						<label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
							Kritické rozdiely
						</label>
						<ul className="space-y-1">
							{integrity.mismatches.map((m: string, i: number) => (
								<li
									key={i}
									className="text-xs font-bold text-red-700 flex items-center"
								>
									<div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>{" "}
									{m}
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="relative space-y-10 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-1.5 before:bg-gray-100 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
					{history.map((tx, i) => (
						<div key={`${tx.txId}-${i}`} className="relative pl-20 pb-2">
							<div className="absolute left-5 top-2 w-7 h-7 bg-white border-4 border-black rounded-full z-10 shadow-md"></div>
							<div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
								<div className="flex justify-between items-start mb-6">
									<div>
										<span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">
											Blockchain Záznam
										</span>
										<div className="flex items-center text-xs text-gray-400 font-bold bg-white px-3 py-1.5 rounded-xl border">
											<Clock size={14} className="mr-2" />
											{new Date(
												(typeof tx.timestamp.seconds ===
												"number"
													? tx.timestamp.seconds
													: tx.timestamp.seconds
															.low) * 1000,
											).toLocaleString()}
										</div>
									</div>
									<StatusBadge
										status={tx.data?.status || "UNKNOWN"}
									/>
								</div>
								<div className="grid grid-cols-2 gap-6 text-sm font-black">
									<div className="flex items-center text-gray-600 bg-white p-4 rounded-2xl border border-gray-100">
										<User
											size={16}
											className="mr-3 text-gray-400"
										/>{" "}
										{tx.data?.ownerOrg || "N/A"}
									</div>
									<div className="flex items-center text-gray-600 bg-white p-4 rounded-2xl border border-gray-100">
										<Package
											size={16}
											className="mr-3 text-gray-400"
										/>{" "}
										{tx.data?.quantity || 0} {tx.data?.unit}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return null;
};
