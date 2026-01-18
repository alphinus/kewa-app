'use client'

import { useState } from 'react'
import type {
  TemplatePhaseWithPackages,
  TemplatePackageWithTasks,
  TemplateTask
} from '@/types/templates'

interface WBSTreeProps {
  phases: TemplatePhaseWithPackages[]
  expandAll?: boolean
  onTaskClick?: (task: TemplateTask) => void
}

/**
 * WBSTree Component
 *
 * Displays the 3-level WBS hierarchy (Phase > Package > Task)
 * in a collapsible tree structure with WBS codes.
 */
export function WBSTree({ phases, expandAll = false, onTaskClick }: WBSTreeProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    expandAll ? new Set(phases.map(p => p.id)) : new Set()
  )
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    expandAll ? new Set(phases.flatMap(p => p.packages?.map(pkg => pkg.id) || [])) : new Set()
  )

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const togglePackage = (packageId: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev)
      if (next.has(packageId)) {
        next.delete(packageId)
      } else {
        next.add(packageId)
      }
      return next
    })
  }

  const expandAllNodes = () => {
    setExpandedPhases(new Set(phases.map(p => p.id)))
    setExpandedPackages(new Set(phases.flatMap(p => p.packages?.map(pkg => pkg.id) || [])))
  }

  const collapseAllNodes = () => {
    setExpandedPhases(new Set())
    setExpandedPackages(new Set())
  }

  if (!phases || phases.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4 text-center">
        Keine Phasen vorhanden
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Expand/collapse controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={expandAllNodes}
          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
        >
          Alle aufklappen
        </button>
        <button
          onClick={collapseAllNodes}
          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
        >
          Alle zuklappen
        </button>
      </div>

      {/* Tree structure */}
      <div className="border rounded-lg overflow-hidden">
        {phases.map((phase, phaseIndex) => (
          <PhaseNode
            key={phase.id}
            phase={phase}
            isExpanded={expandedPhases.has(phase.id)}
            onToggle={() => togglePhase(phase.id)}
            expandedPackages={expandedPackages}
            onTogglePackage={togglePackage}
            onTaskClick={onTaskClick}
            isLast={phaseIndex === phases.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// Phase node component
interface PhaseNodeProps {
  phase: TemplatePhaseWithPackages
  isExpanded: boolean
  onToggle: () => void
  expandedPackages: Set<string>
  onTogglePackage: (id: string) => void
  onTaskClick?: (task: TemplateTask) => void
  isLast: boolean
}

function PhaseNode({
  phase,
  isExpanded,
  onToggle,
  expandedPackages,
  onTogglePackage,
  onTaskClick,
  isLast
}: PhaseNodeProps) {
  const hasPackages = phase.packages && phase.packages.length > 0

  return (
    <div className={!isLast ? 'border-b' : ''}>
      {/* Phase header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-left transition-colors"
      >
        <span className="text-gray-400 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          {hasPackages ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="w-4 h-4 block" />
          )}
        </span>
        <span className="font-mono text-sm text-blue-600 font-medium">{phase.wbs_code}</span>
        <span className="font-medium text-gray-900 flex-1">{phase.name}</span>
        {phase.estimated_duration_days !== null && phase.estimated_duration_days > 0 && (
          <span className="text-xs text-gray-500">{phase.estimated_duration_days} Tage</span>
        )}
      </button>

      {/* Packages */}
      {isExpanded && hasPackages && (
        <div className="pl-6">
          {phase.packages.map((pkg, pkgIndex) => (
            <PackageNode
              key={pkg.id}
              pkg={pkg}
              isExpanded={expandedPackages.has(pkg.id)}
              onToggle={() => onTogglePackage(pkg.id)}
              onTaskClick={onTaskClick}
              isLast={pkgIndex === phase.packages.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Package node component
interface PackageNodeProps {
  pkg: TemplatePackageWithTasks
  isExpanded: boolean
  onToggle: () => void
  onTaskClick?: (task: TemplateTask) => void
  isLast: boolean
}

function PackageNode({
  pkg,
  isExpanded,
  onToggle,
  onTaskClick,
  isLast
}: PackageNodeProps) {
  const hasTasks = pkg.tasks && pkg.tasks.length > 0

  return (
    <div className={!isLast ? 'border-b border-gray-100' : ''}>
      {/* Package header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
      >
        <span className="text-gray-400 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          {hasTasks ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="w-4 h-4 block" />
          )}
        </span>
        <span className="font-mono text-sm text-purple-600">{pkg.wbs_code}</span>
        <span className="text-gray-800 flex-1">{pkg.name}</span>
        {pkg.trade_category && (
          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
            {pkg.trade_category}
          </span>
        )}
        {pkg.estimated_duration_days !== null && pkg.estimated_duration_days > 0 && (
          <span className="text-xs text-gray-500">{pkg.estimated_duration_days} Tage</span>
        )}
      </button>

      {/* Tasks */}
      {isExpanded && hasTasks && (
        <div className="pl-6">
          {pkg.tasks.map((task, taskIndex) => (
            <TaskNode
              key={task.id}
              task={task}
              onClick={onTaskClick}
              isLast={taskIndex === pkg.tasks.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Task node component
interface TaskNodeProps {
  task: TemplateTask
  onClick?: (task: TemplateTask) => void
  isLast: boolean
}

function TaskNode({ task, onClick, isLast }: TaskNodeProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(task)
    }
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''} ${!isLast ? 'border-b border-gray-100' : ''}`}
      onClick={handleClick}
    >
      <span className="w-4 h-4" /> {/* Spacer for alignment */}
      <span className="font-mono text-xs text-gray-500">{task.wbs_code}</span>
      <span className="text-sm text-gray-700 flex-1">{task.name}</span>
      {task.is_optional && (
        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
          optional
        </span>
      )}
      {task.trade_category && (
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
          {task.trade_category}
        </span>
      )}
      {task.estimated_duration_days > 0 && (
        <span className="text-xs text-gray-500">{task.estimated_duration_days}d</span>
      )}
      {task.estimated_cost !== null && task.estimated_cost > 0 && (
        <span className="text-xs text-gray-500">CHF {task.estimated_cost.toLocaleString('de-CH')}</span>
      )}
    </div>
  )
}
