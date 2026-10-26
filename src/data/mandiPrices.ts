// Mandi (Agricultural Market) Price Dataset
// Historical snapshot: December 2024
// Sources referenced by the project: AGMARKNET, eNAM, APMC market data.
// Historical values below are not live quotations.

import { createDatasetMetadata } from "./datasetMetadata";
import { supabase } from "@/integrations/supabase/client";

export type MandiCategory =
  | "cereal"
  | "pulse"
  | "oilseed"
  | "vegetable"
  | "fruit"
  | "spice"
  | "fiber"
  | "other";

export interface MarketEntry {
  market: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  date: string;
  arrivals: number;
}

export interface MandiPrice {
  id: string;
  commodity: string;
  hindiName: string;
  variety: string;
  category: MandiCategory;
  unit: string;
  mspPrice: number | null;
  marketPrices: MarketEntry[];
}

export interface PriceTrend {
  commodity: string;
  monthlyAvg: { month: string; avgPrice: number }[];
  yearlyAvg: { year: string; avgPrice: number }[];
  seasonalPattern: string;
  volatility: "low" | "medium" | "high" | "extreme";
}

export interface LiveMarketPrice {
  crop: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  date?: string;
  source?: string;
}

export const mandiPricesMetadata = createDatasetMetadata({
  version: "1.0.0",
  lastUpdated: "2024-12-01T00:00:00Z",
  source: "AGMARKNET, eNAM, APMC market data",
  notes:
    "Historical snapshot of representative mandi prices for 2024. Values must not be treated as current market quotations.",
});

const entry = (
  market: string,
  district: string,
  state: string,
  minPrice: number,
  maxPrice: number,
  modalPrice: number,
  arrivals: number
): MarketEntry => ({
  market,
  district,
  state,
  minPrice,
  maxPrice,
  modalPrice,
  date: "2024-12",
  arrivals,
});

