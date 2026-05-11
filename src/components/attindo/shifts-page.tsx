'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Star,
  Users,
  Timer,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

interface ShiftData {
  id: string
  name: string
  nameAr: string
  startTime: string
  endTime: string
  graceMinutes: number
  overtimeThreshold: number
  isDefault: boolean
  color: string
  daysOfWeek: string
  employeeCount: number
}

const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

const DEFAULT_COLORS = [
  '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#3B82F6', '#EC4899', '#10B981', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#E11D48',
]

const defaultForm = {
  name: '',
  nameAr: '',
  startTime: '08:00',
  endTime: '17:00',
  graceMinutes: 15,
  overtimeThreshold: 8.0,
  isDefault: false,
  color: '#14B8A6',
  daysOfWeek: [0, 1, 2, 3, 4] as number[],
}

export function ShiftsPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  // Shifts are free - no license restriction
  const isLocked = false

  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...defaultForm })

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts')
      if (res.ok) {
        const data = await res.json()
        setShifts(data.shifts || [])
      }
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setEditingId(null)
    setForm({ ...defaultForm })
    setDialogOpen(true)
  }

  const openEditDialog = (shift: ShiftData) => {
    setEditingId(shift.id)
    setForm({
      name: shift.name,
      nameAr: shift.nameAr,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      overtimeThreshold: shift.overtimeThreshold,
      isDefault: shift.isDefault,
      color: shift.color,
      daysOfWeek: shift.daysOfWeek.split(',').map(Number).filter((n) => !isNaN(n)),
    })
    setDialogOpen(true)
  }

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }))
  }

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error(isRTL ? 'اسم الوردية مطلوب' : 'Shift name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        nameAr: form.nameAr,
        startTime: form.startTime,
        endTime: form.endTime,
        graceMinutes: form.graceMinutes,
        overtimeThreshold: form.overtimeThreshold,
        isDefault: form.isDefault,
        color: form.color,
        daysOfWeek: form.daysOfWeek.join(','),
      }

      const res = await fetch('/api/shifts', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(
          editingId
            ? isRTL ? 'تم تحديث الوردية' : 'Shift updated successfully'
            : isRTL ? 'تم إضافة الوردية' : 'Shift added successfully'
        )
        setDialogOpen(false)
        setForm({ ...defaultForm })
        setEditingId(null)
        fetchShifts()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed')
      }
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(isRTL ? 'تم حذف الوردية' : 'Shift deleted successfully')
        setDeleteConfirmId(null)
        fetchShifts()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete')
        setDeleteConfirmId(null)
      }
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    }
  }

  const getDaysLabel = (daysOfWeek: string) => {
    const days = daysOfWeek.split(',').map(Number).filter((n) => !isNaN(n))
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) {
      return isRTL ? 'من الإثنين إلى الجمعة' : 'Mon–Fri'
    }
    if (days.length === 7) {
      return isRTL ? 'كل يوم' : 'Every day'
    }
    if (days.length === 6 && [0, 1, 2, 3, 4, 5].every((d) => days.includes(d))) {
      return isRTL ? 'من الأحد إلى الجمعة' : 'Sun–Fri'
    }
    return days.map((d) => isRTL ? DAY_LABELS_AR[d] : DAY_LABELS_EN[d]).join(', ')
  }

  const getShiftDuration = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    let diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff < 0) diff += 24 * 60 // Handle overnight shifts
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-600" />
            {isRTL ? 'الورديات والجداول' : 'Shifts & Schedules'}
            {isLocked && <AlertTriangle className="w-4 h-4 text-amber-500" />}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL
              ? `عدد الورديات: ${shifts.length}`
              : `${shifts.length} shift${shifts.length !== 1 ? 's' : ''} configured`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={isLocked}
              onClick={openAddDialog}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة وردية' : 'Add Shift'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? isRTL ? 'تعديل الوردية' : 'Edit Shift'
                  : isRTL ? 'إضافة وردية جديدة' : 'Add New Shift'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'اسم الوردية' : 'Shift Name'}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={isRTL ? 'مثال: وردية الصباح' : 'e.g. Morning Shift'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                  <Input
                    dir="rtl"
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    placeholder="اسم الوردية"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'وقت البداية' : 'Start Time'}</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'وقت النهاية' : 'End Time'}</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Grace & Overtime */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'فترة السماح (دقيقة)' : 'Grace Period (min)'}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={form.graceMinutes}
                    onChange={(e) => setForm({ ...form, graceMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'حد الإضافي (ساعات)' : 'Overtime Threshold (hrs)'}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.overtimeThreshold}
                    onChange={(e) => setForm({ ...form, overtimeThreshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div className="space-y-2">
                <Label>{isRTL ? 'أيام العمل' : 'Working Days'}</Label>
                <div className="flex flex-wrap gap-2">
                  {(isRTL ? [...DAY_LABELS_AR].reverse() : DAY_LABELS_EN).map((label, idx) => {
                    const dayIndex = isRTL ? 6 - idx : idx
                    return (
                      <div key={dayIndex} className="flex items-center gap-1.5">
                        <Checkbox
                          checked={form.daysOfWeek.includes(dayIndex)}
                          onCheckedChange={() => toggleDay(dayIndex)}
                          className="border-slate-300"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <Label>{isRTL ? 'اللون' : 'Color'}</Label>
                <div className="flex flex-wrap gap-2 items-center">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        form.color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <Input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-8 h-8 p-0 border-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">{form.color}</span>
                  </div>
                </div>
              </div>

              {/* Default Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {isRTL ? 'وردية افتراضية' : 'Default Shift'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isRTL ? 'تُعين للموظفين الجدد تلقائياً' : 'Assigned to new employees automatically'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.name || form.daysOfWeek.length === 0}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving
                  ? isRTL ? 'جاري الحفظ...' : 'Saving...'
                  : editingId
                    ? isRTL ? 'تحديث الوردية' : 'Update Shift'
                    : isRTL ? 'إضافة الوردية' : 'Add Shift'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* License Warning */}
      {isLocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {isRTL ? 'ترخيص HR غير مفعل' : 'HR License Not Active'}
              </p>
              <p className="text-xs text-amber-600">
                {isRTL
                  ? 'يرجى تفعيل ترخيص HR للوصول إلى هذه الميزة'
                  : 'Please activate an HR license to access this feature'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-teal-50 p-2 rounded-lg"><Clock className="w-4 h-4 text-teal-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'الورديات' : 'Shifts'}</p>
              <p className="text-xl font-bold text-slate-900">{shifts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-lg"><Star className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'افتراضية' : 'Default'}</p>
              <p className="text-xl font-bold text-slate-900">{shifts.filter((s) => s.isDefault).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg"><Users className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'الموظفين' : 'Employees'}</p>
              <p className="text-xl font-bold text-slate-900">{shifts.reduce((sum, s) => sum + s.employeeCount, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg"><Timer className="w-4 h-4 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'متوسط الساعات' : 'Avg Hours'}</p>
              <p className="text-xl font-bold text-slate-900">
                {shifts.length > 0
                  ? (shifts.reduce((sum, s) => {
                      const [sh, sm] = s.startTime.split(':').map(Number)
                      const [eh, em] = s.endTime.split(':').map(Number)
                      let diff = (eh * 60 + em) - (sh * 60 + sm)
                      if (diff < 0) diff += 24 * 60
                      return sum + diff / 60
                    }, 0) / shifts.length).toFixed(1)
                  : '0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Cards Grid */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" />
          </CardContent>
        </Card>
      ) : shifts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {isRTL ? 'لا توجد ورديات بعد' : 'No shifts configured yet'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {isRTL ? 'أضف وردية لبدء إدارة الجداول' : 'Add a shift to start managing schedules'}
            </p>
            <Button
              onClick={openAddDialog}
              className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة وردية' : 'Add Shift'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card
              key={shift.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Color Bar */}
              <div className="h-1.5" style={{ backgroundColor: shift.color }} />
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: shift.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {isRTL && shift.nameAr ? shift.nameAr : shift.name}
                        </h3>
                        {shift.isDefault && (
                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 px-1.5 py-0">
                            {isRTL ? 'افتراضي' : 'Default'}
                          </Badge>
                        )}
                      </div>
                      {(isRTL ? shift.name : shift.nameAr) && (
                        <p className="text-xs text-slate-400 truncate" dir={isRTL ? 'ltr' : 'rtl'}>
                          {isRTL ? shift.name : shift.nameAr}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-teal-600"
                      onClick={() => openEditDialog(shift)}
                      disabled={isLocked}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => setDeleteConfirmId(shift.id)}
                      disabled={isLocked}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-mono font-medium text-slate-800">
                      {shift.startTime}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-sm font-mono font-medium text-slate-800">
                      {shift.endTime}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                    {getShiftDuration(shift.startTime, shift.endTime)}
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">
                      {isRTL ? 'السماح' : 'Grace'}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {shift.graceMinutes}<span className="text-[10px] text-slate-400 ml-0.5">{isRTL ? 'د' : 'm'}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">
                      {isRTL ? 'إضافي' : 'O/T'}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {shift.overtimeThreshold}<span className="text-[10px] text-slate-400 ml-0.5">{isRTL ? 'س' : 'h'}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">
                      {isRTL ? 'موظفين' : 'Staff'}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">{shift.employeeCount}</p>
                  </div>
                </div>

                {/* Days */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const activeDays = shift.daysOfWeek.split(',').map(Number)
                    const isActive = activeDays.includes(i)
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center ${
                          isActive
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-300'
                        }`}
                        style={isActive ? { backgroundColor: shift.color } : {}}
                      >
                        {isRTL ? DAY_LABELS_AR[i].charAt(0) : DAY_LABELS_EN[i].charAt(0)}
                      </div>
                    )
                  })}
                </div>

                {/* Days Label */}
                <p className="text-xs text-slate-400">
                  {getDaysLabel(shift.daysOfWeek)}
                </p>

                {/* Delete Confirmation */}
                {deleteConfirmId === shift.id && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 mb-2">
                      {isRTL
                        ? 'هل أنت متأكد من حذف هذه الوردية؟'
                        : 'Are you sure you want to delete this shift?'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => handleDelete(shift.id)}
                      >
                        {isRTL ? 'حذف' : 'Delete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-slate-200"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
