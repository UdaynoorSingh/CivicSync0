import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";
import * as api from "../../lib/api";
import type { HeatmapDistrict } from "../../lib/api";

// Haryana centre coords
const HARYANA_CENTER: [number, number] = [29.0588, 76.0856];

function circleColor(ratio: number) {
  if (ratio > 0.7) return "#DC2626";
  if (ratio > 0.4) return "#EA580C";
  return "#16A34A";
}

const DAYS_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function ComplaintMapPage() {
  const [districts, setDistricts] = useState<HeatmapDistrict[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getHeatmap({ days });
      setDistricts(res.districts);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxCount = Math.max(...districts.map((d) => d.count), 1);
  // Default centre on first district or Haryana
  const mapCenter: [number, number] = districts[0]
    ? [districts[0].lat, districts[0].lng]
    : HARYANA_CENTER;

  return (
    <div className="min-h-screen bg-[#EEF0FB] px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Complaint Map</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Refresh"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Time-range tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 mb-4 shadow-sm">
        {DAYS_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setDays(value)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${days === value ? "bg-[#1E3A5F] text-white shadow" : "text-gray-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3">
        {[
          ["Low", "#16A34A"],
          ["Medium", "#EA580C"],
          ["High", "#DC2626"],
        ].map(([label, color]) => (
          <div
            key={label}
            className="flex items-center gap-1.5 text-xs text-gray-600"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm mb-4"
        style={{ height: 360 }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center bg-white">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={7}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {districts
              .filter((d) => d.lat && d.lng)
              .map((d) => {
                const ratio = d.count / maxCount;
                const radius = 8 + ratio * 22;
                const color = circleColor(ratio);
                return (
                  <CircleMarker
                    key={String(d.districtId)}
                    center={[d.lat, d.lng]}
                    radius={radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.5,
                      weight: 1.5,
                    }}
                  >
                    <Tooltip>
                      <div className="text-xs font-semibold">
                        <p>{d.name}</p>
                        <p>Complaints: {d.count}</p>
                        <p>Top: {d.topCategory}</p>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
          </MapContainer>
        )}
      </div>

      {/* Ranked list */}
      {districts.length === 0 && !loading ? (
        <p className="text-center text-sm text-gray-400 py-6">
          No complaints in the selected period.
        </p>
      ) : (
        <div className="space-y-2">
          {[...districts].slice(0, 7).map((d, i) => (
            <div
              key={String(d.districtId)}
              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <span className="text-lg font-black text-gray-300 w-7">
                #{i + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{d.name}</p>
                <p className="text-xs text-gray-400">{d.topCategory}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1E3A5F] text-sm">{d.count}</p>
                <p className="text-[10px] text-gray-400">complaints</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
