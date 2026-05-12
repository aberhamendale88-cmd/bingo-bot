declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        ready(): void;
        expand(): void;
        close(): void;
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        MainButton: {
          text: string;
          show(): void;
          hide(): void;
          onClick(fn: () => void): void;
        };
        BackButton: {
          show(): void;
          hide(): void;
          onClick(fn: () => void): void;
        };
        HapticFeedback: {
          impactOccurred(style: "light" | "medium" | "heavy"): void;
          notificationOccurred(type: "error" | "success" | "warning"): void;
        };
        version: string;
        platform: string;
      };
    };
  }
}

export const twa = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export function isTelegramApp(): boolean {
  return !!(twa && twa.initData);
}

export function getTelegramUser() {
  if (!isTelegramApp()) return null;
  return twa?.initDataUnsafe?.user ?? null;
}

export function getTelegramDisplayName(): string | null {
  const user = getTelegramUser();
  if (!user) return null;
  if (user.username) return `@${user.username}`;
  if (user.last_name) return `${user.first_name} ${user.last_name}`;
  return user.first_name;
}

export function telegramReady() {
  twa?.ready();
  twa?.expand();
}
