'use client'

import { useState } from 'react'
import {
  Plus, ChevronRight, GripVertical, Calendar, User, Trash2, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockTasks, type MockTask } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

const columns: { id: MockTask['status']; title: string; color: string }[] = [
  { id: 'new', title: 'New', color: 'bg-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'review', title: 'Review', color: 'bg-cyan-500' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
]

const priorityStyle: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

function TaskCard({
  task,
  onMove,
}: {
  task: MockTask
  onMove: (id: string, direction: 'left' | 'right') => void
}) {
  const colIndex = columns.findIndex((c) => c.id === task.status)

  return (
    <div className="border border-border/50 rounded-lg p-3 hover:border-primary/20 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant="outline" className={`text-[10px] ${priorityStyle[task.priority]}`}>
          {task.priority}
        </Badge>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {colIndex > 0 && (
            <button
              onClick={() => onMove(task.id, 'left')}
              className="p-0.5 rounded hover:bg-muted"
              title="Move left"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
            </button>
          )}
          {colIndex < columns.length - 1 && (
            <button
              onClick={() => onMove(task.id, 'right')}
              className="p-0.5 rounded hover:bg-muted"
              title="Move right"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <h4 className="text-sm font-medium mb-1.5 leading-tight">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {task.assignee && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.assignee}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function WorkflowView() {
  const [tasks, setTasks] = useState<MockTask[]>(mockTasks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    assignee: '',
    dueDate: '',
  })
  const [loading, setLoading] = useState(false)

  const moveTask = (id: string, direction: 'left' | 'right') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const idx = columns.findIndex((c) => c.id === t.status)
        const newIdx = direction === 'right' ? idx + 1 : idx - 1
        if (newIdx < 0 || newIdx >= columns.length) return t
        return { ...t, status: columns[newIdx].id }
      })
    )
  }

  const addTask = async () => {
    if (!newTask.title.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          assignee: newTask.assignee,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setTasks((prev) => [
          {
            id: created.id,
            title: newTask.title,
            description: newTask.description || undefined,
            status: 'new',
            priority: newTask.priority,
            assignee: newTask.assignee || undefined,
            dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
        setDialogOpen(false)
        setNewTask({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' })
      }
    } catch {
      // Fallback to local state
      setTasks((prev) => [
        {
          id: `local-${Date.now()}`,
          title: newTask.title,
          description: newTask.description || undefined,
          status: 'new',
          priority: newTask.priority,
          assignee: newTask.assignee || undefined,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setDialogOpen(false)
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage security tasks from discovery to resolution
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="Task title..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  placeholder="Task description..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) => setNewTask({ ...newTask, priority: v as 'low' | 'medium' | 'high' | 'critical' })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Assignee</Label>
                <Input
                  placeholder="Assign to..."
                  value={newTask.assignee}
                  onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button size="sm" onClick={addTask} disabled={loading || !newTask.title.trim()}>
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id)
          return (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {columnTasks.length}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} />
                ))}
                {columnTasks.length === 0 && (
                  <div className="border border-dashed border-border/50 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
