'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface DisasterMiniMapProps {
  latitude: number;
  longitude: number;
  disasterType?: string | null;
  severity?: string | null;
  className?: string;
}

export function DisasterMiniMap({
  latitude,
  longitude,
  disasterType,
  severity,
  className = '',
}: DisasterMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const normSev = (severity || 'medium').toLowerCase();
    let fillColor = '#DC2626';
    if (normSev === 'low') fillColor = '#F59E0B';
    else if (normSev === 'medium') fillColor = '#EA580C';
    else if (normSev === 'critical') fillColor = '#991B1B';

    L.circleMarker([latitude, longitude], {
      radius: 8,
      fillColor,
      fillOpacity: 0.95,
      color: '#FFFFFF',
      weight: 2,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, disasterType, severity]);

  return (
    <div className={`relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 bg-white/95 px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 border border-slate-200 z-[400]">
        {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
      </div>
    </div>
  );
}
