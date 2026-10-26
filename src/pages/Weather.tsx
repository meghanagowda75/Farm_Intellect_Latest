
import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch } from "@/lib/api";
import {
  CloudSun, MapPin, TrendingUp, Droplets, Wind, Sun, Cloud,
  CloudRain, CloudSnow, CloudLightning, Thermometer, RefreshCw,
  Loader2,
} from "lucide-react";

interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  visibility: number;
  pressure: number;
  condition: string;
  description: string;
  icon: string;
  location: string;
}

interface ForecastDay {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  description: string;
  rain: number;
  wind: number;
  humidity: number;
}

interface WeatherAlert {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface WeatherResponse {
  current: any;
  forecast: any;
}

const REFRESH_INTERVAL = 10 * 60 * 1000;

const getConditionIcon = (condition: string, size = "h-8 w-8") => {
  switch (condition.toLowerCase()) {
    case "clear":
      return <Sun className={`${size} text-yellow-500`} />;
    case "rain":
    case "drizzle":
      return <CloudRain className={`${size} text-blue-500`} />;
    case "snow":
      return <CloudSnow className={`${size} text-cyan-400`} />;
    case "thunderstorm":
      return <CloudLightning className={`${size} text-purple-500`} />;
    case "clouds":
      return <Cloud className={`${size} text-gray-500`} />;
    default:
      return <CloudSun className={`${size} text-orange-400`} />;
  }
};

const getFarmCondition = (
  temp: number,
  humidity: number,
  wind: number,
  condition: string
) => {
  const cond = condition.toLowerCase();

  if (cond.includes("thunder") || wind > 40) {
    return {
      label: "poor",
      color: "text-destructive",
      bg: "bg-destructive/10",
    };
  }

  if (cond.includes("rain") || cond.includes("snow") || humidity > 90) {
    return {
      label: "moderate",
      color: "text-harvest",
      bg: "bg-harvest/10",
    };
  }

  if (temp > 10 && temp < 40 && humidity > 30 && humidity < 80) {
    return {
      label: "optimal",
      color: "text-primary",
      bg: "bg-primary/10",
    };
  }

  return {
    label: "good",
    color: "text-primary",
    bg: "bg-primary/10",
  };
};

const getMostCommon = (values: string[]): string => {
  if (!values.length) return "";

  const counts: Record<string, number> = {};

  values.forEach((value) => {
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// Generate alerts using the selected city's current weather and forecast.
const generateWeatherAlerts = (
  current: CurrentWeather,
  forecast: ForecastDay[]
): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const condition = current.condition.toLowerCase();

  if (condition.includes("thunder")) {
    alerts.push({
      title: "Thunderstorm Alert",
      description:
        "Thunderstorm conditions are reported. Avoid open fields and postpone outdoor farm work.",
      severity: "high",
    });
  }

  if (current.temp >= 40) {
    alerts.push({
      title: "High Temperature Alert",
      description: `Current temperature is ${current.temp}°C. Protect crops from heat stress and check soil moisture.`,
      severity: "high",
    });
  } else if (current.temp >= 35) {
    alerts.push({
      title: "Hot Weather Advisory",
      description: `Current temperature is ${current.temp}°C. Monitor crops and provide irrigation when needed.`,
      severity: "medium",
    });
  }

  if (current.wind >= 40) {
    alerts.push({
      title: "Strong Wind Alert",
      description: `Wind speed is ${current.wind} km/h. Avoid pesticide spraying and check support for tall crops.`,
      severity: "high",
    });
  } else if (current.wind >= 25) {
    alerts.push({
      title: "Wind Advisory",
      description: `Wind speed is ${current.wind} km/h. Use caution when spraying pesticides or fertilizers.`,
      severity: "medium",
    });
  }

  if (current.humidity >= 90) {
    alerts.push({
      title: "Very High Humidity",
      description: `Humidity is ${current.humidity}%. Monitor crops for possible fungal disease conditions.`,
      severity: "medium",
    });
  }

  if (
    condition.includes("rain") ||
    condition.includes("drizzle")
  ) {
    alerts.push({
      title: "Rainy Weather",
      description:
        "Rain is currently reported. Check field drainage and adjust irrigation plans.",
      severity: "medium",
    });
  }

  // Check the next three forecast days for additional risks.
  for (const day of forecast.slice(0, 3)) {
    if (day.rain >= 30) {
      alerts.push({
        title: `Heavy Rain Expected (${day.dayName})`,
        description: `${day.rain} mm of forecast rainfall. Check drainage and consider postponing field operations.`,
        severity: "high",
      });
    } else if (day.rain >= 10) {
      alerts.push({
        title: `Rain Expected (${day.dayName})`,
        description: `${day.rain} mm of forecast rainfall. Adjust irrigation according to expected rain.`,
        severity: "medium",
      });
    }

    if (day.tempMax >= 42) {
      alerts.push({
        title: `Extreme Heat Expected (${day.dayName})`,
        description: `Temperature may reach ${day.tempMax}°C. Take precautions to reduce crop heat stress.`,
        severity: "high",
      });
    }

    if (day.wind >= 40) {
      alerts.push({
        title: `Strong Winds Expected (${day.dayName})`,
        description: `Forecast wind speed is ${day.wind} km/h. Avoid spraying during strong winds.`,
        severity: "medium",
      });
    }
  }

  // Remove duplicate alert types and limit the number shown.
  const uniqueAlerts = alerts.filter(
    (alert, index, all) =>
      all.findIndex((item) => item.title === alert.title) === index
  );

  if (uniqueAlerts.length === 0) {
    return [{
      title: "No Major Weather Alerts",
      description:
        "No major weather risks were detected from the available current conditions and forecast. Continue monitoring local weather.",
      severity: "low",
    }];
  }

  return uniqueAlerts.slice(0, 5);
};

const Weather = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const { t } = useLanguage();

  const [location, setLocation] = useState(user?.location || "Chandigarh");
  const [cityInput, setCityInput] = useState(user?.location || "Chandigarh");
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const requestId = useRef(0);
  const manuallySelected = useRef(false);

  const fetchWeatherData = useCallback(async (city: string) => {
    const selectedCity = city.trim();
    if (!selectedCity) return;

    const thisRequest = ++requestId.current;
    setLoading(true);
    setErrorMessage("");

    try {
      console.log("WEATHER: requesting city:", selectedCity);

      const data = await apiFetch<WeatherResponse>(
        `/api/weather?city=${encodeURIComponent(selectedCity)}`
      );

      if (thisRequest !== requestId.current) return;

      console.log("WEATHER: received city:", data?.current?.name);

      if (
        !data?.current?.main ||
        !data?.current?.weather?.[0] ||
        !data?.forecast?.list
      ) {
        throw new Error(
          "Weather data is unavailable for this city. Check the city name and try again."
        );
      }

      const cur = data.current;
      const fore = data.forecast;

      const current: CurrentWeather = {
        temp: Math.round(cur.main.temp),
        feelsLike: Math.round(cur.main.feels_like),
        humidity: cur.main.humidity,
        wind: Math.round(cur.wind.speed * 3.6),
        visibility: cur.visibility
          ? Number((cur.visibility / 1000).toFixed(1))
          : 10,
        pressure: cur.main.pressure,
        condition: cur.weather[0].main,
        description: cur.weather[0].description,
        icon: cur.weather[0].icon,
        location: `${cur.name}, ${cur.sys.country}`,
      };

      const dailyMap = new Map<string, {
        temps: number[];
        conditions: string[];
        descriptions: string[];
        rain: number;
        winds: number[];
        humidities: number[];
      }>();

      for (const item of fore.list) {
        const date = item.dt_txt.split(" ")[0];

        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            temps: [],
            conditions: [],
            descriptions: [],
            rain: 0,
            winds: [],
            humidities: [],
          });
        }

        const day = dailyMap.get(date)!;
        day.temps.push(item.main.temp);
        day.conditions.push(item.weather[0].main);
        day.descriptions.push(item.weather[0].description);
        day.rain += item.rain?.["3h"] || 0;
        day.winds.push(item.wind.speed * 3.6);
        day.humidities.push(item.main.humidity);
      }

      const forecastDays: ForecastDay[] = [];
      let index = 0;

      for (const [date, day] of dailyMap) {
        const dateObj = new Date(`${date}T12:00:00`);

        forecastDays.push({
          date,
          dayName:
            index === 0
              ? t("calendar.today")
              : dateObj.toLocaleDateString("en-IN", {
                  weekday: "short",
                }),
          tempMax: Math.round(Math.max(...day.temps)),
          tempMin: Math.round(Math.min(...day.temps)),
          condition: getMostCommon(day.conditions),
          description: getMostCommon(day.descriptions),
          rain: Math.round(day.rain),
          wind: Math.round(
            day.winds.reduce((a, b) => a + b, 0) / day.winds.length
          ),
          humidity: Math.round(
            day.humidities.reduce((a, b) => a + b, 0) /
              day.humidities.length
          ),
        });

        index++;
      }

      setCurrentWeather(current);
      setForecast(forecastDays);
      setAlerts(generateWeatherAlerts(current, forecastDays));
    } catch (error) {
      if (thisRequest !== requestId.current) return;

      console.error("Weather fetch failed:", error);
      setCurrentWeather(null);
      setForecast([]);
      setAlerts([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to fetch weather data. Please try again."
      );
    } finally {
      if (thisRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (user?.location && !manuallySelected.current) {
      setLocation(user.location);
      setCityInput(user.location);
    }
  }, [user?.location]);

  useEffect(() => {
    if (!location) return;

    fetchWeatherData(location);

    const interval = window.setInterval(() => {
      fetchWeatherData(location);
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
      requestId.current++;
    };
  }, [location, fetchWeatherData]);

  const handleLocationChange = (value: string) => {
    const city = value.trim();
    if (!city) return;

    console.log("SEARCH BUTTON: entered city:", city);

    manuallySelected.current = true;
    setCityInput(city);
    setErrorMessage("");
    setCurrentWeather(null);
    setForecast([]);
    setAlerts([]);
    setLocation(city);
    setShowLocationPicker(false);

    // A search for the same city still refreshes the data.
    if (city.toLowerCase() === location.trim().toLowerCase()) {
      fetchWeatherData(city);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const farmCondition = currentWeather
    ? getFarmCondition(
        currentWeather.temp,
        currentWeather.humidity,
        currentWeather.wind,
        currentWeather.condition
      )
    : {
        label: "loading",
        color: "text-muted-foreground",
        bg: "bg-muted",
      };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        notificationCount={3}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />

      <main className="md:ml-64 p-6">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {t("weather.title")}
              </h2>
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {currentWeather?.location || location} • {t("weather.subtitle")}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCityInput(location);
                  setShowLocationPicker(!showLocationPicker);
                }}
                className="hover:bg-primary/10"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t("weather.change_location")}
              </Button>

              <Button
                variant="outline"
                onClick={() => fetchWeatherData(location)}
                disabled={loading}
                className="hover:bg-primary/10"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                {t("weather.refresh")}
              </Button>
            </div>
          </div>

          {showLocationPicker && (
            <Card className="animate-slide-up">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("weather.search_city")}:
                </p>

                <form
                  className="flex max-w-md gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleLocationChange(cityInput);
                  }}
                >
                  <Input
                    value={cityInput}
                    onChange={(event) => setCityInput(event.target.value)}
                    placeholder="Enter city name"
                  />

                  <Button type="submit" disabled={!cityInput.trim() || loading}>
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading weather for {location}...
              </span>
            </div>
          )}

          {errorMessage && !loading && (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-destructive">{errorMessage}</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => fetchWeatherData(location)}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {currentWeather && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="tricolor-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getConditionIcon(currentWeather.condition, "h-5 w-5")}
                        {t("weather.conditions")}
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <div className="text-3xl font-bold text-primary">
                            {currentWeather.temp}°C
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {currentWeather.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t("weather.feels_like")} {currentWeather.feelsLike}°C
                          </div>
                        </div>

                        <div className={`text-center p-4 ${farmCondition.bg} rounded-lg`}>
                          <div className={`text-2xl font-bold ${farmCondition.color}`}>
                            {t(`weather.${farmCondition.label}`)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("weather.farm_conditions")}
                          </div>
                        </div>

                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <Droplets className="h-5 w-5 text-primary mx-auto mb-1" />
                          <div className="text-2xl font-bold text-primary">
                            {currentWeather.humidity}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("weather.humidity")}
                          </div>
                        </div>

                        <div className="text-center p-4 bg-accent/10 rounded-lg">
                          <Wind className="h-5 w-5 text-accent mx-auto mb-1" />
                          <div className="text-2xl font-bold text-accent">
                            {currentWeather.wind} km/h
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("weather.wind")}
                          </div>
                        </div>
                      </div>

                      <h4 className="font-semibold mb-3">
                        {t("weather.forecast_5day")}
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {forecast.slice(0, 5).map((day) => (
                          <div
                            key={day.date}
                            className="text-center p-3 bg-muted rounded-lg"
                          >
                            <div className="text-sm font-medium">{day.dayName}</div>
                            <div className="my-2 flex justify-center">
                              {getConditionIcon(day.condition)}
                            </div>
                            <div className="text-sm font-bold">{day.tempMax}°</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {day.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card className="tricolor-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Thermometer className="h-5 w-5 text-accent" />
                        {t("weather.alerts")}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {alerts.map((alert, index) => (
                        <div
                          key={`${alert.title}-${index}`}
                          className="space-y-2 p-3 rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <Badge
                              variant={getSeverityColor(alert.severity) as "destructive" | "secondary" | "outline"}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {alert.description}
                          </p>
                        </div>
                      ))}

                      {alerts.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t("weather.no_alerts")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="tricolor-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t("weather.detailed_forecast")}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {forecast.map((day, index) => (
                      <div
                        key={day.date}
                        className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border ${
                          index === 0
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <div className="font-medium">{day.dayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                                "en-IN",
                                { month: "short", day: "numeric" }
                              )}
                            </div>
                          </div>

                          {getConditionIcon(day.condition)}

                          <div className="text-center min-w-[100px]">
                            <div className="font-medium">
                              {day.tempMax}° / {day.tempMin}°
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {day.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Droplets className="h-4 w-4 text-primary" />
                            <span>{day.rain}mm</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wind className="h-4 w-4 text-muted-foreground" />
                            <span>{day.wind} km/h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{day.humidity}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Weather;