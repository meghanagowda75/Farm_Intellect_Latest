import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const SMS_KINDS = ['weather', 'market', 'crop', 'scheme'];
const PLAN_TIERS = ['free', 'basic', 'pro', 'institutional'];

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }

  return null;
};

const subscriberResponse = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  state: row.state,
  district: row.district,
  village: row.village,
  gram_panchayat: row.gramPanchayat,
  crop: row.crop,
  language: row.language,
  source: row.source,
  active: row.active,
  plan_tier: row.planTier,
  plan_status: row.planStatus,
  monthly_sms_quota: row.monthlySmsQuota,
  sms_sent_this_month: row.smsSentThisMonth,
  created_at: row.createdAt,
});

const logResponse = (row) => ({
  id: row.id,
  subscriber_id: row.subscriberId,
  template_key: row.templateKey,
  status: row.status,
  body: row.body,
  sent_at: row.sentAt,
  error: row.error,
});

const scheduleResponse = (row) => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  template_key: row.templateKey,
  day_of_week: row.dayOfWeek,
  send_time: row.sendTime,
  active: row.active,
});

const templateResponse = (row) => ({
  id: row.id,
  key: row.key,
  language: row.language,
  body: row.body,
  dlt_template_id: row.dltTemplateId,
});

const billingResponse = (row) => ({
  id: row.id,
  account_name: row.accountName,
  account_type: row.accountType,
  plan_tier: row.planTier,
  billing_status: row.billingStatus,
  monthly_budget_paise: row.monthlyBudgetPaise,
});

const paymentResponse = (row) => ({
  id: row.id,
  amount_paise: row.amountPaise,
  status: row.status,
  payment_provider: row.paymentProvider,
  created_at: row.createdAt,
});

const optOutResponse = (row) => ({
  id: row.id,
  phone: row.phone,
  keyword: row.keyword,
  source: row.source,
  created_at: row.createdAt,
});

// Public farmer registration.
// Consent is mandatory. Registration type and source are controlled by the server.
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      phone,
      state,
      district,
      crop,
      language,
      consent,
    } = req.body || {};

    const normalizedPhone = normalizePhone(phone);

    if (!name || String(name).trim().length < 2 || String(name).trim().length > 80) {
      return res.status(400).json({ error: 'Enter a valid farmer name.' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Enter a valid Indian mobile number.' });
    }

    if (!state || !district || !crop || !language) {
      return res.status(400).json({ error: 'Complete all registration fields.' });
    }

    if (consent !== true) {
      return res.status(400).json({ error: 'SMS consent is required.' });
    }

    const subscriber = await prisma.smsSubscriber.create({
      data: {
        name: String(name).trim(),
        phone: normalizedPhone,
        state: String(state).trim(),
        district: String(district).trim(),
        crop: String(crop).trim(),
        language: String(language).trim(),
        source: 'web',
        farmerType: 'self',
        planTier: 'free',
        planStatus: 'active',
        consentAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Your SMS registration was saved successfully.',
      subscriber: {
        id: subscriber.id,
        name: subscriber.name,
        phone: subscriber.phone,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'This mobile number is already registered.',
      });
    }

    console.error('SMS registration error:', error);
    return res.status(500).json({ error: 'Could not complete SMS registration.' });
  }
});

// All routes below require an authenticated administrator.
router.use('/admin', authenticate, authorize('ADMIN'));

