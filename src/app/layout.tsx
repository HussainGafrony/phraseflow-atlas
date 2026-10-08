/**
 * الغلاف المشترك لكل الصفحات: مزود الترجمة ومبدل اللغة. أول عرض يكون بالعربية وباتجاه RTL.
 */
import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { I18nProvider } from "@/components/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "تعلّم اللغات بجمل يومية وترجمة عربية ومراجعة محفوظاتك.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <I18nProvider>
          <LanguageSwitcher />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
