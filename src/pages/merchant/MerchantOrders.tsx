import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Package,
  Truck,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Order = {
  id: string;
  crop_name: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  status: string;
  delivery_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
};

const STORAGE_KEY = "farm_intellect_demo_orders_v2";

const DEFAULT_MOCK_ORDERS: Order[] = [
  {
    id: "demo-1",
    crop_name: "Premium Basmati Rice",
    quantity_kg: 5000,
    price_per_kg: 75,
    total_amount: 375000,
    status: "in_transit",
    delivery_date: "2026-10-10",
    notes: "Premium quality basmati rice.",
    created_at: "2026-10-01T10:00:00",
  },
  {
    id: "demo-2",
    crop_name: "Organic Tomatoes",
    quantity_kg: 2000,
    price_per_kg: 40,
    total_amount: 80000,
    status: "in_transit",
    delivery_date: "2026-10-08",
    notes: "Fresh organic tomatoes.",
    created_at: "2026-10-02T11:30:00",
  },
  {
    id: "demo-3",
    crop_name: "Fresh Red Onions",
    quantity_kg: 3000,
    price_per_kg: 35,
    total_amount: 105000,
    status: "in_transit",
    delivery_date: "2026-10-12",
    notes: "Fresh red onions for delivery.",
    created_at: "2026-10-03T09:15:00",
  },
];

const getInitialOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Unable to read saved demo orders:", error);
  }

  return DEFAULT_MOCK_ORDERS;
};

const MerchantOrders = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>(getInitialOrders);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    crop_name: "",
    quantity_kg: "",
    price_per_kg: "",
    delivery_date: "",
    notes: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error("Unable to save demo orders:", error);
    }
  }, [orders]);

  const stats = {
    total: orders.length,
    pending: orders.filter(
      (order) => order.status.toLowerCase() === "pending"
    ).length,
    active: orders.filter((order) =>
      ["accepted", "in_transit"].includes(order.status.toLowerCase())
    ).length,
    delivered: orders.filter(
      (order) => order.status.toLowerCase() === "delivered"
    ).length,
  };

  const updateStatus = (id: string, status: string) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
              updated_at: new Date().toISOString(),
            }
          : order
      )
    );

    toast({
      title:
        status === "delivered"
          ? "Order marked as delivered!"
          : "Order status updated.",
    });
  };

  const resetForm = () => {
    setForm({
      crop_name: "",
      quantity_kg: "",
      price_per_kg: "",
      delivery_date: "",
      notes: "",
    });
    setDialogOpen(false);
  };

  const handleCreate = () => {
    if (
      !form.crop_name.trim() ||
      !form.quantity_kg ||
      !form.price_per_kg
    ) {
      toast({
        title: "Missing details",
        description: "Enter crop name, quantity, and price.",
        variant: "destructive",
      });
      return;
    }

    const quantity = Number(form.quantity_kg);
    const price = Number(form.price_per_kg);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity <= 0 ||
      price <= 0
    ) {
      toast({
        title: "Invalid details",
        description: "Quantity and price must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      crop_name: form.crop_name.trim(),
      quantity_kg: quantity,
      price_per_kg: price,
      total_amount: quantity * price,
      status: "in_transit",
      delivery_date: form.delivery_date || null,
      notes: form.notes.trim() || null,
      created_at: new Date().toISOString(),
    };

    setOrders((currentOrders) => [newOrder, ...currentOrders]);
    toast({ title: "Order created successfully!" });
    resetForm();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-blue-100 text-blue-800",
      in_transit: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return (
      styles[status.toLowerCase()] ||
      "bg-muted text-muted-foreground"
    );
  };

  const statCards = [
    {
      label: "Total Orders",
      value: stats.total,
      icon: Package,
      color: "text-blue-600",
      background: "bg-blue-100",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      background: "bg-amber-100",
    },
    {
      label: "Active",
      value: stats.active,
      icon: Truck,
      color: "text-indigo-600",
      background: "bg-indigo-100",
    },
    {
      label: "Delivered",
      value: stats.delivered,
      icon: CheckCircle,
      color: "text-green-600",
      background: "bg-green-100",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{
          name: user?.name || "Merchant",
          role: "merchant",
        }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="merchant"
      />

      <main className="md:ml-64 pt-16 p-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gradient-tricolor">
              📦 Orders & Purchases
            </h1>

            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Crop Name</Label>
                    <Input
                      value={form.crop_name}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          crop_name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Wheat"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantity (kg)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.quantity_kg}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            quantity_kg: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label>Price (₹/kg)</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.price_per_kg}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            price_per_kg: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Delivery Date</Label>
                    <Input
                      type="date"
                      value={form.delivery_date}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          delivery_date: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <Button
                    onClick={handleCreate}
                    className="w-full bg-primary text-primary-foreground"
                  >
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card
                  key={stat.label}
                  className="tricolor-card"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${stat.background}`}
                    >
                      <Icon
                        className={`h-5 w-5 ${stat.color}`}
                      />
                    </div>

                    <div>
                      <p className="text-2xl font-bold">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="tricolor-card">
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>

            <CardContent>
              {orders.length > 0 ? (
                <div className="divide-y divide-border">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {order.crop_name}
                          </span>

                          <Badge
                            className={statusBadge(order.status)}
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {order.quantity_kg.toLocaleString("en-IN")} kg × ₹
                          {order.price_per_kg}/kg ={" "}
                          <span className="font-medium text-foreground">
                            ₹
                            {order.total_amount.toLocaleString("en-IN")}
                          </span>
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {order.created_at
                            ? format(
                                new Date(order.created_at),
                                "MMM dd, yyyy"
                              )
                            : ""}
                        </p>
                      </div>

                      <div>
                        {order.status.toLowerCase() === "in_transit" && (
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground"
                            onClick={() =>
                              updateStatus(order.id, "delivered")
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>
                    No orders yet. Create your first purchase order!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MerchantOrders;