import { classifyEngineByCapacity, EngineClass } from '@fesco/domain';

/**
 * // lexicon-allow: official statutory name of Ghana Driver and Vehicle Licensing Authority
 * Driver and Vehicle Licensing Authority (DVLA) Adapter
 *
 * Rules:
 * - Vehicle age must be < 15 years old
 * - Roadworthiness must be valid
 * - Extracts engine capacity (cc) and classifies into SVOC classes A, B, C
 * - Graceful Degradation: returns SERVICE_UNAVAILABLE on API timeout/500
 */

export interface DvlaQuery {
  licensePlate: string;
  chassisNumber?: string;
}

export type DvlaStatus =
  | 'VALID'
  | 'EXPIRED_ROADWORTHINESS'
  | 'VEHICLE_TOO_OLD'
  | 'SERVICE_UNAVAILABLE';

export interface DvlaResult {
  status: DvlaStatus;
  yearOfManufacture: number;
  vehicleAgeYears: number;
  roadworthinessExpiry: string;
  engineCapacityCc: number;
  engineClass: EngineClass;
  isEligibleToHost: boolean;
  message: string;
}

export interface IDvlaAdapter {
  queryVehicle(query: DvlaQuery): Promise<DvlaResult>;
}

export class MockDvlaAdapter implements IDvlaAdapter {
  async queryVehicle(query: DvlaQuery): Promise<DvlaResult> {
    const cleanPlate = query.licensePlate.trim().toUpperCase().replace(/\s+/g, '');

    // Test hook for timeout / 500 error simulation
    if (cleanPlate.includes('TIMEOUT') || cleanPlate.includes('500')) {
      return {
        status: 'SERVICE_UNAVAILABLE',
        yearOfManufacture: 2020,
        vehicleAgeYears: 6,
        roadworthinessExpiry: '2027-01-01',
        engineCapacityCc: 1800,
        engineClass: 'B',
        isEligibleToHost: false,
        message: 'DVLA verification service is temporarily down. Verification Pending.',
      };
    }

    if (cleanPlate.includes('OLD')) {
      return {
        status: 'VEHICLE_TOO_OLD',
        yearOfManufacture: 2008,
        vehicleAgeYears: 18,
        roadworthinessExpiry: '2026-11-30',
        engineCapacityCc: 2000,
        engineClass: 'B',
        isEligibleToHost: false,
        message: 'Vehicle age (18 years) exceeds the 15-year maximum limit for Hosts.',
      };
    }

    // Default mock response: 2021 Toyota Corolla, 1800cc (Class B), valid roadworthiness
    const currentYear = new Date().getFullYear();
    const yearOfManufacture = 2021;
    const vehicleAgeYears = currentYear - yearOfManufacture;
    const engineCapacityCc = 1798;
    const engineClass = classifyEngineByCapacity(engineCapacityCc);

    return {
      status: 'VALID',
      yearOfManufacture,
      vehicleAgeYears,
      roadworthinessExpiry: '2027-02-28',
      engineCapacityCc,
      engineClass,
      isEligibleToHost: true,
      message: 'Vehicle registered, roadworthy, and under 15 years old.',
    };
  }
}
