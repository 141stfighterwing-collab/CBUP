'use client'

import { Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started with cybersecurity awareness.',
    features: [
      '1 user',
      'Daily headline alerts (3/day)',
      'Weekly summary brief',
      'Basic threat indicator feed',
      'Community support',
    ],
    cta: 'Get Started Free',
    popular: false,
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For small teams that need structured security briefings.',
    features: [
      'Up to 5 users',
      'Full daily brief with analysis',
      'Workflow alerts & task tracking',
      'Basic monitoring dashboard',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For growing teams that need comprehensive monitoring.',
    features: [
      'Up to 25 users',
      'Real-time alerts',
      'Advanced monitoring & trend charts',
      'Compliance reports',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with advanced security requirements.',
    features: [
      'Unlimited users',
      'On-prem/self-hosted deployment',
      'SIEM integration',
      'Custom threat feeds',
      'Dedicated support',
      'SLA guarantees',
    ],
    cta: 'Contact Sales',
    popular: false,
    highlight: false,
  },
]

export function Pricing() {
  const { setView, setAuthMode } = useAppStore()

  return (
    <section id="pricing" className="container mx-auto px-4 lg:px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Simple, transparent pricing
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Choose the plan that fits your team. All plans include a 14-day free trial.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative ${
              tier.highlight
                ? 'border-primary cyber-glow'
                : 'border-border/50'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                  <Star className="h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader className="pb-3 pt-6">
              <div>
                <h3 className="font-bold text-lg">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground ml-1">{tier.period}</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <ul className="space-y-2.5 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.highlight ? 'default' : 'outline'}
                onClick={() => {
                  if (tier.name === 'Enterprise') return
                  setAuthMode('signup')
                  setView('auth')
                }}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
