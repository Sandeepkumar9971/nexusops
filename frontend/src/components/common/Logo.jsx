import { Waypoints } from 'lucide-react'

const SIZE_CLASSES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 16 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 20 },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 24 },
}

// NexusOps' brand mark: a network of connected waypoints, standing in for
// "operations intelligence across connected facilities" — a pictorial
// glyph rather than a single-letter avatar, so it reads as an actual logo.
export default function Logo({ size = 'md', className = '' }) {
  const { box, icon } = SIZE_CLASSES[size]
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${box} bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md shadow-blue-500/30 ${className}`}
    >
      <Waypoints size={icon} strokeWidth={2.25} />
    </div>
  )
}
