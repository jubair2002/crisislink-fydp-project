'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartPalette, Colors } from '@/lib/colors';
import type {
  DisasterTypeCount,
  UserSignupPoint,
  VolunteerSkillCount,
} from '@/lib/dashboardMetrics';

interface DashboardChartsProps {
  signups: UserSignupPoint[];
  disasters: DisasterTypeCount[];
  volunteerSkills: VolunteerSkillCount[];
}

const ChartCard = ({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl bg-surface border border-surface-border shadow-card p-5 ${className}`}
  >
    <header className="mb-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
    </header>
    <div className="h-72">{children}</div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex items-center justify-center text-xs text-ink-muted">{message}</div>
);

export default function DashboardCharts({
  signups,
  disasters,
  volunteerSkills,
}: DashboardChartsProps) {
  const signupsHasData = signups.some((p) => p.count > 0);
  const disastersHasData = disasters.length > 0;
  const skillsHasData = volunteerSkills.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="User Registrations"
        subtitle="New profiles over the last 30 days"
        className="lg:col-span-2"
      >
        {signupsHasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signups} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={Colors.border} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: Colors.textSecondary }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: Colors.textSecondary }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="New users"
                stroke={Colors.primary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, stroke: Colors.primary, fill: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No registrations in the last 30 days." />
        )}
      </ChartCard>

      <ChartCard title="Disasters by Type" subtitle="Reported this month">
        {disastersHasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={disasters} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={Colors.border} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: Colors.textSecondary }}
                tickMargin={8}
                interval={0}
                angle={-15}
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: Colors.textSecondary }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip />
              <Bar dataKey="count" name="Disasters" radius={[6, 6, 0, 0]}>
                {disasters.map((entry, idx) => (
                  <Cell key={entry.type} fill={ChartPalette[idx % ChartPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No disasters reported this month." />
        )}
      </ChartCard>

      <ChartCard title="Volunteers by Skill" subtitle="Approved volunteers, multi-skill counted">
        {skillsHasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: Colors.textSecondary, paddingTop: 8 }}
              />
              <Pie
                data={volunteerSkills}
                dataKey="count"
                nameKey="label"
                outerRadius={90}
                innerRadius={48}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {volunteerSkills.map((entry, idx) => (
                  <Cell key={entry.skill} fill={ChartPalette[idx % ChartPalette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No approved volunteers yet." />
        )}
      </ChartCard>
    </div>
  );
}