export const mandiPrices: MandiPrice[] = [
  {
    id: "wheat_mp",
    commodity: "Wheat",
    hindiName: "गेहूं",
    variety: "Lokwan / Sharbati / PBW 343",
    category: "cereal",
    unit: "₹/quintal",
    mspPrice: 2275,
    marketPrices: [
      entry("Azadpur", "New Delhi", "Delhi", 2250, 2800, 2450, 850),
      entry("Khanna", "Ludhiana", "Punjab", 2275, 2650, 2400, 2500),
      entry("Narela", "New Delhi", "Delhi", 2200, 2700, 2380, 680),
      entry("Hapur", "Hapur", "Uttar Pradesh", 2180, 2550, 2350, 1200),
      entry("Indore", "Indore", "Madhya Pradesh", 2250, 2900, 2550, 3200),
      entry("Karnal", "Karnal", "Haryana", 2275, 2600, 2380, 1800),
      entry("Jaipur", "Jaipur", "Rajasthan", 2200, 2750, 2420, 950),
      entry("Dewas", "Dewas", "Madhya Pradesh", 2280, 2850, 2520, 1500),
    ],
  },
  {
    id: "rice_mp",
    commodity: "Rice (Paddy)",
    hindiName: "धान",
    variety: "Common / Grade-A / Basmati",
    category: "cereal",
    unit: "₹/quintal",
    mspPrice: 2300,
    marketPrices: [
      entry("Karnal", "Karnal", "Haryana", 2100, 3800, 2500, 4500),
      entry("Khanna", "Ludhiana", "Punjab", 2300, 3200, 2600, 5200),
      entry("Gorakhpur", "Gorakhpur", "Uttar Pradesh", 1950, 2500, 2200, 2800),
      entry("Nellore", "Nellore", "Andhra Pradesh", 2100, 2800, 2350, 3500),
      entry("Burdwan", "Bardhaman", "West Bengal", 1900, 2600, 2250, 3200),
      entry("Thanjavur", "Thanjavur", "Tamil Nadu", 2000, 2700, 2300, 2100),
    ],
  },
  {
    id: "maize_mp",
    commodity: "Maize",
    hindiName: "मक्का",
    variety: "Yellow / White / Hybrid",
    category: "cereal",
    unit: "₹/quintal",
    mspPrice: 2090,
    marketPrices: [
      entry("Davangere", "Davangere", "Karnataka", 1900, 2400, 2100, 3500),
      entry("Gulbarga", "Kalaburagi", "Karnataka", 1850, 2350, 2050, 2800),
      entry("Nizamabad", "Nizamabad", "Telangana", 1800, 2300, 2000, 2200),
      entry("Bhilwara", "Bhilwara", "Rajasthan", 1900, 2250, 2050, 1500),
      entry("Chhindwara", "Chhindwara", "Madhya Pradesh", 1850, 2300, 2080, 1800),
    ],
  },
  {
    id: "chana_mp",
    commodity: "Chickpea (Gram)",
    hindiName: "चना",
    variety: "Desi / Kabuli",
    category: "pulse",
    unit: "₹/quintal",
    mspPrice: 5440,
    marketPrices: [
      entry("Indore", "Indore", "Madhya Pradesh", 5200, 6800, 5800, 4200),
      entry("Latur", "Latur", "Maharashtra", 5100, 6500, 5600, 3800),
      entry("Bikaner", "Bikaner", "Rajasthan", 5300, 6200, 5650, 2500),
      entry("Kota", "Kota", "Rajasthan", 5250, 6600, 5700, 2100),
      entry("Akola", "Akola", "Maharashtra", 5000, 6400, 5500, 1900),
      entry("Jaipur", "Jaipur", "Rajasthan", 5400, 7000, 5900, 1500),
    ],
  },
  {
    id: "moong_mp",
    commodity: "Green Gram (Moong)",
    hindiName: "मूंग",
    variety: "Bold / Small",
    category: "pulse",
    unit: "₹/quintal",
    mspPrice: 8558,
    marketPrices: [
      entry("Jodhpur", "Jodhpur", "Rajasthan", 7500, 10500, 8800, 1500),
      entry("Nagaur", "Nagaur", "Rajasthan", 7200, 10000, 8500, 1200),
      entry("Indore", "Indore", "Madhya Pradesh", 7800, 10200, 8900, 800),
      entry("Latur", "Latur", "Maharashtra", 7000, 9800, 8400, 900),
    ],
  },
  {
    id: "tur_mp",
    commodity: "Pigeon Pea (Tur/Arhar)",
    hindiName: "तूर / अरहर",
    variety: "FAQ / Medium",
    category: "pulse",
    unit: "₹/quintal",
    mspPrice: 7000,
    marketPrices: [
      entry("Latur", "Latur", "Maharashtra", 8500, 12000, 9800, 3500),
      entry("Gulbarga", "Kalaburagi", "Karnataka", 8200, 11500, 9500, 2800),
      entry("Akola", "Akola", "Maharashtra", 8000, 11800, 9600, 2200),
      entry("Indore", "Indore", "Madhya Pradesh", 8500, 12500, 10000, 1800),
      entry("Nagpur", "Nagpur", "Maharashtra", 8300, 11200, 9400, 1500),
    ],
  },
  {
    id: "urad_mp",
    commodity: "Black Gram (Urad)",
    hindiName: "उड़द",
    variety: "Bold / Small / Munger",
    category: "pulse",
    unit: "₹/quintal",
    mspPrice: 6950,
    marketPrices: [
      entry("Indore", "Indore", "Madhya Pradesh", 6500, 9500, 7800, 1200),
      entry("Nagpur", "Nagpur", "Maharashtra", 6200, 9000, 7500, 900),
      entry("Latur", "Latur", "Maharashtra", 6000, 8800, 7400, 1100),
      entry("Bikaner", "Bikaner", "Rajasthan", 6800, 9200, 7900, 700),
    ],
  },
  {
    id: "masoor_mp",
    commodity: "Lentil (Masoor)",
    hindiName: "मसूर",
    variety: "Bold / Small Red",
    category: "pulse",
    unit: "₹/quintal",
    mspPrice: 6425,
    marketPrices: [
      entry("Indore", "Indore", "Madhya Pradesh", 5800, 7500, 6500, 1500),
      entry("Rewa", "Rewa", "Madhya Pradesh", 5500, 7200, 6200, 800),
      entry("Varanasi", "Varanasi", "Uttar Pradesh", 5600, 7000, 6300, 600),
    ],
  },
  {
    id: "mustard_mp",
    commodity: "Mustard (Rapeseed)",
    hindiName: "सरसों",
    variety: "Bold / Small / Lahi",
    category: "oilseed",
    unit: "₹/quintal",
    mspPrice: 5650,
    marketPrices: [
      entry("Jaipur", "Jaipur", "Rajasthan", 5200, 6800, 5900, 3500),
      entry("Alwar", "Alwar", "Rajasthan", 5100, 6500, 5800, 2800),
      entry("Sri Ganganagar", "Sri Ganganagar", "Rajasthan", 5300, 6900, 6000, 4200),
      entry("Hapur", "Hapur", "Uttar Pradesh", 5000, 6400, 5700, 1800),
      entry("Morena", "Morena", "Madhya Pradesh", 5200, 6600, 5850, 1500),
    ],
  },
  {
    id: "soybean_mp",
    commodity: "Soybean",
    hindiName: "सोयाबीन",
    variety: "Yellow",
    category: "oilseed",
    unit: "₹/quintal",
    mspPrice: 4600,
    marketPrices: [
      entry("Indore", "Indore", "Madhya Pradesh", 4200, 5500, 4800, 8500),
      entry("Ujjain", "Ujjain", "Madhya Pradesh", 4100, 5300, 4700, 5200),
      entry("Latur", "Latur", "Maharashtra", 4000, 5200, 4600, 4800),
      entry("Nagpur", "Nagpur", "Maharashtra", 4100, 5100, 4650, 3500),
      entry("Khandwa", "Khandwa", "Madhya Pradesh", 4000, 5400, 4750, 3000),
    ],
  },
  {
    id: "groundnut_mp",
    commodity: "Groundnut",
    hindiName: "मूंगफली",
    variety: "Bold / Java / TG 51",
    category: "oilseed",
    unit: "₹/quintal",
    mspPrice: 6377,
    marketPrices: [
      entry("Rajkot", "Rajkot", "Gujarat", 5500, 8500, 6800, 5500),
      entry("Gondal", "Rajkot", "Gujarat", 5800, 9000, 7200, 4200),
      entry("Junagadh", "Junagadh", "Gujarat", 5200, 8000, 6500, 3800),
      entry("Kurnool", "Kurnool", "Andhra Pradesh", 5000, 7500, 6200, 2500),
      entry("Villupuram", "Villupuram", "Tamil Nadu", 5300, 7800, 6400, 1800),
    ],
  },
  {
    id: "onion_mp",
    commodity: "Onion",
    hindiName: "प्याज",
    variety: "Red / White / Bangalore Rose",
    category: "vegetable",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Lasalgaon", "Nashik", "Maharashtra", 800, 3500, 1800, 15000),
      entry("Pimpalgaon", "Nashik", "Maharashtra", 700, 3200, 1700, 8500),
      entry("Azadpur", "New Delhi", "Delhi", 1200, 4000, 2200, 6500),
      entry("Bangalore", "Bangalore", "Karnataka", 1000, 3800, 2000, 3500),
      entry("Mandsaur", "Mandsaur", "Madhya Pradesh", 600, 2800, 1500, 5200),
      entry("Hubli", "Dharwad", "Karnataka", 900, 3500, 1900, 2800),
    ],
  },
  {
    id: "tomato_mp",
    commodity: "Tomato",
    hindiName: "टमाटर",
    variety: "Hybrid / Local / Desi",
    category: "vegetable",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Kolar", "Kolar", "Karnataka", 500, 4500, 1500, 5500),
      entry("Madanapalle", "Annamayya", "Andhra Pradesh", 400, 4000, 1400, 4800),
      entry("Azadpur", "New Delhi", "Delhi", 800, 5000, 2000, 5200),
      entry("Pune", "Pune", "Maharashtra", 600, 4200, 1600, 3500),
      entry("Narayangaon", "Pune", "Maharashtra", 500, 3800, 1500, 2800),
    ],
  },
  {
    id: "potato_mp",
    commodity: "Potato",
    hindiName: "आलू",
    variety: "Jyoti / Pukhraj / Chandramukhi",
    category: "vegetable",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Agra", "Agra", "Uttar Pradesh", 400, 1800, 900, 8500),
      entry("Azadpur", "New Delhi", "Delhi", 600, 2200, 1200, 6500),
      entry("Hooghly", "Hooghly", "West Bengal", 500, 1600, 850, 5200),
      entry("Jalandhar", "Jalandhar", "Punjab", 500, 1900, 1000, 4200),
      entry("Indore", "Indore", "Madhya Pradesh", 550, 2000, 1100, 3800),
    ],
  },
  {
    id: "chilli_mp",
    commodity: "Green Chilli",
    hindiName: "हरी मिर्च",
    variety: "Jwala / Bullet / Byadagi",
    category: "vegetable",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Guntur", "Guntur", "Andhra Pradesh", 2000, 18000, 8000, 12000),
      entry("Khammam", "Khammam", "Telangana", 1800, 15000, 7500, 5500),
      entry("Warangal", "Warangal", "Telangana", 2000, 16000, 7800, 4200),
      entry("Azadpur", "New Delhi", "Delhi", 3000, 8000, 5000, 2500),
    ],
  },
  {
    id: "turmeric_mp",
    commodity: "Turmeric",
    hindiName: "हल्दी",
    variety: "Erode / Salem / Nizamabad / Sangli",
    category: "spice",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Erode", "Erode", "Tamil Nadu", 10000, 18000, 13500, 3500),
      entry("Nizamabad", "Nizamabad", "Telangana", 9500, 17000, 13000, 2800),
      entry("Sangli", "Sangli", "Maharashtra", 9000, 16500, 12500, 2200),
      entry("Duggirala", "Guntur", "Andhra Pradesh", 9500, 16000, 12800, 1800),
    ],
  },
  {
    id: "jeera_mp",
    commodity: "Cumin (Jeera)",
    hindiName: "जीरा",
    variety: "Bold / Medium / Small",
    category: "spice",
    unit: "₹/quintal",
    mspPrice: null,
    marketPrices: [
      entry("Unjha", "Mehsana", "Gujarat", 28000, 55000, 42000, 5500),
      entry("Jodhpur", "Jodhpur", "Rajasthan", 26000, 52000, 40000, 3200),
      entry("Nagaur", "Nagaur", "Rajasthan", 25000, 50000, 38000, 2800),
    ],
  },
  {
    id: "cotton_mp",
    commodity: "Cotton",
    hindiName: "कपास",
    variety: "DCH-32 / Bunny / Long Staple",
    category: "fiber",
    unit: "₹/quintal",
    mspPrice: 6620,
    marketPrices: [
      entry("Rajkot", "Rajkot", "Gujarat", 6200, 7800, 7000, 8500),
      entry("Amreli", "Amreli", "Gujarat", 6000, 7500, 6800, 5200),
      entry("Adilabad", "Adilabad", "Telangana", 6100, 7200, 6700, 4500),
      entry("Akola", "Akola", "Maharashtra", 6000, 7400, 6750, 6200),
      entry("Yavatmal", "Yavatmal", "Maharashtra", 5800, 7200, 6600, 4800),
      entry("Sirsa", "Sirsa", "Haryana", 6200, 7600, 6900, 3500),
    ],
  },
];

