export interface AutoPartsStore {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  category: 'Local Retail' | 'Junkyards & Recyclers' | 'Commercial & Heavy Duty' | 'Warehouse Catalog' | 'Comparison';
  badgeColor: string;
  accentColor: string;
  isJunkyard?: boolean;
  isCustom?: boolean;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  createdAt?: string;
  buildSearchUrl: (year: string, make: string, model: string, engine: string, partName: string) => string;
}

export const CUSTOM_STORES_STORAGE_KEY = 'autoshop_custom_parts_stores_v1';

export function getCustomStores(): AutoPartsStore[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        ...item,
        isCustom: true,
        buildSearchUrl: (year: string, make: string, model: string, engine: string, partName: string) => {
          if (item.website && item.website.includes('{part}')) {
            return item.website
              .replace('{part}', encodeURIComponent(partName))
              .replace('{year}', encodeURIComponent(year))
              .replace('{make}', encodeURIComponent(make))
              .replace('{model}', encodeURIComponent(model))
              .replace('{engine}', encodeURIComponent(engine));
          }
          if (item.website && (item.website.startsWith('http://') || item.website.startsWith('https://'))) {
            // Search on site or Google
            const domain = item.website.replace(/^https?:\/\//, '').split('/')[0];
            const q = `site:${domain} ${year} ${make} ${model} ${partName}`.trim();
            return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
          }
          // Search specific business name + location/address + vehicle specs
          const locationPart = item.address ? ` ${item.address}` : '';
          const q = `"${item.name}"${locationPart} ${year} ${make} ${model} ${partName}`.trim();
          return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        },
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to read custom stores from storage:', err);
    return [];
  }
}

export function saveCustomStores(stores: AutoPartsStore[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanStores = stores.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      tagline: s.tagline,
      category: s.category,
      badgeColor: s.badgeColor,
      accentColor: s.accentColor,
      isJunkyard: s.isJunkyard,
      isCustom: true,
      phone: s.phone,
      address: s.address,
      website: s.website,
      notes: s.notes,
      createdAt: s.createdAt || new Date().toISOString(),
    }));
    localStorage.setItem(CUSTOM_STORES_STORAGE_KEY, JSON.stringify(cleanStores));
    window.dispatchEvent(new Event('autoshop_custom_stores_updated'));
  } catch (err) {
    console.error('Failed to save custom stores to storage:', err);
  }
}

