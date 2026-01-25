'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PropertyStep } from './steps/PropertyStep'
import { BuildingStep } from './steps/BuildingStep'
import { PartnerStep } from './steps/PartnerStep'

type WizardStep = 'property' | 'building' | 'partner'

interface WizardData {
  property?: { id: string; name: string }
  building?: { id: string; name: string }
  partner?: { id: string; name: string }
}

interface SetupWizardProps {
  onComplete: () => void
  onSkip?: () => void
}

const STEPS: { key: WizardStep; title: string; number: number }[] = [
  { key: 'property', title: 'Liegenschaft erstellen', number: 1 },
  { key: 'building', title: 'Gebäude hinzufügen', number: 2 },
  { key: 'partner', title: 'Partner anlegen', number: 3 },
]

/**
 * Setup Wizard for first-time onboarding
 * Guides user through creating initial property, building, and partner
 */
export function SetupWizard({ onComplete, onSkip }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('property')
  const [wizardData, setWizardData] = useState<WizardData>({})

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)

  function handlePropertyComplete(data: { id: string; name: string }) {
    setWizardData(prev => ({ ...prev, property: data }))
    setCurrentStep('building')
  }

  function handleBuildingComplete(data: { id: string; name: string }) {
    setWizardData(prev => ({ ...prev, building: data }))
    setCurrentStep('partner')
  }

  function handlePartnerComplete(data: { id: string; name: string }) {
    setWizardData(prev => ({ ...prev, partner: data }))
    onComplete()
  }

  function handleBack() {
    if (currentStep === 'building') {
      setCurrentStep('property')
    } else if (currentStep === 'partner') {
      setCurrentStep('building')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Willkommen bei KEWA
            </h2>
            {onSkip && (
              <button
                onClick={onSkip}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                title="Überspringen"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center">
                {/* Step circle */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Connecting line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      index < currentStepIndex
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-6">
            {STEPS[currentStepIndex].title}
          </h3>

          {/* Step content */}
          {currentStep === 'property' && (
            <PropertyStep
              initialData={wizardData.property}
              onComplete={handlePropertyComplete}
            />
          )}

          {currentStep === 'building' && wizardData.property && (
            <BuildingStep
              propertyId={wizardData.property.id}
              initialData={wizardData.building}
              onComplete={handleBuildingComplete}
              onBack={handleBack}
            />
          )}

          {currentStep === 'partner' && (
            <PartnerStep
              initialData={wizardData.partner}
              onComplete={handlePartnerComplete}
              onBack={handleBack}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
