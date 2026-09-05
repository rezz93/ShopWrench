export interface OemPortalInfo {
  brandName: string;
  manufacturer: string;
  portalName: string;
  portalUrl: string;
  tagline: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  buildVinCatalogUrl: (vin: string, partQuery?: string) => string;
  buildPartCatalogUrl: (year: string, make: string, model: string, partQuery: string, engine?: string) => string;
  buildDiagramUrl: (year: string, make: string, model: string, partQuery: string, vin?: string) => string;
  buildDealerPartsMapUrl: (make: string) => string;
}

export interface OemLookupResult {
  oemBrand: string;
  partQuery: string;
  oemPartNumbers: Array<{
    partNumber: string;
    brand: string;
    description: string;
    isSuperseded?: boolean;
  }>;
  supersededNumbers?: string[];
  torqueSpecs?: string[];
  fluidAndSpecs?: string;
  techTips?: string[];
}

/**
 * Normalizes vehicle make to identify the correct OEM manufacturer portal
 */
export function getOemPortalForMake(make: string): OemPortalInfo {
  const m = (make || '').trim().toLowerCase();

  // GENERAL MOTORS (GMC, Chevrolet, Cadillac, Buick, Pontiac, Oldsmobile, Saturn, Hummer)
  if (
    m.includes('gmc') ||
    m.includes('chev') ||
    m.includes('chevy') ||
    m.includes('cadillac') ||
    m.includes('buick') ||
    m.includes('pontiac') ||
    m.includes('saturn') ||
    m.includes('hummer') ||
    m.includes('gm')
  ) {
    return {
      brandName: 'GM Genuine Parts & ACDelco',
      manufacturer: 'General Motors',
      portalName: 'GMPartsDirect / GM Dealership Catalog',
      portalUrl: 'https://www.gmpartsdirect.com/',
      tagline: 'Official GM dealership wholesale catalog & ACDelco OE schematics',
      accentColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300',
      badgeBorder: 'border-blue-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.gmpartsdirect.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.gmpartsdirect.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} GM Genuine exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent('GMC Chevrolet dealer parts department near me')}`;
      },
    };
  }

  // FORD MOTOR COMPANY (Ford, Lincoln, Mercury)
  if (m.includes('ford') || m.includes('lincoln') || m.includes('mercury')) {
    return {
      brandName: 'Motorcraft & Ford Genuine Parts',
      manufacturer: 'Ford Motor Company',
      portalName: 'FordParts.com / OEMFordPart',
      portalUrl: 'https://parts.ford.com/',
      tagline: 'Official Ford & Motorcraft OE parts catalog with VIN fitment',
      accentColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/20 text-sky-300',
      badgeBorder: 'border-sky-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.oemfordpart.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.oemfordpart.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Motorcraft Ford OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent('Ford Lincoln dealer parts department near me')}`;
      },
    };
  }

  // MOPAR / STELLANTIS (Chrysler, Dodge, Jeep, Ram, SRT, Plymouth, Fiat, Alfa Romeo)
  if (
    m.includes('dodge') ||
    m.includes('ram') ||
    m.includes('jeep') ||
    m.includes('chrysler') ||
    m.includes('mopar') ||
    m.includes('srt')
  ) {
    return {
      brandName: 'Mopar Genuine OE Parts',
      manufacturer: 'Stellantis / Mopar',
      portalName: 'MoparPartsGiant / Mopar Direct',
      portalUrl: 'https://www.moparpartsgiant.com/',
      tagline: 'Factory Mopar replacement parts & exploded assembly diagrams',
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300',
      badgeBorder: 'border-amber-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.moparpartsgiant.com/parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.moparpartsgiant.com/parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Mopar OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent('Dodge Jeep Ram dealer parts department near me')}`;
      },
    };
  }

  // TOYOTA / LEXUS / SCION
  if (m.includes('toyota') || m.includes('lexus') || m.includes('scion')) {
    const isLexus = m.includes('lexus');
    return {
      brandName: isLexus ? 'Lexus Genuine OE Parts' : 'Toyota Genuine Parts',
      manufacturer: 'Toyota Motor Corporation',
      portalName: isLexus ? 'LexusPartsNow / Official Lexus' : 'ToyotaPartsDeal / Official Toyota',
      portalUrl: isLexus ? 'https://www.lexuspartsnow.com/' : 'https://www.toyotapartsdeal.com/',
      tagline: 'Official OEM Toyota / Lexus factory parts & EPC assembly schematics',
      accentColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300',
      badgeBorder: 'border-rose-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        const base = isLexus ? 'https://www.lexuspartsnow.com/' : 'https://www.toyotapartsdeal.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        const base = isLexus ? 'https://www.lexuspartsnow.com/' : 'https://www.toyotapartsdeal.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Toyota Lexus OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent(`${make} dealer parts department near me`)}`;
      },
    };
  }

  // HONDA / ACURA
  if (m.includes('honda') || m.includes('acura')) {
    const isAcura = m.includes('acura');
    return {
      brandName: isAcura ? 'Acura Genuine OE Parts' : 'Honda Genuine OE Parts',
      manufacturer: 'Honda Motor Company',
      portalName: isAcura ? 'AcuraPartsWarehouse' : 'HondaPartsNow',
      portalUrl: isAcura ? 'https://www.acurapartswarehouse.com/' : 'https://www.hondapartsnow.com/',
      tagline: 'Direct Honda & Acura factory dealership parts with VIN decoding',
      accentColor: 'text-teal-400',
      badgeBg: 'bg-teal-500/20 text-teal-300',
      badgeBorder: 'border-teal-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        const base = isAcura ? 'https://www.acurapartswarehouse.com/' : 'https://www.hondapartsnow.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        const base = isAcura ? 'https://www.acurapartswarehouse.com/' : 'https://www.hondapartsnow.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Honda Acura OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent(`${make} dealer parts department near me`)}`;
      },
    };
  }

  // NISSAN / INFINITI
  if (m.includes('nissan') || m.includes('infiniti')) {
    const isInfiniti = m.includes('infiniti');
    return {
      brandName: isInfiniti ? 'Infiniti Genuine Parts' : 'Nissan Genuine OE Parts',
      manufacturer: 'Nissan Motor Corporation',
      portalName: isInfiniti ? 'InfinitiPartsDeal' : 'NissanPartsDeal',
      portalUrl: isInfiniti ? 'https://www.infinitipartsdeal.com/' : 'https://www.nissanpartsdeal.com/',
      tagline: 'Factory Nissan & Infiniti parts catalog & factory part schematics',
      accentColor: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/20 text-indigo-300',
      badgeBorder: 'border-indigo-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        const base = isInfiniti ? 'https://www.infinitipartsdeal.com/' : 'https://www.nissanpartsdeal.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        const base = isInfiniti ? 'https://www.infinitipartsdeal.com/' : 'https://www.nissanpartsdeal.com/';
        return `${base}parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Nissan Infiniti OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent(`${make} dealer parts department near me`)}`;
      },
    };
  }

  // SUBARU
  if (m.includes('subaru')) {
    return {
      brandName: 'Subaru Genuine Parts',
      manufacturer: 'Subaru Corporation',
      portalName: 'SubaruPartsDeal / Parts.Subaru.com',
      portalUrl: 'https://www.subarupartsdeal.com/',
      tagline: 'Factory Boxer engine & AWD OEM parts diagrams and numbers',
      accentColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20 text-cyan-300',
      badgeBorder: 'border-cyan-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.subarupartsdeal.com/parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.subarupartsdeal.com/parts-list?keywords=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Subaru OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent('Subaru dealer parts department near me')}`;
      },
    };
  }

  // HYUNDAI / KIA / GENESIS
  if (m.includes('hyundai') || m.includes('kia') || m.includes('genesis')) {
    return {
      brandName: 'Hyundai Mobis / Kia Genuine Parts',
      manufacturer: 'Hyundai Motor Group',
      portalName: 'HyundaiOEMParts / KiaPartsNow',
      portalUrl: 'https://www.hyundaioemparts.com/',
      tagline: 'Official Hyundai & Kia Mobis genuine parts and diagrams',
      accentColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.hyundaioemparts.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.hyundaioemparts.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} Hyundai Kia OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent(`${make} dealer parts department near me`)}`;
      },
    };
  }

  // BMW / MINI
  if (m.includes('bmw') || m.includes('mini')) {
    return {
      brandName: 'BMW Original Teile (Genuine Parts)',
      manufacturer: 'Bayerische Motoren Werke AG',
      portalName: 'RealOEM & BMW Dealer Parts',
      portalUrl: 'https://www.realoem.com/bmw/enUS/select',
      tagline: 'Official RealOEM exploded parts catalogs & ETK schematic diagrams',
      accentColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/20 text-sky-300',
      badgeBorder: 'border-sky-500/40',
      buildVinCatalogUrl: (vin) => {
        const last7 = vin.slice(-7);
        return `https://www.realoem.com/bmw/enUS/select?vin=${encodeURIComponent(last7 || vin)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `site:realoem.com ${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} RealOEM BMW exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent('BMW dealer parts department near me')}`;
      },
    };
  }

  // VOLKSWAGEN / AUDI / PORSCHE
  if (m.includes('volkswagen') || m.includes('vw') || m.includes('audi') || m.includes('porsche')) {
    return {
      brandName: 'VAG Genuine OE Parts (Audi / VW)',
      manufacturer: 'Volkswagen Group',
      portalName: 'VWPartsVortex / AudiUSAParts',
      portalUrl: 'https://www.vwpartsvortex.com/',
      tagline: 'Factory VAG parts catalog with ETKA exploded schematics',
      accentColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300',
      badgeBorder: 'border-blue-500/40',
      buildVinCatalogUrl: (vin, partQuery) => {
        const q = partQuery ? `${vin} ${partQuery}` : vin;
        return `https://www.vwpartsvortex.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildPartCatalogUrl: (year, make, model, partQuery) => {
        const q = `${year} ${make} ${model} ${partQuery}`.trim();
        return `https://www.vwpartsvortex.com/search?search_str=${encodeURIComponent(q)}`;
      },
      buildDiagramUrl: (year, make, model, partQuery, vin) => {
        const q = `${year} ${make} ${model} ${partQuery} VAG VW Audi OEM exploded parts diagram schematic ${vin || ''}`.trim();
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
      },
      buildDealerPartsMapUrl: () => {
        return `https://www.google.com/maps/search/${encodeURIComponent(`${make} dealer parts department near me`)}`;
      },
    };
  }

  // DEFAULT / UNIVERSAL OEM (Mazda, Volvo, Mercedes, Land Rover, etc.)
  const makeClean = make ? make.trim() : 'Vehicle';
  return {
    brandName: `${makeClean} Genuine OEM Parts`,
    manufacturer: `${makeClean} Manufacturer`,
    portalName: 'OEMPartsOnline / Dealer Wholesale',
    portalUrl: 'https://www.oempartsonline.com/',
    tagline: 'Official OEM manufacturer replacement parts & diagrams',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    badgeBorder: 'border-amber-500/40',
    buildVinCatalogUrl: (vin, partQuery) => {
      const q = partQuery ? `${vin} ${partQuery}` : vin;
      return `https://www.oempartsonline.com/search?search_str=${encodeURIComponent(q)}`;
    },
    buildPartCatalogUrl: (year, make, model, partQuery) => {
      const q = `${year} ${make} ${model} ${partQuery}`.trim();
      return `https://www.oempartsonline.com/search?search_str=${encodeURIComponent(q)}`;
    },
    buildDiagramUrl: (year, make, model, partQuery, vin) => {
      const q = `${year} ${make} ${model} ${partQuery} OEM exploded parts diagram schematic ${vin || ''}`.trim();
      return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
    },
    buildDealerPartsMapUrl: (mk) => {
      return `https://www.google.com/maps/search/${encodeURIComponent(`${mk || make} dealer parts department near me`)}`;
    },
  };
}

