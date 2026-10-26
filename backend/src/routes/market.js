
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/database.js';
import { getDatasetMetadata } from '../services/datasets.js';

const router = express.Router();

router.get('/prices', authenticate, async (req, res) => {
  try {
    const { crop, state, district } = req.query;

    const where = {};

    if (typeof crop === 'string' && crop.trim()) {
      where.crop = { contains: crop.trim(), mode: 'insensitive' };
    }

    if (typeof state === 'string' && state.trim()) {
      where.region = { contains: state.trim(), mode: 'insensitive' };
    }

    if (typeof district === 'string' && district.trim()) {
      where.market = { contains: district.trim(), mode: 'insensitive' };
    }

    const records = await prisma.mandiPrice.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    const metadata = await getDatasetMetadata('mandi-prices');

    const prices = records.map((record) => ({
      crop: record.crop,
      market: record.market,
      minPrice: null,
      maxPrice: null,
      modalPrice: record.price,
      unit: record.unit || '₹/quintal',
      date: record.recordedAt.toISOString(),
      source: record.source || 'unknown',
      region: record.region || null,
      trend: record.trend || null,
    }));

    res.set('Cache-Control', 'no-store');

    return res.json({
      prices,
      source: prices.length ? 'database' : 'unavailable',
      metadata,
      message: prices.length
        ? 'Showing stored mandi price records. Check each record date before relying on it.'
        : 'No mandi price records are currently available. Configure and run the mandi data ingestion job.',
    });
  } catch (error) {
    console.error('Failed to fetch mandi prices:', error);

    return res.status(500).json({
      prices: [],
      source: 'unavailable',
      error: 'Unable to retrieve mandi prices.',
    });
  }
});

router.get('/merchants', authenticate, async (_req, res) => {
  try {
    const merchants = await prisma.merchant.findMany({
      orderBy: { rating: 'desc' },
    });
    const metadata = await getDatasetMetadata('market-merchants');

    return res.json({ metadata, merchants });
  } catch (error) {
    console.error('Failed to fetch market merchants:', error);
    return res.status(500).json({ error: 'Unable to retrieve market merchants.' });
  }
});

router.get('/demand', authenticate, async (_req, res) => {
  try {
    const demand = await prisma.cropDemand.findMany({
      orderBy: { lastUpdated: 'desc' },
    });
    const metadata = await getDatasetMetadata('market-demand');

    return res.json({ metadata, demand });
  } catch (error) {
    console.error('Failed to fetch crop demand:', error);
    return res.status(500).json({ error: 'Unable to retrieve crop demand.' });
  }
});

export default router;
