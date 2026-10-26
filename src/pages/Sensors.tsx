
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  Wifi,
  WifiOff,
  Battery,
  Thermometer,
  Droplets,
  Zap,
  AlertTriangle,
  Settings,
  Plus,
  MapPin,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

type SensorType = "soil_moisture" | "temperature" | "ph" | "npk";
type SensorStatus = "online" | "warning" | "offline";
type FilterStatus = "all" | SensorStatus;
type DialogType = "history" | "settings" | "add" | null;

type Sensor = {
  id: number;
  name: string;
  type: SensorType;
  location: string;
  status: SensorStatus;
  battery: number;
  lastReading: string;
  value: number;
  unit: string;
  optimal: {
    min: number;
    max: number;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
};

const STORAGE_KEY = "sensors";

const mockSensors: Sensor[] = [
  {
    id: 1,
    name: "Soil Moisture Sensor A1",
    type: "soil_moisture",
    location: "Field A - Section 1",
    status: "online",
    battery: 85,
    lastReading: new Date().toISOString(),
    value: 42,
    unit: "%",
    optimal: { min: 35, max: 65 },
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    id: 2,
    name: "Temperature Sensor A2",
    type: "temperature",
    location: "Field A - Section 2",
    status: "online",
    battery: 92,
    lastReading: new Date().toISOString(),
    value: 24.5,
    unit: "°C",
    optimal: { min: 18, max: 28 },
    coordinates: { lat: 40.713, lng: -74.0058 },
  },
  {
    id: 3,
    name: "pH Sensor B1",
    type: "ph",
    location: "Field B - Section 1",
    status: "warning",
    battery: 23,
    lastReading: new Date().toISOString(),
    value: 6.8,
    unit: "pH",
    optimal: { min: 6, max: 7.5 },
    coordinates: { lat: 40.7125, lng: -74.0065 },
  },
  {
    id: 4,
    name: "Soil Moisture Sensor B2",
    type: "soil_moisture",
    location: "Field B - Section 2",
    status: "offline",
    battery: 0,
    lastReading: new Date().toISOString(),
    value: 28,
    unit: "%",
    optimal: { min: 35, max: 65 },
    coordinates: { lat: 40.7122, lng: -74.007 },
  },
  {
    id: 5,
    name: "NPK Sensor C1",
    type: "npk",
    location: "Field C - Section 1",
    status: "online",
    battery: 67,
    lastReading: new Date().toISOString(),
    value: 185,
    unit: "ppm",
    optimal: { min: 150, max: 300 },
    coordinates: { lat: 40.7135, lng: -74.0055 },
  },
];

const sensorIcons = {
  soil_moisture: Droplets,
  temperature: Thermometer,
  ph: Activity,
  npk: Zap,
};

const sensorColors = {
  soil_moisture: "text-water",
  temperature: "text-harvest",
  ph: "text-primary",
  npk: "text-earth",
};

const sensorTypeOptions: {
  value: SensorType;
  label: string;
  unit: string;
  min: number;
  max: number;
}[] = [
  {
    value: "soil_moisture",
    label: "Soil Moisture",
    unit: "%",
    min: 35,
    max: 65,
  },
  {
    value: "temperature",
    label: "Temperature",
    unit: "°C",
    min: 18,
    max: 28,
  },
  {
    value: "ph",
    label: "pH",
    unit: "pH",
    min: 6,
    max: 7.5,
  },
  {
    value: "npk",
    label: "NPK",
    unit: "ppm",
    min: 150,
    max: 300,
  },
];

const initialValues: Record<SensorType, number> = {
  soil_moisture: 42,
  temperature: 24.5,
  ph: 6.8,
  npk: 185,
};

const loadSensors = (): Sensor[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (sensor) =>
            sensor &&
            typeof sensor.id === "number" &&
            typeof sensor.name === "string" &&
            ["soil_moisture", "temperature", "ph", "npk"].includes(
              sensor.type
            ) &&
            ["online", "warning", "offline"].includes(sensor.status) &&
            typeof sensor.value === "number" &&
            typeof sensor.battery === "number" &&
            sensor.optimal &&
            typeof sensor.optimal.min === "number" &&
            typeof sensor.optimal.max === "number"
        )
      ) {
        return parsed as Sensor[];
      }
    }
  } catch (error) {
    console.error("Could not load saved sensors:", error);
  }

  return mockSensors.map((sensor) => ({ ...sensor }));
};

