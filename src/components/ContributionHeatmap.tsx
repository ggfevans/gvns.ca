import { ActivityCalendar } from 'react-activity-calendar';

interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface Props {
  days: CalendarDay[];
}

const violetTheme = {
  dark: ['#27272a', '#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa'],
};

export default function ContributionHeatmap({ days }: Props) {
  return (
    <ActivityCalendar
      data={days}
      theme={violetTheme}
      colorScheme="dark"
      blockSize={11}
      blockMargin={3}
      blockRadius={2}
      fontSize={12}
      showWeekdayLabels={['mon', 'wed', 'fri']}
      labels={{
        totalCount: '{{count}} contributions in the last year',
        legend: { less: 'Less', more: 'More' },
      }}
    />
  );
}
