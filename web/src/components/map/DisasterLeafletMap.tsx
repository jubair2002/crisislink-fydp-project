'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { DisasterRow } from '@/types/admin';
import { getDisasterTypeMeta } from '@/components/DisasterBadge';

interface LeafletMapProps {
  disasters: DisasterRow[];
  selectedDisaster: DisasterRow | null;
  onSelectDisaster: (disaster: DisasterRow) => void;
}

function getSeverityColor(sev: string | null | undefined): string {
  switch ((sev || 'low').toLowerCase()) {
    case 'critical':
      return '#991B1B';
    case 'high':
      return '#EF4444';
    case 'medium':
      return '#F97316';
    case 'low':
    default:
      return '#F59E0B';
  }
}

function getSeverityRadius(sev: string | null | undefined): number {
  switch ((sev || 'low').toLowerCase()) {
    case 'critical':
      return 20;
    case 'high':
      return 16;
    case 'medium':
      return 13;
    case 'low':
    default:
      return 9;
  }
}

// Controller to fly to selected disaster when clicked
function MapController({ selectedDisaster }: { selectedDisaster: DisasterRow | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedDisaster?.latitude && selectedDisaster?.longitude) {
      map.flyTo([selectedDisaster.latitude, selectedDisaster.longitude], Math.max(map.getZoom(), 9), {
        duration: 1.2,
      });
    }
  }, [selectedDisaster, map]);

  return null;
}

export default function DisasterLeafletMap({
  disasters,
  selectedDisaster,
  onSelectDisaster,
}: LeafletMapProps) {
  // Center of Bangladesh
  const defaultCenter: [number, number] = [23.685, 90.3563];
  const defaultZoom = 7;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: '#0F172A' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedDisaster={selectedDisaster} />

        {disasters.map((d) => {
          if (!d.latitude || !d.longitude) return null;
          const isSelected = selectedDisaster?.id === d.id;
          const color = getSeverityColor(d.severity);
          const radius = getSeverityRadius(d.severity);
          const meta = getDisasterTypeMeta(d.disaster_type);

          return (
            <React.Fragment key={d.id}>
              {/* Outer halo for high/critical or selected */}
              {(d.severity === 'critical' || isSelected) && (
                <CircleMarker
                  center={[d.latitude, d.longitude]}
                  radius={radius + 8}
                  pathOptions={{
                    color,
                    weight: 1,
                    opacity: 0.4,
                    fillColor: color,
                    fillOpacity: 0.15,
                  }}
                />
              )}

              <CircleMarker
                center={[d.latitude, d.longitude]}
                radius={isSelected ? radius + 4 : radius}
                eventHandlers={{
                  click: () => onSelectDisaster(d),
                }}
                pathOptions={{
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                  weight: isSelected ? 3 : 1.5,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span>{meta.emoji}</span>
                      <span className="capitalize">{d.disaster_type || 'Disaster'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{d.description}</p>
                    <button
                      onClick={() => onSelectDisaster(d)}
                      className="mt-1 w-full text-center py-1 bg-blue-600 text-white rounded font-bold text-[10px]"
                    >
                      Select to View Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
