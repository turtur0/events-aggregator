'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { format, isAfter, isBefore, startOfDay, isWithinInterval } from 'date-fns';
import {
  Filter, X, Plus, Minus, Users, Sparkles, TrendingUp, DollarSign,
  Calendar as CalendarIcon, Clock, ArrowUpDown, Tag, Grid3x3, Ticket, Archive
} from 'lucide-react';
import { CATEGORIES } from '@/lib/constants/categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Calendar } from '@/components/ui/Calendar';

export type SortOption = 'recommended' | 'popular' | 'price-low' | 'price-high' | 'date-soon' | 'date-late' | 'recently-added';
export type ArchivedSortOption = 'date-recent' | 'date-old' | 'popular' | 'recently-archived';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended', icon: Sparkles, requiresAuth: true },
  { value: 'popular', label: 'Most Popular', icon: TrendingUp, requiresAuth: false },
  { value: 'price-low', label: 'Price: Low to High', icon: DollarSign, requiresAuth: false },
  { value: 'price-high', label: 'Price: High to Low', icon: DollarSign, requiresAuth: false },
  { value: 'date-soon', label: 'Date: Soonest', icon: CalendarIcon, requiresAuth: false },
  { value: 'date-late', label: 'Date: Latest', icon: CalendarIcon, requiresAuth: false },
  { value: 'recently-added', label: 'Recently Added', icon: Clock, requiresAuth: false },
];

const ARCHIVED_SORT_OPTIONS = [
  { value: 'date-recent', label: 'Most Recent', icon: CalendarIcon },
  { value: 'date-old', label: 'Oldest First', icon: CalendarIcon },
  { value: 'popular', label: 'Most Popular', icon: TrendingUp },
  { value: 'recently-archived', label: 'Recently Archived', icon: Archive },
];

interface EventFiltersProps {
  isAuthenticated?: boolean;
  hideRecommendedSort?: boolean;
  hideDateFilters?: boolean;
  hideAccessibilityFilter?: boolean;
  hideCategoryFilter?: boolean;
  hideSubcategoryFilter?: boolean;
  isArchived?: boolean;
}

