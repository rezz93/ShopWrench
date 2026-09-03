import React, { useState } from 'react';
import { X, Plus, Store, Recycle, Phone, MapPin, Globe, FileText, Check, AlertCircle } from 'lucide-react';
import { addCustomStore, AutoPartsStore } from '../services/partsStores';
import { VoiceInputButton } from './VoiceInputButton';

interface AddCustomStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreAdded: (newStore: AutoPartsStore) => void;
}

export const AddCustomStoreModal: React.FC<AddCustomStoreModalProps> = ({
  isOpen,
  onClose,
  onStoreAdded,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [category, setCategory] = useState<'Junkyards & Recyclers' | 'Local Retail' | 'Commercial & Heavy Duty' | 'Warehouse Catalog'>('Junkyards & Recyclers');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the name of the store or salvage yard.');
      return;
    }

    const isJunkyard = category === 'Junkyards & Recyclers';
    const newStore = addCustomStore({
      name: name.trim(),
      shortName: shortName.trim() || undefined,
      category,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      notes: notes.trim() || undefined,
      isJunkyard,
    });

    onStoreAdded(newStore);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="add-custom-store-modal"
        className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Add Local Store or Junkyard</h3>
              <p className="text-xs text-slate-400">Save custom salvage yards, wreckers, or local suppliers</p>
            </div>
          </div>
          <button
            type="button"
            id="close-add-custom-store-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier Type / Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Supplier Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="cat-select-junkyard"
                onClick={() => setCategory('Junkyards & Recyclers')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  category === 'Junkyards & Recyclers'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Recycle className="w-4 h-4 text-emerald-400" />
                <span>Junkyard / Salvage</span>
              </button>

              <button
                type="button"
                id="cat-select-retail"
                onClick={() => setCategory('Local Retail')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  category === 'Local Retail'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Store className="w-4 h-4 text-amber-400" />
                <span>Local Retail Shop</span>
              </button>

              <button
                type="button"
                id="cat-select-commercial"
                onClick={() => setCategory('Commercial & Heavy Duty')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  category === 'Commercial & Heavy Duty'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Store className="w-4 h-4 text-blue-400" />
                <span>Commercial / Fleet</span>
              </button>

              <button
                type="button"
                id="cat-select-warehouse"
                onClick={() => setCategory('Warehouse Catalog')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  category === 'Warehouse Catalog'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Online / Warehouse</span>
              </button>
            </div>
          </div>

          {/* Store Name with Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="custom-store-name" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Store or Junkyard Name <span className="text-rose-400">*</span>
              </label>
              <VoiceInputButton
                id="voice-custom-store-name"
                size="sm"
                mode="replace"
                onTranscript={(text) => setName(text)}
                title="Speak Store Name"
              />
            </div>
            <input
              id="custom-store-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Miller's Auto Salvage & Wrecking or Northside Parts"
              className="w-full min-h-[44px] px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="custom-store-phone" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Phone Number (for 1-Tap Calling)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="custom-store-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 392-0199"
                className="w-full min-h-[44px] pl-10 pr-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Physical Address / Location with Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="custom-store-address" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Address / Location (for 1-Tap GPS Directions)
              </label>
              <VoiceInputButton
                id="voice-custom-store-address"
                size="sm"
                mode="replace"
                onTranscript={(text) => setAddress(text)}
                title="Speak Address"
              />
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="custom-store-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 1420 W Industrial Way, Dallas, TX"
                className="w-full min-h-[44px] pl-10 pr-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Website or Inventory Search URL */}
          <div>
            <label htmlFor="custom-store-website" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Website URL or Inventory Portal (Optional)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="custom-store-website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. www.millersalvage.com or https://..."
                className="w-full min-h-[44px] pl-10 pr-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes / Commercial Discount with Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="custom-store-notes" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Shop Account Notes / Contact Person
              </label>
              <VoiceInputButton
                id="voice-custom-store-notes"
                size="sm"
                mode="append"
                currentValue={notes}
                onTranscript={(text) => setNotes(text)}
                title="Dictate Shop Notes"
              />
            </div>
            <textarea
              id="custom-store-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ask for Carlos at parts counter. Commercial Account #1042. 15% discount."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-custom-store-btn"
              className="min-h-[44px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Supplier</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
