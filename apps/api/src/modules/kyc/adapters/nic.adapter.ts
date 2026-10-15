/**
 * National Insurance Commission (NIC) Motor Insurance Database Adapter
 *
 * Mandatory requirement for Hosts: Active Comprehensive Insurance.
 * Graceful Degradation: If NIC API times out or throws HTTP 500, do not hard-block.
 * Return SERVICE_UNAVAILABLE which triggers Amber "Verification Pending" UI state.
 */

export interface NicInsuranceQuery {
  licensePlate: string;
}

export type NicStatus =
  | 'ACTIVE_COMPREHENSIVE'
  | 'THIRD_PARTY_ONLY'
  | 'EXPIRED'
  | 'UNREGISTERED'
  | 'SERVICE_UNAVAILABLE';

export interface NicInsuranceResult {
  status: NicStatus;
  policyNumber?: string;
  insuranceCompany?: string;
  expiryDate?: string;
  isComprehensive: boolean;
  message: string;
}

export interface INicAdapter {
  queryInsurance(query: NicInsuranceQuery): Promise<NicInsuranceResult>;
}

export class MockNicAdapter implements INicAdapter {
  async queryInsurance(query: NicInsuranceQuery): Promise<NicInsuranceResult> {
    const cleanPlate = query.licensePlate.trim().toUpperCase().replace(/\s+/g, '');

    // Test hook: plates containing "FAIL" or "TIMEOUT" trigger graceful degradation
    if (cleanPlate.includes('TIMEOUT') || cleanPlate.includes('500')) {
      return {
        status: 'SERVICE_UNAVAILABLE',
        isComprehensive: false,
        message: 'NIC Motor Insurance Database is temporarily unreachable. Verification Pending.',
      };
    }

    if (cleanPlate.includes('THIRD')) {
      return {
        status: 'THIRD_PARTY_ONLY',
        policyNumber: 'NIC-TP-2026-9921',
        insuranceCompany: 'Enterprise Insurance Ghana',
        expiryDate: '2026-12-31',
        isComprehensive: false,
        message: 'Vehicle has Third-Party cover only. Comprehensive Insurance is required to Host.',
      };
    }

    // Default mock response: active comprehensive policy
    return {
      status: 'ACTIVE_COMPREHENSIVE',
      policyNumber: 'NIC-COMP-2026-8812',
      insuranceCompany: 'Hollard Insurance Ghana',
      expiryDate: '2027-04-30',
      isComprehensive: true,
      message: 'Active Comprehensive Insurance verified with NIC MID.',
    };
  }
}
