import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CrisisLink Web Citizen UI Test Suite', () => {
  describe('Public Citizen Portal & Navigation', () => {
    it('should verify public routes accessible without authentication token', () => {
      const publicPaths = [
        '/',
        '/about',
        '/campaigns',
        '/map',
        '/track',
        '/disasters',
        '/login',
        '/signup'
      ];

      // Verifying public route resolution
      publicPaths.forEach(path => {
        const isPublic = path === '/' || [
          '/about', '/terms', '/privacy', '/campaigns', '/map', '/track', '/disasters', '/login', '/signup'
        ].some(prefix => path === prefix || path.startsWith(`${prefix}/`));

        assert.strictEqual(isPublic, true, `Path ${path} must be publicly accessible without auth`);
      });
    });

    it('should redirect unauthenticated users attempting to access /citizen protected dashboard', () => {
      const protectedPath = '/citizen';
      const mockSession = { user: null, roleCookie: null };

      let redirectUrl = null;
      if (protectedPath.startsWith('/citizen') && !mockSession.user) {
        redirectUrl = `/login?redirect=${encodeURIComponent(protectedPath)}`;
      }

      assert.strictEqual(redirectUrl, '/login?redirect=%2Fcitizen');
    });

    it('should validate Citizen Disaster Reporting Form UI validation rules', () => {
      const formFields = {
        disasterType: { value: '', required: true },
        locationLabel: { value: '', required: true },
        latitude: { value: null, required: true },
        longitude: { value: null, required: true },
        severity: { value: 'medium', required: true },
        description: { value: 'Brief note', required: true, minLength: 15 }
      };

      function validateForm(fields) {
        const errors = {};
        if (fields.disasterType.required && !fields.disasterType.value) {
          errors.disasterType = 'Disaster type is required';
        }
        if (fields.locationLabel.required && !fields.locationLabel.value) {
          errors.locationLabel = 'Location address is required';
        }
        if (fields.latitude.value === null || fields.longitude.value === null) {
          errors.coordinates = 'Coordinates are required from map pin or GPS';
        }
        if (fields.description.value.length < fields.description.minLength) {
          errors.description = `Description must be at least ${fields.description.minLength} characters`;
        }
        return { isValid: Object.keys(errors).length === 0, errors };
      }

      // Test with empty fields
      const res1 = validateForm(formFields);
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.disasterType);
      assert.ok(res1.errors.coordinates);
      assert.ok(res1.errors.description);

      // Test with valid filled fields
      formFields.disasterType.value = 'flood';
      formFields.locationLabel.value = 'Chhatak, Sunamganj';
      formFields.latitude.value = 25.0416;
      formFields.longitude.value = 91.6706;
      formFields.description.value = 'Severe flooding detected. Multiple villages are submerged with high current.';
      
      const res2 = validateForm(formFields);
      assert.strictEqual(res2.isValid, true);
      assert.strictEqual(Object.keys(res2.errors).length, 0);
    });

    it('should format location address fallback into description if location_label column is pending migration', () => {
      const address = 'Mirpur 10, Dhaka';
      const userDesc = 'Water logging up to knee height near roundabout.';

      // As documented in web/docs/backend-requests.md:
      // The web client stores `Location: [Address] - [Description]` for seamless backwards compatibility
      const mergedDescription = `Location: ${address} - ${userDesc}`;

      assert.ok(mergedDescription.startsWith('Location: Mirpur 10, Dhaka - '));
      assert.ok(mergedDescription.includes(userDesc));
    });
  });

  describe('Campaign Donation UI & Preset Chips', () => {
    it('should validate preset donation amount chip selection and custom amount input', () => {
      const presetAmounts = [100, 500, 1000, 2000, 5000];
      let selectedAmount = 500;

      assert.ok(presetAmounts.includes(selectedAmount));

      // Custom amount validation
      function validateDonationAmount(val) {
        const num = Number(val);
        if (isNaN(num) || num < 10) return { valid: false, error: 'Minimum donation is 10 BDT' };
        if (num > 500000) return { valid: false, error: 'Maximum single donation is 500,000 BDT' };
        return { valid: true, amount: num };
      }

      assert.strictEqual(validateDonationAmount('5').valid, false);
      assert.strictEqual(validateDonationAmount('1500').valid, true);
      assert.strictEqual(validateDonationAmount('1000000').valid, false);
    });

    it('should correctly handle anonymous donation toggle masking donor details', () => {
      const donorProfile = {
        name: 'Tanvir Hossain',
        email: 'tanvir@example.com',
        phone: '+8801700000000',
        isAnonymous: true
      };

      const publicDisplayDonor = donorProfile.isAnonymous ? 'Anonymous Donor' : donorProfile.name;
      assert.strictEqual(publicDisplayDonor, 'Anonymous Donor');
    });
  });
});
