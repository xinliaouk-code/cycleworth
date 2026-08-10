import type { Lang } from './i18n'

export const dashboardCardClass = 'rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm md:p-6 transition-all hover:border-slate-300/80 hover:shadow-md'
export const dashboardCardTitleClass = 'text-base font-bold tracking-tight text-slate-800 md:text-lg'
export const dashboardCollapseButtonClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95'

const text = {
  en: {
    keyStats: 'Key statistics',
    calories: 'Estimated calories',
    todayAdvice: "Today's ride advice",
    weatherUnavailable: 'Today\'s ride advice is temporarily unavailable.',
    retry: 'Retry',
    recommended: 'Recommended to cycle',
    consider: 'Consider cycling',
    notRecommended: 'Not recommended',
    monthlyWeeklyRides: 'Monthly weekly rides',
    weeklyDistance: 'Total riding distance by week',
    rain: 'Rain',
    wind: 'Wind',
    temperature: 'Temp',
    sunset: 'Sunset',
    air: 'Air',
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    poor: 'Poor',
    week: 'Week',
  },
  zh: {
    keyStats: '核心统计',
    calories: '卡路里预估',
    todayAdvice: '今日骑行建议',
    weatherUnavailable: '暂时无法获取今日骑行建议。',
    retry: '重试',
    recommended: '推荐骑车',
    consider: '可考虑骑车',
    notRecommended: '不建议骑车',
    monthlyWeeklyRides: '月度周骑行',
    weeklyDistance: '按每周总骑行里程显示',
    rain: '降雨',
    wind: '风力',
    temperature: '温度',
    sunset: '日落',
    air: '空气',
    excellent: '优',
    good: '良好',
    moderate: '一般',
    poor: '较差',
    week: '第',
  },
} as const

export function moduleText(lang: Lang) { return text[lang] }