export const priceTrends: PriceTrend[] = [
  {
    commodity: "Onion",
    monthlyAvg: [
      { month: "Jan", avgPrice: 1800 },
      { month: "Feb", avgPrice: 1500 },
      { month: "Mar", avgPrice: 1200 },
      { month: "Apr", avgPrice: 1000 },
      { month: "May", avgPrice: 1200 },
      { month: "Jun", avgPrice: 1800 },
      { month: "Jul", avgPrice: 2500 },
      { month: "Aug", avgPrice: 3500 },
      { month: "Sep", avgPrice: 4000 },
      { month: "Oct", avgPrice: 3500 },
      { month: "Nov", avgPrice: 2800 },
      { month: "Dec", avgPrice: 2200 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 1550 },
      { year: "2021", avgPrice: 1850 },
      { year: "2022", avgPrice: 2100 },
      { year: "2023", avgPrice: 2450 },
      { year: "2024", avgPrice: 2200 },
    ],
    seasonalPattern:
      "Prices can peak during Aug-Oct when supply is tight and may fall after harvest when arrivals increase.",
    volatility: "extreme",
  },
  {
    commodity: "Tomato",
    monthlyAvg: [
      { month: "Jan", avgPrice: 1200 },
      { month: "Feb", avgPrice: 800 },
      { month: "Mar", avgPrice: 600 },
      { month: "Apr", avgPrice: 500 },
      { month: "May", avgPrice: 1000 },
      { month: "Jun", avgPrice: 2500 },
      { month: "Jul", avgPrice: 4000 },
      { month: "Aug", avgPrice: 3000 },
      { month: "Sep", avgPrice: 2000 },
      { month: "Oct", avgPrice: 1500 },
      { month: "Nov", avgPrice: 1200 },
      { month: "Dec", avgPrice: 1500 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 1200 },
      { year: "2021", avgPrice: 1500 },
      { year: "2022", avgPrice: 1800 },
      { year: "2023", avgPrice: 2800 },
      { year: "2024", avgPrice: 1600 },
    ],
    seasonalPattern:
      "Tomato prices can be highly volatile due to weather, transport, and changing arrivals.",
    volatility: "extreme",
  },
  {
    commodity: "Wheat",
    monthlyAvg: [
      { month: "Jan", avgPrice: 2500 },
      { month: "Feb", avgPrice: 2550 },
      { month: "Mar", avgPrice: 2400 },
      { month: "Apr", avgPrice: 2275 },
      { month: "May", avgPrice: 2300 },
      { month: "Jun", avgPrice: 2350 },
      { month: "Jul", avgPrice: 2400 },
      { month: "Aug", avgPrice: 2450 },
      { month: "Sep", avgPrice: 2500 },
      { month: "Oct", avgPrice: 2550 },
      { month: "Nov", avgPrice: 2600 },
      { month: "Dec", avgPrice: 2650 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 2000 },
      { year: "2021", avgPrice: 2100 },
      { year: "2022", avgPrice: 2450 },
      { year: "2023", avgPrice: 2550 },
      { year: "2024", avgPrice: 2500 },
    ],
    seasonalPattern:
      "Prices may dip during harvest and rise as available stocks decline. Procurement policies can affect market prices.",
    volatility: "low",
  },
  {
    commodity: "Rice (Paddy)",
    monthlyAvg: [
      { month: "Jan", avgPrice: 2400 },
      { month: "Feb", avgPrice: 2350 },
      { month: "Mar", avgPrice: 2300 },
      { month: "Apr", avgPrice: 2350 },
      { month: "May", avgPrice: 2400 },
      { month: "Jun", avgPrice: 2450 },
      { month: "Jul", avgPrice: 2500 },
      { month: "Aug", avgPrice: 2550 },
      { month: "Sep", avgPrice: 2500 },
      { month: "Oct", avgPrice: 2350 },
      { month: "Nov", avgPrice: 2300 },
      { month: "Dec", avgPrice: 2350 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 1868 },
      { year: "2021", avgPrice: 1960 },
      { year: "2022", avgPrice: 2060 },
      { year: "2023", avgPrice: 2183 },
      { year: "2024", avgPrice: 2300 },
    ],
    seasonalPattern:
      "Harvest arrivals, procurement, and export policies can influence paddy prices.",
    volatility: "low",
  },
  {
    commodity: "Potato",
    monthlyAvg: [
      { month: "Jan", avgPrice: 800 },
      { month: "Feb", avgPrice: 600 },
      { month: "Mar", avgPrice: 500 },
      { month: "Apr", avgPrice: 450 },
      { month: "May", avgPrice: 600 },
      { month: "Jun", avgPrice: 900 },
      { month: "Jul", avgPrice: 1200 },
      { month: "Aug", avgPrice: 1500 },
      { month: "Sep", avgPrice: 1800 },
      { month: "Oct", avgPrice: 2000 },
      { month: "Nov", avgPrice: 1600 },
      { month: "Dec", avgPrice: 1200 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 800 },
      { year: "2021", avgPrice: 950 },
      { year: "2022", avgPrice: 1100 },
      { year: "2023", avgPrice: 1200 },
      { year: "2024", avgPrice: 1050 },
    ],
    seasonalPattern:
      "Potato prices depend on harvest arrivals, storage supply, and demand.",
    volatility: "high",
  },
  {
    commodity: "Chickpea (Gram)",
    monthlyAvg: [
      { month: "Jan", avgPrice: 5800 },
      { month: "Feb", avgPrice: 5600 },
      { month: "Mar", avgPrice: 5200 },
      { month: "Apr", avgPrice: 5000 },
      { month: "May", avgPrice: 5100 },
      { month: "Jun", avgPrice: 5300 },
      { month: "Jul", avgPrice: 5500 },
      { month: "Aug", avgPrice: 5700 },
      { month: "Sep", avgPrice: 5900 },
      { month: "Oct", avgPrice: 6100 },
      { month: "Nov", avgPrice: 6200 },
      { month: "Dec", avgPrice: 6000 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 4200 },
      { year: "2021", avgPrice: 4800 },
      { year: "2022", avgPrice: 5200 },
      { year: "2023", avgPrice: 5500 },
      { year: "2024", avgPrice: 5600 },
    ],
    seasonalPattern:
      "Prices can soften during harvest and be influenced by government procurement and import policies.",
    volatility: "medium",
  },
  {
    commodity: "Cotton",
    monthlyAvg: [
      { month: "Jan", avgPrice: 6800 },
      { month: "Feb", avgPrice: 6900 },
      { month: "Mar", avgPrice: 7000 },
      { month: "Apr", avgPrice: 7100 },
      { month: "May", avgPrice: 7200 },
      { month: "Jun", avgPrice: 7000 },
      { month: "Jul", avgPrice: 6800 },
      { month: "Aug", avgPrice: 6600 },
      { month: "Sep", avgPrice: 6400 },
      { month: "Oct", avgPrice: 6200 },
      { month: "Nov", avgPrice: 6400 },
      { month: "Dec", avgPrice: 6600 },
    ],
    yearlyAvg: [
      { year: "2020", avgPrice: 5500 },
      { year: "2021", avgPrice: 7500 },
      { year: "2022", avgPrice: 9500 },
      { year: "2023", avgPrice: 6800 },
      { year: "2024", avgPrice: 6700 },
    ],
    seasonalPattern:
      "Cotton prices are affected by new-crop arrivals, international prices, and MSP procurement.",
    volatility: "medium",
  },
];

