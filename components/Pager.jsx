'use client'

// iOS-style page control: chevron · dots · chevron. Sits at the card's bottom edge.
const Chevron = ({ dir }) => (
  <svg viewBox="0 0 10 16" width="8" height="13" aria-hidden="true">
    <path d={dir === 'left' ? 'M8 2 2 8l6 6' : 'M2 2l6 6-6 6'} />
  </svg>
)

export default function Pager({ page, total, onChange, accent }) {
  if (total < 2) return null
  return (
    <nav className="pager" style={accent ? { '--pager-accent': accent } : undefined} aria-label="Pages">
      <button className="pager-btn" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous">
        <Chevron dir="left" />
      </button>
      <div className="pager-dots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={`pager-dot${i === page ? ' on' : ''}`}
            onClick={() => onChange(i)}
            aria-label={`Page ${i + 1}`}
            aria-current={i === page ? 'page' : undefined}
          />
        ))}
      </div>
      <button className="pager-btn" disabled={page === total - 1} onClick={() => onChange(page + 1)} aria-label="Next">
        <Chevron dir="right" />
      </button>
    </nav>
  )
}
