
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DollarSign,
  MapPin,
  Phone,
  Star,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wheat,
} from "lucide-react";

interface Merchant {
  id: string;
  name: string;
  company: string;
  location: string;
  distance: string;
  rating: number;
  phone: string;
  specialties: string[];
  crops: {
    name: string;
    price: number;
    unit: string;
    demand: "high" | "medium" | "low";
  }[];
  verified: boolean;
}

interface CropDemand {
  crop: string;
  avgPrice: number;
  merchants: number;
  trend: "up" | "down" | "stable";
  recommendation: string;
}

interface FarmerGroup {
  id: string;
  name: string;
  crop: string;
  merchant: string;
  capacity: number;
  description: string;
  status: "created" | "requested";
  createdAt: string;
}

const GROUPS_STORAGE_KEY = "farm-intellect-farmer-groups";

const mockMerchants: Merchant[] = [
  {
    id: "1",
    name: "Raj Agro Trading",
    company: "Raj Agro Pvt Ltd",
    location: "Pune, Maharashtra",
    distance: "12 km",
    rating: 4.5,
    phone: "+91 98765 43210",
    specialties: ["Wheat", "Rice", "Pulses"],
    crops: [
      { name: "Wheat", price: 2150, unit: "quintal", demand: "high" },
      { name: "Rice", price: 3200, unit: "quintal", demand: "medium" },
      { name: "Chickpea", price: 5800, unit: "quintal", demand: "high" },
    ],
    verified: true,
  },
  {
    id: "2",
    name: "Green Valley Foods",
    company: "Green Valley Processing",
    location: "Nashik, Maharashtra",
    distance: "25 km",
    rating: 4.2,
    phone: "+91 98765 43211",
    specialties: ["Vegetables", "Fruits", "Organic"],
    crops: [
      { name: "Tomato", price: 25, unit: "kg", demand: "high" },
      { name: "Onion", price: 18, unit: "kg", demand: "medium" },
      { name: "Potato", price: 15, unit: "kg", demand: "low" },
    ],
    verified: true,
  },
  {
    id: "3",
    name: "Maharashtra Cotton Corp",
    company: "Cotton Corporation of India",
    location: "Aurangabad, Maharashtra",
    distance: "45 km",
    rating: 4.8,
    phone: "+91 98765 43212",
    specialties: ["Cotton", "Sugarcane"],
    crops: [
      { name: "Cotton", price: 6200, unit: "quintal", demand: "high" },
      { name: "Sugarcane", price: 350, unit: "quintal", demand: "medium" },
    ],
    verified: true,
  },
];

const readSavedGroups = (): FarmerGroup[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as FarmerGroup[]) : [];
  } catch {
    return [];
  }
};

