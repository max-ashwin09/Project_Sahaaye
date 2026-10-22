import { create } from 'zustand';

export type LanguageCode = 'en' | 'hi';

interface LanguageStore {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  toggleLang: () => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  lang: ((typeof window !== 'undefined' && localStorage.getItem('sahaaye_lang')) as LanguageCode) || 'en',
  setLang: (lang: LanguageCode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaaye_lang', lang);
    }
    set({ lang });
  },
  toggleLang: () => {
    set((state) => {
      const next: LanguageCode = state.lang === 'en' ? 'hi' : 'en';
      if (typeof window !== 'undefined') {
        localStorage.setItem('sahaaye_lang', next);
      }
      return { lang: next };
    });
  },
}));
