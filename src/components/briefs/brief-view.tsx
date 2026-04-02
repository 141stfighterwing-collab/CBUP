'use client'

import {
  ShieldCheck, AlertTriangle, ShieldAlert, Building2, CheckCircle, Radar, Clock
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockBrief } from '@/lib/mock-data'

const iconMap: Record<string, React.ElementType> = {
  'alert-triangle': AlertTriangle,
  'shield-alert': ShieldAlert,
  'building-2': Building2,
  'check-circle': CheckCircle,
  'radar': Radar,
}

const severityStyle: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-amber-500',
  medium: 'text-yellow-600',
  low: 'text-green-500',
}

const severityBg: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/20',
  high: 'bg-amber-500/10 border-amber-500/20',
  medium: 'bg-yellow-500/10 border-yellow-500/20',
  low: 'bg-green-500/10 border-green-500/20',
}

export function BriefView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Brief Header */}
      <Card className="border-border/50 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-transparent to-primary/5 px-6 py-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{mockBrief.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {mockBrief.date} • Volume #{mockBrief.volume}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Published 6:00 AM EST</span>
              </div>
              <Badge variant="destructive" className="text-xs">
                Threat Level: {mockBrief.threatLevel}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Threat Score:</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-xs">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                style={{ width: `${mockBrief.threatScore}%` }}
              />
            </div>
            <span className="text-xs font-semibold">{mockBrief.threatScore}/100</span>
          </div>
        </div>
      </Card>

      {/* Brief Sections */}
      {mockBrief.sections.map((section) => {
        const Icon = iconMap[section.icon] || AlertTriangle
        return (
          <Card key={section.title} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {section.items.length} items
                </Badge>
              </div>

              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${severityBg[item.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${severityStyle[item.severity]}`}>
                            {item.severity}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold mb-1.5">{item.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Brief Footer */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs text-center text-muted-foreground">
            This briefing is generated using data from NVD, CISA, MITRE, and partner threat intelligence feeds.
            For questions or additional information, contact your security operations team.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
