'use client'

import { AlertTriangle, Bell, CheckCircle, ShieldAlert, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { dashboardStats, mockAlerts } from '@/lib/mock-data'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { threatTrendData } from '@/lib/mock-data'

const severityColor = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

export function DashboardView() {
  const { setView } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.activeAlerts}</p>
                <p className="text-xs text-red-500 mt-1">{dashboardStats.criticalAlerts} critical</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open Tasks</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.openTasks}</p>
                <p className="text-xs text-muted-foreground mt-1">{dashboardStats.completedTasks} completed</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.complianceScore}%</p>
                <Progress value={dashboardStats.complianceScore} className="mt-2 h-1.5" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Threat Level</p>
                <Badge variant="destructive" className="mt-1.5 text-xs">
                  {dashboardStats.threatLevel}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1.5">Score: {dashboardStats.threatScore}/100</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Alerts */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Recent Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView('alerts')}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {dashboardStats.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high' ? 'bg-amber-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.source} • {new Date(alert.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColor[alert.severity]}`}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions + Mini Chart */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={() => setView('briefs')}>
                Read Today's Brief
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={() => setView('alerts')}>
                Review Critical Alerts
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={() => setView('workflow')}>
                Check Open Tasks
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-8" onClick={() => setView('monitoring')}>
                View Monitoring
              </Button>
            </CardContent>
          </Card>

          {/* Mini Trend Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Threat Trend (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={threatTrendData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 155)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 155)' }}
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
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
