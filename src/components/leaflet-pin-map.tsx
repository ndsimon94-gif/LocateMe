import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

export type PinGroupBase = {
  key: string;
  lat: number;
  lng: number;
  count: number;
};

type LeafletPinMapProps<T extends PinGroupBase> = {
  groups: T[];
  onSelect: (group: T) => void;
  pinColor: string;
  pinTextColor: string;
};

// A from-scratch web map (OpenStreetMap tiles via Leaflet, no API key) since
// react-native-maps has no web build at all. Pins are custom divIcons rather
// than Leaflet's default marker image, which sidesteps the classic
// bundler-breaks-the-default-icon-path issue entirely.
export function LeafletPinMap<T extends PinGroupBase>({
  groups,
  onSelect,
  pinColor,
  pinTextColor,
}: LeafletPinMapProps<T>) {
  const iconFor = useMemo(() => {
    const cache = new Map<number, L.DivIcon>();
    return (count: number) => {
      const cached = cache.get(count);
      if (cached) return cached;
      const icon = L.divIcon({
        className: 'orbit-pin',
        html: `<div style="width:28px;height:28px;border-radius:14px;background:${pinColor};border:2px solid ${pinTextColor};display:flex;align-items:center;justify-content:center;color:${pinTextColor};font-size:12px;font-weight:700;font-family:-apple-system,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${count}</div>`,
        iconSize: [28, 28],
      });
      cache.set(count, icon);
      return icon;
    };
  }, [pinColor, pinTextColor]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {groups.map((group) => (
        <Marker
          key={group.key}
          position={[group.lat, group.lng]}
          icon={iconFor(group.count)}
          eventHandlers={{ click: () => onSelect(group) }}
        />
      ))}
    </MapContainer>
  );
}
