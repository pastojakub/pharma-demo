"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../auth-provider";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";
import { useRouter } from "next/navigation";
import {
	Loader2,
	AlertCircle,
	CheckCircle,
	Layers,
	Building,
	Search,
	Plus,
	ShoppingCart,
	Box,
	Info,
	RotateCcw,
	Truck,
	ChevronLeft,
	ChevronRight,
	ShieldCheck,
	History,
} from "lucide-react";
import { InventorySection } from "../../components/dashboard/InventorySection";
import { OrdersSection } from "../../components/dashboard/OrdersSection";
import { IncomingSection } from "../../components/dashboard/IncomingSection";
import { ActionModalContent } from "../../components/dashboard/ActionModalContent";
import { Modal } from "../../components/ui/Modal";
import {
	Batch,
	OrderRequest,
	DrugDefinition,
	TransactionHistory,
	IntegrityStatus,
	FileMetadata,
} from "../../types";
import { useToast } from "../../components/ToastProvider";

export default function UnifiedDashboard() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const { showToast } = useToast();
	
	const isRegulator = user?.role === "regulator";
	
	const [batches, setBatches] = useState<Batch[]>([]);
	const [catalog, setCatalog] = useState<DrugDefinition[]>([]);
	const [orders, setOrders] = useState<OrderRequest[]>([]);
	const [history, setHistory] = useState<TransactionHistory[]>([]);
	const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [activeMainTab, setActiveMainTab] = useState<
		"inventory" | "orders" | "catalog" | "incoming"
	>(isRegulator ? "catalog" : "inventory");
	
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalType, setModalType] = useState<string>("INFO");
	const [modalTab, setModalTab] = useState<"details" | "batches" | "pricing">(
		"details",
	);
	const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
	const [selectedDrug, setSelectedDrug] = useState<DrugDefinition | null>(
		null,
	);
	
	// Gallery Viewer States
	const [viewerGallery, setViewerGallery] = useState<string[]>([]);
	const [viewerIndex, setViewerIndex] = useState(0);
	const [isViewerOpen, setIsViewerOpen] = useState(false);

	const [selectedOffer, setSelectedOffer] = useState<any>(null);
	const [offers, setOffers] = useState<any[]>([]);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const [newBatch, setNewBatch] = useState({
		id: "",
		drugID: "",
		name: "",
		manufacturer: "",
		expiryDate: "",
		price: 0,
		quantity: 1,
		unit: "ks",
	});
	const [newDrug, setNewDrug] = useState({
		name: "",
		composition: "",
		recommendedDosage: "",
		intakeInfo: "",
		leaflet: null as FileMetadata | null,
		gallery: [] as FileMetadata[],
	});
	const [transferQuantity, setTransferQuantity] = useState(0);
	const [sellQuantity, setSellQuantity] = useState(1);
	const [offerPrice, setOfferPrice] = useState(0);
	const [targetOrg, setTargetOrg] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [drugSearch, setDrugSearch] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const [fulfillmentBatches, setFulfillmentBatches] = useState<
		{ batchID: string; quantity: number }[]
	>([]);
	const [fulfillments, setFulfillments] = useState<any[]>([]);
	const [pricingSummary, setPricingSummary] = useState<any[]>([]);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);
	const backendUrl = api.defaults.baseURL || "http://localhost:3001";

	const fetchData = async () => {
		if (!user) return null;
		setIsRefreshing(true);
		try {
			const queries: any[] = [
				api.get("/drug-catalog"),
			];
			
			if (!isRegulator) {
				queries.push(api.get("/drugs/orders"));
				queries.push(api.get("/drugs/all"));
			} else {
				// Regulators need to see all batches to audit them via catalog details
				queries.push(api.get("/drugs/all"));
			}

			const results = await Promise.all(queries);
			
			const data = {
				catalog: Array.isArray(results[0].data) ? results[0].data : [],
				orders: !isRegulator && Array.isArray(results[1]?.data) ? results[1].data : [],
				batches: Array.isArray(results[isRegulator ? 1 : 2]?.data) ? results[isRegulator ? 1 : 2].data : [],
			};
			
			setCatalog(data.catalog);
			setOrders(data.orders);
			setBatches(data.batches);
			return data;
		} catch (err) {
			console.error(err);
			setBatches([]);
			setCatalog([]);
			setOrders([]);
			return null;
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleSyncCatalog = async () => {
		try {
			const res = await api.post("/drug-catalog/sync");
			if (res.data.success) {
				showToast(`Synchronizácia úspešná! Spracovaných ${res.data.count} položiek.`, "success");
				fetchData();
			} else {
				showToast(`Chyba pri synchronizácii: ${res.data.error}`, "error");
			}
		} catch (error) {
			showToast("Synchronizácia zlyhala.", "error");
		}
	};

	useEffect(() => {
		if (user) {
			fetchData();
			if (isRegulator) setActiveMainTab("catalog");
		}
	}, [user]);

	const handleFileUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
		type: "leaflet" | "gallery",
	) => {
		const files = e.target.files;
		if (!files?.length) return;
		setIsUploading(true);
		try {
			const formData = new FormData();
			if (type === "leaflet") {
				formData.append("file", files[0]);
				const res = await api.post("/upload/file", formData);
				setNewDrug((prev) => ({
					...prev,
					leaflet: { ...res.data, category: "LEAFLET" },
				}));
			} else {
				Array.from(files).forEach((f: any) =>
					formData.append("files", f),
				);
				const res = await api.post("/upload/multiple", formData);
				const newImages = res.data.map((img: any) => ({
					...img,
					category: "GALLERY",
				}));
				setNewDrug((prev) => ({
					...prev,
					gallery: [...prev.gallery, ...newImages],
				}));
			}
			showToast("Súbor bol úspešne nahraný.", "success");
		} catch (e) {
			showToast("Chyba pri nahrávaní.", "error");
		} finally {
			setIsUploading(false);
		}
	};

	const handleAction = async (
		type: string,
		batch?: Batch,
		drug?: DrugDefinition,
		tab?: "details" | "batches" | "pricing",
	) => {
		let finalType = type;
		if (type === "INFO" && batch) {
			finalType = "BATCH_INFO";
		}

		setModalType(finalType);
		setModalTab(tab || "details");

		if (type === "SYNC_ORDER" && batch) {
			try {
				const id = batch.batchID || (batch as any).requestId;
				await api.post(`/drugs/orders/${id}/sync`);
				showToast("Dáta boli úspešne zosynchronizované z blockchainu.", "success");
				await fetchData();
				setModalType(""); // Close modal to refresh view
				return;
			} catch (e) {
				showToast("Synchronizácia zlyhala.", "error");
				return;
			}
		}

		if (type === "SYNC_BATCH" && batch) {
			try {
				await api.post(`/drugs/sync-batch`, { id: batch.batchID });
				showToast("Šarža bola úspešne zosynchronizované z blockchainu.", "success");
				await fetchData();
				setModalType("");
				return;
			} catch (e) {
				showToast("Synchronizácia zlyhala.", "error");
				return;
			}
		}

		setHistory([]);
		setIntegrity(null);
		setSelectedOffer(null);
		setOffers([]);
		setFulfillmentBatches([{ batchID: "", quantity: 0 }]);
		setFulfillments([]);
		setPricingSummary([]);

		// Reset creation states by default
		if (finalType === "CREATE_DRUG") {
			setNewDrug({
				name: "",
				composition: "",
				recommendedDosage: "",
				intakeInfo: "",
				leaflet: null,
				gallery: [],
			});
		}

		if (finalType === "REQUEST" && !drug) {
			setNewBatch({
				id: "",
				drugID: "",
				name: "",
				manufacturer: "",
				expiryDate: "",
				price: 0,
				quantity: 1,
				unit: "ks",
			});
		}

		if (drug) {
			setSelectedDrug(drug);
			
			// Prefill creation/edit state ONLY if we are actually editing or creating a batch from this drug
			if (finalType === "EDIT_DRUG" || finalType === "CREATE_BATCH" || finalType === "INFO") {
				// We still prefill for INFO because some sub-modals (like CREATE_BATCH) might be opened from INFO
				setNewDrug({
					name: drug.name,
					composition: drug.composition,
					recommendedDosage: drug.recommendedDosage,
					intakeInfo: drug.intakeInfo || "",
					leaflet: drug.files?.find((f) => f.category === "LEAFLET") || null,
					gallery: drug.files?.filter((f) => f.category === "GALLERY") || [],
				});
			}

			if (user?.role === "manufacturer") {
				try {
					const pricingRes = await api.get(
						`/drugs/catalog/${drug.id}/pricing-summary`,
					);
					setPricingSummary(pricingRes.data);
				} catch (e) {}
			}

			if (finalType === "CREATE_BATCH") {
				setNewBatch({
					id: `B-${Date.now().toString().slice(-6)}`,
					drugID: String(drug.id),
					name: drug.name,
					manufacturer: user?.org || "",
					expiryDate: "",
					price: 0,
					quantity: 1,
					unit: "ks",
				});
			}
		} else {
			setSelectedDrug(null);
		}

		if (batch) {
			setSelectedBatch(batch);
			const id = batch.batchID || (batch as any).requestId;
			const drugId = batch.drugID || (batch as any).drugId;

			if (drugId) {
				const drugInfo = catalog.find(
					(d) => String(d.id) === String(drugId),
				);
				if (drugInfo) setSelectedDrug(drugInfo);
			}

			setTransferQuantity(batch.quantity);
			setOfferPrice(batch.priceOffer || batch.price || 0);

			try {
				if (finalType === "OFFER" || finalType === "APPROVE_OFFER" || finalType === "ORDER_DETAILS") {
					const [offersRes, integrityRes] = await Promise.all([
						api.get(`/drugs/offers/${id}`),
						api.get(`/drugs/orders/${id}/verify-integrity`)
					]);
					setOffers(offersRes.data);
					setIntegrity(integrityRes.data);
				}
				if (
					finalType === "VIEW_FULFILLMENT" ||
					finalType === "FULFILL"
				) {
					const [fullRes, integrityRes] = await Promise.all([
						api.get(`/drugs/orders/${id}/fulfillments`),
						api.get(`/drugs/orders/${id}/verify-integrity`)
					]);
					setFulfillments(fullRes.data);
					setIntegrity(integrityRes.data);
				}
			} catch (e) {}

			if (finalType === "HISTORY") {
				const [h, i] = await Promise.all([
					api.get(`/drugs/${id}/history`),
					api.get(`/drugs/${id}/verify-integrity`),
				]);
				setHistory(h.data);
				setIntegrity(i.data);
			}
		} else {
			setSelectedBatch(null);
		}

		setIsModalOpen(true);
	};

	const verifyOrderOnBC = async (order: OrderRequest) => {
		try {
			const res = await api.get(
				`/drugs/orders/${order.requestId}/verify-integrity`,
			);
			const integrityData = res.data;

			setOrders(
				orders.map((o) =>
					o.requestId === order.requestId
						? {
								...o,
								bcVerified: true,
								integrity: integrityData,
							}
						: o,
				),
			);

			if (integrityData.isValid) {
				showToast(
					`Dáta overené v súkromnom kanáli. Dáta sú zhodné s blockchainom.`,
					"success",
				);
			} else {
				showToast(
					`Zistený nesúlad dát! Skontrolujte detaily auditného záznamu.`,
					"error",
				);
			}
		} catch (err) {
			showToast(
				"Blockchain overenie zlyhalo. Dáta nemusia byť dostupné.",
				"error",
			);
		}
	};

	const executeAction = async () => {
		const currentModalType = modalType;
		const currentNewBatchId = newBatch.id;
		const currentSelectedBatchId = selectedBatch?.batchID;
		const currentRequestId = (selectedBatch as any)?.requestId;
		const originalQuantity = selectedBatch?.quantity || 0;

		try {
			if (modalType === "CREATE_BATCH") {
				if (!newBatch.expiryDate) {
					showToast("Prosím, zadajte dátum exspirácie.", "error");
					return;
				}
			}

			// Close modal now that validation passed
			setIsModalOpen(false);

			let response;
			if (modalType === "CREATE_DRUG" || modalType === "EDIT_DRUG") {
				const files = [];
				if (newDrug.leaflet) files.push(newDrug.leaflet);
				newDrug.gallery.forEach((f) => files.push(f));

				const payload = {
					name: newDrug.name,
					composition: newDrug.composition,
					recommendedDosage: newDrug.recommendedDosage,
					intakeInfo: newDrug.intakeInfo,
					files,
				};

				if (modalType === "CREATE_DRUG") {
					response = await api.post("/drug-catalog", payload);
					showToast(`Liek ${newDrug.name} pridaný.`, "success");
				} else if (selectedDrug) {
					response = await api.patch(
						`/drug-catalog/${selectedDrug.id}`,
						payload,
					);
					showToast(`Liek ${newDrug.name} bol upravený.`, "success");
				}
			} else if (modalType === "CREATE_BATCH") {
				response = await api.post("/drugs", newBatch);
			} else if (modalType === "REQUEST") {
				response = await api.post("/drugs/request", {
					requestID: `REQ-${Date.now().toString().slice(-6)}`,
					drugID: newBatch.drugID,
					name: newBatch.name,
					manufacturerOrg: newBatch.manufacturer,
					quantity: newBatch.quantity,
					unit: newBatch.unit,
				});
			} else if (modalType === "OFFER" && selectedBatch) {
				const requestID =
					(selectedBatch as any).requestId || selectedBatch.batchID;
				response = await api.post("/drugs/offer", {
					requestID,
					price: offerPrice,
					pharmacyOrg:
						(selectedBatch as any).pharmacyOrg ||
						selectedBatch.requesterOrg,
				});
			} else if (modalType === "REJECT" && selectedBatch) {
				const requestID =
					(selectedBatch as any).requestId || selectedBatch.batchID;
				response = await api.post("/drugs/reject-request", {
					requestID,
					pharmacyOrg:
						(selectedBatch as any).pharmacyOrg ||
						selectedBatch.requesterOrg,
				});
			} else if (
				modalType === "APPROVE_OFFER" &&
				selectedBatch &&
				selectedOffer
			) {
				const requestID =
					(selectedBatch as any).requestId || selectedBatch.batchID;
				response = await api.post("/drugs/approve-offer", {
					requestID,
					offerID: selectedOffer.id,
				});
			} else if (modalType === "TRANSFER" && selectedBatch) {
				if (!targetOrg) {
					showToast("Prosím, vyberte cieľovú organizáciu.", "error");
					return;
				}
				response = await api.post("/transfer", {
					batchID: selectedBatch.batchID,
					newOwnerOrg: targetOrg,
					quantity: transferQuantity,
					status: "IN_TRANSIT",
				});
			} else if (modalType === "SELL" && selectedBatch) {
				response = await api.post("/drugs/sell", {
					id: selectedBatch.batchID,
					quantity: sellQuantity,
				});
			} else if (modalType === "RECEIVE" && selectedBatch) {
				response = await api.post("/drugs/receive", {
					id: selectedBatch.batchID,
				});
			} else if (modalType === "FULFILL" && selectedBatch) {
				const requestId = (selectedBatch as any).requestId;
				response = await api.post("/drugs/fulfill-order", {
					requestId,
					batches: fulfillmentBatches.filter(
						(b) => b.batchID && b.quantity > 0,
					),
				});
				showToast(
					"Objednávka sa spracováva a šarže budú odoslané.",
					"success",
				);
			}

			showToast(
				"Požiadavka bola odoslaná na blockchain a spracováva sa.",
				"success",
			);

			const returnedId = response?.data?.batchID || response?.data;

			// Polling for updates
			let attempts = 0;
			const poll = setInterval(async () => {
				const newData = await fetchData();
				attempts++;

				let isDone = false;
				if (newData) {
					if (currentModalType === "CREATE_BATCH") {
						isDone = newData.batches.some(
							(b) => b.batchID === currentNewBatchId,
						);
					} else if (currentModalType === "FULFILL") {
						isDone = newData.orders.some(
							(o) =>
								o.requestId === currentRequestId &&
								(o.status === "FULFILLED" ||
									o.status === "ORDERED"),
						);
					} else if (currentModalType === "RECEIVE") {
						const b = newData.batches.find(
							(b) => b.batchID === currentSelectedBatchId,
						);
						isDone =
							b &&
							(b.status === "DELIVERED" || b.status === "OWNED");
					} else if (currentModalType === "SELL") {
						const b = newData.batches.find(
							(b) => b.batchID === currentSelectedBatchId,
						);
						isDone =
							!b ||
							b.status === "SOLD" ||
							b.quantity < originalQuantity;
					} else if (currentModalType === "TRANSFER") {
						// In transfer, the batch might be split or change owner
						const b = newData.batches.find(
							(b) => b.batchID === currentSelectedBatchId,
						);
						const newB = returnedId
							? newData.batches.find(
									(b) => b.batchID === returnedId,
								)
							: null;
						// Successful if original is gone/updated OR if a new split ID appears (and we don't own it)
						// Since we only see owned batches, being gone is a good sign for a transfer
						isDone =
							!b ||
							b.status === "IN_TRANSIT" ||
							b.quantity < originalQuantity;
					} else if (
						currentModalType === "APPROVE_OFFER" ||
						currentModalType === "REJECT" ||
						currentModalType === "OFFER" ||
						currentModalType === "REQUEST"
					) {
						const o = newData.orders.find(
							(o) =>
								o.requestId === currentRequestId ||
								o.requestId === returnedId,
						);
						if (currentModalType === "REQUEST")
							isDone = !!newData.orders.find(
								(o) =>
									o.drugName === newBatch.name &&
									o.quantity === newBatch.quantity,
							);
						if (currentModalType === "APPROVE_OFFER")
							isDone = o && o.status === "APPROVED";
						if (currentModalType === "REJECT")
							isDone = o && o.status === "REJECTED";
						if (currentModalType === "OFFER")
							isDone = o && o.status === "OFFER_MADE";
					} else {
						isDone = attempts >= 3;
					}
				}

				if (isDone) {
					showToast(
						"Dáta boli úspešne zapísané na blockchain.",
						"success",
					);
					clearInterval(poll);
				} else if (attempts >= 12) {
					clearInterval(poll);
				}
			}, 3000);
		} catch (err: any) {
			const errorMsg =
				err.response?.data?.message || err.message || "Akcia zlyhala.";
			showToast(errorMsg, "error");
		}
	};

	const groupedData = useMemo(() => {
		const groups: any = {};
		if (user?.role === "manufacturer" && Array.isArray(catalog)) {
			catalog.forEach(
				(d) =>
					(groups[String(d.id)] = {
						drug: d,
						batches: [],
						name: d.name,
					}),
			);
		}
		batches.forEach((b) => {
			const id = b.drugID ? String(b.drugID) : "0";
			if (!groups[id]) {
				const drugInfo = Array.isArray(catalog)
					? catalog.find((d) => String(d.id) === id)
					: null;
				groups[id] = {
					drug: drugInfo || null,
					batches: [],
					name: b.drugName,
				};
			}
			groups[id].batches.push(b);
		});
		return Object.entries(groups).filter(([_, g]: any) =>
			g.name.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [batches, catalog, searchTerm, user]);

	// Open Viewer Helper
	const openViewer = (url: string, gallery: any[]) => {
		const urls = gallery.map(f => backendUrl + f.url);
		const idx = urls.indexOf(url);
		setViewerGallery(urls);
		setViewerIndex(idx >= 0 ? idx : 0);
		setIsViewerOpen(true);
	};

	if (loading || !user)
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="animate-spin text-black" size={48} />
			</div>
		);

	return (
		<div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-gray-900">
			<Navbar />

			<main className="max-w-7xl mx-auto py-12 px-6">
				<div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
					<div>
						<div className="flex items-center space-x-2 mb-3">
							<div className="bg-black p-1.5 rounded-lg text-white">
								{isRegulator ? <ShieldCheck size={18} /> : <Layers size={18} />}
							</div>
							<span className="text-[10px] font-black uppercase tracking-widest text-black">
								{isRegulator ? "Regulatory Audit Mode" : "Blockchain Tracking System"}
							</span>
						</div>
						<h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">
							{isRegulator 
								? "Dozorný Orgán" 
								: user.role === "manufacturer"
								? "Sklad Výrobcu"
								: "Sklad Lekárne"}
						</h1>
						<div className="flex items-center text-gray-500 font-bold bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm w-fit mt-4">
							<Building size={18} className="mr-2 text-black" />
							{user.org}
						</div>
					</div>
					<div className="flex flex-wrap gap-4 w-full lg:w-auto items-center">
						<div className="relative flex-grow sm:w-80 group">
							<Search
								className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
								size={20}
							/>
							<input
								type="text"
								placeholder="Hľadať..."
								className="w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-100 rounded-[2rem] focus:border-black outline-none font-bold shadow-xl shadow-gray-200/10 transition-all"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<button
							onClick={fetchData}
							disabled={isRefreshing}
							className={`p-4 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all shadow-xl shadow-gray-200/10 group ${isRefreshing ? "animate-pulse" : ""}`}
							title="Obnoviť dáta"
						>
							<RotateCcw
								size={20}
								className={`${isRefreshing ? "text-black animate-spin" : "text-gray-400 group-hover:text-black"} transition-colors`}
							/>
						</button>
						<button
							onClick={handleSyncCatalog}
							className="flex items-center space-x-2 px-6 h-[60px] bg-white border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all group shadow-xl shadow-gray-200/10"
							title="Kompletná synchronizácia všetkých dát z blockchainu (Katalóg, Sklad, Objednávky)"
						>
							<RotateCcw
								size={18}
								className="text-gray-400 group-hover:text-black transition-colors"
							/>
							<span className="text-xs font-black uppercase tracking-widest text-black">
								Sync Systém
							</span>
						</button>
						{user.role === "manufacturer" && !isRegulator && (
							<button
								onClick={() => handleAction("CREATE_DRUG")}
								className="bg-black text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-300 flex items-center"
							>
								<Plus size={20} className="mr-2" /> NOVÝ LIEK
							</button>
						)}
						{user.role === "pharmacy" && !isRegulator && (
							<button
								onClick={() => handleAction("REQUEST")}
								className="bg-gray-800 text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center"
							>
								<ShoppingCart size={20} className="mr-2" />{" "}
								OBJEDNAŤ
							</button>
						)}
						{isRegulator && (
							<button
								onClick={() => router.push('/audit')}
								className="bg-black text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-300 flex items-center"
							>
								<ShieldCheck size={20} className="mr-2" /> PREJSŤ NA AUDIT
							</button>
						)}
					</div>
				</div>

				<div className="flex space-x-1 bg-gray-200/50 p-1.5 rounded-[2.5rem] w-fit mb-12 border border-gray-200 shadow-inner">
					{!isRegulator && (
						<button
							onClick={() => setActiveMainTab("inventory")}
							className={`px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center transition-all ${activeMainTab === "inventory" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}
						>
							<Box size={18} className="mr-2" /> Sklad
						</button>
					)}
					{!isRegulator && (
						<button
							onClick={() => setActiveMainTab("incoming")}
							className={`px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center transition-all ${activeMainTab === "incoming" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}
						>
							<Truck size={18} className="mr-2" /> Prichádzajúce{" "}
							{batches.filter((b) => b.status === "IN_TRANSIT")
								.length > 0 && (
								<span className="ml-2 bg-blue-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-pulse font-bold">
									{
										batches.filter(
											(b) => b.status === "IN_TRANSIT",
										).length
									}
								</span>
							)}
						</button>
					)}
					<button
						onClick={() => setActiveMainTab("catalog")}
						className={`px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center transition-all ${activeMainTab === "catalog" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}
					>
						<Layers size={18} className="mr-2" /> Katalóg
					</button>
					{!isRegulator && (
						<button
							onClick={() => setActiveMainTab("orders")}
							className={`px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center transition-all ${activeMainTab === "orders" ? "bg-white text-black shadow-lg" : "text-gray-500"}`}
						>
							<ShoppingCart size={18} className="mr-2" /> Objednávky{" "}
							{Array.isArray(orders) &&
								orders.filter(
									(o) =>
										o.status !== "APPROVED" &&
										o.status !== "REJECTED" &&
										o.status !== "FULFILLED",
								).length > 0 && (
									<span className="ml-2 bg-black text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-pulse font-bold">
										{
											orders.filter(
												(o) =>
													o.status !== "APPROVED" &&
													o.status !== "REJECTED" &&
													o.status !== "FULFILLED",
											).length
										}
									</span>
								)}
						</button>
					)}
				</div>

				{activeMainTab === "inventory" && !isRegulator ? (
					<InventorySection
						groupedData={groupedData}
						viewMode={viewMode}
						setViewMode={setViewMode}
						statusFilter={statusFilter}
						setStatusFilter={setStatusFilter}
						handleAction={handleAction}
						user={user}
						backendUrl={backendUrl}
					/>
				) : activeMainTab === "incoming" && !isRegulator ? (
					<IncomingSection
						batches={batches}
						handleAction={handleAction}
						user={user}
					/>
				) : activeMainTab === "catalog" ? (
					<div className="bg-white rounded-[3rem] border border-gray-200 overflow-hidden shadow-xl animate-in fade-in duration-500">
						<div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
							<div>
								<h3 className="text-xl font-black text-gray-900 tracking-tight">
									Celý katalóg liečiv
								</h3>
								<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
									Všetky schválené produkty v sieti
								</p>
							</div>
						</div>
						<table className="w-full text-left">
							<thead className="bg-gray-50/50 border-b border-gray-200">
								<tr>
									<th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">
										Produkt
									</th>
									<th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">
										Katalóg ID
									</th>
									<th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 text-right">
										Akcie
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{catalog
									.filter((d) =>
										d.name
											.toLowerCase()
											.includes(searchTerm.toLowerCase()),
									)
									.map((drug) => (
										<tr
											key={drug.id}
											className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
											onClick={() =>
												handleAction(
													"INFO",
													undefined,
													drug,
													"details",
												)
											}
										>
											<td className="px-10 py-6">
												<div className="flex items-center space-x-4">
													<div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
														{drug.files?.find(
															(f) =>
																f.category ===
																"GALLERY",
														) ? (
															<img
																src={
																	backendUrl +
																	drug.files.find(
																		(f) =>
																			f.category ===
																			"GALLERY",
																	)!.url
																}
																className="w-full h-full object-cover"
															/>
														) : (
															<Layers
																className="text-gray-300"
																size={20}
															/>
														)}
													</div>
													<p className="font-black text-gray-900 text-lg leading-tight">
														{drug.name}
													</p>
												</div>
											</td>
											<td className="px-8 py-6">
												<span className="font-mono font-black text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg text-xs">
													#{drug.id}
												</span>
											</td>
											<td className="px-8 py-6">
												<div className="flex justify-end gap-2">
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleAction(
																"INFO",
																undefined,
																drug,
																"details",
															);
														}}
														className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-all flex items-center shadow-sm"
													>
														<Info
															size={14}
															className="mr-2 text-gray-400"
														/>{" "}
														DETAIL PRODUKTU
													</button>
													{user.role ===
														"pharmacy" && !isRegulator && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																setNewBatch({
																	...newBatch,
																	drugID: String(
																		drug.id,
																	),
																	name: drug.name,
																});
																handleAction(
																	"REQUEST",
																);
															}}
															className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all flex items-center shadow-lg"
														>
															<ShoppingCart
																size={14}
																className="mr-2"
															/>{" "}
															OBJEDNAŤ
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				) : (
					<OrdersSection
						orders={orders}
						user={user}
						catalog={catalog}
						handleAction={handleAction}
						verifyOrderOnBC={verifyOrderOnBC}
					/>
				)}

				<Modal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					title={modalType.replace("_", " ")}
					footer={
						<>
							<button
								onClick={() => setIsModalOpen(false)}
								className="flex-1 py-5 px-8 border-2 border-gray-100 text-gray-500 font-black rounded-[2rem] hover:bg-gray-50 transition-all active:scale-95"
							>
								ZAVRIEŤ
							</button>
							{modalType !== "INFO" &&
								modalType !== "BATCH_INFO" &&
								modalType !== "HISTORY" &&
								modalType !== "VIEW_FULFILLMENT" &&
								modalType !== "ORDER_DETAILS" && (
									<button
										onClick={executeAction}
										disabled={
											isUploading ||
											(modalType === "APPROVE_OFFER" &&
												!selectedOffer) ||
											(modalType === "FULFILL" &&
												fulfillmentBatches.length === 0)
										}
										className={`flex-2 py-5 px-12 ${modalType === "REJECT" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-gray-100" : "bg-black hover:bg-gray-800 shadow-gray-200"} text-white font-black rounded-[2rem] shadow-2xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-95`}
									>
										{isUploading ? (
											<Loader2 className="animate-spin mr-2" />
										) : (
											<CheckCircle
												className="mr-2"
												size={22}
											/>
										)}
										{modalType === "REJECT"
											? "ZAMIETNUŤ POŽIADAVKU"
											: "POTVRDIŤ ZÁPIS"}
									</button>
								)}
						</>
					}
				>
					<ActionModalContent
						modalType={modalType}
						setModalType={setModalType}
						modalTab={modalTab}
						setModalTab={setModalTab}
						selectedDrug={selectedDrug}
						selectedBatch={selectedBatch}
						batches={batches}
						newDrug={newDrug}
						setNewDrug={setNewDrug}
						newBatch={newBatch}
						setNewBatch={setNewBatch}
						catalog={catalog}
						drugSearch={drugSearch}
						setDrugSearch={setDrugSearch}
						isDropdownOpen={isDropdownOpen}
						setIsDropdownOpen={setIsDropdownOpen}
						offerPrice={offerPrice}
						setOfferPrice={setOfferPrice}
						offers={offers}
						selectedOffer={selectedOffer}
						setSelectedOffer={setSelectedOffer}
						transferQuantity={transferQuantity}
						setTransferQuantity={setTransferQuantity}
						sellQuantity={sellQuantity}
						setSellQuantity={setSellQuantity}
						history={history}
						integrity={integrity}
						backendUrl={backendUrl}
						handleFileUpload={handleFileUpload}
						fileInputRef={fileInputRef}
						galleryInputRef={galleryInputRef}
						fulfillmentBatches={fulfillmentBatches}
						setFulfillmentBatches={setFulfillmentBatches}
						fulfillments={fulfillments}
						user={user}
						pricingSummary={pricingSummary}
						handleAction={handleAction}
						setSelectedImage={(url) => {
							if (url) {
								const currentGallery = (modalType === "EDIT_DRUG" || modalType === "CREATE_DRUG") 
									? newDrug.gallery 
									: selectedDrug?.files?.filter(f => f.category === "GALLERY") || [];
								openViewer(url, currentGallery);
							}
						}}
						targetOrg={targetOrg}
						setTargetOrg={setTargetOrg}
					/>
				</Modal>

				{/* Enhanced Image Viewer Modal */}
				<Modal
					isOpen={isViewerOpen}
					onClose={() => setIsViewerOpen(false)}
					title={`Obrázok ${viewerIndex + 1} z ${viewerGallery.length}`}
					zIndex={1000}
					footer={
						<div className="flex w-full gap-4">
							<button
								onClick={() => setViewerIndex((prev) => (prev > 0 ? prev - 1 : viewerGallery.length - 1))}
								className="p-4 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center"
							>
								<ChevronLeft size={24} />
							</button>
							<button
								onClick={() => setIsViewerOpen(false)}
								className="flex-1 py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest text-xs"
							>
								ZAVRIEŤ
							</button>
							<button
								onClick={() => setViewerIndex((prev) => (prev < viewerGallery.length - 1 ? prev + 1 : 0))}
								className="p-4 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center"
							>
								<ChevronRight size={24} />
							</button>
						</div>
					}
				>
					<div className="flex flex-col items-center">
						<div className="w-full max-h-[70vh] overflow-auto bg-white rounded-3xl border border-gray-100 p-2 custom-scrollbar flex items-center justify-center min-h-[400px]">
							{viewerGallery.length > 0 && (
								<img
									src={viewerGallery[viewerIndex]}
									alt={`Gallery Detail ${viewerIndex}`}
									className="max-w-full h-auto object-contain rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-300"
								/>
							)}
						</div>
						{viewerGallery.length > 1 && (
							<div className="flex gap-2 mt-6 overflow-x-auto w-full justify-center pb-2 custom-scrollbar">
								{viewerGallery.map((url, idx) => (
									<button
										key={idx}
										onClick={() => setViewerIndex(idx)}
										className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all overflow-hidden ${viewerIndex === idx ? "border-black scale-105 shadow-md" : "border-transparent opacity-50 hover:opacity-100"}`}
									>
										<img src={url} className="w-full h-full object-cover" />
									</button>
								))}
							</div>
						)}
					</div>
				</Modal>
			</main>
		</div>
	);
}
