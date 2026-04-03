'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'


const severityColor: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const severityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

interface AlertItem {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  source: string
  description: string
  category: string
  createdAt: string
}

const filters = ['all', 'critical', 'high', 'medium', 'low'] as const

function AlertCard({ alert }: { alert: AlertItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden hover:border-primary/20 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${severityDot[alert.severity]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium leading-tight">{alert.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-[10px] ${severityColor[alert.severity]}`}>
                {alert.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {alert.category}
              </Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{alert.source}</span>
            <span>•</span>
            <span>{new Date(alert.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {alert.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Create Task
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              <ExternalLink className="mr-1 h-3 w-3" />
              View Source
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AlertsView() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then((data) => {
        setAlerts(Array.isArray(data) ? data : (data?.alerts || []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = activeFilter === 'all' || alert.severity === activeFilter
    const matchesSearch = !searchQuery ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSeverity && matchesSearch
  })

  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Security Alerts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage the latest cybersecurity threats and vulnerabilities
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs h-7 capitalize ${activeFilter === filter ? '' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter}
                  <span className="ml-1.5 opacity-70">({counts[filter]})</span>
                </Button>
              ))}
            </div>
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full sm:w-64 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? <div className="text-center py-8 text-xs text-muted-foreground">Loading alerts...</div> : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No alerts match your filters</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
