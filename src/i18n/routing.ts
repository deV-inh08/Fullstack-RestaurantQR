import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Các ngôn ngữ được hỗ trợ
  locales: ['vi', 'en'],

  // Ngôn ngữ mặc định khi không match locale nào (vd: user vào "/")
  defaultLocale: 'vi',

  // 'always' => luôn có prefix /vi hoặc /en trên mọi route, kể cả locale mặc định.
  // Chọn 'always' để URL luôn tường minh, tránh nhầm lẫn giữa route "không prefix"
  // và route thật, đồng thời tối ưu SEO rõ ràng cho từng locale.
  localePrefix: 'always',

  // Cho phép user tự chọn locale (qua Language Switcher) ghi đè lên
  // Accept-Language header ở các lần truy cập sau, lưu trong cookie NEXT_LOCALE.
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]
