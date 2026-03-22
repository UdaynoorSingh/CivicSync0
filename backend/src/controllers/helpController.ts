import { Request, Response } from "express";

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  email: string;
  icon: "shield" | "help-circle";
  color: string;
}

interface ImportantContact {
  id: string;
  name: string;
  number: string;
  email: string;
}

const emergencyContacts: EmergencyContact[] = [
  {
    id: "ec1",
    name: "Police",
    number: "100",
    email: "police.control@civicsync.local",
    icon: "shield",
    color: "bg-blue-600",
  },
  {
    id: "ec2",
    name: "Ambulance",
    number: "108",
    email: "ambulance.dispatch@civicsync.local",
    icon: "help-circle",
    color: "bg-red-600",
  },
  {
    id: "ec3",
    name: "Fire Service",
    number: "101",
    email: "fire.control@civicsync.local",
    icon: "help-circle",
    color: "bg-orange-600",
  },
];

const importantContacts: ImportantContact[] = [
  {
    id: "ic1",
    name: "Electricity Board",
    number: "1912",
    email: "electricity@civicsync.local",
  },
  {
    id: "ic2",
    name: "Water Supply",
    number: "1916",
    email: "water@civicsync.local",
  },
  {
    id: "ic3",
    name: "Municipal Office",
    number: "1800-11-3377",
    email: "municipal@civicsync.local",
  },
  {
    id: "ic4",
    name: "Citizen Helpline",
    number: "1800-11-1000",
    email: "help@civicsync.local",
  },
];

export const getHelpContacts = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    emergencyContacts,
    importantContacts,
  });
};