// Load all data used by the Admin SMS dashboard.
router.get('/admin/data', async (req, res) => {
  try {
    const [
      subscribers,
      logs,
      schedules,
      templates,
      billingAccounts,
      payments,
      optOutEvents,
    ] = await Promise.all([
      prisma.smsSubscriber.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.smsLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.smsSchedule.findMany({
        orderBy: [{ dayOfWeek: 'asc' }, { sendTime: 'asc' }],
      }),
      prisma.smsTemplate.findMany({
        orderBy: [{ key: 'asc' }, { language: 'asc' }],
        take: 200,
      }),
      prisma.billingAccount.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.smsOptOutEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return res.json({
      subscribers: subscribers.map(subscriberResponse),
      logs: logs.map(logResponse),
      schedules: schedules.map(scheduleResponse),
      templates: templates.map(templateResponse),
      billingAccounts: billingAccounts.map(billingResponse),
      payments: payments.map(paymentResponse),
      optOutEvents: optOutEvents.map(optOutResponse),
    });
  } catch (error) {
    console.error('Admin SMS data error:', error);
    return res.status(500).json({ error: 'Could not load SMS dashboard data.' });
  }
});

// Admin bulk registration.
// The administrator must confirm that consent was obtained from every listed farmer.
router.post('/admin/bulk', async (req, res) => {
  try {
    const { rows, consentConfirmed } = req.body || {};

    if (consentConfirmed !== true) {
      return res.status(400).json({
        error: 'Confirm that every farmer listed has agreed to receive SMS.',
      });
    }

    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
      return res.status(400).json({
        error: 'Provide between 1 and 500 subscriber rows.',
      });
    }

    const validatedRows = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const phone = normalizePhone(row.phone);
      const planTier = String(row.plan_tier || 'free').toLowerCase();

      if (!phone) {
        return res.status(400).json({
          error: `Row ${index + 1}: invalid Indian mobile number.`,
        });
      }

      if (!PLAN_TIERS.includes(planTier)) {
        return res.status(400).json({
          error: `Row ${index + 1}: unsupported plan tier.`,
        });
      }

      if (!row.state || !row.district) {
        return res.status(400).json({
          error: `Row ${index + 1}: state and district are required.`,
        });
      }

      validatedRows.push({
        name: String(row.name || 'Farmer').trim(),
        phone,
        state: String(row.state).trim(),
        district: String(row.district).trim(),
        crop: row.crop ? String(row.crop).trim() : null,
        language: String(row.language || 'hi').trim(),
        village: row.village ? String(row.village).trim() : null,
        gramPanchayat: row.gram_panchayat
          ? String(row.gram_panchayat).trim()
          : null,
        planTier,
      });
    }

    const uniquePhones = new Set(validatedRows.map((row) => row.phone));

    if (uniquePhones.size !== validatedRows.length) {
      return res.status(400).json({
        error: 'The CSV contains duplicate mobile numbers.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let inserted = 0;
      let updated = 0;

      for (const row of validatedRows) {
        const existing = await tx.smsSubscriber.findUnique({
          where: { phone: row.phone },
          select: { id: true },
        });

        const data = {
          name: row.name,
          state: row.state,
          district: row.district,
          crop: row.crop,
          language: row.language,
          village: row.village,
          gramPanchayat: row.gramPanchayat,
          source: 'sevak_bulk',
          farmerType: 'sevak_registered',
          planTier: row.planTier,
          planStatus: 'active',
          registeredBy: req.user.id,
          sevakId: req.user.id,
        };

        if (existing) {
          // Do not reactivate an opted-out subscriber or erase their opt-out.
          await tx.smsSubscriber.update({
            where: { id: existing.id },
            data,
          });
          updated += 1;
        } else {
          await tx.smsSubscriber.create({
            data: {
              ...data,
              phone: row.phone,
              consentAt: new Date(),
            },
          });
          inserted += 1;
        }
      }

      return { inserted, updated };
    });

    return res.json({
      success: true,
      ...result,
      total: validatedRows.length,
    });
  } catch (error) {
    console.error('SMS bulk registration error:', error);
    return res.status(500).json({ error: 'Bulk registration failed.' });
  }
});

// Create a weekly schedule. Saving a schedule does not activate a sending job.
router.post('/admin/schedules', async (req, res) => {
  try {
    const { name, kind, template_key, day_of_week, send_time } = req.body || {};
    const day = Number(day_of_week);

    if (
      !name ||
      !SMS_KINDS.includes(kind) ||
      !template_key ||
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(send_time || ''))
    ) {
      return res.status(400).json({ error: 'Enter valid schedule details.' });
    }

    const schedule = await prisma.smsSchedule.create({
      data: {
        name: String(name).trim(),
        kind,
        templateKey: String(template_key).trim(),
        dayOfWeek: day,
        sendTime: send_time,
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ schedule: scheduleResponse(schedule) });
  } catch (error) {
    console.error('SMS schedule error:', error);
    return res.status(500).json({ error: 'Could not save the SMS schedule.' });
  }
});

// Create or update a language-specific SMS template.
router.post('/admin/templates', async (req, res) => {
  try {
    const { key, language, body, dlt_template_id } = req.body || {};

    if (
      !key?.trim() ||
      !language?.trim() ||
      !body?.trim() ||
      String(body).length > 1600
    ) {
      return res.status(400).json({
        error: 'Enter a template key, language and message body.',
      });
    }

    const template = await prisma.smsTemplate.upsert({
      where: {
        key_language: {
          key: key.trim(),
          language: language.trim(),
        },
      },
      update: {
        body: body.trim(),
        dltTemplateId: dlt_template_id?.trim() || null,
      },
      create: {
        key: key.trim(),
        language: language.trim(),
        body: body.trim(),
        dltTemplateId: dlt_template_id?.trim() || null,
      },
    });

    return res.json({ template: templateResponse(template) });
  } catch (error) {
    console.error('SMS template error:', error);
    return res.status(500).json({ error: 'Could not save the SMS template.' });
  }
});

// Safe dispatch response until an SMS provider is selected and configured.
// This endpoint intentionally does not send or mark any message as sent.
router.post('/admin/dispatch', async (req, res) => {
  try {
    const { kind, retryFailed = false, limit = 100 } = req.body || {};

    if (!SMS_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'Invalid SMS alert category.' });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const eligibleSubscribers = await prisma.smsSubscriber.findMany({
      where: {
        active: true,
        planStatus: 'active',
        optOutAt: null,
        consentAt: { not: null },
      },
      select: { id: true },
      take: safeLimit,
    });

    return res.status(503).json({
      error: 'SMS provider is not configured. No messages were sent.',
      providerConfigured: false,
      eligibleSubscribers: eligibleSubscribers.length,
    });
  } catch (error) {
    console.error('SMS dispatch error:', error);
    return res.status(500).json({ error: 'Could not process the SMS dispatch request.' });
  }
});

export default router;
