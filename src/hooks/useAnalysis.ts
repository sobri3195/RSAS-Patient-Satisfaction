import { useState } from 'react';
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  differenceInCalendarDays,
  subDays,
} from 'date-fns';
import { useStore } from '../app/Store';
import { aggregateResponses, filterResponses, type Filter } from '../domain/analytics';
export function useAnalysis() {
  const store = useStore();
  const [filter, setFilter] = useState<Filter>({
    unitId: '',
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    version: store.data.questionnaires.at(-1)!.version,
  });
  const [period, setPeriod] = useState('month');
  const [trendPeriod, setTrendPeriod] = useState<'day' | 'week' | 'month'>('day');
  const q =
    store.data.questionnaires.find((q) => q.version === filter.version) ??
    store.data.questionnaires.at(-1)!;
  const rows = filterResponses(store.data.responses, filter, store.demo);
  const stats = aggregateResponses(rows, q.weights);
  const days =
    filter.from && filter.to
      ? differenceInCalendarDays(
          new Date(filter.to + 'T12:00:00'),
          new Date(filter.from + 'T12:00:00'),
        ) + 1
      : 0;
  const previous =
    days > 0
      ? aggregateResponses(
          filterResponses(
            store.data.responses,
            {
              ...filter,
              from: format(subDays(new Date(filter.from + 'T12:00:00'), days), 'yyyy-MM-dd'),
              to: format(subDays(new Date(filter.from + 'T12:00:00'), 1), 'yyyy-MM-dd'),
            },
            store.demo,
          ),
          q.weights,
        )
      : null;
  function preset(p: string) {
    setPeriod(p);
    if (p === 'custom') return;
    const now = new Date();
    const [from, to] =
      p === 'month'
        ? [startOfMonth(now), endOfMonth(now)]
        : p === 'quarter'
          ? [startOfQuarter(now), endOfQuarter(now)]
          : p === 'year'
            ? [startOfYear(now), endOfYear(now)]
            : [null, null];
    setFilter((f) => ({
      ...f,
      from: from ? format(from, 'yyyy-MM-dd') : '',
      to: to ? format(to, 'yyyy-MM-dd') : '',
    }));
  }
  return {
    ...store,
    filter,
    setFilter,
    period,
    preset,
    trendPeriod,
    setTrendPeriod,
    q,
    rows,
    stats,
    previous,
  };
}
export type Analysis = ReturnType<typeof useAnalysis>;
