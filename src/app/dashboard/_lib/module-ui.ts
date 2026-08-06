import type { Lang } from './i18n'

export const dashboardCardClass = 'rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6'
export const dashboardCardTitleClass = 'text-base font-semibold text-slate-800 md:text-lg'
export const dashboardCollapseButtonClass = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 transition hover:bg-slate-200'

const text = {
  en: { keyStats: 'Key statistics', calories: 'Estimated calories', todayAdvice: "Today's ride advice", weatherUnavailable: 'Today\'s ride advice is temporarily unavailable.', retry: 'Retry', recommended: 'Recommended', consider: 'Consider cycling', notRecommended: 'Not recommended', monthlyWeeklyRides: 'Monthly weekly rides', weeklyDistance: 'Total riding distance by week', rain: 'Rain', wind: 'Wind', temperature: 'Temp', sunset: 'Sunset', air: 'Air', excellent: 'Excellent', good: 'Good', moderate: 'Moderate', poor: 'Poor', week: 'Week' },
  zh: { keyStats: '\u6838\u5fc3\u7edf\u8ba1', calories: '\u5361\u8def\u91cc\u9884\u4f30', todayAdvice: '\u4eca\u65e5\u9a91\u884c\u5efa\u8bae', weatherUnavailable: '\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u4eca\u65e5\u9a91\u884c\u5efa\u8bae\u3002', retry: '\u91cd\u8bd5', recommended: '\u63a8\u8350\u9a91\u8f66', consider: '\u53ef\u8003\u8651\u9a91\u8f66', notRecommended: '\u4e0d\u5efa\u8bae\u9a91\u8f66', monthlyWeeklyRides: '\u6708\u5ea6\u5468\u9a91\u884c', weeklyDistance: '\u6309\u6bcf\u5468\u603b\u9a91\u884c\u91cc\u7a0b\u663e\u793a', rain: '\u964d\u96e8', wind: '\u98ce', temperature: '\u6e29\u5ea6', sunset: '\u65e5\u843d', air: '\u7a7a\u6c14', excellent: '\u4f18', good: '\u826f\u597d', moderate: '\u4e00\u822c', poor: '\u8f83\u5dee', week: '\u7b2c' },
} as const

export function moduleText(lang: Lang) { return text[lang] }