// ============ LIVE API INTEGRATION ============

type MarketPricesFunctionResponse = {
  prices?: Array<{
    crop?: string;
    commodity?: string;
    market?: string;
    district?: string;
    state?: string;
    minPrice?: number | string;
    maxPrice?: number | string;
    modalPrice?: number | string;
    unit?: string;
    date?: string;
    source?: string;
  }>;
  source?: string;
  message?: string;
  error?: string;
};

const isValidPrice = (value: unknown): value is number | string =>
  (typeof value === "number" || typeof value === "string") &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const normalizeLivePrice = (
  item: NonNullable<MarketPricesFunctionResponse["prices"]>[number]
): LiveMarketPrice | null => {
  const modalPrice = Number(item.modalPrice);
  const minPrice = Number(item.minPrice);
  const maxPrice = Number(item.maxPrice);
  const crop = item.crop || item.commodity;
  const marketName = item.market || item.district;

  if (
    !crop ||
    !marketName ||
    !Number.isFinite(modalPrice) ||
    modalPrice < 0
  ) {
    return null;
  }

  return {
    crop,
    market: [marketName, item.district, item.state]
      .filter((part, index, all) => part && all.indexOf(part) === index)
      .join(", "),
    minPrice: Number.isFinite(minPrice) ? minPrice : modalPrice,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : modalPrice,
    modalPrice,
    unit: item.unit || "₹/quintal",
    date: item.date,
    source: item.source || "Live market API",
  };
};

