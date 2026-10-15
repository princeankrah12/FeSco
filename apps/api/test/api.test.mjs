import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthService,
  KycService,
  MockNiaAdapter,
  MockNicAdapter,
  MockDvlaAdapter,
  RoutingService,
} from '../dist/index.js';

test('AuthService: Corporate email gatekeeper sends OTP and establishes authenticated session', async () => {
  const auth = new AuthService();

  // 1. Request access with verified corporate email (Stanbic Bank Ghana)
  const reqResult = await auth.requestAccess('yaa.mensah@stanbic.com.gh');
  assert.ok(reqResult.success);
  assert.ok(reqResult.debugOtp);
  assert.equal(reqResult.validation.employer?.companyName, 'Stanbic Bank Ghana');

  // 2. Attempt with wrong OTP
  const wrongResult = await auth.verifyOtp('yaa.mensah@stanbic.com.gh', '000000');
  assert.equal(wrongResult.success, false);
  assert.ok(wrongResult.message.includes('attempts remaining'));

  // 3. Verify with correct OTP
  const verifyResult = await auth.verifyOtp('yaa.mensah@stanbic.com.gh', reqResult.debugOtp);
  assert.ok(verifyResult.success);
  assert.ok(verifyResult.session?.accessToken);
  assert.equal(verifyResult.session?.user.corporate_email, 'yaa.mensah@stanbic.com.gh');
  assert.equal(verifyResult.session?.user.is_cocommuter, true);
  assert.equal(verifyResult.session?.user.is_host, false);
});

test('AuthService: Request Company Addition registers non-allowlisted corporate employers', async () => {
  const auth = new AuthService();
  const res = await auth.requestCompanyAddition('founder@newfintech.gh', 'New Fintech Ghana Ltd');
  assert.ok(res.success);
  assert.ok(res.message.includes('submitted for admin verification'));
});

test('KycService: Biometric identity verification verifies valid Ghana Card and liveness', async () => {
  const kyc = new KycService();

  // Valid verification
  const valid = await kyc.verifyBiometricIdentity('GHA-712345678-9', true);
  assert.equal(valid.status, 'VERIFIED');
  assert.equal(valid.fullName, 'KWAME ASANTE');

  // Failed liveness
  const failedLiveness = await kyc.verifyBiometricIdentity('GHA-712345678-9', false);
  assert.equal(failedLiveness.status, 'FAILED');
  assert.ok(failedLiveness.failureReason?.includes('Biometric liveness'));
});

test('KycService: Vehicle safety registration gracefully degrades when government APIs time out', async () => {
  const kyc = new KycService(new MockNiaAdapter(), new MockNicAdapter(), new MockDvlaAdapter());

  // Happy Path: valid comprehensive insurance & vehicle < 15 years
  const happyPath = await kyc.registerHostVehicle('GE-4921-21', 'CHASSIS-12345');
  assert.equal(happyPath.status, 'VERIFIED');
  assert.equal(happyPath.isEligibleToHost, true);
  assert.equal(happyPath.dvlaResult.engineClass, 'B');

  // Graceful Degradation: NIC or DVLA 500 error / timeout -> PENDING state (Amber)
  const timeoutDegradation = await kyc.registerHostVehicle('GE-500-TIMEOUT', 'CHASSIS-999');
  assert.equal(timeoutDegradation.status, 'PENDING');
  assert.equal(timeoutDegradation.isEligibleToHost, false); // Disabled until verified
  assert.ok(timeoutDegradation.userFacingMessage.includes('Verification Pending'));
});

test('RoutingService: Flexible AI Routing calculates Nearest Stop Match and recalculates contribution', () => {
  const routing = new RoutingService();

  const hostRoute = [
    { name: 'Ablekuma Curve', lat: 5.612, lng: -0.321, scheduledPassingTime: '5:30 AM' },
    { name: 'Agape Junction', lat: 5.601, lng: -0.305, scheduledPassingTime: '5:40 AM' },
    { name: 'Awoshie Water Works', lat: 5.589, lng: -0.288, scheduledPassingTime: '5:52 AM' },
    { name: 'Kaneshie First Light', lat: 5.571, lng: -0.245, scheduledPassingTime: '6:10 AM' },
    { name: 'Osu Oxford Street', lat: 5.556, lng: -0.182, scheduledPassingTime: '6:35 AM' },
  ];

  // Co-Commuter pin is near Agape Junction (~250m away from waypoint)
  const match = routing.findNearestStopMatch({
    hostRouteWaypoints: hostRoute,
    cocommuterOrigin: { lat: 5.602, lng: -0.303 }, // Near Agape Junction
    destinationKmFromStop: 16.5, // 16.5 km from Agape Junction to Osu
    engineClass: 'B', // Class B: GH₵ 2.10/km
  });

  assert.ok(match !== null);
  assert.equal(match.stopName, 'Agape Junction');
  assert.equal(match.estimatedPickupTime, '5:40 AM');
  assert.equal(match.isNearestStopOffered, true);
  assert.ok(match.suggestionPrompt.includes('Host is passing [Agape Junction] at 5:40 AM'));

  // Check dynamically recalculated contribution for shorter leg
  // 16.5 km * 210 pesewas = 3465 pesewas total; 3465 / 3 = 1155 pesewas = GH₵ 11.55
  assert.equal(match.recalculatedContribution.pesewas, 1155);
  assert.equal(match.recalculatedContribution.toFormattedCedis(), 'GH₵ 11.55');
});
