# Rubra - Period & Cycle Tracker

Rubra, reklamsız və tamamilə sadə, zərif dizayna malik mobil menstruasiya və tsikl izləyici (Period / Cycle Tracker) tətbiqidir. Layihə monorepo strukturundadır.

## Layihə Strukturu

- `backend/`: Java Spring Boot backend layihəsi (gələcək inkişaf üçün hazırlanmış baza strukturu).
- `mobile/`: Mobil tətbiq platforması (Cordova / Capacitor və ya oxşar web-view əsaslı hibrid strukturlar üçün hazırlanmışdır).
  - `mobile/www/`: HTML, CSS və JavaScript əsaslı mobil frontend tətbiqi.

## Texnologiyalar

- **Frontend**: HTML5, CSS3 (Vanilla CSS, Responsive Mobil Dizayn), Modern JavaScript.
- **Backend**: Java 17, Spring Boot, Maven.
- **Dizayn Konsepti**: Glassmorphism, zərif rəng palitrası (rose/coral pastel tonları), interaktiv animasiyalar və intuitiv istifadəçi təcrübəsi (UX).

## Necə İşlətməli

### Mobil Frontend
Mobil tətbiqin frontend hissəsini yerli olaraq açmaq üçün `mobile/www/index.html` faylını brauzerdə aça bilərsiniz. Və ya hər hansı bir lokal server (məsələn, `live-server` və ya VS Code-un `Live Server` genişlənməsi) vasitəsilə işə sala bilərsiniz.