/**
 * Fetch current mandi prices through the configured Supabase Edge Function.
 * If the function fails or returns no valid prices, use the historical
 * dataset as a clearly labelled fallback.
 */
export async function fetchLiveMandiPrices(
  state = "Punjab",
  district?: string
): Promise<{
  prices: LiveMarketPrice[];
  source: "live" | "historical";
  message: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("market-prices", {
      body: { state, district },
    });

    if (!error && Array.isArray(data?.prices)) {
      const livePrices = data.prices
        .map(normalizeLivePrice)
        .filter((price): price is LiveMarketPrice => price !== null);

      if (livePrices.length > 0) {
        return {
          prices: livePrices,
          source: "live",
          message:
            data.message ||
            "Prices returned by the configured market API. Check the source and date.",
        };
      }
    }
  } catch (error) {
    console.error("Live mandi API request failed:", error);
  }

  const historicalPrices = getMandiPricesByState(state)
    .filter((price) => !district || price.district.toLowerCase() === district.toLowerCase())
    .map((item) => {
      const parent = mandiPrices.find((commodity) =>
        commodity.marketPrices.some(
          (marketPrice) =>
            marketPrice.market === item.market &&
            marketPrice.state === item.state
        )
      );

      return {
        crop: parent?.commodity ?? "Unknown",
        market: `${item.market}, ${item.district}, ${item.state}`,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        modalPrice: item.modalPrice,
        unit: parent?.unit ?? "₹/quintal",
        date: item.date,
        source: "Historical dataset (December 2024)",
      };
    });

  return {
    prices: historicalPrices,
    source: "historical",
    message:
      "Live prices were unavailable. Showing historical December 2024 dataset values, not current mandi prices.",
  };
}

