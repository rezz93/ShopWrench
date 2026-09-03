import { DecodeVinResponse } from '../types';

export const SAMPLE_VINS = [
  {
    vin: '1GTH6BEN9J1101728',
    label: '2018 GMC Canyon 3.6L 4WD',
    desc: 'Customer Truck - Work Truck V6',
  },
  {
    vin: '1FTFW1ED4MFA12345',
    label: '2021 Ford F-150 3.5L 4WD',
    desc: 'Truck - 4WD V6',
  },
  {
    vin: '4S4BSANC1L3123456',
    label: '2020 Subaru Outback 2.5L AWD',
    desc: 'Crossover - AWD Boxer 4',
  },
  {
    vin: '1G1ZE5ST2HF123456',
    label: '2017 Chevrolet Malibu 1.5L FWD',
    desc: 'Sedan - FWD Turbo',
  },
  {
    vin: '2T1BURHE7KC123456',
    label: '2019 Toyota Corolla 1.8L FWD',
    desc: 'Compact - 4-Cyl Reliable',
  },
  {
    vin: '1C4PJLCB3KD123456',
    label: '2019 Jeep Cherokee 3.2L 4WD',
    desc: 'SUV - 4WD V6',
  },
];

export async function decodeVinApi(rawVin: string): Promise<DecodeVinResponse> {
  const vin = rawVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (vin.length !== 17) {
    throw new Error('A standard VIN must be exactly 17 alphanumeric characters.');
  }

  // NHTSA VPIC Free Public API
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NHTSA API responded with status ${res.status}`);
    }

    const data = await res.json();
    const result = data.Results?.[0];

    if (!result) {
      throw new Error('No vehicle data returned for this VIN.');
    }

    // Check for NHTSA error codes
    // ErrorCode "0" means Success. "0 - VIN decoded clean"
    const errorCode = result.ErrorCode || '';
    if (errorCode.startsWith('1') || errorCode.startsWith('5')) {
      // Warning or mild issue, but we still parse fields
      console.warn('NHTSA Warning:', result.ErrorText);
    }

    const year = result.ModelYear || result.Year || 'Unknown Year';
    const make = result.Make || 'Unknown Make';
    const model = result.Model || 'Unknown Model';

    // Parse Displacement / Engine
    let engine = '';
    if (result.DisplacementL) {
      engine = `${result.DisplacementL}L`;
    } else if (result.DisplacementCC) {
      const liters = (parseFloat(result.DisplacementCC) / 1000).toFixed(1);
      engine = `${liters}L`;
    }

    if (result.EngineConfiguration || result.EngineCylinders) {
      const config = result.EngineConfiguration ? `${result.EngineConfiguration}` : '';
      const cyl = result.EngineCylinders ? `V${result.EngineCylinders}` : '';
      const desc = config || cyl;
      if (desc) {
        engine = engine ? `${engine} ${desc}` : desc;
      }
    }

    if (result.Turbo === 'Yes') {
      engine += ' Turbo';
    }

    if (!engine) {
      engine = result.EngineModel || 'Standard Engine';
    }

    // Parse Drive Type (AWD, 4WD, FWD, RWD)
    let drivetrain = result.DriveType || '';
    if (!drivetrain) {
      drivetrain = 'Standard Drive';
    }

    return {
      year: year.trim(),
      make: make.trim(),
      model: model.trim(),
      engine: engine.trim(),
      drivetrain: drivetrain.trim(),
      trim: (result.Trim || result.Series || '').trim(),
      bodyClass: (result.BodyClass || '').trim(),
      fuelType: (result.FuelTypePrimary || '').trim(),
      rawResponse: result,
    };
  } catch (err: unknown) {
    console.error('Failed to decode VIN via NHTSA:', err);
    throw err instanceof Error ? err : new Error('Failed to reach NHTSA decoder service.');
  }
}
