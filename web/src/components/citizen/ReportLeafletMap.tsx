'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface ReportLeafletMapProps {
  latitude: number;
  longitude: number;
  severity: string;
  onPositionChange: (lat: number, lng: number) => void;
}

function getSeverityColor(sev: string): string {
  switch ((sev || 'low').toLowerCase()) {
    case 'critical':
      return '#DC2626'; // vibrant red-600
    case 'high':
      return '#EA580C'; // orange-600
    case 'medium':
      return '#F59E0B'; // amber-500
    case 'low':
    default:
      return '#10B981'; // emerald-500
  }
}

function getSeverityRadius(sev: string): number {
  switch ((sev || 'low').toLowerCase()) {
    case 'critical':
      return 1500; // 1.5km radius
    case 'high':
      return 1000;
    case 'medium':
      return 600;
    case 'low':
    default:
      return 300;
  }
}

// Controller to fly to position when coordinates change from manual input
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), {
      duration: 1,
    });
  }, [lat, lng, map]);
  return null;
}

// Map click handler to place pin
function MapClickHandler({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
    },
  });
  return null;
}

export default function ReportLeafletMap({
  latitude,
  longitude,
  severity,
  onPositionChange,
}: ReportLeafletMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const color = getSeverityColor(severity);
  const radius = getSeverityRadius(severity);

  // Custom marker icon based on severity
  const pinIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div style="position: relative; width: 34px; height: 42px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 32" width="34" height="42" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
          </svg>
          <div style="
            position: absolute;
            bottom: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 3px;
            background: rgba(0,0,0,0.25);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });
  }, [color]);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[350px] bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs font-semibold">
        Loading Interactive Map...
      </div>
    );
  }

  const center: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ minHeight: '350px', background: '#F1F5F9' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter lat={latitude} lng={longitude} />
        <MapClickHandler onPositionChange={onPositionChange} />

        {/* Draggable Marker */}
        <Marker
          position={center}
          icon={pinIcon}
          draggable={true}
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const newPos = marker.getLatLng();
              onPositionChange(Number(newPos.lat.toFixed(5)), Number(newPos.lng.toFixed(5)));
            },
          }}
        />

        {/* Severity-colored Circle Overlay */}
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.18,
            dashArray: severity === 'critical' ? '4, 4' : undefined,
          }}
        />
      </MapContainer>

      {/* Floating Instructions Banner */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: color }} />
        <span>Click or drag pin to adjust incident site</span>
      </div>

      {/* Severity Zone Indicator */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-medium flex items-center gap-2 shadow-lg">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="capitalize font-bold">{severity} Alert Zone:</span>
        <span className="text-slate-300">~{radius}m estimated impact radius</span>
      </div>
    </div>
  );
}
