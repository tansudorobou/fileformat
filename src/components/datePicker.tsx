import { CalendarIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
} from "@/components/ui/calendar"
import { DatePicker, DatePickerContent } from "@/components/ui/date-picker"
import { DateInput } from "@/components/ui/datefield"
import { FieldGroup, Label } from "@/components/ui/field"
import { type CalendarDate, parseDate } from "@internationalized/date"
import { format, parse } from "date-fns"

export function Datepicker({
  jsonKey,
  value,
  parseFormat,
  handleInputChange,
}: {
  jsonKey: string
  value: string
  parseFormat: string
  handleInputChange: (key: string, value: string) => void
}) {
  return (
    <DatePicker
      className="min-w-[208px] space-y-1"
      defaultValue={stringToISO8601ToCalenderDate({ value, parseFormat })}
      onChange={(date) =>
        handleInputChange(
          jsonKey,
          calendarDateToFormatDate({ date, parseFormat }),
        )
      }
    >
      <Label>{jsonKey.charAt(0).toUpperCase() + jsonKey.slice(1)}:</Label>
      <FieldGroup>
        <DateInput className="flex-1" variant="ghost" />
        <Button
          variant="ghost"
          size="icon"
          className="mr-1 size-6 data-[focus-visible]:ring-offset-0"
        >
          <CalendarIcon aria-hidden className="size-4" />
        </Button>
      </FieldGroup>
      <DatePickerContent>
        <Calendar>
          <CalendarHeading />
          <CalendarGrid>
            <CalendarGridHeader>
              {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody>
              {(date) => <CalendarCell date={date} />}
            </CalendarGridBody>
          </CalendarGrid>
        </Calendar>
      </DatePickerContent>
    </DatePicker>
  )
}

function stringToISO8601ToCalenderDate({
  value,
  parseFormat,
}: { value: string; parseFormat: string }): CalendarDate {
  return parseDate(format(parse(value, parseFormat, new Date()), "yyyy-MM-dd"))
}

function calendarDateToFormatDate({
  date,
  parseFormat,
}: {
  date: CalendarDate
  parseFormat: string
}): string {
  return format(parse(date.toString(), "yyyy-MM-dd", new Date()), parseFormat)
}
