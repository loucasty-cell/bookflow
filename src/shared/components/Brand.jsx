import { BookOpen } from 'lucide-react'

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <span><BookOpen size={compact ? 17 : 20} /></span>
      <strong>bookflow</strong>
    </div>
  )
}
