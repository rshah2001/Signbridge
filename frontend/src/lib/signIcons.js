import {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake, MessageSquare, HandHeart,
} from "lucide-react";

export const ICON_MAP = {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake, HandHeart,
};

export function iconFor(name) {
  return ICON_MAP[name] || MessageSquare;
}
