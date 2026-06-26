import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface Criterion {
  name: string
  maxScore: number
}

interface RubricBuilderProps {
  criteria: Criterion[]
  onChange: (criteria: Criterion[]) => void
  readOnly?: boolean
}

export default function RubricBuilder({ criteria, onChange, readOnly }: RubricBuilderProps) {
  const addCriterion = () => {
    onChange([...criteria, { name: '', maxScore: 10 }])
  }

  const removeCriterion = (i: number) => {
    onChange(criteria.filter((_, idx) => idx !== i))
  }

  const update = (i: number, field: keyof Criterion, value: string | number) => {
    const updated = criteria.map((c, idx) =>
      idx === i ? { ...c, [field]: value } : c
    )
    onChange(updated)
  }

  const total = criteria.reduce((sum, c) => sum + Number(c.maxScore), 0)

  if (readOnly) {
    return (
      <div className="space-y-2">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="text-muted-foreground">{c.maxScore} pts</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-sm font-medium">
          <span>Total</span>
          <span>{total} / 100</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {criteria.map((c, i) => (
        <div key={i} className="flex items-center gap-3">
          <Input
            placeholder="Criterion name"
            value={c.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Max"
            value={c.maxScore}
            onChange={(e) => update(i, 'maxScore', Number(e.target.value))}
            className="w-20"
            min={1}
            max={100}
          />
          <span className="text-xs text-muted-foreground w-12">pts</span>
          <Button variant="ghost" size="icon" onClick={() => removeCriterion(i)} className="text-red-500 shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={addCriterion}>
          <Plus className="mr-1 h-4 w-4" />
          Add Criterion
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Total: {total} / 100 pts
        </span>
      </div>
    </div>
  )
}
