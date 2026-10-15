'use client';

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet';
import L from 'leaflet';

interface MiniMapProps {
  latitude: number;
  longitude: number;
  severity?: string | null;
}

export default function DisasterMiniMap({ latitude, longitude, severity }: MiniMapProps) {
  const center: [number, number] = [latitude, longitude];

  const markerColor =
    severity === 'critical'
      ? '#991B1B'
      : severity === 'high'
      ? '#EF4444'
      : severity === 'medium'
      ? '#F97316'
      : '#F59E0B';

  return (
    <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-inner border border-slate-200">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={center}
          radius={12}
          pathOptions={{
            color: '#FFFFFF',
            weight: 2,
            fillColor: markerColor,
            fillOpacity: 0.9,
          }}
        />
      </MapContainer>
    </div>
  );
}
