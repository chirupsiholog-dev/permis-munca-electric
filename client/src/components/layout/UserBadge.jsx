export default function UserBadge({ user }) {
  return (
    <div className="flex items-center gap-2.5 border-l border-line-soft pl-[22px]">
      <div className="flex h-[30px] w-[30px] items-center justify-center bg-ink text-nav font-bold tracking-[0.06em] text-white">
        {user.initiale}
      </div>
      <span className="hidden text-cta text-ink-600 sm:block">{user.nume}</span>
    </div>
  )
}
