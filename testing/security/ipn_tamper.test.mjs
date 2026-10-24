import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('CrisisLink SSLCommerz IPN Security & Anti-Fraud Suite', () => {
  const STORE_PASS = 'demo_sslcommerz_store_pass_2026';

  /**
   * Generates MD5 signature according to SSLCommerz validation spec
   */
  function generateSSLSignature(params, storePass) {
    const sortedKeys = Object.keys(params).sort();
    const str = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + `&store_passwd=${crypto.createHash('md5').update(storePass).digest('hex')}`;
    return crypto.createHash('md5').update(str).digest('hex');
  }

  describe('IPN Signature Forgery & Tampering Detection', () => {
    it('should reject IPN callback if verify_sign MD5 hash does not match store credentials', () => {
      const genuineParams = {
        tran_id: 'CL1717000000000abcdef',
        val_id: 'VAL20260601',
        amount: '1000.00',
        currency: 'BDT',
        status: 'VALID'
      };

      const legitimateSign = generateSSLSignature(genuineParams, STORE_PASS);
      const forgedSign = '00001111222233334444555566667777'; // Attacker guess

      function verifyIPN(params, signature, storePass) {
        const expected = generateSSLSignature(params, storePass);
        return expected === signature;
      }

      assert.strictEqual(verifyIPN(genuineParams, legitimateSign, STORE_PASS), true);
      assert.strictEqual(verifyIPN(genuineParams, forgedSign, STORE_PASS), false);
    });

    it('should detect and prevent payment amount tampering attacks (Paying 10 BDT, claiming 10,000 BDT)', () => {
      const initiatedDonation = {
        donation_id: 'don-001',
        campaign_id: 'camp-sylhet',
        expected_amount: 10000.00, // Donor initiated 10,000 BDT
        transaction_id: 'CL1717000000000xyz'
      };

      const attackerTamperedIPN = {
        tran_id: 'CL1717000000000xyz',
        val_id: 'VAL9999',
        amount: '10.00', // Attacker paid only 10 BDT at gateway
        currency: 'BDT',
        status: 'VALID'
      };

      function processPaymentVerification(donation, ipn) {
        if (donation.transaction_id !== ipn.tran_id) {
          return { success: false, reason: 'Transaction ID mismatch' };
        }
        if (Number(ipn.amount) < donation.expected_amount) {
          return {
            success: false,
            fraudDetected: true,
            reason: `Amount mismatch: expected ${donation.expected_amount} BDT, received ${ipn.amount} BDT`
          };
        }
        return { success: true, status: 'paid' };
      }

      const outcome = processPaymentVerification(initiatedDonation, attackerTamperedIPN);
      assert.strictEqual(outcome.success, false);
      assert.strictEqual(outcome.fraudDetected, true);
      assert.ok(outcome.reason.includes('Amount mismatch'));
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject duplicate IPN execution for already-settled transactions', () => {
      const processedTransactions = new Set(['CL1717000000000abc_SETTLED']);

      function handleIncomingIPN(tranId) {
        if (processedTransactions.has(tranId)) {
          return { accepted: false, error: 'Duplicate transaction execution rejected (Replay attack prevention)' };
        }
        processedTransactions.add(tranId);
        return { accepted: true, status: 'processed' };
      }

      // First run: Accepted
      const res1 = handleIncomingIPN('CL_TXN_FIRST');
      assert.strictEqual(res1.accepted, true);

      // Replay of same transaction: Rejected
      const res2 = handleIncomingIPN('CL_TXN_FIRST');
      assert.strictEqual(res2.accepted, false);
      assert.ok(res2.error.includes('Replay attack prevention'));
    });
  });
});
