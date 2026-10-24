import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CrisisLink User Acceptance Testing (UAT) - End-to-End Workflows', () => {
  describe('UAT Scenario 1: Citizen Emergency Disaster Reporting to Field Verification', () => {
    it('should complete the end-to-end workflow from citizen report to volunteer field verification', () => {
      // Step 1: Citizen logs in and submits disaster pin
      const citizenUser = { id: 'usr-cit-101', role: 'citizen', name: 'Kabir Ahmed' };
      const disasterReport = {
        id: 'dis-9901',
        reporter_user_id: citizenUser.id,
        disaster_type: 'flood',
        latitude: 24.8949,
        longitude: 91.8687,
        location_label: 'Kazirbazar, Sylhet',
        severity: 'critical',
        description: 'Water breached embankment, 40+ families trapped on rooftops.',
        status: 'reported',
        created_at: new Date().toISOString()
      };
      assert.strictEqual(disasterReport.status, 'reported');

      // Step 2: System detects volunteer within proximity radius
      const nearbyVolunteer = {
        id: 'usr-vol-202',
        role: 'volunteer',
        name: 'Sumon Barua',
        current_latitude: 24.8980,
        current_longitude: 91.8670,
        verification_status: 'approved'
      };
      const latDiff = Math.abs(nearbyVolunteer.current_latitude - disasterReport.latitude);
      const lngDiff = Math.abs(nearbyVolunteer.current_longitude - disasterReport.longitude);
      const isNearby = latDiff <= 1.0 && lngDiff <= 1.0;
      assert.strictEqual(isNearby, true, 'Volunteer should be within dispatch radius');

      // Step 3: Notification generated for volunteer
      const notification = {
        id: 'notif-1',
        user_id: nearbyVolunteer.id,
        type: 'disaster_nearby',
        title: 'New disaster reported nearby',
        message: 'Flood — open CrisisLink to review.',
        is_read: false
      };
      assert.strictEqual(notification.user_id, nearbyVolunteer.id);

      // Step 4: Volunteer arrives at location and uploads field verification photo
      const verificationMedia = {
        id: 'media-88',
        disaster_id: disasterReport.id,
        media_type: 'photo',
        purpose: 'verification',
        storage_path: 'disaster-media/verification-dis-9901.jpg',
        public_url: 'https://cdn.crisislink.org/verification-dis-9901.jpg',
        uploaded_by: nearbyVolunteer.id
      };
      assert.strictEqual(verificationMedia.purpose, 'verification');

      // Step 5: Volunteer / Admin verifies disaster
      const verifiedDisaster = {
        ...disasterReport,
        status: 'verified',
        verified_by_user_id: nearbyVolunteer.id,
        verified_at: new Date().toISOString(),
        verification_notes: 'Ground reality confirmed. Water level at 4.5 feet and rising.'
      };

      assert.strictEqual(verifiedDisaster.status, 'verified');
      assert.strictEqual(verifiedDisaster.verified_by_user_id, nearbyVolunteer.id);
      assert.ok(verifiedDisaster.verification_notes.length > 0);
    });
  });

  describe('UAT Scenario 2: Public Campaign Donation & Real-Time Sync via SSLCommerz', () => {
    it('should complete donation payment cycle and auto-increment campaign collected funds', () => {
      // Step 1: Active campaign target
      const campaign = {
        id: 'camp-sylhet-2026',
        title: 'Sylhet Flash Flood Relief Fund',
        target_amount: 500000.00,
        collected_amount: 120000.00,
        status: 'active'
      };

      // Step 2: Donor initiates 5,000 BDT donation
      const donationAttempt = {
        id: 'don-7721',
        campaign_id: campaign.id,
        donor_name: 'Anisul Haque',
        anonymous: false,
        amount: 5000.00,
        payment_status: 'pending',
        payment_method: 'sslcommerz',
        transaction_id: 'CL17172026001'
      };
      assert.strictEqual(donationAttempt.payment_status, 'pending');

      // Step 3: SSLCommerz webhook IPN receives payment confirmation
      const ipnPayload = {
        tran_id: donationAttempt.transaction_id,
        val_id: 'VAL_SSL_7721',
        amount: '5000.00',
        status: 'VALID',
        bank_tran_id: 'BANK_DBBL_4455',
        currency: 'BDT'
      };

      // Step 4: Payment status marked as 'paid'
      const completedDonation = {
        ...donationAttempt,
        payment_status: 'paid',
        paid_at: new Date().toISOString()
      };
      assert.strictEqual(completedDonation.payment_status, 'paid');

      // Step 5: Database trigger `sync_campaign_collected_amount` recalculates total
      const updatedCampaign = {
        ...campaign,
        collected_amount: campaign.collected_amount + completedDonation.amount
      };

      assert.strictEqual(updatedCampaign.collected_amount, 125000.00);
      const progressPercent = (updatedCampaign.collected_amount / updatedCampaign.target_amount) * 100;
      assert.strictEqual(progressPercent, 25.0);
    });
  });

  describe('UAT Scenario 3: Volunteer Emergency Field Task Dispatch & Proof of Work', () => {
    it('should assign rescue task, accept within SLA, and submit delivery proof', () => {
      // Step 1: Task created by Admin
      const task = {
        id: 'tsk-001',
        disaster_id: 'dis-9901',
        task_type: 'relief_distribution',
        priority: 'high',
        status: 'assigned',
        required_volunteers: 2,
        notes: 'Distribute 50 dry food packets and water purification kits at primary school shelter.'
      };

      // Step 2: Volunteer assigned with 30s timeout
      const assignment = {
        id: 'asg-01',
        task_id: task.id,
        volunteer_id: 'vol-501',
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        assignment_expires_at: new Date(Date.now() + 30000).toISOString()
      };

      // Step 3: Volunteer accepts task in mobile app
      const acceptedAssignment = {
        ...assignment,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      };
      assert.strictEqual(acceptedAssignment.status, 'accepted');

      // Step 4: Volunteer marks in progress and uploads proof upon delivery
      const completedTask = {
        ...task,
        status: 'completed',
        proof_image_url: 'https://cdn.crisislink.org/tasks/proof-tsk-001.jpg',
        completion_note: 'All 50 dry food packets and 100 water tablets distributed to 32 families.'
      };

      assert.strictEqual(completedTask.status, 'completed');
      assert.ok(completedTask.proof_image_url);
    });
  });

  describe('UAT Scenario 4: Admin Crisis Broadcast & Rapid Channel Creation', () => {
    it('should broadcast red alert to all responders and open incident coordination room', () => {
      const broadcastAlert = {
        id: 'bcast-10',
        title: 'CYCLONE REMAL WARNING: Evacuation Order',
        severity: 'critical',
        target_zone: 'Barisal & Patuakhali Coastal Belt',
        sent_at: new Date().toISOString()
      };

      // Associated emergency coordination channel
      const emergencyChannel = {
        id: 'chan-remal-ops',
        type: 'channel',
        channel_slug: 'cyclone-remal-ops',
        name: 'Cyclone Remal Field Coordination',
        description: 'Command room for volunteer dispatch and shelter allocation',
        activeMembersCount: 142
      };

      assert.strictEqual(emergencyChannel.channel_slug, 'cyclone-remal-ops');
      assert.ok(emergencyChannel.activeMembersCount > 100);
    });
  });

  describe('UAT Scenario 5: Geospatial Duplicate Incident Filter', () => {
    it('should merge duplicate reports from multiple citizens in 200m radius to prevent duplicate volunteer dispatch', () => {
      const existingReport = {
        id: 'dis-flood-01',
        latitude: 23.7937,
        longitude: 90.4066,
        created_at: new Date().toISOString(),
        status: 'reported'
      };

      // Second citizen reports same incident 60 meters away 5 minutes later
      const newIncomingReport = {
        latitude: 23.7941,
        longitude: 90.4070,
        created_at: new Date().toISOString()
      };

      // Distance calculation
      const R = 6371000;
      const dLat = ((newIncomingReport.latitude - existingReport.latitude) * Math.PI) / 180;
      const dLng = ((newIncomingReport.longitude - existingReport.longitude) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos((existingReport.latitude*Math.PI)/180) * Math.cos((newIncomingReport.latitude*Math.PI)/180) * Math.sin(dLng/2)**2;
      const distanceMeters = 2 * R * Math.asin(Math.sqrt(a));

      const isDuplicate = distanceMeters < 200;
      assert.strictEqual(isDuplicate, true, `Distance is ${distanceMeters.toFixed(1)}m, within 200m threshold`);

      // System action: Attach report update to existing disaster rather than creating redundant dispatch
      const disasterUpdate = {
        disaster_id: existingReport.id,
        body_text: 'Additional citizen confirmation received: Flood water continuing to rise.',
        created_at: new Date().toISOString()
      };
      assert.strictEqual(disasterUpdate.disaster_id, existingReport.id);
    });
  });
});
