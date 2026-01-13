"use client";

// ============================================
// ACTIVITY ICON - Dynamic Lucide icon renderer
// ============================================

import {
    Briefcase,
    Code,
    BookOpen,
    Dumbbell,
    Smartphone,
    Coffee,
    Music,
    Gamepad2,
    Utensils,
    Bed,
    Car,
    ShoppingBag,
    Heart,
    GraduationCap,
    Palette,
    Tv,
    MessageCircle,
    Users,
    FileText,
    Camera,
    Plane,
    Home,
    type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
    Briefcase,
    Code,
    BookOpen,
    Dumbbell,
    Smartphone,
    Coffee,
    Music,
    Gamepad2,
    Utensils,
    Bed,
    Car,
    ShoppingBag,
    Heart,
    GraduationCap,
    Palette,
    Tv,
    MessageCircle,
    Users,
    FileText,
    Camera,
    Plane,
    Home,
};

export const AVAILABLE_ICONS = Object.keys(iconMap);

interface ActivityIconProps {
    name: string;
    className?: string;
}

export function ActivityIcon({ name, className }: ActivityIconProps) {
    const Icon = iconMap[name] || Briefcase;
    return <Icon className={className} />;
}
