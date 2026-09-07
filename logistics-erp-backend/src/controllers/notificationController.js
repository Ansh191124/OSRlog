import Notification from "../models/Notification.js";

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ notifications, unreadCount });
}

export async function markRead(req, res) {
  const { id } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  res.json({ notification });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true });
}
