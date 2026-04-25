import {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake, MessageSquare,
} from "lucide-react";

export const ICON_MAP = {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake,
};

export function iconFor(name) {
  return ICON_MAP[name] || MessageSquare;
}
