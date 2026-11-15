import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Radio, Zap, ShieldAlert, Crosshair, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface WarRoomAlert {
  time: string;
  type: string;
  loc: string;
  msg: string;
  severity: "critical" | "high" | "medium" | "low";
}

const generateWeatherAlerts = (data: any, location: string): WarRoomAlert[] => {
  const current = data.current;
  const forecast = data.forecast?.list || [];
  const condition = String(current.weather?.[0]?.main || "").toLowerCase();
  const temp = Number(current.main.temp);
  const wind = Number(current.wind.speed) * 3.6;
  const humidity = Number(current.main.humidity);
  const alerts: WarRoomAlert[] = [];

  const addAlert = (
    type: string,
    msg: string,
    severity: WarRoomAlert["severity"]
  ) => {
    alerts.push({
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      type,
      loc: location,
      msg,
      severity,
    });
  };

  if (condition.includes("thunder")) {
    addAlert("WEATHER", "Thunderstorm conditions reported. Avoid open fields and postpone outdoor farm work.", "high");
  }

  if (temp >= 40) {
    addAlert("WEATHER", `Current temperature is ${Math.round(temp)}°C. Protect crops from heat stress and check soil moisture.`, "high");
  } else if (temp >= 35) {
    addAlert("WEATHER", `Current temperature is ${Math.round(temp)}°C. Monitor crops and irrigate when needed.`, "medium");
  }

  if (wind >= 40) {
    addAlert("WEATHER", `Wind speed is ${Math.round(wind)} km/h. Avoid pesticide spraying and support tall crops.`, "high");
  } else if (wind >= 25) {
    addAlert("WEATHER", `Wind speed is ${Math.round(wind)} km/h. Use caution when spraying.`, "medium");
  }

  if (humidity >= 90) {
    addAlert("WEATHER", `Humidity is ${humidity}%. Monitor crops for possible fungal disease conditions.`, "medium");
  }

  if (condition.includes("rain") || condition.includes("drizzle")) {
    addAlert("WEATHER", "Rain is currently reported. Check field drainage and adjust irrigation plans.", "medium");
  }

  const daily = new Map<string, { rain: number; maxTemp: number; winds: number[] }>();

  for (const item of forecast) {
    const date = String(item.dt_txt || "").split(" ")[0];
    if (!date) continue;

    if (!daily.has(date)) {
      daily.set(date, { rain: 0, maxTemp: -Infinity, winds: [] });
    }

    const day = daily.get(date)!;
    day.rain += Number(item.rain?.["3h"] || 0);
    day.maxTemp = Math.max(day.maxTemp, Number(item.main.temp));
    day.winds.push(Number(item.wind.speed) * 3.6);
  }

  const nextDays = Array.from(daily.entries()).slice(0, 3);

  for (const [date, day] of nextDays) {
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" });

    if (day.rain >= 30) {
      addAlert("WEATHER", `${day.rain.toFixed(0)} mm of rain forecast for ${dayName}. Check drainage and postpone field operations if needed.`, "high");
    } else if (day.rain >= 10) {
      addAlert("WEATHER", `${day.rain.toFixed(0)} mm of rain forecast for ${dayName}. Adjust irrigation plans.`, "medium");
    }

    if (day.maxTemp >= 42) {
      addAlert("WEATHER", `Temperature may reach ${Math.round(day.maxTemp)}°C on ${dayName}. Take precautions against crop heat stress.`, "high");
    }

    const averageWind = day.winds.length
      ? day.winds.reduce((sum, value) => sum + value, 0) / day.winds.length
      : 0;

    if (averageWind >= 40) {
      addAlert("WEATHER", `Strong winds of ${Math.round(averageWind)} km/h forecast for ${dayName}. Avoid spraying.`, "medium");
    }
  }

  return alerts.length
    ? alerts.slice(0, 5)
    : [{
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
        type: "WEATHER",
        loc: location,
        msg: "No major weather risks detected in the available current conditions and forecast.",
        severity: "low",
      }];
};

