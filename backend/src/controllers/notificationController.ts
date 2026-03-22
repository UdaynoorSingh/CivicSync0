import { Request, Response } from "express";
import { Notification } from "../models/Notification";

export const pushNotification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user || req.user.role === "citizen") {
      res.status(403).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { title, body, type, priority } = req.body;

    const newNotif = await Notification.create({
      sentBy: req.user.id,
      title,
      body,
      type,
      priority: priority || "normal",
      district: req.user.districtId,
      department: req.user.departmentId || undefined,
    });

    res.status(201).json({ success: true, notification: newNotif });
  } catch (error) {
    console.error("Push Notification Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { districtId, id } = req.user;

    const query: any = {
      isActive: true,
      deletedBy: { $ne: id },
    };

    if (districtId && districtId.trim() !== "") {
      query.$or = [{ district: districtId }, { district: null }];
    } else {
      query.district = null;
    }

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllNotificationsForAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user || req.user.role === "citizen") {
      res.status(403).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { districtId } = req.user;

    const query: any = {};
    if (districtId && districtId.trim() !== "") {
      query.$or = [{ district: districtId }, { district: null }];
    } else {
      query.district = null;
    }

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id: notifId } = req.params;
    const userId = req.user?.id;

    await Notification.updateOne(
      { _id: notifId, "readBy.userId": { $ne: userId } },
      { $push: { readBy: { userId } } },
    );

    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const districtId = req.user?.districtId;

    const query: any = {
      isActive: true,
      "readBy.userId": { $ne: userId },
    };

    if (districtId && districtId.trim() !== "") {
      query.$or = [{ district: districtId }, { district: null }];
    } else {
      query.district = null;
    }

    await Notification.updateMany(query, { $push: { readBy: { userId } } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id: notifId } = req.params;
    const userId = req.user?.id;

    await Notification.findByIdAndUpdate(notifId, {
      $addToSet: { deletedBy: userId },
    });

    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAllNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const districtId = req.user?.districtId;

    const query: any = {
      isActive: true,
      deletedBy: { $ne: userId },
    };

    if (districtId && districtId.trim() !== "") {
      query.$or = [{ district: districtId }, { district: null }];
    } else {
      query.district = null;
    }

    await Notification.updateMany(query, { $addToSet: { deletedBy: userId } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete All Notifications Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
