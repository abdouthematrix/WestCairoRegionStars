export class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {};
        this.rtlLanguages = ['ar'];
    }

    async loadLanguage(lang) {
        if (!this.translations[lang]) {
            try {
                const response = await fetch(`js/locales/${lang}.json`);
                this.translations[lang] = await response.json();
            } catch (error) {
                console.error(`Failed to load language ${lang}:`, error);
                // Fallback to English if language file not found
                if (lang !== 'en') {
                    await this.loadLanguage('en');
                    this.translations[lang] = this.translations['en'];
                }
            }
        }
    }

    async setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);

        await this.loadLanguage(lang);

        // Update HTML attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = this.rtlLanguages.includes(lang) ? 'rtl' : 'ltr';

        // Update all translated elements
        this.updateTranslations();
    }

    updateTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                element.textContent = translation;
            }
        });
    }

    t(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];

        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return translation;
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    isRTL() {
        return this.rtlLanguages.includes(this.currentLanguage);
    }
}