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
        "rounded-xl shadow-lg w-full " +
        // responsive grid + spacing
        "grid grid-cols-1 lg:grid-cols-5 bg-white " +
        // height behavior: don't force h-full; allow it to size naturally
        "min-h-0 " +
        // prevent horizontal overflow on small screens (without clipping vertical content)
        "overflow-x-hidden " +
        className
      }
    >
      {/* LEFT (60%) */}
      <div
        className={
          "min-h-0 lg:col-span-3 bg-zinc-800 relative " +
          // responsive padding
          "p-3 sm:p-4 " +
          // allow content to scroll if needed (fixes clipping on laptops)
          "overflow-auto " +
          leftClassName
        }
      >
        {left}
      </div>

      {/* RIGHT (40%) */}
      <div
        className={
          "min-h-0 lg:col-span-2 bg-gray-50 " +
          // responsive padding
          "p-3 sm:p-4 " +
          // allow scrolling instead of clipping
          "overflow-auto " +
          rightClassName
        }
      >
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