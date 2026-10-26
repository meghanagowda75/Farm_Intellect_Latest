
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Coordinate {
  lat: number;
  lng: number;
}

interface MapField {
  id: number | string;
  name: string;
  coordinates?: Coordinate[];
}

interface LeafletFieldMapProps {
  fields: MapField[];
  selectedField: number | string | null;
  mapView: "satellite" | "terrain";
  onSelectField: (id: number | string) => void;
}

export function LeafletFieldMap({
  fields,
  selectedField,
  mapView,
  onSelectField,
}: LeafletFieldMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  const validFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          Array.isArray(field.coordinates) &&
          field.coordinates.length >= 3 &&
          field.coordinates.every(
            (point) =>
              Number.isFinite(point.lat) &&
              Number.isFinite(point.lng) &&
              point.lat >= -90 &&
              point.lat <= 90 &&
              point.lng >= -180 &&
              point.lng <= 180
          )
      ),
    [fields]
  );

  // Initialize the map once.
  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;

    const map = L.map(mapElement.current).setView(
      [20.5937, 78.9629],
      5
    );

    mapInstance.current = map;
    layerGroup.current = L.layerGroup().addTo(map);

    // Recalculate the map size after it has been mounted.
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapInstance.current = null;
      layerGroup.current = null;
    };
  }, []);

  // Change the map's tile layer.
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
      maxZoom: 19,
      attribution:
        mapView === "satellite"
          ? "Tiles © Esri"
          : "© OpenStreetMap contributors",
    }).addTo(map);
  }, [mapView]);

  // Redraw field boundaries and focus the selected field.
  useEffect(() => {
    const map = mapInstance.current;
    const group = layerGroup.current;

    if (!map || !group) return;

    group.clearLayers();

    validFields.forEach((field) => {
      const points = field.coordinates!;
      const isSelected = String(field.id) === String(selectedField);

      const polygon = L.polygon(
        points.map(
          (point) => [point.lat, point.lng] as L.LatLngTuple
        ),
        {
          color: isSelected ? "#ff3d00" : "#16a34a",
          weight: isSelected ? 5 : 2,
          fillColor: isSelected ? "#ff9800" : "#4ade80",
          fillOpacity: isSelected ? 0.55 : 0.2,
        }
      ).addTo(group);

      polygon.bindTooltip(field.name, {
        permanent: true,
        direction: "center",
        className: "field-map-label",
      });

      polygon.on("click", () => {
        onSelectField(field.id);
      });
    });

    const activeField = validFields.find(
      (field) => String(field.id) === String(selectedField)
    );

    if (activeField?.coordinates) {
      const bounds = L.latLngBounds(
        activeField.coordinates.map(
          (point) => [point.lat, point.lng] as L.LatLngTuple
        )
      );

      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 19,
        duration: 0.6,
      });
    } else if (validFields.length > 0) {
      const allPoints = validFields.flatMap((field) =>
        field.coordinates!.map(
          (point) => [point.lat, point.lng] as L.LatLngTuple
        )
      );

      map.fitBounds(L.latLngBounds(allPoints), {
        padding: [30, 30],
        maxZoom: 16,
      });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [validFields, selectedField, onSelectField]);

  return (
    <div
      ref={mapElement}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
      }}
    />
  );
}