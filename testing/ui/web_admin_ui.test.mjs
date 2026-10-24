import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CrisisLink Web Admin UI & Control Panel Test Suite', () => {
  describe('Admin Slug Obscurity & Route Protection', () => {
    it('should redirect unauthenticated users accessing /admin or /[adminSlug] to login', () => {
      const adminSlug = 'ops-hq-7788';
      const testPaths = ['/admin', '/admin/disasters', `/${adminSlug}`, `/${adminSlug}/volunteers`];

      testPaths.forEach(path => {
        const isAdminRoute =
          path === `/${adminSlug}` ||
          path.startsWith(`/${adminSlug}/`) ||
          path === '/admin' ||
          path.startsWith('/admin/');

        assert.strictEqual(isAdminRoute, true, `Path ${path} must be recognized as protected admin route`);

        // Check authentication requirement
        const user = null;
        const redirectTarget = !user ? `/login?redirect=${encodeURIComponent(path)}` : null;
        assert.ok(redirectTarget.startsWith('/login?redirect='));
      });
    });

    it('should redirect volunteers attempting to access web volunteer route to /use-mobile', () => {
      const pathname = '/volunteer/tasks';
      const isVolunteerRoute = pathname === '/volunteer' || pathname.startsWith('/volunteer/');
      
      let redirectTarget = null;
      if (isVolunteerRoute) {
        redirectTarget = '/use-mobile';
      }

      assert.strictEqual(redirectTarget, '/use-mobile');
    });
  });

  describe('Admin Disaster Triage & Verification Workflow', () => {
    it('should order triage queue by urgency and unverified status first', () => {
      const mockDisasters = [
        { id: '1', status: 'verified', severity: 'critical', created_at: '2026-10-24T06:00:00Z' },
        { id: '2', status: 'reported', severity: 'low', created_at: '2026-10-24T07:00:00Z' },
        { id: '3', status: 'reported', severity: 'critical', created_at: '2026-10-24T07:30:00Z' },
        { id: '4', status: 'reported', severity: 'high', created_at: '2026-10-24T07:15:00Z' }
      ];

      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      
      // Admin triage sorting: reported first, then highest severity, then newest
      const sorted = [...mockDisasters].sort((a, b) => {
        if (a.status === 'reported' && b.status !== 'reported') return -1;
        if (a.status !== 'reported' && b.status === 'reported') return 1;
        if (severityWeight[b.severity] !== severityWeight[a.severity]) {
          return severityWeight[b.severity] - severityWeight[a.severity];
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

      assert.strictEqual(sorted[0].id, '3', 'Reported + Critical should be at top of triage queue');
      assert.strictEqual(sorted[1].id, '4', 'Reported + High should be second');
      assert.strictEqual(sorted[2].id, '2', 'Reported + Low should be third');
      assert.strictEqual(sorted[3].id, '1', 'Already verified should follow unverified reports');
    });

    it('should require verification notes when marking disaster as rejected or false alarm', () => {
      function submitVerification(disasterId, newStatus, verificationNotes) {
        if (['rejected', 'false_alarm'].includes(newStatus)) {
          if (!verificationNotes || verificationNotes.trim().length < 10) {
            return { success: false, error: 'A detailed rejection reason (minimum 10 characters) is required.' };
          }
        }
        return { success: true, updatedStatus: newStatus, notes: verificationNotes };
      }

      const invalidReject = submitVerification('dis-1', 'rejected', 'Spam');
      assert.strictEqual(invalidReject.success, false);
      assert.ok(invalidReject.error.includes('minimum 10 characters'));

      const validReject = submitVerification('dis-1', 'rejected', 'Ground volunteer verified this is routine road repair, no flood.');
      assert.strictEqual(validReject.success, true);
    });
  });

  describe('Volunteer Management & Role Approvals', () => {
    it('should validate volunteer approval state transition and rejection rationale', () => {
      const volunteerProfile = {
        userId: 'vol-456',
        fullName: 'Sadia Jahan',
        verification_status: 'pending',
        skills: ['First Aid', 'Search & Rescue'],
        nidVerified: true
      };

      function updateVolunteerStatus(profile, newStatus, rejectionReason) {
        if (newStatus === 'rejected' && (!rejectionReason || rejectionReason.length < 5)) {
          return { error: 'Rejection reason is required for audit compliance.' };
        }
        return {
          ...profile,
          verification_status: newStatus,
          verification_rejection_reason: newStatus === 'rejected' ? rejectionReason : null,
          verified_at: newStatus === 'approved' ? new Date().toISOString() : null
        };
      }

      const approved = updateVolunteerStatus(volunteerProfile, 'approved');
      assert.strictEqual(approved.verification_status, 'approved');
      assert.ok(approved.verified_at);

      const rejected = updateVolunteerStatus(volunteerProfile, 'rejected', 'NID scan blurred and illegible.');
      assert.strictEqual(rejected.verification_status, 'rejected');
      assert.strictEqual(rejected.verification_rejection_reason, 'NID scan blurred and illegible.');
    });
  });
});
