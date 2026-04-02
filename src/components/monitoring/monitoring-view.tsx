'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  threatTrendData,
  alertDistributionData,
  severityBreakdownData,
  activityLogData,
} from '@/lib/mock-data'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts'
import { CheckCircle, XCircle, AlertTriangle, Wifi } from 'lucide-react'

const typeColor: Record<string, string> = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  high: 'text-orange-500',
  info: 'text-muted-foreground',
}

export function MonitoringView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Security Monitoring</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of your security posture and threat landscape
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Threat Intel Feed', status: 'online', icon: Wifi },
          { label: 'Vulnerability Scanner', status: 'online', icon: CheckCircle },
          { label: 'Email Gateway', status: 'degraded', icon: AlertTriangle },
          { label: 'SIEM Integration', status: 'offline', icon: XCircle },
        ].map((item) => (
          <Card key={item.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] mt-1.5 ${
                      item.status === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      item.status === 'degraded' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>
                <item.icon className={`h-5 w-5 ${
                  item.status === 'online' ? 'text-green-500' :
                  item.status === 'degraded' ? 'text-amber-500' :
                  'text-red-500'
                }`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Threat Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Threat Level Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={threatTrendData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 155)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 155)' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.17 0.01 155)',
                      border: '1px solid oklch(0.28 0.015 155)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'oklch(0.95 0.01 155)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="oklch(0.627 0.194 149.214)"
                    strokeWidth={2}
                    dot={{ fill: 'oklch(0.627 0.194 149.214)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alert Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alerts by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertDistributionData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 155)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 155)' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.17 0.01 155)',
                      border: '1px solid oklch(0.28 0.015 155)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'oklch(0.95 0.01 155)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {alertDistributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`oklch(${0.6 - index * 0.04} 0.15 ${150 + index * 10})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity Breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.17 0.01 155)',
                      border: '1px solid oklch(0.28 0.015 155)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {severityBreakdownData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {activityLogData.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0 w-12">
                    {item.time}
                  </span>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    item.type === 'critical' ? 'bg-red-500' :
                    item.type === 'warning' ? 'bg-amber-500' :
                    item.type === 'high' ? 'bg-orange-500' :
                    'bg-muted-foreground'
                  }`} />
                  <p className="text-xs leading-relaxed">{item.action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