const WarRoom = () => {
  const { user } = useCurrentUser();
  const location = user?.location?.trim() || "Chandigarh";
  const [alerts, setAlerts] = useState<WarRoomAlert[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let active = true;

    const checkBackend = async () => {
      try {
        const result = await apiFetch<any>("/health");
        if (active) {
          setBackendStatus(result?.status === "OK" ? "online" : "offline");
        }
      } catch {
        if (active) setBackendStatus("offline");
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchWeatherAlerts = async () => {
      setWeatherLoading(true);
      setWeatherError("");

      try {
        const data = await apiFetch<any>(
          `/api/weather?city=${encodeURIComponent(location)}`
        );

        if (!data?.current?.main || !data?.current?.weather?.[0] || !data?.forecast?.list) {
          throw new Error("Weather data is unavailable for this location.");
        }

        if (active) {
          setAlerts(generateWeatherAlerts(data, location));
        }
      } catch (error) {
        if (active) {
          setWeatherError(
            error instanceof Error ? error.message : "Unable to load weather alerts."
          );
          setAlerts([]);
        }
      } finally {
        if (active) setWeatherLoading(false);
      }
    };

    fetchWeatherAlerts();
    const interval = setInterval(fetchWeatherAlerts, 10 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-mono selection:bg-red-950">
      {/* Header */}
      <header className="h-16 border-b border-red-900/30 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-6">
          <Link to="/admin/intelligence-center" className="text-zinc-500 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-widest text-red-500 uppercase">Strategic Ops / War Room</h1>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-zinc-500">
          <span className={`flex items-center gap-2 ${backendStatus === "online" ? "text-emerald-500" : backendStatus === "offline" ? "text-red-500" : "text-amber-500"}`}>
            <Radio className="w-4 h-4" />
            {backendStatus === "online" ? "BACKEND ONLINE" : backendStatus === "offline" ? "BACKEND OFFLINE" : "CHECKING BACKEND"}
          </span>
          <span>LOCATION: {location}</span>
          <span className="font-bold text-white bg-zinc-900 px-3 py-1 rounded border border-zinc-700">LIVE STATUS</span>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="h-[calc(100vh-4rem)] p-4 grid grid-cols-12 grid-rows-6 gap-4">
        
        {/* Left Panel: Alerts & Feeds */}
        <div className="col-span-3 row-span-6 flex flex-col gap-4">
          <div className="flex-1 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-50" />
            <h2 className="text-xs text-red-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Live Threat Intel
            </h2>
            <div className="flex-1 overflow-y-auto relative">
              {weatherLoading ? (
                <p className="text-xs text-zinc-400">Fetching weather intelligence for {location}...</p>
              ) : weatherError ? (
                <div className="text-xs text-red-300 space-y-2">
                  <p>Weather intelligence unavailable.</p>
                  <p className="text-zinc-500">{weatherError}</p>
                </div>
              ) : (
                <AnimatePresence>
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.time + alert.msg}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className={`mb-3 p-3 rounded bg-black border-l-2 text-xs ${
                        alert.severity === "critical" ? "border-red-500 text-red-100" :
                        alert.severity === "high" ? "border-amber-500 text-amber-100" :
                        alert.severity === "medium" ? "border-yellow-500 text-yellow-100" :
                        "border-blue-500 text-blue-100"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] opacity-70 mb-1">
                        <span>{alert.time} // {alert.type}</span>
                        <span>{alert.loc}</span>
                      </div>
                      <p>{alert.msg}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          <div className="h-1/3 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-4 relative overflow-hidden">
             <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> System Telemetry
            </h2>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between gap-2">
                <span>Backend API</span>
                <span className={backendStatus === "online" ? "text-emerald-500" : backendStatus === "offline" ? "text-red-500" : "text-amber-500"}>
                  {backendStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Weather Service</span>
                <span className={weatherLoading ? "text-amber-500" : weatherError ? "text-red-500" : "text-emerald-500"}>
                  {weatherLoading ? "CHECKING" : weatherError ? "UNAVAILABLE" : "CONNECTED"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Market Data</span>
                <span className="text-zinc-500">NOT VERIFIED</span>
              </div>
              <p className="text-[10px] text-zinc-600">
                Only verified service statuses are displayed. Processing and satellite telemetry are not currently available.
              </p>
            </div>
          </div>
        </div>

        {/* Center Panel: Map / Main Visualization */}
        <div className="col-span-6 row-span-6 bg-[#0a0a0a] border border-zinc-900 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/e4/India_satellite_image.png')] bg-cover bg-center opacity-30 mix-blend-screen transition-opacity duration-1000 group-hover:opacity-50" />
          
          {/* Scanning line animation */}
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.8)]"
            animate={{ y: ["0%", "800%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          {/* Map Overlays */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-20 pointer-events-none">
            {Array.from({length: 64}).map((_, i) => (
              <div key={i} className="border-[0.5px] border-zinc-800" />
            ))}
          </div>

          <div className="absolute top-4 left-4">
             <div className="bg-black/60 backdrop-blur border border-zinc-800 p-3 rounded-lg flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Focus Area</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2"><Crosshair className="w-3 h-3 text-red-500" /> {location.toUpperCase()}</div>
                </div>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Status</div>
                  <div className={`text-sm font-bold ${weatherLoading ? "text-amber-500" : weatherError ? "text-red-500" : "text-emerald-500"}`}>
                    {weatherLoading ? "CHECKING" : weatherError ? "UNAVAILABLE" : "WEATHER LIVE"}
                  </div>
                </div>
             </div>
          </div>

        </div>

        {/* Right Panel: Stats & Details */}
        <div className="col-span-3 row-span-6 flex flex-col gap-4">
          <div className="h-2/5 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-4">
            <h2 className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> District Risk Scores
            </h2>
            <div className="flex-1 flex flex-col justify-center text-center gap-2">
              <p className="text-sm text-zinc-400">District risk scores unavailable</p>
              <p className="text-[10px] text-zinc-600">
                A verified district-level risk dataset is not currently connected.
              </p>
            </div>
          </div>

          <div className="flex-1 bg-[#0a0a0a] border border-zinc-900 rounded-xl p-4 flex flex-col">
             <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-4">
              Scheme Utilization
            </h2>
            <div className="flex-1 flex flex-col justify-center text-center gap-2 border-y border-zinc-900">
              <p className="text-sm text-zinc-400">Scheme utilization data unavailable</p>
              <p className="text-[10px] text-zinc-600">
                Verified scheme enrollment and utilization records are not connected.
              </p>
            </div>
            <p className="mt-4 text-[10px] text-zinc-600 text-center">
              Scheme statistics will appear when a reliable data source is available.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WarRoom;
