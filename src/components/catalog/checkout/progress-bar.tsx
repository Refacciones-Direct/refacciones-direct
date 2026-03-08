import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

interface CheckoutProgressBarProps {
  currentStep: 1 | 2 | 3;
}

export async function CheckoutProgressBar({ currentStep }: CheckoutProgressBarProps) {
  const t = await getTranslations('catalog');

  const steps = [
    { number: 1, label: t('checkout.stepShipping') },
    { number: 2, label: t('checkout.stepPayment') },
    { number: 3, label: t('checkout.stepReview') },
  ] as const;

  return (
    <div data-slot="checkout-progress-bar" className="mx-auto max-w-md">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div key={step.number} className="flex flex-1 items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-medium',
                    isCompleted && 'bg-emerald-600 text-white',
                    isActive && 'bg-brand-navy text-white',
                    !isCompleted &&
                      !isActive &&
                      'border border-border bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : step.number}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    isCompleted && 'text-emerald-600',
                    isActive && 'font-semibold text-brand-navy',
                    !isCompleted && !isActive && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line (not after last step) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1',
                    step.number < currentStep ? 'bg-emerald-600' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
