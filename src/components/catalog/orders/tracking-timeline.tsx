import { Check, ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

type StepStatus = 'completed' | 'active' | 'pending';

interface TimelineStep {
  labelKey: string;
  description: string;
  status: StepStatus;
  trackingInfo?: {
    trackingNumber: string;
    carrier: string;
  };
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    labelKey: 'orders.trackingOrderPlaced',
    description: '5 de marzo, 2026 — 10:30 AM',
    status: 'completed',
  },
  {
    labelKey: 'orders.trackingProcessing',
    description: '5 de marzo, 2026 — 11:45 AM',
    status: 'completed',
  },
  {
    labelKey: 'orders.trackingShipped',
    description: '6 de marzo, 2026 — 2:15 PM',
    status: 'completed',
    trackingInfo: {
      trackingNumber: 'MEX-2026-TRK-4891',
      carrier: 'Estafeta',
    },
  },
  {
    labelKey: 'orders.trackingOutForDelivery',
    description: 'Tu paquete está en camino',
    status: 'active',
  },
  {
    labelKey: 'orders.trackingDelivered',
    description: 'Entrega estimada: 10-12 de marzo, 2026',
    status: 'pending',
  },
];

export async function TrackingTimeline() {
  const t = await getTranslations('catalog');

  return (
    <div data-slot="tracking-timeline" className="relative space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <div key={step.labelKey} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-[28px] w-0.5',
                  step.status === 'completed' ? 'bg-emerald-600' : 'bg-border',
                )}
                style={{ height: 'calc(100% - 16px)' }}
              />
            )}

            {/* Circle */}
            <div className="relative z-10 shrink-0">
              {step.status === 'completed' && (
                <div className="flex size-6 items-center justify-center rounded-full bg-emerald-600">
                  <Check className="size-3.5 text-white" />
                </div>
              )}
              {step.status === 'active' && (
                <div className="relative flex size-6 items-center justify-center">
                  <div className="absolute size-6 animate-ping rounded-full bg-brand-navy/20" />
                  <div className="size-6 rounded-full bg-brand-navy" />
                </div>
              )}
              {step.status === 'pending' && (
                <div className="size-6 rounded-full border border-border bg-muted" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  step.status === 'completed' && 'text-emerald-700',
                  step.status === 'active' && 'text-brand-navy',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {t(step.labelKey)}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  step.status === 'pending' ? 'text-muted-foreground/60' : 'text-muted-foreground',
                )}
              >
                {step.description}
              </p>

              {/* Tracking info sub-section */}
              {step.trackingInfo && (
                <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t('orders.trackingNumber')}:</span>{' '}
                    <span className="font-mono font-semibold">
                      {step.trackingInfo.trackingNumber}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('orders.carrier')}:</span>{' '}
                    <span className="font-semibold">{step.trackingInfo.carrier}</span>
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline"
                  >
                    {t('orders.trackOnCarrier')}
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
