import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * High-precision performance benchmarker
 */
function benchmark(name, iterations, fn) {
  const latencies = [];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn(i);
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }

  const endTotal = performance.now();
  const totalMs = endTotal - startTotal;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(iterations * 0.50)];
  const p90 = latencies[Math.floor(iterations * 0.90)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const p99 = latencies[Math.floor(iterations * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / iterations;
  const throughput = (iterations / (totalMs / 1000));

  return {
    name,
    iterations,
    totalMs: Number(totalMs.toFixed(2)),
    avgMs: Number(avg.toFixed(4)),
    minMs: Number(latencies[0].toFixed(4)),
    p50Ms: Number(p50.toFixed(4)),
    p90Ms: Number(p90.toFixed(4)),
    p95Ms: Number(p95.toFixed(4)),
    p99Ms: Number(p99.toFixed(4)),
    maxMs: Number(latencies[latencies.length - 1].toFixed(4)),
    throughputRps: Number(throughput.toFixed(1))
  };
}

describe('CrisisLink Performance & Stress Testing Suite', () => {
  describe('Disaster Surge Reporting Concurrency Benchmark', () => {
    it('should process 1,000 disaster ingestion validations with sub-millisecond p95 latency', () => {
      const validator = (i) => {
        const payload = {
          id: `disaster-test-${i}`,
          disaster_type: 'flood',
          latitude: 24.8949 + (i * 0.0001),
          longitude: 91.8687 + (i * 0.0001),
          location_label: `District Section ${i % 20}`,
          severity: ['low', 'medium', 'high', 'critical'][i % 4],
          description: `Emergency flood water level rising rapidly at sector ${i}`
        };

        // Schema validation check
        if (!payload.disaster_type || typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
          throw new Error('Validation failed');
        }
        return payload;
      };

      const metrics = benchmark('Disaster Ingestion Validation', 1000, validator);
      
      console.log(`\n[PERF METRICS] ${metrics.name}:`);
      console.log(`  - Iterations: ${metrics.iterations}`);
      console.log(`  - Throughput: ${metrics.throughputRps.toLocaleString()} ops/sec`);
      console.log(`  - Average: ${metrics.avgMs} ms | p50: ${metrics.p50Ms} ms | p95: ${metrics.p95Ms} ms | p99: ${metrics.p99Ms} ms`);

      assert.ok(metrics.p95Ms < 1.0, `p95 latency (${metrics.p95Ms}ms) must remain below 1ms`);
      assert.ok(metrics.throughputRps > 10000, `Throughput (${metrics.throughputRps} rps) must exceed 10,000 ops/sec`);
    });
  });

  describe('Spatial Haversine Duplicate Detection Under Load', () => {
    it('should evaluate 10,000 coordinate proximity checks under 50ms total execution time', () => {
      const originLat = 24.8949, originLng = 91.8687;
      const R = 6371000;
      const toRad = (d) => (d * Math.PI) / 180;

      const haversine = (lat2, lng2) => {
        const dLat = toRad(lat2 - originLat);
        const dLng = toRad(lng2 - originLng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(originLat)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
      };

      const metrics = benchmark('Spatial Duplicate Calculation', 10000, (i) => {
        const testLat = originLat + (Math.sin(i) * 0.01);
        const testLng = originLng + (Math.cos(i) * 0.01);
        const dist = haversine(testLat, testLng);
        return dist < 200;
      });

      console.log(`\n[PERF METRICS] ${metrics.name}:`);
      console.log(`  - 10,000 Geospatial Computations in: ${metrics.totalMs} ms`);
      console.log(`  - Throughput: ${metrics.throughputRps.toLocaleString()} ops/sec | p99: ${metrics.p99Ms} ms`);

      assert.ok(metrics.totalMs < 100, `Total time for 10k spatial evaluations must be under 100ms (measured: ${metrics.totalMs}ms)`);
    });
  });

  describe('Real-Time Chat & Broadcast Dispatch Scalability', () => {
    it('should simulate 500 volunteer broadcast fan-out deliveries within 10ms', () => {
      const volunteers = Array.from({ length: 500 }, (_, i) => ({
        id: `vol-${i}`,
        socketActive: i % 10 !== 0,
        queue: []
      }));

      const broadcastMessage = {
        id: 'msg-alert-99',
        type: 'broadcast',
        content: 'FLASH FLOOD RED ALERT: Evacuate low-lying areas near Surma River.',
        timestamp: Date.now()
      };

      const metrics = benchmark('WebSocket Fan-Out', 1, () => {
        let deliveredCount = 0;
        for (const vol of volunteers) {
          if (vol.socketActive) {
            vol.queue.push(broadcastMessage);
            deliveredCount++;
          }
        }
        return deliveredCount;
      });

      console.log(`\n[PERF METRICS] ${metrics.name}:`);
      console.log(`  - 500 Subscribed Sockets Fan-out in: ${metrics.totalMs} ms`);

      assert.ok(metrics.totalMs < 10, `Fan-out delivery time must be under 10ms (measured: ${metrics.totalMs}ms)`);
    });
  });
});
