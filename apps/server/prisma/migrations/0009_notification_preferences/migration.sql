CREATE TABLE "NotificationPreference" (
    "userId" UUID NOT NULL,
    "receiveAssignments" BOOLEAN NOT NULL DEFAULT true,
    "receiveReviewUpdates" BOOLEAN NOT NULL DEFAULT true,
    "receiveDueSoonReminders" BOOLEAN NOT NULL DEFAULT true,
    "receiveOverdueAlerts" BOOLEAN NOT NULL DEFAULT true,
    "receiveDailySummary" BOOLEAN NOT NULL DEFAULT true,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
