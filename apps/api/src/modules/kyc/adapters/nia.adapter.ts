import { validateGhanaCardPin } from '@fesco/domain';

export interface NiaVerificationRequest {
  ghanaCardPin: string;
  faceLivenessConfirmed: boolean;
  ocrConfidence?: number;
}

export interface NiaVerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'PENDING';
  pin: string;
  fullName?: string;
  dateOfBirth?: string;
  failureReason?: string;
}

export interface INiaAdapter {
  verifyIdentity(request: NiaVerificationRequest): Promise<NiaVerificationResult>;
}

export class MockNiaAdapter implements INiaAdapter {
  async verifyIdentity(request: NiaVerificationRequest): Promise<NiaVerificationResult> {
    const validation = validateGhanaCardPin(request.ghanaCardPin);
    if (!validation.isValid) {
      return {
        status: 'FAILED',
        pin: request.ghanaCardPin,
        failureReason: validation.errorMessage ?? 'Invalid Ghana Card PIN format',
      };
    }

    if (!request.faceLivenessConfirmed) {
      return {
        status: 'FAILED',
        pin: validation.formattedPin,
        failureReason: 'Biometric liveness verification was not confirmed',
      };
    }

    // Simulate successful NIA identity match
    return {
      status: 'VERIFIED',
      pin: validation.formattedPin,
      fullName: 'KWAME ASANTE',
      dateOfBirth: '1990-05-14',
    };
  }
}