/**
 * Universal OEM Sourcing & Diagrams Links
 */
export function buildUniversalOemLinks(
  year: string,
  make: string,
  model: string,
  engine: string,
  vin: string,
  partQuery: string
) {
  const cleanPart = partQuery.trim() || 'Engine Parts';
  const vehicleStr = [year, make, model, engine].filter(Boolean).join(' ');

  return {
    // Brand-New Genuine OEM parts on eBay Motors (Filtered for condition NEW and OE Genuine)
    ebayOemNew: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
      `${vehicleStr} ${cleanPart} Genuine OEM new ${vin ? vin.slice(-8) : ''}`.trim()
    )}&_sacat=6030&LH_ItemCondition=1000`,

    // Google Shopping filtered specifically for OEM Genuine
    googleOemShop: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
      `${vehicleStr} ${cleanPart} Genuine OEM`
    )}`,

    // Official Exploded Parts Diagrams / Schematics (Google Images with high resolution)
    googleDiagrams: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
      `${year} ${make} ${model} ${cleanPart} OEM parts diagram exploded view schematic ${vin || ''}`
    )}`,

    // NHTSA Official Tech Bulletins & Recalls
    nhtsaTsb: vin
      ? `https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(vin)}`
      : `https://www.nhtsa.gov/vehicle/${encodeURIComponent(year)}/${encodeURIComponent(make)}/${encodeURIComponent(model)}`,

    // Local Dealership Wholesale Counter Locator
    dealerPartsDesk: `https://www.google.com/maps/search/${encodeURIComponent(
      `${make} dealer parts department wholesale near me`
    )}`,
  };
}
