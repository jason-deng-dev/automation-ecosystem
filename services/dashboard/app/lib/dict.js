import { cookies } from 'next/headers';
import en from './locales/en';
import zh from './locales/zh';

export async function getDict() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || process.env.NEXT_PUBLIC_LANG || 'en';
  const dict = lang === 'zh' ? zh : en;
  return { dict, lang };
}
