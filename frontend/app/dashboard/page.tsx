"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../auth-provider";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import Navbar from "../../components/Navbar";
import { Modal } from "../../components/ui/Modal";
import { ImageViewerModal } from "../../components/ui/ImageViewerModal";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { DashboardTabs } from "../../components/dashboard/DashboardTabs";
import { CatalogSection } from "../../components/dashboard/CatalogSection";
import { InventorySection } from "../../components/dashboard/InventorySection";
import { OrdersSection } from "../../components/dashboard/OrdersSection";
import { IncomingSection } from "../../components/dashboard/IncomingSection";
import { ActionModalContent } from "../../components/dashboard/ActionModalContent";
import { useToast } from "../../components/ToastProvider";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useActionPoller } from "../../hooks/useActionPoller";
import { useDashboardActions } from "../../hooks/useDashboardActions";

export default function UnifiedDashboard() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const { showToast } = useToast();

	const isRegulator = user?.role === "regulator";

	const { batches, catalog, orders, isRefreshing, fetchData, handleSyncCatalog, verifyOrderOnBC } =
		useDashboardData(user, isRegulator, showToast);

	const { startPolling } = useActionPoller(fetchData, showToast);

	const actions = useDashboardActions({ user, catalog, batches, orders, fetchData, showToast, startPolling });

	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [activeMainTab, setActiveMainTab] = useState<"inventory" | "orders" | "catalog" | "incoming">(
		isRegulator ? "catalog" : "inventory",
	);
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

	useEffect(() => {
		if (user && isRegulator) setActiveMainTab("catalog");
	}, [user]);

	const groupedData = useMemo(() => {
		const groups: any = {};
		if (user?.role === "manufacturer" && Array.isArray(catalog)) {
			catalog.forEach((d) => (groups[String(d.id)] = { drug: d, batches: [], name: d.name }));
		}
		batches.forEach((b) => {
			const id = b.drugID ? String(b.drugID) : "0";
			if (!groups[id]) {
				groups[id] = { drug: Array.isArray(catalog) ? catalog.find((d) => String(d.id) === id) || null : null, batches: [], name: b.drugName };
			}
			groups[id].batches.push(b);
		});
		return Object.entries(groups).filter(([_, g]: any) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
	}, [batches, catalog, searchTerm, user]);

	const inTransitCount = batches.filter((b) => b.status === "IN_TRANSIT").length;
	const pendingOrdersCount = Array.isArray(orders)
		? orders.filter((o) => o.status !== "APPROVED" && o.status !== "REJECTED" && o.status !== "FULFILLED").length
		: 0;

	if (loading || !user) return (
		<div className="flex h-screen items-center justify-center">
			<Loader2 className="animate-spin text-black" size={48} />
		</div>
	);

	return (
		<div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-gray-900">
			<Navbar />
			<main className="max-w-7xl mx-auto py-12 px-6">
				<DashboardHeader
					user={user}
					isRegulator={isRegulator}
					isRefreshing={isRefreshing}
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					onRefresh={fetchData}
					onSync={handleSyncCatalog}
					onNewDrug={() => actions.handleAction("CREATE_DRUG")}
					onNewOrder={() => actions.handleAction("REQUEST")}
					onAudit={() => router.push("/audit")}
				/>

				<DashboardTabs
					activeTab={activeMainTab}
					onChange={setActiveMainTab}
					isRegulator={isRegulator}
					inTransitCount={inTransitCount}
					pendingOrdersCount={pendingOrdersCount}
				/>

				{activeMainTab === "inventory" && !isRegulator ? (
					<InventorySection
						groupedData={groupedData}
						viewMode={viewMode}
						setViewMode={setViewMode}
						statusFilter={statusFilter}
						setStatusFilter={setStatusFilter}
						handleAction={actions.handleAction}
						user={user}
						backendUrl={actions.backendUrl}
					/>
				) : activeMainTab === "incoming" && !isRegulator ? (
					<IncomingSection batches={batches} handleAction={actions.handleAction} user={user} />
				) : activeMainTab === "catalog" ? (
					<CatalogSection
						catalog={catalog}
						searchTerm={searchTerm}
						backendUrl={actions.backendUrl}
						user={user}
						isRegulator={isRegulator}
						handleAction={actions.handleAction}
					/>
				) : (
					<OrdersSection
						orders={orders}
						user={user}
						catalog={catalog}
						handleAction={actions.handleAction}
						verifyOrderOnBC={verifyOrderOnBC}
					/>
				)}

				<Modal
					isOpen={actions.isModalOpen}
					onClose={() => actions.setIsModalOpen(false)}
					title={actions.modalType.replace("_", " ")}
					footer={
						<>
							<button
								onClick={() => actions.setIsModalOpen(false)}
								className="flex-1 py-5 px-8 border-2 border-gray-100 text-gray-500 font-black rounded-[2rem] hover:bg-gray-50 transition-all active:scale-95"
							>
								ZAVRIEŤ
							</button>
							{!["INFO", "BATCH_INFO", "HISTORY", "VIEW_FULFILLMENT", "ORDER_DETAILS"].includes(actions.modalType) && (
								<button
									onClick={actions.executeAction}
									disabled={
										actions.isUploading ||
										(actions.modalType === "APPROVE_OFFER" && !actions.selectedOffer) ||
										(actions.modalType === "FULFILL" && actions.fulfillmentBatches.length === 0)
									}
									className={`flex-2 py-5 px-12 ${actions.modalType === "REJECT" ? "bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-gray-100" : "bg-black text-white hover:bg-gray-800 shadow-gray-200"} font-black rounded-[2rem] shadow-2xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-95`}
								>
									{actions.isUploading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" size={22} />}
									{actions.modalType === "REJECT" ? "ZAMIETNUŤ POŽIADAVKU" : "POTVRDIŤ ZÁPIS"}
								</button>
							)}
						</>
					}
				>
					<ActionModalContent
						modalType={actions.modalType}
						setModalType={actions.setModalType}
						modalTab={actions.modalTab}
						setModalTab={actions.setModalTab}
						selectedDrug={actions.selectedDrug}
						selectedBatch={actions.selectedBatch}
						batches={batches}
						newDrug={actions.newDrug}
						setNewDrug={actions.setNewDrug}
						newBatch={actions.newBatch}
						setNewBatch={actions.setNewBatch}
						catalog={catalog}
						drugSearch={actions.drugSearch}
						setDrugSearch={actions.setDrugSearch}
						isDropdownOpen={actions.isDropdownOpen}
						setIsDropdownOpen={actions.setIsDropdownOpen}
						offerPrice={actions.offerPrice}
						setOfferPrice={actions.setOfferPrice}
						offers={actions.offers}
						selectedOffer={actions.selectedOffer}
						setSelectedOffer={actions.setSelectedOffer}
						transferQuantity={actions.transferQuantity}
						setTransferQuantity={actions.setTransferQuantity}
						sellQuantity={actions.sellQuantity}
						setSellQuantity={actions.setSellQuantity}
						history={actions.history}
						integrity={actions.integrity}
						backendUrl={actions.backendUrl}
						handleFileUpload={actions.handleFileUpload}
						fileInputRef={actions.fileInputRef}
						galleryInputRef={actions.galleryInputRef}
						fulfillmentBatches={actions.fulfillmentBatches}
						setFulfillmentBatches={actions.setFulfillmentBatches}
						fulfillments={actions.fulfillments}
						user={user}
						pricingSummary={actions.pricingSummary}
						handleAction={actions.handleAction}
						setSelectedImage={(url) => {
							if (url) {
								const gallery = ["EDIT_DRUG", "CREATE_DRUG"].includes(actions.modalType)
									? actions.newDrug.gallery
									: actions.selectedDrug?.files?.filter((f) => f.category === "GALLERY") || [];
								actions.openViewer(url, gallery);
							}
						}}
						targetOrg={actions.targetOrg}
						setTargetOrg={actions.setTargetOrg}
					/>
				</Modal>

				<ImageViewerModal
					isOpen={actions.isViewerOpen}
					onClose={() => actions.setIsViewerOpen(false)}
					gallery={actions.viewerGallery}
					index={actions.viewerIndex}
					onIndexChange={actions.setViewerIndex}
				/>
			</main>
		</div>
	);
}