// ============ HELPER FUNCTIONS ============

export const getMandiPricesByCommodity = (
  commodity: string
): MandiPrice | undefined => {
  const search = commodity.trim().toLowerCase();

  if (!search) return undefined;

  return mandiPrices.find(
    (item) =>
      item.commodity.toLowerCase().includes(search) ||
      item.id.toLowerCase().includes(search) ||
      item.hindiName.includes(commodity.trim())
  );
};

export const getMandiPricesByState = (state: string): MarketEntry[] => {
  const search = state.trim().toLowerCase();

  if (!search) return [];

  return mandiPrices.flatMap((commodity) =>
    commodity.marketPrices.filter(
      (price) => price.state.toLowerCase() === search
    )
  );
};

export const getMandiPricesByMarket = (
  market: string
): { commodity: string; price: MarketEntry }[] => {
  const search = market.trim().toLowerCase();

  if (!search) return [];

  return mandiPrices.flatMap((commodity) =>
    commodity.marketPrices
      .filter((price) => price.market.toLowerCase().includes(search))
      .map((price) => ({
        commodity: commodity.commodity,
        price,
      }))
  );
};

export const getMSPCrops = (): { commodity: string; msp: number }[] =>
  mandiPrices
    .filter(
      (commodity): commodity is MandiPrice & { mspPrice: number } =>
        commodity.mspPrice !== null
    )
    .map((commodity) => ({
      commodity: commodity.commodity,
      msp: commodity.mspPrice,
    }));

