import Skeleton from '../ui/Skeleton.jsx'

/**
 * Stand-in for the whole authenticated shell while /api/auth/me is verifying the
 * session. The header is reproduced exactly — same 62px bar, same divider, same
 * avatar square — because it's identical on every page, so it lands without a
 * shift. The body is deliberately generic: at this point we don't yet know which
 * route the user is headed to.
 */
export default function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-[62px] flex-none items-center justify-between border-b border-line bg-surface px-7">
        <div className="flex flex-col gap-[5px]">
          <Skeleton className="h-[9px] w-[104px]" />
          <Skeleton className="h-[9px] w-[74px]" />
        </div>

        <div className="flex items-center gap-[22px]">
          <div className="hidden items-center gap-[22px] sm:flex">
            <Skeleton className="h-[9px] w-[42px]" />
            <Skeleton className="h-[9px] w-[54px]" />
            <Skeleton className="h-[9px] w-[46px]" />
          </div>
          <div className="flex items-center gap-2.5 border-l border-line-soft pl-[22px]">
            <Skeleton className="h-[30px] w-[30px]" />
            <Skeleton className="hidden h-[10px] w-[88px] sm:block" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-[26px] px-7 pb-16 pt-11">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[22px] w-[210px]" />
          <Skeleton className="h-[13px] w-[380px] max-w-full" />
        </div>

        <div className="border border-line bg-surface shadow-card">
          <div className="flex flex-col gap-4 p-8">
            <Skeleton className="h-[13px] w-[160px]" />
            <Skeleton className="h-[13px] w-full" />
            <Skeleton className="h-[13px] w-[72%]" />
          </div>
        </div>
      </main>
    </div>
  )
}
