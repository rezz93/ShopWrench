import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ShoppingBag,
  Store,
  Sparkles,
  MapPin,
  Recycle,
  Building2,
  Package,
  Search,
  Plus,
  Phone,
  Trash2,
  Navigation,
  Zap,
  Info,
} from 'lucide-react';
import {
  AUTO_PARTS_STORES,
  AutoPartsStore,
  getCustomStores,
  deleteCustomStore,
  formatPartSearchQuery,
} from '../services/partsStores';
import { VehicleDetails } from '../types';
import { AddCustomStoreModal } from './AddCustomStoreModal';

interface PartsSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleDetails;
  partName: string;
}

type CategoryFilter = 'all' | 'custom' | 'junkyard' | 'retail' | 'online';

export const PartsSupplierModal: React.FC<PartsSupplierModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  partName,
}) => {
  const [customStores, setCustomStores] = useState<AutoPartsStore[]>([]);
  const [copiedStore, setCopiedStore] = useState<string | null>(null);
  const [justCopiedQuery, setJustCopiedQuery] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all');
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomStores(getCustomStores());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setCustomStores(getCustomStores());
    };
    window.addEventListener('autoshop_custom_stores_updated', handleUpdate);
    return () => window.removeEventListener('autoshop_custom_stores_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const allStores = [...customStores, ...AUTO_PARTS_STORES];

  const { cleanPart, fullQuery, vehicleQuery } = formatPartSearchQuery(
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.engine || '',
    partName
  );

  const filteredStores = allStores.filter((store) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'custom') return store.isCustom === true;
    if (selectedFilter === 'junkyard') return store.isJunkyard === true;
    if (selectedFilter === 'retail') return store.category === 'Local Retail' || store.category === 'Commercial & Heavy Duty';
    if (selectedFilter === 'online') return store.category === 'Warehouse Catalog' || store.category === 'Comparison';
    return true;
  });

  const customCount = customStores.length;
  const junkyardCount = allStores.filter((s) => s.isJunkyard).length;
  const retailCount = allStores.filter((s) => s.category === 'Local Retail' || s.category === 'Commercial & Heavy Duty').length;

  const handleLaunchStore = (store: AutoPartsStore, useDirectProduct = false) => {
    navigator.clipboard.writeText(fullQuery);
    setCopiedStore(store.name);

    let url = '';
    if (useDirectProduct && store.buildDirectProductUrl) {
      url = store.buildDirectProductUrl(
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.engine || '',
        partName
      );
    } else {
      url = store.buildSearchUrl(
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.engine || '',
        partName
      );
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    setTimeout(() => {
      setCopiedStore(null);
    }, 4000);
  };

  const handleCopyQueryOnly = () => {
    navigator.clipboard.writeText(fullQuery);
    setJustCopiedQuery(true);
    setTimeout(() => setJustCopiedQuery(false), 2000);
  };

  const handleDeleteCustomStore = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Remove this custom supplier from your list?')) {
      deleteCustomStore(id);
      setCustomStores(getCustomStores());
    }
  };

  const handleLaunchGoogleShopping = () => {
    navigator.clipboard.writeText(fullQuery);
    setCopiedStore('Google Shopping');
    window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(fullQuery)}`, '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopiedStore(null), 4000);
  };

  const handleLaunchRockAuto = () => {
    navigator.clipboard.writeText(fullQuery);
    setCopiedStore('RockAuto');
    window.open(`https://www.google.com/search?q=${encodeURIComponent(`site:rockauto.com ${fullQuery}`)}`, '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopiedStore(null), 4000);
  };

  const handleLaunchAmazonAuto = () => {
    navigator.clipboard.writeText(fullQuery);
    setCopiedStore('Amazon Automotive');
    window.open(`https://www.amazon.com/s?k=${encodeURIComponent(fullQuery)}&i=automotive`, '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopiedStore(null), 4000);
  };

  return (
    <>
      <div
        id="parts-supplier-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-5 py-4 bg-slate-800/95 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Find Part at Stores &amp; Junkyards</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Search auto parts stores, local salvage yards &amp; recycler networks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="open-add-custom-store-btn"
                onClick={() => setIsAddStoreModalOpen(true)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Add your local junkyard or parts shop"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Local Store / Yard</span>
              </button>

              <button
                id="close-supplier-modal-btn"
                onClick={onClose}
                aria-label="Close parts stores modal"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Vehicle & Part Information Banner */}
          <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/80">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Target Part
                  </span>
                  {cleanPart.toLowerCase() !== partName.toLowerCase().trim() && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Standardized Part Name
                    </span>
                  )}
                </div>
                <p className="text-base font-black text-white truncate">
                  {cleanPart}
                </p>
                {cleanPart.toLowerCase() !== partName.toLowerCase().trim() && (
                  <p className="text-xs text-slate-400">
                    Original input: &quot;{partName}&quot;
                  </p>
                )}
                <p className="text-xs text-slate-300 font-medium">
                  {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.engine || 'Standard Engine'}
                </p>
              </div>

              <button
                id="copy-exact-search-query-btn"
                onClick={handleCopyQueryOnly}
                className="min-h-[42px] px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
                title="Copy complete search query to clipboard"
              >
                {justCopiedQuery ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Query Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Search Text</span>
                  </>
                )}
              </button>
            </div>

            {/* Recommended 1-Click Direct Launchers (Bypasses Retail Homepages) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Recommended: Direct Product &amp; Price Comparison</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">Bypasses empty store homepages</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Google Shopping Direct */}
                <button
                  type="button"
                  id="direct-google-shopping-btn"
                  onClick={handleLaunchGoogleShopping}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 hover:from-amber-500/30 hover:to-amber-500/15 border border-amber-500/40 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Google Shopping</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-amber-400 opacity-80" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Compares AutoZone, O&apos;Reilly, Advance &amp; RockAuto prices
                  </p>
                </button>

                {/* RockAuto Direct */}
                <button
                  type="button"
                  id="direct-rockauto-btn"
                  onClick={handleLaunchRockAuto}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 hover:from-sky-500/30 hover:to-sky-500/15 border border-sky-500/40 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-sky-300 group-hover:text-sky-200 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-sky-400" />
                      <span>RockAuto Catalog</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-sky-400 opacity-80" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Wholesale OEM &amp; aftermarket replacement parts
                  </p>
                </button>

                {/* Amazon Auto Garage */}
                <button
                  type="button"
                  id="direct-amazon-auto-btn"
                  onClick={handleLaunchAmazonAuto}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 hover:from-yellow-500/30 hover:to-yellow-500/15 border border-yellow-500/40 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-yellow-300 group-hover:text-yellow-200 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Amazon Garage</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-yellow-400 opacity-80" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Fitment confirmed with fast Prime delivery
                  </p>
                </button>
              </div>
            </div>

            {/* Explanatory Tip for Retail Sites */}
            <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-slate-300 font-semibold text-xs">
                  Why do some store links (AutoZone / Advance) open to their main page?
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Big chains wipe search parameters on direct external links if you don&apos;t have a local store/vehicle cookie saved. We&apos;ve <strong>automatically copied &quot;{fullQuery}&quot; to your clipboard</strong>! When the store opens, simply paste (Ctrl+V) into their search bar, or use the <em>&quot;Direct Product Link&quot;</em> button below.
                </p>
              </div>
            </div>

            {copiedStore && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Copied <strong>&quot;{fullQuery}&quot;</strong> to clipboard and opened <strong>{copiedStore}</strong>!
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">Ready to Paste</span>
              </div>
            )}

            {/* Sourcing Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                id="filter-all-suppliers"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Sources ({allStores.length})
              </button>

              {customCount > 0 && (
                <button
                  id="filter-custom-suppliers"
                  onClick={() => setSelectedFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    selectedFilter === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/40'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Added Stores ({customCount})</span>
                </button>
              )}

              <button
                id="filter-junkyards"
                onClick={() => setSelectedFilter('junkyard')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  selectedFilter === 'junkyard'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-500/30'
                }`}
              >
                <Recycle className="w-3.5 h-3.5" />
                <span>Junkyards &amp; Recyclers ({junkyardCount})</span>
              </button>

              <button
                id="filter-retail"
                onClick={() => setSelectedFilter('retail')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  selectedFilter === 'retail'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Local Retail ({retailCount})</span>
              </button>

              <button
                id="filter-online"
                onClick={() => setSelectedFilter('online')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  selectedFilter === 'online'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Warehouse &amp; Comparison</span>
              </button>
            </div>
          </div>

          {/* Stores Grid */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  id={`store-card-${store.id}`}
                  className={`p-4 bg-slate-950/70 border rounded-xl transition flex flex-col justify-between gap-3 group relative ${
                    store.isJunkyard ? 'border-emerald-500/30 hover:border-emerald-400/80 bg-emerald-950/10' : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {store.isJunkyard && <Recycle className="w-4 h-4 text-emerald-400 shrink-0" />}
                        <span className="font-extrabold text-base text-white group-hover:text-amber-400 transition">
                          {store.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {store.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Custom
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${store.badgeColor}`}>
                          {store.category}
                        </span>
                        {store.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomStore(e, store.id)}
                            title="Delete custom supplier"
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {store.tagline}
                    </p>

                    {/* Custom Store Meta Details: Phone, Address, Notes */}
                    {store.isCustom && (
                      <div className="pt-1.5 space-y-1 text-xs border-t border-slate-800/80">
                        {store.phone && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                            <a
                              href={`tel:${store.phone}`}
                              className="font-mono text-emerald-400 hover:underline"
                            >
                              {store.phone}
                            </a>
                          </div>
                        )}
                        {store.address && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{store.address}</span>
                          </div>
                        )}
                        {store.notes && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded border border-slate-800">
                            &quot;{store.notes}&quot;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5">
                    {/* If Custom Store has Phone / Address, show quick contact tools */}
                    {store.isCustom && (store.phone || store.address) && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            className="min-h-[38px] px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Call Store</span>
                          </a>
                        )}
                        {store.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${store.address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[38px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Navigation className="w-3.5 h-3.5 text-amber-400" />
                            <span>Directions</span>
                          </a>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      id={`open-store-${store.id}-btn`}
                      onClick={() => handleLaunchStore(store, false)}
                      className={`w-full min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group-hover:shadow-md ${
                        store.isJunkyard
                          ? 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 active:bg-emerald-600 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:bg-amber-600 text-slate-200 border-slate-700 hover:border-amber-400'
                      }`}
                      title={`Copies "${fullQuery}" to clipboard and opens ${store.name}`}
                    >
                      <span>Search on {store.shortName}</span>
                      <ExternalLink className={`w-4 h-4 transition ${store.isJunkyard ? 'text-emerald-400 group-hover:text-slate-950' : 'text-amber-400 group-hover:text-slate-950'}`} />
                    </button>

                    {/* Direct Product Link for stores with homepage redirects */}
                    {store.buildDirectProductUrl && (
                      <button
                        type="button"
                        id={`direct-product-${store.id}-btn`}
                        onClick={() => handleLaunchStore(store, true)}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg font-semibold text-[11px] bg-slate-900/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700/80 hover:border-amber-500/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title={`Opens directly indexed ${store.shortName} product pages via Google (bypasses homepage redirect)`}
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Direct Product Link (Bypass Redirect)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsAddStoreModalOpen(true)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Local Junkyard or Auto Parts Store</span>
            </button>

            <button
              onClick={onClose}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Store Modal */}
      {isAddStoreModalOpen && (
        <AddCustomStoreModal
          isOpen={isAddStoreModalOpen}
          onClose={() => setIsAddStoreModalOpen(false)}
          onStoreAdded={(newStore) => {
            setCustomStores(getCustomStores());
            setSelectedFilter('all');
          }}
        />
      )}
    </>
  );
};

