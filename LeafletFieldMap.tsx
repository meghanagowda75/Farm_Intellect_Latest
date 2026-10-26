import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapField {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface LeafletFieldMapProps {
  fields: MapField[];
  selectedField: MapField | null;
  mapView: "satellite" | "terrain";
  onSelectField: (field: MapField) => void;
}

export function LeafletFieldMap({
  fields,
  selectedField,
  mapView,
  onSelectField,
}: LeafletFieldMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;

    const map = L.map(mapElement.current).setView(
      [fields[0]?.lat ?? 12.9716, fields[0]?.lng ?? 77.5946],
      13
    );

    mapInstance.current = map;
    markers.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl =
      mapView === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        mapView === "satellite"
          ? "Tiles © Esri"
          : "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
  }, [mapView]);

  useEffect(() => {
    const map = mapInstance.current;
    const layerGroup = markers.current;

    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    fields.forEach((field) => {
      if (
        typeof field.lat !== "number" ||
        typeof field.lng !== "number" ||
        !Number.isFinite(field.lat) ||
        !Number.isFinite(field.lng)
      ) {
        return;
      }

      const isSelected = selectedField?.id === field.id;

      const marker = L.circleMarker([field.lat, field.lng], {
        radius: isSelected ? 10 : 7,
        color: isSelected ? "#ffffff" : "#166534",
        weight: 2,
        fillColor: isSelected ? "#16a34a" : "#86efac",
        fillOpacity: 0.9,
      });

      marker.bindTooltip(field.name);
      marker.on("click", () => onSelectField(field));
      marker.addTo(layerGroup);
    });

    if (selectedField) {
      map.setView([selectedField.lat, selectedField.lng], 15);
    } else if (fields.length > 0) {
      map.setView([fields[0].lat, fields[0].lng], 13);
    }
  }, [fields, selectedField, onSelectField]);

  return (
    <div
      ref={mapElement}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
    />
  );
}