export function EventFilters(props: EventFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Extract filter values
  const category = searchParams.get('category') || 'all';
  const subcategory = searchParams.get('subcategory') || 'all';
  const dateFilter = searchParams.get('date') || 'all';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const freeOnly = searchParams.get('free') === 'true';
  const accessibleOnly = searchParams.get('accessible') === 'true';
  const sortOption = props.isArchived
    ? (searchParams.get('sort') as ArchivedSortOption) || 'date-recent'
    : (searchParams.get('sort') as SortOption) || (props.isAuthenticated ? 'recommended' : 'date-soon');

  const hasCustomDateRange = Boolean(dateFrom || dateTo);
  const selectedCategory = CATEGORIES.find(cat => cat.value === category);

  // Filter available sort options
  const availableSortOptions = props.isArchived
    ? ARCHIVED_SORT_OPTIONS
    : SORT_OPTIONS.filter(opt =>
      (!opt.requiresAuth || props.isAuthenticated) &&
      (!props.hideRecommendedSort || opt.value !== 'recommended')
    );

  // Calculate active filters
  const activeFilters = [
    !props.hideCategoryFilter && category !== 'all',
    !props.hideSubcategoryFilter && subcategory !== 'all',
    !props.hideDateFilters && (dateFilter !== 'all' || hasCustomDateRange),
    freeOnly,
    !props.hideAccessibilityFilter && accessibleOnly,
  ].filter(Boolean).length;

  // Update URL helper
  const updateURL = (updates: Record<string, string | boolean>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === false) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (value: string) => {
    updateURL({ category: value, subcategory: 'all' });
  };

  const clearAllFilters = () => {
    const updates: Record<string, string> = { free: 'all', accessible: 'all' };
    if (!props.hideCategoryFilter) updates.category = 'all';
    if (!props.hideSubcategoryFilter) updates.subcategory = 'all';
    if (!props.hideDateFilters) {
      updates.date = 'all';
      updates.dateFrom = 'all';
      updates.dateTo = 'all';
    }
    updateURL(updates);
  };

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    updateURL({
      date: 'all',
      dateFrom: from ? format(from, 'yyyy-MM-dd') : 'all',
      dateTo: to ? format(to, 'yyyy-MM-dd') : 'all',
    });
  };

  // Dynamic grid columns
  const visibleDropdowns = [
    true,
    !props.hideCategoryFilter,
    !props.hideSubcategoryFilter,
    !props.hideDateFilters
  ].filter(Boolean).length;

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[visibleDropdowns] || 'grid-cols-1 sm:grid-cols-2';

  const getDateBadgeText = () => {
    if (hasCustomDateRange) {
      const from = dateFrom ? format(new Date(dateFrom), 'dd MMM') : '';
      const to = dateTo ? format(new Date(dateTo), 'dd MMM') : '';
      if (from && to) return `${from} - ${to}`;
      return from ? `From ${from}` : `Until ${to}`;
    }
    return dateFilter.replace('-', ' ');
  };

  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="bg-card border-2 rounded-lg p-4 transition-all hover:border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold">Filters & Sort</h3>
            {activeFilters > 0 && (
              <Badge className="bg-primary text-primary-foreground animate-in fade-in zoom-in">
                {activeFilters}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 w-8 transition-all hover:bg-primary/10 hover:text-primary"
              aria-expanded={showFilters}
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            >
              {showFilters ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>

            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 transition-all hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t animate-in fade-in slide-in-from-top-2">
            {!props.hideCategoryFilter && category !== 'all' && (
              <FilterBadge icon={Tag} label={selectedCategory?.label || category} onRemove={() => handleCategoryChange('all')} />
            )}
            {!props.hideSubcategoryFilter && subcategory !== 'all' && (
              <FilterBadge icon={Grid3x3} label={subcategory} onRemove={() => updateURL({ subcategory: 'all' })} />
            )}
            {!props.hideDateFilters && (dateFilter !== 'all' || hasCustomDateRange) && (
              <FilterBadge icon={CalendarIcon} label={getDateBadgeText()} onRemove={() => updateURL({ date: 'all', dateFrom: 'all', dateTo: 'all' })} variant="secondary" />
            )}
            {freeOnly && (
              <FilterBadge icon={Ticket} label="Free only" onRemove={() => updateURL({ free: false })} variant="emerald" />
            )}
            {!props.hideAccessibilityFilter && accessibleOnly && (
              <FilterBadge icon={Users} label="Accessible only" onRemove={() => updateURL({ accessible: false })} variant="emerald" />
            )}
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="bg-card border-2 rounded-lg p-4 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-4">
            {/* Dropdowns */}
            <div className={`grid gap-4 ${gridClasses}`}>
              {/* Sort */}
              <FilterSelect
                label="Sort by"
                icon={ArrowUpDown}
                value={sortOption}
                onChange={(value) => updateURL({ sort: value })}
                options={availableSortOptions}
              />

              {/* Category */}
              {!props.hideCategoryFilter && (
                <FilterSelect
                  label="Category"
                  icon={Tag}
                  value={category}
                  onChange={handleCategoryChange}
                  options={[
                    { value: 'all', label: 'All categories' },
                    ...CATEGORIES.map(cat => ({ value: cat.value, label: cat.label })),
                  ]}
                />
              )}

              {/* Subcategory */}
              {!props.hideSubcategoryFilter && (
                <FilterSelect
                  label="Subcategory"
                  icon={Grid3x3}
                  value={subcategory}
                  onChange={(value) => updateURL({ subcategory: value })}
                  disabled={category === 'all' || !selectedCategory?.subcategories?.length}
                  options={[
                    { value: 'all', label: 'All types' },
                    ...(selectedCategory?.subcategories?.map(sub => ({ value: sub, label: sub })) || []),
                  ]}
                />
              )}

              {/* Date */}
              {!props.hideDateFilters && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                    Date Range
                  </Label>
                  <div className="flex gap-2">
                    <Select value={hasCustomDateRange ? 'custom' : dateFilter} onValueChange={(value) => updateURL({ date: value, dateFrom: 'all', dateTo: 'all' })}>
                      <SelectTrigger className="border-2 hover:border-secondary/30 transition-colors flex-1">
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This week</SelectItem>
                        <SelectItem value="this-month">This month</SelectItem>
                        <SelectItem value="next-month">Next month</SelectItem>
                        {hasCustomDateRange && <SelectItem value="custom">Custom range</SelectItem>}
                      </SelectContent>
                    </Select>

                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`border-2 hover:border-secondary/30 transition-all hover:scale-105 ${hasCustomDateRange ? 'bg-secondary/10 border-secondary/30 scale-105' : ''}`}
                          aria-label="Open calendar"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0" align="end">
                        <DateRangePicker
                          dateFrom={dateFrom ? new Date(dateFrom) : undefined}
                          dateTo={dateTo ? new Date(dateTo) : undefined}
                          onDateChange={handleDateRangeChange}
                          onClose={() => setDatePopoverOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-3">
              <FilterToggle id="free-only" label="Free only" icon={Ticket} checked={freeOnly} onChange={(checked) => updateURL({ free: checked })} />
              {!props.hideAccessibilityFilter && (
                <FilterToggle id="accessible-only" label="Accessible only" icon={Users} checked={accessibleOnly} onChange={(checked) => updateURL({ accessible: checked })} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified sub-components
function FilterBadge({ icon: Icon, label, onRemove, variant = 'primary' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onRemove: () => void;
  variant?: 'primary' | 'secondary' | 'emerald';
}) {
  const styles = {
    primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20',
    emerald: 'border-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400',
  }[variant];

  return (
    <Badge variant="secondary" className={`gap-1 transition-colors ${styles}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
      <button onClick={onRemove} className="ml-1 hover:text-destructive transition-colors" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function FilterSelect({ label, icon: Icon, value, onChange, disabled, options }: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: Array<{ value: string; label: string; icon?: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="border-2 hover:border-primary/30 transition-colors disabled:opacity-50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(({ value, label, icon: OptionIcon }) => (
            <SelectItem key={value} value={value}>
              <div className="flex items-center gap-2">
                {OptionIcon && <OptionIcon className="h-4 w-4" />}
                <span>{label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterToggle({ id, label, icon: Icon, checked, onChange }: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-2 rounded-md transition-all hover:border-emerald-500/30 hover:scale-[1.02] bg-background">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-emerald-600" />
      <Label htmlFor={id} className="cursor-pointer text-sm">{label}</Label>
    </div>
  );
}

function DateRangePicker({ dateFrom, dateTo, onDateChange, onClose }: {
  dateFrom?: Date;
  dateTo?: Date;
  onDateChange: (from: Date | undefined, to: Date | undefined) => void;
  onClose: () => void;
}) {
  const [selectedFrom, setSelectedFrom] = useState<Date | undefined>(dateFrom);
  const [selectedTo, setSelectedTo] = useState<Date | undefined>(dateTo);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const today = startOfDay(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!selectedFrom || (selectedFrom && selectedTo)) {
      setSelectedFrom(date);
      setSelectedTo(undefined);
    } else {
      if (isBefore(date, selectedFrom)) {
        setSelectedTo(selectedFrom);
        setSelectedFrom(date);
      } else {
        setSelectedTo(date);
      }
    }
  };

  const isInRange = (date: Date) => {
    if (!selectedFrom) return false;
    const end = selectedTo || (hoveredDate && isAfter(hoveredDate, selectedFrom) ? hoveredDate : undefined);
    return end ? isWithinInterval(date, { start: selectedFrom, end }) : false;
  };

  return (
    <div className="space-y-4 p-4 w-full">
      <div className="text-sm text-muted-foreground text-center pb-2 border-b">
        {!selectedFrom ? 'Select start date' : !selectedTo ? 'Select end date' : 'Click a date to start new selection'}
      </div>

      <Calendar
        mode="single"
        selected={selectedFrom}
        onSelect={handleDateSelect}
        disabled={(date) => isBefore(date, today)}
        initialFocus
        className="rounded-md border-0 w-full"
        onDayMouseEnter={setHoveredDate}
        onDayMouseLeave={() => setHoveredDate(undefined)}
        modifiers={{
          range_start: selectedFrom,
          range_end: selectedTo,
          range_middle: (date) => isInRange(date) && date !== selectedFrom && date !== selectedTo,
        }}
        modifiersClassNames={{
          range_start: 'bg-primary text-primary-foreground font-bold rounded-l-md rounded-r-none',
          range_end: 'bg-primary text-primary-foreground font-bold rounded-r-md rounded-l-none',
          range_middle: 'bg-primary/15 hover:bg-primary/25 rounded-none',
        }}
      />

      {(selectedFrom || selectedTo) && (
        <div className="px-3 py-3 bg-muted/50 rounded-md space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground font-medium">From:</span>
            <span className="text-sm font-semibold">{selectedFrom ? format(selectedFrom, 'dd MMM yyyy') : '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground font-medium">To:</span>
            <span className="text-sm font-semibold">{selectedTo ? format(selectedTo, 'dd MMM yyyy') : '—'}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={() => { setSelectedFrom(undefined); setSelectedTo(undefined); onDateChange(undefined, undefined); onClose(); }} className="flex-1">
          Clear
        </Button>
        <Button size="sm" onClick={() => { onDateChange(selectedFrom, selectedTo); onClose(); }} disabled={!selectedFrom} className="flex-1">
          Apply
        </Button>
      </div>
    </div>
  );
}