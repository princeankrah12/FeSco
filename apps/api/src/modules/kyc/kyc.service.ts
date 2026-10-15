import {
  INiaAdapter,
  INicAdapter,
  IDvlaAdapter,
  MockNiaAdapter,
  MockNicAdapter,
  MockDvlaAdapter,
  NiaVerificationResult,
  NicInsuranceResult,
  DvlaResult,
} from './adapters/index.js';

export interface VehicleRegistrationResult {
  isEligibleToHost: boolean;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  nicResult: NicInsuranceResult;
  dvlaResult: DvlaResult;
  userFacingMessage: string;
}

export class KycService {
  constructor(
    private niaAdapter: INiaAdapter = new MockNiaAdapter(),
    private nicAdapter: INicAdapter = new MockNicAdapter(),
    private dvlaAdapter: IDvlaAdapter = new MockDvlaAdapter(),
  ) {}

  /**
   * Engine 1: Biometric Identity & Ghana Card Verification
   */
  async verifyBiometricIdentity(
    ghanaCardPin: string,
    faceLivenessConfirmed: boolean,
  ): Promise<NiaVerificationResult> {
    return this.niaAdapter.verifyIdentity({
      ghanaCardPin,
      faceLivenessConfirmed,
    });
  }

  /**
   * Engine 2: Vehicle Safety & Registration (Host Enrollment)
   *
   * Graceful Degradation:
   * If NIC or DVLA services return SERVICE_UNAVAILABLE (500 or timeout),
   * do NOT hard-block the user. Return status: 'PENDING' (Amber),
   * allowing the user to explore the app, while disabling 'Hosting' until
   * background retries succeed.
   */
  async registerHostVehicle(
    licensePlate: string,
    chassisNumber?: string,
  ): Promise<VehicleRegistrationResult> {
    const [nicResult, dvlaResult] = await Promise.all([
      this.nicAdapter.queryInsurance({ licensePlate }),
      this.dvlaAdapter.queryVehicle({ licensePlate, chassisNumber }),
    ]);

    // Check for service downtime / degradation
    const isDegraded =
      nicResult.status === 'SERVICE_UNAVAILABLE' ||
      dvlaResult.status === 'SERVICE_UNAVAILABLE';

    if (isDegraded) {
      return {
        isEligibleToHost: false,
        status: 'PENDING',
        nicResult,
        dvlaResult,
        userFacingMessage:
          'Verification Pending: Regulatory databases are temporarily experiencing delays. You can explore FeSCo, and we will notify you once vehicle hosting is activated.',
      };
    }

    // Strict safety checks
    const hasComprehensiveInsurance = nicResult.isComprehensive;
    const isRoadworthyAndYoung = dvlaResult.isEligibleToHost;

    if (!hasComprehensiveInsurance || !isRoadworthyAndYoung) {
      const reasons: string[] = [];
      if (!hasComprehensiveInsurance) reasons.push(nicResult.message);
      if (!isRoadworthyAndYoung) reasons.push(dvlaResult.message);

      return {
        isEligibleToHost: false,
        status: 'REJECTED',
        nicResult,
        dvlaResult,
        userFacingMessage: `Vehicle registration could not be approved: ${reasons.join(' ')}`,
      };
    }

    return {
      isEligibleToHost: true,
      status: 'VERIFIED',
      nicResult,
      dvlaResult,
      userFacingMessage: `Vehicle verified successfully: Class ${dvlaResult.engineClass} (${dvlaResult.engineCapacityCc}cc), Comprehensive Insurance active.`,
    };
  }
}