const Sensors = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("all");

  const { user } = useCurrentUser();
  const { toast } = useToast();

  const [sensors, setSensors] = useState<Sensor[]>(loadSensors);

  const [selectedSensor, setSelectedSensor] =
    useState<Sensor | null>(null);
  const [activeDialog, setActiveDialog] =
    useState<DialogType>(null);

  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const [newSensorName, setNewSensorName] = useState("");
  const [newSensorType, setNewSensorType] =
    useState<SensorType>("soil_moisture");
  const [newSensorLocation, setNewSensorLocation] = useState("");

  // Save every sensor change to browser storage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sensors));
    } catch (error) {
      console.error("Could not save sensors:", error);
      toast({
        title: "Storage error",
        description: "Sensor changes could not be saved in this browser.",
        variant: "destructive",
      });
    }
  }, [sensors, toast]);

  // Simulate live readings every five seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors((previous) =>
        previous.map((sensor) => {
          if (sensor.status === "offline") {
            return sensor;
          }

          const change =
            (Math.random() - 0.5) *
            (sensor.type === "temperature"
              ? 0.4
              : sensor.type === "ph"
                ? 0.1
                : 4);

          return {
            ...sensor,
            value: Number((sensor.value + change).toFixed(1)),
            lastReading: new Date().toISOString(),
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Dashboard counts always use the current sensor list.
  const summary = useMemo(
    () => ({
      total: sensors.length,
      online: sensors.filter((sensor) => sensor.status === "online").length,
      warning: sensors.filter((sensor) => sensor.status === "warning").length,
      offline: sensors.filter((sensor) => sensor.status === "offline").length,
    }),
    [sensors]
  );

  const filteredSensors = useMemo(
    () =>
      filterStatus === "all"
        ? sensors
        : sensors.filter((sensor) => sensor.status === filterStatus),
    [sensors, filterStatus]
  );

  const getStatusBadge = (status: SensorStatus) => {
    switch (status) {
      case "online":
        return "default";
      case "warning":
        return "secondary";
      case "offline":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return "text-primary";
    if (battery > 20) return "text-harvest";
    return "text-destructive";
  };

  const isValueOptimal = (
    value: number,
    optimal: { min: number; max: number }
  ) => value >= optimal.min && value <= optimal.max;

  const getValueStatus = (
    value: number,
    optimal: { min: number; max: number }
  ) => {
    if (value < optimal.min) return "Low";
    if (value > optimal.max) return "High";
    return "Optimal";
  };

  const openHistory = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setActiveDialog("history");
  };

  const openSettings = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setMinValue(String(sensor.optimal.min));
    setMaxValue(String(sensor.optimal.max));
    setActiveDialog("settings");
  };

  const openAddSensor = () => {
    setNewSensorName("");
    setNewSensorType("soil_moisture");
    setNewSensorLocation("");
    setActiveDialog("add");
  };

  const addSensor = () => {
    const name = newSensorName.trim();
    const location = newSensorLocation.trim();

    if (!name || !location) {
      toast({
        title: "Missing information",
        description: "Enter the sensor name and location.",
        variant: "destructive",
      });
      return;
    }

    const selectedType = sensorTypeOptions.find(
      (option) => option.value === newSensorType
    );

    if (!selectedType) return;

    const newSensor: Sensor = {
      id: Date.now(),
      name,
      type: newSensorType,
      location,
      status: "online",
      battery: 100,
      lastReading: new Date().toISOString(),
      value: initialValues[newSensorType],
      unit: selectedType.unit,
      optimal: {
        min: selectedType.min,
        max: selectedType.max,
      },
      coordinates: {
        lat: 0,
        lng: 0,
      },
    };

    setSensors((previous) => [...previous, newSensor]);
    setFilterStatus("all");
    setActiveDialog(null);

    toast({
      title: "Sensor added",
      description: `${name} was added to the sensor network.`,
    });
  };

  const saveSettings = () => {
    if (!selectedSensor) return;

    const min = Number(minValue);
    const max = Number(maxValue);

    if (
      minValue.trim() === "" ||
      maxValue.trim() === "" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min >= max
    ) {
      toast({
        title: "Invalid range",
        description: "Enter valid values. Minimum must be less than maximum.",
        variant: "destructive",
      });
      return;
    }

    setSensors((previous) =>
      previous.map((sensor) =>
        sensor.id === selectedSensor.id
          ? { ...sensor, optimal: { min, max } }
          : sensor
      )
    );

    setSelectedSensor((previous) =>
      previous ? { ...previous, optimal: { min, max } } : previous
    );

    toast({
      title: "Settings updated",
      description: "The sensor's optimal range has been saved.",
    });

    setActiveDialog(null);
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
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Sensor Network
              </h2>
              <p className="text-muted-foreground">
                Monitor soil conditions and environmental parameters across
                your fields
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Demo mode: readings are simulated and update every 5 seconds.
              </p>
            </div>

            <Button onClick={openAddSensor}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sensor
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Sensors
                  </p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-primary">
                    {summary.online}
                  </p>
                </div>
                <Wifi className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold text-harvest">
                    {summary.warning}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-harvest" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-destructive">
                    {summary.offline}
                  </p>
                </div>
                <WifiOff className="h-8 w-8 text-destructive" />
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 border-b">
            {[
              { key: "all", label: "All Sensors" },
              { key: "online", label: "Online" },
              { key: "warning", label: "Warning" },
              { key: "offline", label: "Offline" },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={filterStatus === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterStatus(tab.key as FilterStatus)}
                className="mb-2"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSensors.map((sensor) => {
              const SensorIcon = sensorIcons[sensor.type];
              const isOptimal = isValueOptimal(
                sensor.value,
                sensor.optimal
              );
              const valueStatus = getValueStatus(
                sensor.value,
                sensor.optimal
              );

              return (
                <Card
                  key={sensor.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <SensorIcon
                          className={`h-5 w-5 shrink-0 ${sensorColors[sensor.type]}`}
                        />
                        <div className="min-w-0">
                          <CardTitle className="text-base">
                            {sensor.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {sensor.location}
                          </CardDescription>
                        </div>
                      </div>

                      <Badge variant={getStatusBadge(sensor.status) as any}>
                        {sensor.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Current Reading
                        </span>
                        <Badge
                          variant={isOptimal ? "default" : "destructive"}
                        >
                          {valueStatus}
                        </Badge>
                      </div>

                      <div className="text-2xl font-bold">
                        {sensor.value} {sensor.unit}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Optimal: {sensor.optimal.min} -{" "}
                        {sensor.optimal.max} {sensor.unit}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1">
                          <Battery className="h-4 w-4" />
                          Battery
                        </span>
                        <span
                          className={`font-medium ${getBatteryColor(sensor.battery)}`}
                        >
                          {sensor.battery}%
                        </span>
                      </div>
                      <Progress value={sensor.battery} className="h-2" />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last reading:{" "}
                      {new Date(sensor.lastReading).toLocaleString()}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openHistory(sensor)}
                      >
                        View History
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSettings(sensor)}
                        aria-label={`Settings for ${sensor.name}`}
                        title="Sensor settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredSensors.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No sensors found</h3>
              <p className="text-muted-foreground">
                {filterStatus === "all"
                  ? "No sensors are currently deployed"
                  : `No sensors with ${filterStatus} status`}
              </p>
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={activeDialog === "add"}
        onOpenChange={(open) => {
          if (!open) setActiveDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sensor</DialogTitle>
            <DialogDescription>
              Enter the sensor details to add it to the network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="sensor-name" className="text-sm font-medium">
                Sensor Name
              </label>
              <input
                id="sensor-name"
                type="text"
                value={newSensorName}
                onChange={(event) => setNewSensorName(event.target.value)}
                placeholder="Example: Soil Moisture Sensor D1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sensor-type" className="text-sm font-medium">
                Sensor Type
              </label>
              <select
                id="sensor-type"
                value={newSensorType}
                onChange={(event) =>
                  setNewSensorType(event.target.value as SensorType)
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {sensorTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sensor-location" className="text-sm font-medium">
                Location
              </label>
              <input
                id="sensor-location"
                type="text"
                value={newSensorLocation}
                onChange={(event) =>
                  setNewSensorLocation(event.target.value)
                }
                placeholder="Example: Field D - Section 1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveDialog(null)}
              >
                Cancel
              </Button>
              <Button onClick={addSensor}>Add Sensor</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Demo mode: sensors are saved in this browser only. They are not
              connected to a physical device or database.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "history"}
        onOpenChange={(open) => {
          if (!open) setActiveDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSensor?.name} - Reading History
            </DialogTitle>
            <DialogDescription>
              Latest reading information for this sensor.
            </DialogDescription>
          </DialogHeader>

          {selectedSensor && (
            <div className="space-y-3">
              <div className="rounded-md border p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Latest reading
                </p>
                <p className="text-2xl font-bold">
                  {sensors.find((s) => s.id === selectedSensor.id)?.value ??
                    selectedSensor.value}{" "}
                  {selectedSensor.unit}
                </p>
                <p className="text-sm text-muted-foreground">
                  Recorded:{" "}
                  {new Date(
                    sensors.find((s) => s.id === selectedSensor.id)
                      ?.lastReading ?? selectedSensor.lastReading
                  ).toLocaleString()}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Historical readings are not stored yet. This view currently
                shows only the latest available reading.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeDialog === "settings"}
        onOpenChange={(open) => {
          if (!open) setActiveDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSensor?.name} - Settings
            </DialogTitle>
            <DialogDescription>
              Set the optimal range used to evaluate this sensor's reading.
            </DialogDescription>
          </DialogHeader>

          {selectedSensor && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="minimum-value"
                  className="text-sm font-medium"
                >
                  Minimum optimal value ({selectedSensor.unit})
                </label>
                <input
                  id="minimum-value"
                  type="number"
                  step="any"
                  value={minValue}
                  onChange={(event) => setMinValue(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="maximum-value"
                  className="text-sm font-medium"
                >
                  Maximum optimal value ({selectedSensor.unit})
                </label>
                <input
                  id="maximum-value"
                  type="number"
                  step="any"
                  value={maxValue}
                  onChange={(event) => setMaxValue(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveDialog(null)}
                >
                  Cancel
                </Button>
                <Button onClick={saveSettings}>Save Settings</Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Changes are saved in this browser, not in the backend database.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sensors;