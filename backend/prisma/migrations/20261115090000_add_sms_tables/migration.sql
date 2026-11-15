-- CreateTable
CREATE TABLE "sms_subscribers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "gramPanchayat" TEXT,
    "crop" TEXT,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "source" TEXT NOT NULL DEFAULT 'web',
    "farmerType" TEXT NOT NULL DEFAULT 'self',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "planTier" TEXT NOT NULL DEFAULT 'free',
    "planStatus" TEXT NOT NULL DEFAULT 'active',
    "monthlySmsQuota" INTEGER NOT NULL DEFAULT 30,
    "smsSentThisMonth" INTEGER NOT NULL DEFAULT 0,
    "registeredBy" TEXT,
    "sevakId" TEXT,
    "optOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_log" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "templateKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "sendTime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dltTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "billingStatus" TEXT NOT NULL,
    "monthlyBudgetPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_opt_out_events" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_opt_out_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_subscribers_phone_key" ON "sms_subscribers"("phone");

-- CreateIndex
CREATE INDEX "sms_subscribers_district_state_idx" ON "sms_subscribers"("district", "state");

-- CreateIndex
CREATE INDEX "sms_subscribers_active_planStatus_idx" ON "sms_subscribers"("active", "planStatus");

-- CreateIndex
CREATE INDEX "sms_log_status_createdAt_idx" ON "sms_log"("status", "createdAt");

-- CreateIndex
CREATE INDEX "sms_log_subscriberId_idx" ON "sms_log"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_key_language_key" ON "sms_templates"("key", "language");

-- CreateIndex
CREATE INDEX "sms_opt_out_events_phone_createdAt_idx" ON "sms_opt_out_events"("phone", "createdAt");

-- AddForeignKey
ALTER TABLE "sms_log" ADD CONSTRAINT "sms_log_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "sms_subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
