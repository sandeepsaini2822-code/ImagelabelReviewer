import React from "react"

type Props = {
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
  leftClassName?: string
  rightClassName?: string
}

/**
 * Dashboard layout wrapper: 60/40 split (3/2 in a 5-col grid)
 * - Desktop: left 60%, right 40%
 * - Mobile: stacked (1 column)
 *
 * Non-breaking:
 * - You can use <DashboardLayout left={...} right={...} />
 * - Or use <DashboardLayout> with DashboardLayout.Left / Right
 */
export function DashboardLayout({
  left,
  right,
  className = "",
  leftClassName = "",
  rightClassName = "",
}: Props) {
  return (
    <div
      className={
        "rounded-xl shadow-lg overflow-hidden w-full " +
        "grid grid-cols-1 lg:grid-cols-5 bg-white " +
        "h-full min-h-0 " +
        className
      }

    >
      {/* LEFT (60%) */}
      <div className={"h-full min-h-0 lg:col-span-3 bg-zinc-800 relative p-3 overflow-hidden " + leftClassName}>

        {left}
      </div>

      {/* RIGHT (40%) */}
      <div className={"h-full min-h-0 lg:col-span-2 p-4 bg-gray-50 overflow-hidden " + rightClassName}>

        {right}
      </div>
    </div>
  )
}

/** Optional slot API (if you prefer this style later) */
DashboardLayout.Left = function Left({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
DashboardLayout.Right = function Right({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export default DashboardLayout