export const getPriceTrendByCommodity = (
  commodity: string
): PriceTrend | undefined => {
  const search = commodity.trim().toLowerCase();

  if (!search) return undefined;

  return priceTrends.find((trend) =>
    trend.commodity.toLowerCase().includes(search)
  );
};

export const getHighVolatilityCommodities = (): PriceTrend[] =>
  priceTrends.filter(
    (trend) =>
      trend.volatility === "extreme" || trend.volatility === "high"
  );

export const getCommoditiesByCategory = (
  category: MandiCategory
): MandiPrice[] => mandiPrices.filter((item) => item.category === category);

export const getAllCommodities = (): string[] =>
  mandiPrices.map((item) => item.commodity);

export const getMandiPricesByDistrict = (district: string): MarketEntry[] => {
  const search = district.trim().toLowerCase();

  if (!search) return [];

  return mandiPrices.flatMap((commodity) =>
    commodity.marketPrices.filter(
      (price) => price.district.toLowerCase() === search
    )
  );
};

export const getMarketPriceSummary = (
  commodity: string,
  state?: string
): {
  commodity: string;
  averageModalPrice: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  marketCount: number;
  mspPrice: number | null;
  date: string | null;
} | null => {
  const item = getMandiPricesByCommodity(commodity);

  if (!item) return null;

  const entries = state
    ? item.marketPrices.filter(
        (price) => price.state.toLowerCase() === state.trim().toLowerCase()
      )
    : item.marketPrices;

  if (entries.length === 0) {
    return {
      commodity: item.commodity,
      averageModalPrice: null,
      minimumPrice: null,
      maximumPrice: null,
      marketCount: 0,
      mspPrice: item.mspPrice,
      date: null,
    };
  }

  const averageModalPrice =
    entries.reduce((total, price) => total + price.modalPrice, 0) /
    entries.length;

  return {
    commodity: item.commodity,
    averageModalPrice: Math.round(averageModalPrice * 100) / 100,
    minimumPrice: Math.min(...entries.map((price) => price.minPrice)),
    maximumPrice: Math.max(...entries.map((price) => price.maxPrice)),
    marketCount: entries.length,
    mspPrice: item.mspPrice,
    date: entries[0]?.date ?? null,
  };
};