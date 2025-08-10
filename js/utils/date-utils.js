export class DateUtils {
    static formatDate(date, locale = 'en') {
        if (!date) return '';

        const d = date instanceof Date ? date : new Date(date);

        if (locale === 'ar') {
            return d.toLocaleDateString('ar-EG');
        }

        return d.toLocaleDateString('en-US');
    }

    static formatDateTime(date, locale = 'en') {
        if (!date) return '';

        const d = date instanceof Date ? date : new Date(date);

        if (locale === 'ar') {
            return d.toLocaleString('ar-EG');
        }

        return d.toLocaleString('en-US');
    }

    static getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static getDateString(date) {
        if (!date) return '';

        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static parseDate(dateString) {
        if (!dateString) return null;
        return new Date(dateString);
    }

    static isToday(date) {
        const today = new Date();
        const d = date instanceof Date ? date : new Date(date);

        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }

    static getRelativeTime(date, locale = 'en') {
        if (!date) return '';

        const d = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (locale === 'ar') {
            if (diffMins < 1) return 'الآن';
            if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
            if (diffHours < 24) return `منذ ${diffHours} ساعة`;
            if (diffDays < 7) return `منذ ${diffDays} يوم`;
            return this.formatDate(d, locale);
        }

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return this.formatDate(d, locale);
    }
}