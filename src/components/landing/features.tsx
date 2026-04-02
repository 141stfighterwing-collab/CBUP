'use client'

import { FileText, Bell, GitBranch, MonitorSmartphone, Server } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: FileText,
    title: 'Daily Threat Brief',
    description: 'Curated cybersecurity briefing delivered every morning with the latest threats, vulnerabilities, and actionable intelligence.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Instant notifications for critical vulnerabilities, active exploits, and emerging threats tailored to your technology stack.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: GitBranch,
    title: 'Workflow Management',
    description: 'Track security tasks from discovery to resolution with kanban boards, assignment tracking, and SLA management.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: MonitorSmartphone,
    title: 'Low-Level Monitoring',
    description: 'Dashboard with threat trend charts, severity breakdowns, and activity logs to visualize your security posture.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Server,
    title: 'On-Prem Deploy',
    description: 'Full self-hosted deployment option for organizations with strict data residency and compliance requirements.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

export function Features() {
  return (
    <section className="container mx-auto px-4 lg:px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Everything your security team needs
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          A comprehensive platform for threat intelligence, alert management, and security operations — all in one place.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="border-border/50 hover:border-primary/30 transition-colors group"
          >
            <CardContent className="p-6">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${feature.bg} mb-4`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold mb-2 text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
