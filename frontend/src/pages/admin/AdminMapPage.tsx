import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { Loader2, RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";
import * as api from "../../lib/api";
import type { HeatmapDistrict } from "../../lib/api";

const HARYANA_CENTER: [number, number] = [29.0588, 76.0856];

const DAYS_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function circleColor(ratio: number) {
  if (ratio > 0.7) return "#DC2626";
  if (ratio > 0.4) return "#EA580C";
  return "#16A34A";
}

function severityLabel(ratio: number) {
  if (ratio > 0.7) return { label: "High", cls: "badge-rejected" };
  if (ratio > 0.4) return { label: "Medium", cls: "badge-pending" };
  return { label: "Low", cls: "badge-resolved" };
}

export default function AdminMapPage() {
  const [districts, setDistricts] = useState<HeatmapDistrict[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getHeatmap({
        days,
        category: category || undefined,
      });
      setDistricts(res.districts);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [days, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxCount = Math.max(...districts.map((d) => d.count), 1);
  const mapCenter: [number, number] = districts[0]
    ? [districts[0].lat, districts[0].lng]
    : HARYANA_CENTER;

  const CATEGORIES = [
    "",
    "Power Outage",
    "Water Leakage",
    "Road Damage",
    "Garbage Collection",
    "Streetlight Fault",
    "Sewage Problem",
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      {/* Header + Controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 font-display">
          Complaint Map View
        </h1>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-200 bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c || "All Categories"}
              </option>
            ))}
          </select>

          {/* Days filter */}
          {DAYS_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${days === value ? "bg-[#1E3A5F] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={load}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 ml-1"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
        style={{ height: 460 }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={8}
            scrollWheelZoom
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
                const radius = 10 + ratio * 28;
                const color = circleColor(ratio);
                return (
                  <CircleMarker
                    key={String(d.districtId)}
                    center={[d.lat, d.lng]}
                    radius={radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.45,
                      weight: 2,
                    }}
                  >
                    <Tooltip>
                      <div className="text-xs font-semibold">
                        <p className="font-bold">{d.name}</p>
                        <p>Complaints: {d.count}</p>
                        <p>Top Issue: {d.topCategory}</p>
                        <p>Urgency Score: {d.urgencyScore}</p>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
          </MapContainer>
        )}
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-700 text-sm">
            State Summary — Last {days} days
            {category ? ` · ${category}` : ""}
            {districts.length > 0 && (
              <span className="ml-2 text-gray-400 font-normal">
                ({districts.length} states)
              </span>
            )}
          </h2>
        </div>
        {districts.length === 0 && !loading ? (
          <p className="text-center text-sm text-gray-400 py-10">
            No complaints match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase">
                  {[
                    "Rank",
                    "State",
                    "Complaints",
                    "Top Category",
                    "Urgency Score",
                    "Severity",
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...districts].map((d, i) => {
                  const ratio = d.count / maxCount;
                  const { label, cls } = severityLabel(ratio);
                  return (
                    <tr
                      key={String(d.districtId)}
                      className="border-t border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 font-bold text-gray-300">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1E3A5F]">
                        {d.count}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.topCategory}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.urgencyScore}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full font-semibold ${cls}`}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
