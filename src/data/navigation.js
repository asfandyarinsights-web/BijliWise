import { LayoutDashboard, Receipt, BarChart3, Sparkles, Lightbulb, Settings } from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, title: "Dashboard", subtitle: "Your household electricity at a glance" },
  { id: "bills", label: "Electricity Bills", icon: Receipt, title: "Electricity Bills", subtitle: "Every bill, date and amount in one place" },
  { id: "analytics", label: "Analytics", icon: BarChart3, title: "Analytics", subtitle: "Deeper breakdowns of your usage" },
  { id: "predictions", label: "Predictions", icon: Sparkles, title: "Predictions", subtitle: "Forecast your future electricity consumption and estimated bills using historical usage patterns." },
  { id: "insights", label: "Energy Insights", icon: Lightbulb, title: "Energy Insights", subtitle: "Understand your electricity usage, discover patterns, and make smarter energy decisions." },
  { id: "settings", label: "Settings", icon: Settings, title: "Settings", subtitle: "Preferences and account" },
];
