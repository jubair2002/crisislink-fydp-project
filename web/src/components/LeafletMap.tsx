'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapDisaster {
  id: string;
  disaster_type: string | null;
  latitude: number | null;
  longitude: number | null;
  severity: string | null;
  status: string | null;
  description: string | null;
  location_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface LeafletMapProps {
  disasters: MapDisaster[];
  selectedDisasterId?: string | null;
  onSelectDisaster: (disaster: MapDisaster) => void;
  className?: string;
}

export function LeafletMap({
  disasters,
  selectedDisasterId,
  onSelectDisaster,
  className = '',
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [23.685, 90.3563],
      zoom: 7,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    // Clean CartoDB Voyager tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control
      .attribution({ position: 'bottomleft', prefix: '© OpenStreetMap contributors' })
      .addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    disasters.forEach((d) => {
      if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') return;

      const normSev = (d.severity || 'medium').toLowerCase();
      const isSelected = d.id === selectedDisasterId;

      let color = '#EA580C'; // Medium
      let radius = 9;

      if (normSev === 'low') {
        color = '#F59E0B';
        radius = 8;
      } else if (normSev === 'medium') {
        color = '#EA580C';
        radius = 9;
      } else if (normSev === 'high') {
        color = '#DC2626';
        radius = 11;
      } else if (normSev === 'critical') {
        color = '#991B1B';
        radius = 13;
      }

      if (isSelected) {
        radius += 3;
      }

      // Clean circle marker with solid stroke
      const marker = L.circleMarker([d.latitude, d.longitude], {
        radius,
        fillColor: color,
        fillOpacity: 0.9,
        color: isSelected ? '#0F172A' : '#FFFFFF',
        weight: isSelected ? 3 : 2,
      });

      marker.on('click', () => {
        onSelectDisaster(d);
        map.setView([d.latitude!, d.longitude!], Math.max(map.getZoom(), 9), { animate: true });
      });

      const loc = d.location_label || d.description?.split(':')[0] || 'Incident Zone';
      const label = (d.disaster_type || 'Disaster').toUpperCase();

      marker.bindTooltip(
        `<div class="font-sans text-xs">
          <span class="font-semibold text-slate-900">${label}</span><br/>
          <span class="text-slate-500">${loc}</span>
        </div>`,
        { direction: 'top', offset: [0, -radius] }
      );

      layer.addLayer(marker);
    });
  }, [disasters, selectedDisasterId, onSelectDisaster]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-100 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