const Merchants = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("merchants");
  const [selectedMerchant, setSelectedMerchant] =
    useState<Merchant | null>(null);

  const user = {
    name: "John Farmer",
    role: "farmer",
  };

  const [marketDemands, setMarketDemands] = useState<CropDemand[]>([
    {
      crop: "Wheat",
      avgPrice: 2180,
      merchants: 8,
      trend: "up",
      recommendation:
        "High demand due to festival season. Best time to sell.",
    },
    {
      crop: "Rice",
      avgPrice: 3150,
      merchants: 6,
      trend: "stable",
      recommendation: "Stable prices. Good time for bulk sales.",
    },
    {
      crop: "Cotton",
      avgPrice: 6350,
      merchants: 4,
      trend: "up",
      recommendation:
        "Export demand increasing. Premium prices available.",
    },
    {
      crop: "Tomato",
      avgPrice: 28,
      merchants: 12,
      trend: "down",
      recommendation:
        "Oversupply in market. Consider processed sales.",
    },
  ]);

  const [groupDialog, setGroupDialog] =
    useState<"join" | "create" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupCrop, setGroupCrop] = useState("Cotton");
  const [groupCapacity, setGroupCapacity] = useState("6");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [farmerGroups, setFarmerGroups] =
    useState<FarmerGroup[]>(readSavedGroups);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "market-prices",
          {
            body: {
              state: "Punjab",
              district: "Ludhiana",
            },
          }
        );

        if (error) {
          console.error("Market price function error:", error);
          return;
        }

        if (data?.prices?.length > 0) {
          const formatted: CropDemand[] = data.prices
            .slice(0, 4)
            .map((p: any) => ({
              crop: p.crop,
              avgPrice: p.modalPrice,
              merchants: Math.floor(Math.random() * 10) + 2,
              trend: p.modalPrice > p.minPrice ? "up" : "down",
              recommendation: "Current market rate.",
            }));

          setMarketDemands(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch market prices:", err);
      }
    };

    fetchPrices();
  }, []);

  const demandColors = {
    high: "text-green-600 bg-green-50",
    medium: "text-orange-600 bg-orange-50",
    low: "text-red-600 bg-red-50",
  };

  const trendIcons = {
    up: "↗️",
    down: "↘️",
    stable: "➡️",
  };

  const filteredMerchants = mockMerchants.filter(
    (merchant) =>
      merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.specialties.some((specialty) =>
        specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleContact = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  };

  const handleViewPrices = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setActiveTab("prices");
  };

  const handleShowAllPrices = () => {
    setSelectedMerchant(null);
  };

  const saveGroup = (group: FarmerGroup) => {
    const updated = [group, ...farmerGroups];

    try {
      window.localStorage.setItem(
        GROUPS_STORAGE_KEY,
        JSON.stringify(updated)
      );

      setFarmerGroups(updated);
      setGroupDialog(null);
      setGroupMessage(
        group.status === "requested"
          ? "Your join request was saved on this device. Contact the merchant to coordinate participation."
          : "Your farmer group was saved on this device. Other farmers have not been notified."
      );
    } catch (error) {
      console.error("Unable to save farmer group:", error);
      setGroupMessage(
        "Could not save the group. Check your browser storage and try again."
      );
    }
  };

  const handleJoinGroup = () => {
    const alreadyRequested = farmerGroups.some(
      (group) =>
        group.status === "requested" &&
        group.merchant === "Green Valley Foods"
    );

    if (alreadyRequested) {
      setGroupDialog(null);
      setGroupMessage(
        "You already have a saved join request for Green Valley Foods."
      );
      return;
    }

    saveGroup({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: "Green Valley Foods Shared Shipment",
      crop: "Mixed produce",
      merchant: "Green Valley Foods",
      capacity: 4,
      description:
        "Shared shipment proposal with estimated transport savings of ₹200/quintal.",
      status: "requested",
      createdAt: new Date().toISOString(),
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setGroupMessage("Please enter a group name.");
      return;
    }

    const capacity = Number(groupCapacity);

    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 100) {
      setGroupMessage(
        "Enter a group capacity between 2 and 100 farmers."
      );
      return;
    }

    saveGroup({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: groupName.trim(),
      crop: groupCrop,
      merchant: "Maharashtra Cotton Corp",
      capacity,
      description: groupDescription.trim(),
      status: "created",
      createdAt: new Date().toISOString(),
    });

    setGroupName("");
    setGroupCrop("Cotton");
    setGroupCapacity("6");
    setGroupDescription("");
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
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Merchants & Market
            </h2>
            <p className="text-muted-foreground">
              Connect with merchants and find the best prices for your crops
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList>
              <TabsTrigger value="merchants">
                Nearby Merchants
              </TabsTrigger>
              <TabsTrigger value="prices">
                Market Prices
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                AI Recommendations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="merchants" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <Input
                    placeholder="Search merchants by name or crop specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMerchants.map((merchant) => (
                  <Card
                    key={merchant.id}
                    className="transition-shadow hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Store className="h-6 w-6 text-primary" />
                          </div>

                          <div>
                            <CardTitle className="text-lg">
                              {merchant.name}
                            </CardTitle>
                            <CardDescription>
                              {merchant.company}
                            </CardDescription>
                          </div>
                        </div>

                        {merchant.verified && (
                          <Badge className="bg-green-100 text-green-700">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {merchant.location} • {merchant.distance}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{merchant.rating} Rating</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{merchant.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">
                          Specialties:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {merchant.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">
                          Current Prices:
                        </h4>
                        <div className="space-y-1">
                          {merchant.crops.slice(0, 2).map((crop) => (
                            <div
                              key={crop.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{crop.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  ₹{crop.price}/{crop.unit}
                                </span>
                                <Badge
                                  className={`${demandColors[crop.demand]} text-xs`}
                                >
                                  {crop.demand}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => handleContact(merchant.phone)}
                        >
                          Contact
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPrices(merchant)}
                        >
                          View All Prices
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredMerchants.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No merchants found.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="prices" className="space-y-6">
              {selectedMerchant && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedMerchant.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All crop prices listed for this merchant
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleShowAllPrices}
                  >
                    All Market Prices
                  </Button>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {selectedMerchant
                  ? selectedMerchant.crops.map((crop) => (
                      <Card key={crop.name}>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Wheat className="h-6 w-6 text-primary" />
                              <div>
                                <CardTitle>{crop.name}</CardTitle>
                                <CardDescription>
                                  Demand: {crop.demand}
                                </CardDescription>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-bold text-primary">
                                ₹{crop.price}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                per {crop.unit}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <Badge className={demandColors[crop.demand]}>
                            {crop.demand} demand
                          </Badge>
                        </CardContent>
                      </Card>
                    ))
                  : marketDemands.map((demand) => (
                      <Card key={demand.crop}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wheat className="h-6 w-6 text-primary" />
                              <div>
                                <CardTitle>{demand.crop}</CardTitle>
                                <CardDescription>
                                  {demand.merchants} merchants interested
                                </CardDescription>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                ₹{demand.avgPrice}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <span>{trendIcons[demand.trend]}</span>
                                <span>{demand.trend}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {demand.recommendation}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    AI Market Recommendations
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-start gap-3">
                        <DollarSign className="mt-0.5 h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Best Selling Opportunity
                          </h4>
                          <p className="text-sm text-green-700">
                            Sell your wheat to{" "}
                            <strong>Raj Agro Trading</strong> within 5km.
                            They're offering ₹2,150/quintal (8% above market
                            rate) and need 50 quintals.
                          </p>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              handleContact(mockMerchants[0].phone)
                            }
                          >
                            Get Connected
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-blue-800">
                            Transport Savings
                          </h4>
                          <p className="text-sm text-blue-700">
                            Combine shipment with 3 nearby farmers to Green
                            Valley Foods. Save ₹200/quintal in transportation
                            costs.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setGroupMessage("");
                              setGroupDialog("join");
                            }}
                          >
                            Join Group
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="font-medium text-purple-800">
                            Bulk Opportunity
                          </h4>
                          <p className="text-sm text-purple-700">
                            Form a cooperative with 5 other cotton farmers.
                            Maharashtra Cotton Corp is offering a bulk purchase
                            bonus of ₹300/quintal.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setGroupMessage("");
                              setGroupDialog("create");
                            }}
                          >
                            Create Group
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {groupMessage && (
            <div
              role="status"
              className="rounded-lg border border-border bg-muted p-4 text-sm text-foreground"
            >
              <div className="flex items-start justify-between gap-3">
                <p>{groupMessage}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setGroupMessage("")}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>My Farmer Groups</CardTitle>
              <CardDescription>
                Group requests and groups saved on this device
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {farmerGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You haven't joined or created any groups yet.
                </p>
              ) : (
                farmerGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge variant="outline">
                        {group.status === "requested"
                          ? "Join request saved"
                          : "Created"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {group.crop} · {group.merchant} · Capacity:{" "}
                      {group.capacity} farmers
                    </p>

                    {group.description && (
                      <p className="mt-1 text-sm">{group.description}</p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">
                      Saved {new Date(group.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={groupDialog !== null}
        onOpenChange={(open) => {
          if (!open) setGroupDialog(null);
        }}
      >
        <DialogContent>
          {groupDialog === "join" ? (
            <>
              <DialogHeader>
                <DialogTitle>Join Shared Shipment</DialogTitle>
                <DialogDescription>
                  Green Valley Foods · Estimated transport savings: ₹200/quintal.
                  Save a request to participate in a shared shipment.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-3">
                <p className="text-sm">
                  <strong>Merchant:</strong> Green Valley Foods
                </p>
                <p className="text-sm">
                  <strong>Proposal:</strong> Combine shipments with three nearby
                  farmers.
                </p>
                <p className="text-sm text-muted-foreground">
                  This saves a request on this device only. It does not
                  automatically contact the merchant or other farmers.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setGroupDialog(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleJoinGroup}>
                  Confirm Join Request
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create Farmer Group</DialogTitle>
                <DialogDescription>
                  Organize farmers for a potential bulk sale to Maharashtra
                  Cotton Corp. The displayed ₹300/quintal bonus requires
                  merchant confirmation.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label htmlFor="farmer-group-name">Group name</Label>
                  <Input
                    id="farmer-group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Green Cotton Farmers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmer-group-crop">Crop</Label>
                  <select
                    id="farmer-group-crop"
                    value={groupCrop}
                    onChange={(e) => setGroupCrop(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                  >
                    <option value="Cotton">Cotton</option>
                    <option value="Sugarcane">Sugarcane</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Rice">Rice</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmer-group-capacity">
                    Total group capacity (2–100 farmers)
                  </Label>
                  <Input
                    id="farmer-group-capacity"
                    type="number"
                    min="2"
                    max="100"
                    value={groupCapacity}
                    onChange={(e) => setGroupCapacity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmer-group-description">
                    Additional details (optional)
                  </Label>
                  <Textarea
                    id="farmer-group-description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Location, expected quantity, preferred delivery date..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setGroupDialog(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>
                  Create Group
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Merchants;
