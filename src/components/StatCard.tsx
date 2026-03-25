import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export default function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const glowMap = {
    default: "glow-primary",
    success: "glow-success",
    warning: "glow-warning",
    destructive: "glow-destructive",
  };
  const colorMap = {
    default: "text-primary",
    success: "text-green-400",
    warning: "text-yellow-400",
    destructive: "text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", colorMap[variant])}>{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn("p-2.5 rounded-lg bg-muted/50 border border-border/50")}>
          <Icon className={cn("h-5 w-5", colorMap[variant])} />
        </div>
      </div>
    </motion.div>
  );
}
