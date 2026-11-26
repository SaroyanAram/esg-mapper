# Кадры из GPT

Шесть кадров первой волны подключены: `hero`, `lupa`, `e`, `s`, `g`, `report`. Слоты `result` и `outro` пока показывают локальные SVG/DOM-заглушки: отдельные кадры для них ещё не сгенерированы, промпты - в `Материалы/Промпты для GPT — вторая волна.md`.

Пока флаг выключен, сайт не запрашивает отсутствующий файл: запрос делает только `manifest.json`.

## Как подключить оставшиеся кадры

1. Переименуй PNG по таблице и положи в эту папку. Если формат не WebP, OpenCode перекодирует (longest side 1600 px, quality 0.82).
2. В `manifest.json` поставь `true` у `result` и `outro`.
3. Обнови страницу: manifest запрашивается без кэша.

| Ключ | Файл | Источник в `Материалы/гпт картинки выход` | Где появляется |
|---|---|---|---|
| `hero` | `hero-backdrop.webp` | `Brass Lens Over an Industrial City-6.png` | Фон первого экрана поверх контурной карты |
| `lupa` | `lupa.webp` | `Steampunk Lens Explorer on a Glowing Map-8.png` | Люпа в первом акте и на карте следов |
| `e` | `portal-e.webp` | `Industrial Filtration Flow Report-12.png` | Фон карточки источника E |
| `s` | `portal-s.webp` | `Collaborative Insight Network-14.png` | Фон карточки источника S |
| `g` | `portal-g.webp` | `Neon Strategy Boardroom Network-17.png` | Фон карточки источника G |
| `report` | `report-sheet.webp` | `Illuminated Report Under Magnification-19.png` | Лист отчётности на липкой сцене каталога |
| `result` | `result-map.webp` | вторая волна, промпт 1 | Фон карточки результата квиза |
| `outro` | `outro.webp` | вторая волна, промпт 2 | Фон финального блока с источниками |

Изображения остаются декоративными: весь текст, подписи и стандарты живут в HTML и берутся из `data/site-content.json`.
