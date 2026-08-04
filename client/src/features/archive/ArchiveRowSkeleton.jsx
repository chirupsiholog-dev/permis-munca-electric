import Skeleton from '../../components/ui/Skeleton.jsx'
import { GRID } from './archiveGrid.js'

/**
 * Placeholder row. Uses the same GRID as the real rows and the same vertical
 * padding, so the header, the skeletons and the loaded table all line up and
 * nothing jumps when the data arrives.
 *
 * Bar widths vary slightly per row so a stack of these reads as content rather
 * than as a repeating pattern.
 */
export default function ArchiveRowSkeleton({ index = 0 }) {
  const wide = index % 2 === 0

  return (
    <div
      style={GRID}
      className="items-center border-b border-line-faint px-[22px] py-[15px]"
    >
      <Skeleton className="h-[11px] w-[68px]" />

      <span className="flex min-w-0 flex-col gap-[6px]">
        <Skeleton className={`h-[11px] ${wide ? 'w-[78%]' : 'w-[62%]'}`} />
        <Skeleton className="h-[9px] w-[45%]" />
      </span>

      <span className="flex items-center gap-2">
        <Skeleton className="h-2 w-2 flex-none" />
        <Skeleton className="h-[9px] w-[74px]" />
      </span>

      <span className="flex min-w-0 flex-col gap-[6px]">
        <Skeleton className="h-[10px] w-[70%]" />
        <Skeleton className="h-[9px] w-[52px]" />
      </span>

      <span className="flex min-w-0 flex-col gap-[6px]">
        <Skeleton className={`h-[10px] ${wide ? 'w-[76%]' : 'w-[58%]'}`} />
        <Skeleton className="h-[9px] w-[52px]" />
      </span>

      <Skeleton className="h-[11px] w-[56px]" />

      <span className="flex items-center gap-2.5 justify-self-end">
        <Skeleton className="h-[9px] w-[58px]" />
        <Skeleton className="h-[30px] w-[30px] flex-none" />
      </span>
    </div>
  )
}
