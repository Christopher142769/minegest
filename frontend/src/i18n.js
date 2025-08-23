import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          title: 'Truckers Management Platform',
          subtitle: 'An intuitive, futuristic and efficient platform.',
          language: 'Language',
          create_card: '➕ Create Trucker Card',
          credit_card: '💳 Credit Trucker Card',
          facturation: '📊 Billing',
          gasoil: '⛽ Fuel Management',
          maintenance: '🛠️ Maintenance',
          depenses: '💸 Expenses'
        }
      },
      fr: {
        translation: {
          title: 'Plateforme de Gestion des Camionneurs',
          subtitle: 'Une plateforme intuitive, futuriste et performante.',
          language: 'Langue',
          create_card: '➕ Créer une carte chauffeur',
          credit_card: '💳 Créditer une carte',
          facturation: '📊 Facturations',
          gasoil: '⛽ Gestion Gasoil',
          maintenance: '🛠️ Gestion Maintenance',
          depenses: '💸 Dépenses'
        }
      }
    },
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
  });

export default i18n;
