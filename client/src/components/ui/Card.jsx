export default function Card({ className = '', children, ...props }) {
  return (
    <div
      {...props}
      className={`border border-line bg-surface shadow-card ${className}`}
    >
      {children}
    </div>
  )
}
