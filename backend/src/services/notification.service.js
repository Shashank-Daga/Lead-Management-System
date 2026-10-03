const prisma = require("../config/prisma");

function createNotification(userId, { type, title, message, metadata = {} }) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId,
    type,
    title,
    message,
    isRead: false,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function formatNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    metadata: notification.metadata || {},
  };
}

async function notifyUser(userId, payload, tx = prisma) {
  // createNotification() above builds a draft with a client-generated ID --
  // useful for validating a payload's shape before it hits the DB (see the
  // "notification payloads remain consistently shaped" test) -- but that ID
  // is never persisted anywhere and must never be handed back to a caller as
  // if it were the row's real identity. The row Prisma creates is the only
  // source of truth for the notification's ID, so we return that instead.
  const created = await tx.notification.create({
    data: {
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata || {},
      isRead: false,
    },
  });
  return formatNotification(created);
}

async function listNotifications(user) {
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    createdAt: row.createdAt,
    metadata: row.metadata || {},
  }));
}

async function markNotificationRead(user, notificationId) {
  const row = await prisma.notification.findFirst({ where: { id: notificationId, userId: user.id } });
  if (!row) return null;

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return {
    id: updated.id,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    isRead: updated.isRead,
    createdAt: updated.createdAt,
    metadata: updated.metadata || {},
  };
}

module.exports = {
  createNotification,
  formatNotification,
  notifyUser,
  listNotifications,
  markNotificationRead,
};






