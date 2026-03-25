import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, Network, Shield, Waypoints } from "lucide-react";

import { getDepartmentAnalytics, getTopologies } from "@/utils/storage";

export default function DepartmentsPage() {
  const [topologies, setTopologies] = useState<Awaited<ReturnType<typeof getTopologies>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDepartments = async () => {
      try {
        const saved = await getTopologies();
        if (mounted) {
          setTopologies(saved);
        }
      } catch (error) {
        console.error("Failed to load department analytics", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDepartments();

    return () => {
      mounted = false;
    };
  }, []);

  const departments = useMemo(() => getDepartmentAnalytics(topologies), [topologies]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-primary/70">Departments</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
          <Building2 className="h-7 w-7 text-primary" />
          Real Department Analytics
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Departments are now generated from MongoDB-backed topologies instead of placeholder data.
        </p>
      </div>

      {loading && (
        <div className="glass-card p-5 text-sm text-muted-foreground">
          Loading department analytics from MongoDB...
        </div>
      )}

      {!loading && departments.length === 0 && (
        <div className="glass-card p-8 text-sm text-muted-foreground">
          No department data yet. Save at least one topology with a department name to populate this page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department, index) => (
          <motion.div
            key={department.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="glass-card-hover p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{department.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{department.description}</p>
              </div>
              <div className={`text-right font-mono text-2xl font-bold ${
                department.avgScore >= 80
                  ? "status-green"
                  : department.avgScore >= 60
                    ? "status-yellow"
                    : "status-red"
              }`}>
                {department.avgScore}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Network className="h-4 w-4" />
                  Topologies
                </div>
                <p className="mt-2 text-2xl font-bold">{department.topologies}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Waypoints className="h-4 w-4" />
                  Devices
                </div>
                <p className="mt-2 text-2xl font-bold">{department.deviceCount}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Device Breakdown
              </div>
              <div className="mt-3 space-y-2">
                <p>Routers: {department.routers}</p>
                <p>Switches: {department.switches}</p>
                <p>PCs: {department.pcs}</p>
                <p className="flex items-center gap-2 pt-2 text-primary">
                  <Shield className="h-4 w-4" />
                  Average security: {department.avgScore} / 100
                </p>
              </div>
            </div>

            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Last topology saved: {department.lastUpdated}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
