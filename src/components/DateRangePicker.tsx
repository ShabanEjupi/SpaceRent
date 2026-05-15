import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
  label?: string;
}

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, className, label }: DateRangePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined
  });

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    if (newRange?.from) {
      onStartDateChange(format(newRange.from, 'yyyy-MM-dd'));
    } else {
      onStartDateChange('');
    }
    if (newRange?.to) {
      onEndDateChange(format(newRange.to, 'yyyy-MM-dd'));
    } else {
      onEndDateChange('');
    }
  };

  const displayDate = () => {
    if (range?.from) {
      if (range.to) {
        return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`;
      }
      return `${format(range.from, 'MMM d, yyyy')} - ${t('dropoff_date')}`;
    }
    return t('select_dates', 'Select dates');
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-[#E2B808] font-medium text-white/90 text-left relative ${className || ''}`}>
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          {displayDate()}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={5} className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-white" align="start">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            className="rdp-dark"
            modifiersClassNames={{
              selected: "bg-[#E2B808] text-black rounded-lg",
              range_middle: "bg-[#E2B808]/20 text-white rounded-none",
              range_start: "bg-[#E2B808] text-black rounded-l-lg",
              range_end: "bg-[#E2B808] text-black rounded-r-lg"
            }}
            styles={{
              month_caption: { color: 'white', fontWeight: 'bold' }
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
