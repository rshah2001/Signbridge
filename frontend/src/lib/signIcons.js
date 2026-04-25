import {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake, MessageSquare, HandHeart,
  ShieldCheck, ShieldAlert, BadgeCheck, Smile, CloudRain, Plus, RotateCw, RefreshCcw,
  Clock3, FastForward, Rewind, BadgeInfo, User, UserRound, Users, UsersRound, Home,
  House, MapPin, CircleHelp, Contact, MessageCircleQuestion, CalendarClock, HelpCircle,
  CircleCheckBig, CircleSlash, ArrowRight, BadgeX, MoveRight, MoveLeft, Utensils,
  MessagesSquare, HandMetal, Languages, GraduationCap, BookOpen, BriefcaseBusiness,
  RefreshCw, MapPinned, Footprints,
} from "lucide-react";

export const ICON_MAP = {
  Hand, Heart, Check, X, LifeBuoy, Droplets, DoorOpen, Stethoscope,
  Siren, Zap, OctagonAlert, Sparkles, Apple, HeartHandshake, HandHeart,
  ShieldCheck, ShieldAlert, BadgeCheck, Smile, CloudRain, Plus, RotateCw, RefreshCcw,
  Clock3, FastForward, Rewind, BadgeInfo, User, UserRound, Users, UsersRound, Home,
  House, MapPin, CircleHelp, Contact, MessageCircleQuestion, CalendarClock, HelpCircle,
  CircleCheckBig, CircleSlash, ArrowRight, BadgeX, MoveRight, MoveLeft, Utensils,
  MessagesSquare, HandMetal, Languages, GraduationCap, BookOpen, BriefcaseBusiness,
  RefreshCw, MapPinned, Footprints,
};

export function iconFor(name) {
  return ICON_MAP[name] || MessageSquare;
}
