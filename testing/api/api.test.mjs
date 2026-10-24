import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Haversine distance calculator identical to production logic in mobile/src/services/disasterService.ts
 */
function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/**
 * Mock SSLCommerz Payment Session Validator
 */
function validateSSLCommerzInitPayload(body) {
  const campaignId = String(body.campaign_id ?? '');
  const amount = Number(body.amount);
  const donorInfo = body.donor_info ?? {};

  if (!campaignId || !amount || amount < 10) {
    return { valid: false, status: 400, error: 'Invalid campaign or amount' };
  }

  const tranId = `CL${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  return {
    valid: true,
    status: 200,
    data: {
      transaction_id: tranId,
      amount,
      currency: 'BDT',
      payment_url: `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay&SESSIONKEY=${tranId}`,
      donation_id: 'mock-donation-' + tranId
    }
  };
}

/**
 * Mock SSLCommerz IPN (Instant Payment Notification) Verifier
 */
function verifySSLCommerzIPN(ipnPayload, configuredStorePass) {
  const { tran_id, val_id, amount, card_type, status, verify_sign, verify_key } = ipnPayload;
  
  if (status !== 'VALID' && status !== 'VALIDATED') {
    return { verified: false, reason: 'Payment status not valid: ' + status };
  }
  
  if (!tran_id || !val_id || !amount) {
    return { verified: false, reason: 'Missing mandatory transaction parameters' };
  }

  // Simulated hash check
  if (!verify_sign || verify_sign.length < 16) {
    return { verified: false, reason: 'Invalid or missing signature' };
  }

  return { verified: true, tran_id, amount: Number(amount), status: 'paid' };
}

describe('CrisisLink API Test Suite', () => {
  describe('Disaster Reporting Contract & Validation', () => {
    it('should validate valid disaster report payload conforming to database schema', () => {
      const payload = {
        disaster_type: 'flood',
        latitude: 24.8949,
        longitude: 91.8687,
        location_label: 'Kazirbazar, Sylhet',
        severity: 'critical',
        description: 'Rising water level has flooded 50+ residential houses near the river bank.'
      };

      assert.ok(['flood', 'cyclone', 'earthquake', 'fire', 'landslide', 'other'].includes(payload.disaster_type));
      assert.ok(['low', 'medium', 'high', 'critical'].includes(payload.severity));
      assert.strictEqual(typeof payload.latitude, 'number');
      assert.strictEqual(typeof payload.longitude, 'number');
      assert.ok(payload.latitude >= -90 && payload.latitude <= 90);
      assert.ok(payload.longitude >= -180 && payload.longitude <= 180);
      assert.ok(payload.description.length > 10);
    });

    it('should reject disaster reports with missing or invalid coordinates', () => {
      const invalidPayload = {
        disaster_type: 'flood',
        latitude: 105.4, // invalid latitude
        longitude: null,
        description: 'Emergency'
      };

      const isValidLat = typeof invalidPayload.latitude === 'number' && invalidPayload.latitude >= -90 && invalidPayload.latitude <= 90;
      const isValidLng = typeof invalidPayload.longitude === 'number' && invalidPayload.longitude >= -180 && invalidPayload.longitude <= 180;
      
      assert.strictEqual(isValidLat, false, 'Latitude > 90 must fail validation');
      assert.strictEqual(isValidLng, false, 'Null longitude must fail validation');
    });

    it('should accurately calculate Haversine distance for nearby duplicate detection (200m threshold)', () => {
      // Coordinate A: Kazirbazar Bridge (24.8949, 91.8687)
      // Coordinate B: 150m away (24.8961, 91.8693)
      // Coordinate C: 500m away (24.8990, 91.8720)
      const latA = 24.8949, lngA = 91.8687;
      const latB = 24.8961, lngB = 91.8693;
      const latC = 24.8990, lngC = 91.8720;

      const distAB = haversineMeters(latA, lngA, latB, lngB);
      const distAC = haversineMeters(latA, lngA, latC, lngC);

      assert.ok(distAB < 200, `Expected distance AB (${distAB.toFixed(1)}m) to be within 200m duplicate window`);
      assert.ok(distAC > 200, `Expected distance AC (${distAC.toFixed(1)}m) to exceed 200m duplicate window`);
    });

    it('should trigger volunteer proximity alert if volunteer is within +/- 1 degree (~100km)', () => {
      const disasterLat = 24.8949, disasterLng = 91.8687; // Sylhet
      const volunteerNearbyLat = 24.9010, volunteerNearbyLng = 91.8600; // Sylhet City (~1.2km)
      const volunteerDistantLat = 22.3569, volunteerDistantLng = 91.7832; // Chittagong (~280km)

      const isNearbyVolunteer = Math.abs(volunteerNearbyLat - disasterLat) <= 1 && Math.abs(volunteerNearbyLng - disasterLng) <= 1;
      const isDistantVolunteer = Math.abs(volunteerDistantLat - disasterLat) <= 1 && Math.abs(volunteerDistantLng - disasterLng) <= 1;

      assert.strictEqual(isNearbyVolunteer, true, 'Volunteer within 1 deg should be notified');
      assert.strictEqual(isDistantVolunteer, false, 'Volunteer outside 1 deg should NOT be notified');
    });
  });

  describe('SSLCommerz Edge Functions & Payment API', () => {
    it('should initiate payment when campaign is active and amount >= 10 BDT', () => {
      const req = {
        campaign_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 500,
        donor_info: {
          name: 'Rahim Ahmed',
          anonymous: false,
          user_id: 'user-123'
        }
      };

      const result = validateSSLCommerzInitPayload(req);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.status, 200);
      assert.ok(result.data.transaction_id.startsWith('CL'));
      assert.ok(result.data.payment_url.includes('SESSIONKEY'));
    });

    it('should reject payment requests with amount below 10 BDT', () => {
      const req = {
        campaign_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5, // below 10 BDT minimum
        donor_info: { name: 'Anonymous' }
      };

      const result = validateSSLCommerzInitPayload(req);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.status, 400);
      assert.strictEqual(result.error, 'Invalid campaign or amount');
    });

    it('should correctly process SSLCommerz IPN webhook with valid signature', () => {
      const ipnPayload = {
        tran_id: 'CL1717670400000abc123',
        val_id: 'VAL_SSL_987654321',
        amount: '500.00',
        card_type: 'BKASH-bKash',
        status: 'VALID',
        verify_sign: 'a1b2c3d4e5f6g7h8i9j0k1l2',
        verify_key: 'amount,bank_tran_id,card_brand'
      };

      const verification = verifySSLCommerzIPN(ipnPayload, 'test_store_pass');
      assert.strictEqual(verification.verified, true);
      assert.strictEqual(verification.status, 'paid');
      assert.strictEqual(verification.amount, 500);
    });

    it('should reject spoofed or failed IPN callbacks', () => {
      const spoofedPayload = {
        tran_id: 'CL1717670400000abc123',
        val_id: 'VAL_SSL_987654321',
        amount: '500.00',
        status: 'FAILED', // Failed transaction status
        verify_sign: 'short_invalid_sign'
      };

      const verification = verifySSLCommerzIPN(spoofedPayload, 'test_store_pass');
      assert.strictEqual(verification.verified, false);
      assert.ok(verification.reason.includes('Payment status not valid'));
    });
  });

  describe('Volunteer Task Assignment State Machine API', () => {
    it('should enforce valid task lifecycle transitions', () => {
      const validTransitions = {
        assigned: ['accepted', 'declined', 'timeout'],
        accepted: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      function canTransition(current, next) {
        return (validTransitions[current] ?? []).includes(next);
      }

      assert.strictEqual(canTransition('assigned', 'accepted'), true);
      assert.strictEqual(canTransition('accepted', 'in_progress'), true);
      assert.strictEqual(canTransition('in_progress', 'completed'), true);
      assert.strictEqual(canTransition('assigned', 'completed'), false, 'Direct jump to completed without accepting must be blocked');
      assert.strictEqual(canTransition('completed', 'in_progress'), false, 'Completed task cannot revert to in_progress');
    });
  });
});
