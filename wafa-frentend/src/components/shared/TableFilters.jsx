import React, { useState } from "react";
import { Search, Calendar, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * Reusable TableFilters component for admin tables
 * 
 * @param {Object} props
 * @param {string} props.searchValue - Current search value
 * @param {function} props.onSearchChange - Handler for search changes
 * @param {string} props.searchPlaceholder - Placeholder text for search input
 * @param {Date} props.startDate - Start date for date range filter
 * @param {Date} props.endDate - End date for date range filter
 * @param {function} props.onDateChange - Handler for date changes: ({startDate, endDate}) => void
 * @param {boolean} props.showDateFilter - Whether to show date filter (default: true)
 * @param {Array} props.additionalFilters - Array of additional filter configs: [{key, label, options: [{value, label}], value, onChange}]
 * @param {function} props.onClearFilters - Handler to clear all filters
 * @param {number} props.activeFilterCount - Number of active filters for badge
 */
const TableFilters = ({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  startDate,
  endDate,
  onDateChange,
  showDateFilter = true,
  additionalFilters = [],
  onClearFilters,
  activeFilterCount = 0,
}) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const handleApplyDateFilter = () => {
    onDateChange?.({ startDate: tempStartDate, endDate: tempEndDate });
    setDatePopoverOpen(false);
  };

  const handleClearDateFilter = () => {
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    onDateChange?.({ startDate: undefined, endDate: undefined });
    setDatePopoverOpen(false);
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "dd/MM/yy", { locale: fr })} - ${format(endDate, "dd/MM/yy", { locale: fr })}`;
    }
    if (startDate) {
      return `Depuis ${format(startDate, "dd/MM/yy", { locale: fr })}`;
    }
    if (endDate) {
      return `Jusqu'à ${format(endDate, "dd/MM/yy", { locale: fr })}`;
    }
    return "Filtrer par date";
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 pr-10 h-10 border-border focus:border-blue-500 focus:ring-blue-500"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange?.("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        {showDateFilter && (
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 px-4 gap-2 border-border",
                  (startDate || endDate) && "border-blue-500 bg-blue-50 text-blue-700"
                )}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{formatDateRange()}</span>
                <span className="sm:hidden">Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date début</label>
                    <Input
                      type="date"
                      value={tempStartDate ? format(tempStartDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setTempStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date fin</label>
                    <Input
                      type="date"
                      value={tempEndDate ? format(tempEndDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setTempEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={handleClearDateFilter}>
                    Effacer
                  </Button>
                  <Button size="sm" onClick={handleApplyDateFilter}>
                    Appliquer
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Additional Filters */}
        {additionalFilters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value || "all"}
            onValueChange={filter.onChange}
          >
            <SelectTrigger className={cn(
              "h-10 min-w-[140px] border-border",
              filter.value && filter.value !== "all" && "border-blue-500 bg-blue-50"
            )}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous - {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear All Filters */}
        {activeFilterCount > 0 && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer filtres
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
};

export default TableFilters;