export function addCustomStore(params: {
  name: string;
  shortName?: string;
  category: 'Local Retail' | 'Junkyards & Recyclers' | 'Commercial & Heavy Duty' | 'Warehouse Catalog' | 'Comparison';
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  isJunkyard?: boolean;
}): AutoPartsStore {
  const isJunkyard = params.isJunkyard ?? (params.category === 'Junkyards & Recyclers');
  const short = params.shortName?.trim() || params.name.trim();

  const newStore: AutoPartsStore = {
    id: `custom-store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: params.name.trim(),
    shortName: short,
    tagline: params.notes?.trim() || (isJunkyard ? 'Local salvage & auto dismantler' : 'Local preferred parts supplier'),
    category: params.category,
    badgeColor: isJunkyard
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentColor: isJunkyard ? 'text-emerald-400 hover:border-emerald-500' : 'text-amber-400 hover:border-amber-500',
    isJunkyard,
    isCustom: true,
    phone: params.phone?.trim() || undefined,
    address: params.address?.trim() || undefined,
    website: params.website?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    buildSearchUrl: () => '',
  };

  const existing = getCustomStores();
  const updated = [newStore, ...existing];
  saveCustomStores(updated);
  return newStore;
}

export function deleteCustomStore(id: string): void {
  const existing = getCustomStores();
  const filtered = existing.filter((s) => s.id !== id);
  saveCustomStores(filtered);
}

export const AUTO_PARTS_STORES: AutoPartsStore[] = [
  // --- JUNKYARDS & RECYCLED OEM PARTS ---
  {
    id: 'car_part',
    name: 'Car-Part.com Recycler Network',
    shortName: 'Car-Part.com',
    tagline: '4,500+ certified auto recyclers & salvage yards with Hollander interchange',
    category: 'Junkyards & Recyclers',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentColor: 'text-emerald-400 hover:border-emerald-500',
    isJunkyard: true,
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `site:car-part.com ${year} ${make} ${model} ${partName}`.trim();
      return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    },
  },
  {
    id: 'lkq_pickyourpart',
    name: 'LKQ Pick Your Part',
    shortName: 'LKQ Yard Inventory',
    tagline: 'Nationwide self-service salvage yard vehicle inventory',
    category: 'Junkyards & Recyclers',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    accentColor: 'text-teal-400 hover:border-teal-500',
    isJunkyard: true,
    buildSearchUrl: (year, make, model) => {
      const q = `site:lkqpickyourpart.com/inventory ${year} ${make} ${model}`.trim();
      return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    },
  },
  {
    id: 'row52',
    name: 'Row52 Yard Inventory & Pullers',
    shortName: 'Row52',
    tagline: 'Search Pick-n-Pull & self-service junkyard vehicle rows across North America',
    category: 'Junkyards & Recyclers',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentColor: 'text-amber-400 hover:border-amber-500',
    isJunkyard: true,
    buildSearchUrl: (year, make, model) => {
      return `https://row52.com/Search/?Year=${encodeURIComponent(year)}&Make=${encodeURIComponent(make)}&Model=${encodeURIComponent(model)}`;
    },
  },
  {
    id: 'ebay_salvage',
    name: 'eBay Motors (OEM Used / Salvage)',
    shortName: 'eBay Motors Used',
    tagline: 'Tested OEM takeoff assemblies, engines, modules & body panels',
    category: 'Junkyards & Recyclers',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    accentColor: 'text-indigo-400 hover:border-indigo-500',
    isJunkyard: true,
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${partName} OEM used tested`.trim();
      return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6030`;
    },
  },
  {
    id: 'local_salvage_maps',
    name: 'Nearby Auto Salvage & Junkyards',
    shortName: 'Local Yards Map',
    tagline: 'Find phone numbers & addresses of local scrap & auto wreckers',
    category: 'Junkyards & Recyclers',
    badgeColor: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    accentColor: 'text-lime-400 hover:border-lime-500',
    isJunkyard: true,
    buildSearchUrl: () => {
      return `https://www.google.com/maps/search/${encodeURIComponent('auto salvage yards junkyards auto recyclers')}`;
    },
  },

  // --- LOCAL RETAIL AUTO PARTS ---
  {
    id: 'autozone',
    name: 'AutoZone',
    shortName: 'AutoZone',
    tagline: 'Local 30-min store pickup & Duralast parts',
    category: 'Local Retail',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    accentColor: 'text-orange-400 hover:border-orange-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.autozone.com/searchresult?searchText=${encodeURIComponent(q)}`;
    },
  },
  {
    id: 'oreilly',
    name: "O'Reilly Auto Parts",
    shortName: "O'Reilly",
    tagline: 'Local hub inventory & same-day store pickup',
    category: 'Local Retail',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    accentColor: 'text-emerald-400 hover:border-emerald-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.oreillyauto.com/search?q=${encodeURIComponent(q)}`;
    },
  },
  {
    id: 'advance',
    name: 'Advance Auto Parts',
    shortName: 'Advance',
    tagline: 'Speed local delivery, DieHard & Carquest parts',
    category: 'Local Retail',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    accentColor: 'text-rose-400 hover:border-rose-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.advanceautoparts.com/find/product?q=${encodeURIComponent(q)}`;
    },
  },
  {
    id: 'napa',
    name: 'NAPA Auto Parts',
    shortName: 'NAPA',
    tagline: 'Pro commercial fleet & heavy-duty local inventory',
    category: 'Commercial & Heavy Duty',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    accentColor: 'text-blue-400 hover:border-blue-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.napaonline.com/en/search?text=${encodeURIComponent(q)}`;
    },
  },

  // --- WAREHOUSE & COMPARISON ---
  {
    id: 'rockauto',
    name: 'RockAuto',
    shortName: 'RockAuto',
    tagline: 'Discount OEM & aftermarket warehouse catalog',
    category: 'Warehouse Catalog',
    badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    accentColor: 'text-sky-400 hover:border-sky-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.google.com/search?q=${encodeURIComponent(`site:rockauto.com ${q}`)}`;
    },
  },
  {
    id: 'google_shopping',
    name: 'Google Shopping / Local',
    shortName: 'Google Shop',
    tagline: 'Compare all local store prices & nearby availability',
    category: 'Comparison',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accentColor: 'text-amber-400 hover:border-amber-500',
    buildSearchUrl: (year, make, model, engine, partName) => {
      const q = `${year} ${make} ${model} ${engine} ${partName}`.trim();
      return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`;
    },
  },
];
