# «Понемногу» — инструкция для Codex

> **Актуальная версия ТЗ: Habits-only MVP / Avatar v3 / no-penalty progress / expanded messages / Google Sign-In.**
> Если старый код, старые промпты или старые разделы проекта противоречат этому файлу, следовать этому файлу.

> ВАЖНО: в MVP больше нет отдельной пользовательской системы «Навыки». Главная сущность приложения — **привычка / повторяющееся действие**. Старый Skills-код и данные не удалять автоматически, но считать legacy и не развивать.

---

# 0. Главная установка

Перед крупными изменениями прочитай этот файл.

Приоритет:
1. корректная работа и сохранение данных;
2. месячный трекер;
3. сила привычки, стадии и XP;
4. игровой UI;
5. responsive и публикация.

Не делать без отдельного запроса:
- не возвращать отдельную систему Skills;
- не добавлять монеты, магазин, квесты, друзей, рейтинги, AI-советы;
- не копировать The Sims;
- не рефакторить работающие части без необходимости;
- не заменять готовые avatar assets;
- не добавлять React/Tailwind/тяжёлые библиотеки;
- не удалять пользовательские Firestore-данные автоматически.

После крупного этапа запускать `npm run build`.

---

# 1. Концепция

Название: **Понемногу**.

Приложение — игровой трекер повторяющихся действий.

**Привычка** здесь понимается широко: любое действие, которое пользователь хочет регулярно делать и видеть в календаре.

Примеры:
- Английский — 30 минут, 3 раза в неделю;
- Пение — 20 минут, 2 раза в неделю;
- Тренировка — 3 раза в неделю;
- Медитация — каждый день;
- Общение — несколько раз в неделю;
- Пить воду — каждый день.

Не заставлять пользователя делить жизнь на «привычки» и «навыки».

У привычки есть два вида прогресса:
- **регулярность** → `habitStrength` и стадия;
- **фактическое время** → `actualMinutes`, если привычка измеряется в минутах.

Игровой общий прогресс пользователя — `XP + playerLevel`.

Тон: спокойный, немного ироничный, игровой, местами тёплый и поддерживающий. Не наказывать пользователя за пропуски: прогресс привычки не уменьшается из-за невыполненного дня.

Цветовая семантика:
- lime = действие / completion / today;
- purple = прогресс / XP / уровни / habit strength.

---

# 2. Технический стек

- Vite;
- vanilla JavaScript ES modules;
- обычный CSS + CSS variables;
- Firebase Authentication;
- Cloud Firestore;
- Lucide Icons.

Auth:
- Email/Password;
- Google Sign-In через `GoogleAuthProvider` + `signInWithPopup()`;
- reset password;
- logout;
- protected routes.

Hash routes:
- `#/login`
- `#/register`
- `#/onboarding`
- `#/dashboard`
- `#/habits`
- `#/character`
- `#/profile`

`#/skills` больше не является частью MVP. Старый route можно оставить технически, но убрать из навигации и не развивать.

Firebase Storage не нужен.

`.env.local` не коммитить. Service-account/admin credentials в клиент не добавлять.

---

# 3. Firestore

Активная структура MVP:

```text
users/{uid}
users/{uid}/habits/{habitId}
users/{uid}/habitLogs/{logId}
```

Старые коллекции `skills` / `skillLogs` могут существовать у тестовых пользователей. **Не удалять их автоматически и не использовать в новой логике.**

## 3.1 users/{uid}

```js
{
  displayName: "Аня",
  email: "...",
  avatar: {
    bodyType: "female",       // male | female
    skinTone: "default",
    hairStyle: "hair_06_bun",
    hairColor: "darkBrown",
    eyeColor: "green",
    hoodieColor: "purple"
  },
  totalXp: 0,
  playerLevel: 1,
  onboardingCompleted: true,
  createdAt,
  updatedAt
}
```

## 3.2 habits/{habitId}

```js
{
  name: "Английский",
  icon: "languages",

  scheduleType: "timesPerWeek", // daily | selectedDays | timesPerWeek
  daysOfWeek: [],                // selectedDays: 1..7, Monday=1
  timesPerWeek: 3,               // timesPerWeek only

  goalType: "minutes",          // check | minutes
  targetMinutes: 30,             // null for check

  habitStrength: 0,              // 0..100, cached game metric
  archived: false,
  startDate: "2026-08-16",
  createdAt,
  updatedAt
}
```

**Не использовать `skillId` в новой UI-логике.** Старые документы могут содержать это поле; просто игнорировать его. Новые привычки не обязаны его записывать.

## 3.3 habitLogs/{logId}

Stable id:

```text
{habitId}__YYYY-MM-DD
```

```js
{
  habitId: "...",
  date: "2026-08-16",
  completed: true,
  actualMinutes: 35,       // null for check habits
  xpAwarded: 10,
  createdAt,
  updatedAt
}
```

Один habitId нельзя засчитать дважды за одну дату.

Для minute habit при completion спрашивать **«Сколько получилось?»** и сохранять фактические минуты. `targetMinutes` можно подставить по умолчанию.

---

# 4. Firestore Security Rules

Пользователь читает/меняет только собственные данные:

```text
match /users/{userId} {
  allow read, write:
    if request.auth != null && request.auth.uid == userId;

  match /{document=**} {
    allow read, write:
      if request.auth != null && request.auth.uid == userId;
  }
}
```

---

# 5. Onboarding и Avatar v3

Onboarding:
1. Имя.
2. Пол.
3. Причёска.
4. Цвет волос.
5. Цвет глаз.
6. Цвет худи.
7. Готово.

`skinTone: "default"` сохранить, UI пока не показывать.

Avatar/onboarding уже считаются **замороженными для MVP**. Не менять без явной причины.

## 5.1 Avatar v3 layers

```text
avatar_glow
↓
pre-rendered base by bodyType + hoodieColor
↓
hair PNG
↓
iris tint overlay
```

Худи не перекрашивать CSS/mask. Выбирать готовую base PNG.

### Base colors

```text
public/assets/avatar/base/colors/
  avatar_male_purple.png
  avatar_male_lime.png
  avatar_male_blue.png
  avatar_male_black.png
  avatar_male_pink.png

  avatar_female_purple.png
  avatar_female_lime.png
  avatar_female_blue.png
  avatar_female_black.png
  avatar_female_pink.png
```

Допустимые hoodie colors:
- purple
- lime
- blue
- black
- pink

Старые `cream/yellow/coral` → fallback `purple`.

### Hair

Использовать текущий финальный набор рабочих ассетов/config проекта. Основные имена:
- `hair_01_short_neat`
- `hair_02_short_messy`
- `hair_03_straight_shoulder`
- `hair_05_long_soft_waves`
- `hair_06_bun`

Для male/female отдельные `x/y/scale`. Не менять удачные transform values без необходимости.

Hair colors:
- black
- darkBrown
- lightBrown
- blonde
- ginger
- purple

Eye colors:
- brown
- darkBrown
- green
- blue
- gray

Использовать текущий работающий iris overlay; не возвращать отдельные eyes PNG.

Legacy avatar masks/hoodie layers/old bases/expressions не подключать.

---

# 6. Создание и редактирование привычки

Форма:
- название;
- иконка;
- расписание;
- тип цели.

Небольшой набор универсальных иконок, например:
- Чтение;
- Языки;
- Спорт;
- Учёба;
- Музыка;
- Творчество;
- Развитие;
- Другое.

Не использовать узкую категорию «Код» как обязательную категорию.

## Расписание

1. **Каждый день**.
2. **Выбранные дни недели** — минимум 1 день.
3. **N раз в неделю** — 1..7.

Для `timesPerWeek` пользователь сам выбирает фактические дни выполнения.

## Тип цели

- **Просто выполнить** → `goalType="check"`.
- **N минут** → `goalType="minutes"`, `targetMinutes > 0`.

Редактирование не меняет `startDate` и не удаляет историю.

Архивирование:
- confirmation;
- `archived=true`;
- историю не удалять.

---

# 7. Месячный tracker — главный экран

Главная — не набор dashboard-карточек. Это большой игровой месячный tracker.

## 7.1 Desktop layout

Слева постоянный sidebar:
- Главная;
- Привычки;
- Персонаж;
- Профиль.

**Навыки убрать из navigation.**

В sidebar:
- текущий Avatar v3;
- displayName;
- player level;
- XP progress bar.

Основная область:
- `Август 2026`;
- previous / next month;
- Сегодня;
- большой tracker.

## 7.2 Tracker rows

Одна строка = одна активная привычка.

Пример:

```text
[icon] Английский     ✓ ○ ✓ ○ ...      Поймал ритм
       30 минут                       [purple habit-strength bar]
                                      12 ч 40 мин практики
```

Справа **не показывать отдельный skill block**.

Вместо него показывать прогресс самой привычки:
- текущая стадия;
- purple progress bar `habitStrength`;
- для minute habit при наличии данных — накопленное/месячное время практики компактно.

Для check habit время не показывать.

## 7.3 Day states

- completed planned day → lime circle + white check;
- planned empty day → outline circle;
- today → более заметный circle + лёгкая lime vertical highlight;
- future → нельзя отмечать;
- unplanned → muted small marker / disabled state;
- не использовать красный за пропуски.

Для `timesPerWeek` дни недели заранее не фиксированы: текущую неделю оценивать по количеству выполнений.

Пользователь может редактировать прошлые даты. Будущие — нет.

## 7.4 Bottom summary

Одна компактная панель:
- `% выполнено за месяц`;
- `время практики за месяц` — сумма `actualMinutes` minute habits;
- `количество активных привычек`.

Например:

```text
78% выполнено   ·   14 ч практики   ·   5 активных привычек
```

---

# 8. Habit completion и минуты

## Check habit

Клик по доступной planned date:
- создать/обновить habitLog;
- `completed=true`;
- `actualMinutes=null`.

## Minute habit

При отметке показать компактную modal:

```text
Сколько получилось?
[-5] 35 мин [+5]
[Сохранить]
```

- default = `targetMinutes`;
- разрешить изменить;
- `actualMinutes > 0`.

Снятие completion должно корректно обновить log, XP и агрегаты.

Ручной отдельной системы «Добавить практику навыка» в habits-only MVP **нет**.

---

# 9. Habit strength

Это **игровой накопительный показатель того, насколько привычка прижилась**, а не научная диагностика.

Scale `0..100`.

Главный принцип MVP: **пропуски не отнимают уже заработанный прогресс**. Пользователь растёт за выполненные действия, а невыполненный день просто не добавляет очков.

## daily / selectedDays

- выполненный запланированный день: `+2`;
- пропущенный запланированный день: `0`;
- сегодняшний незавершённый день: `0`;
- unplanned day: `0`;
- progress не уменьшается из-за пропуска.

## timesPerWeek

- каждое completion в пределах weekly target: `+2`;
- недостающие до target выполнения: `0`, без штрафа;
- completion сверх N можно хранить как факт, но оно не даёт дополнительный habitStrength bonus;
- максимум `N * 2` habitStrength за одну неделю.

Всегда clamp `0..100`.

Если пользователь **снимает ранее засчитанную галочку**, соответствующие `+2` больше не должны учитываться. После исторического edit/uncheck пересчитывать strength из logs + schedule, а не угадывать delta.

Stages:

```text
0–19    Пробую
20–39   Приживается
40–59   Поймал ритм
60–74   Уже привычно
75–89   Почти на автомате
90–100  Часть жизни
```

Пропуск сам по себе **никогда не понижает стадию**. Стадия может уменьшиться только если пользователь удалил/снял ранее засчитанные historical completions и после честного пересчёта habitStrength стал ниже.

---

# 10. Player XP

Player XP — отдельная игровая система.

- засчитанная scheduled completion = `+10 XP`;
- один habitId максимум один раз в одну дату;
- `timesPerWeek`: XP максимум за N completion/week;
- extra completion сверх weekly target не фармит XP;
- снятие галочки убирает соответствующий XP;
- actualMinutes не дают дополнительный XP.

Формула:

```js
xpNeededForNextLevel(level) = 100 + (level - 1) * 50
```

Вынести в helper.

---

# 11. Время практики

Для `goalType="minutes"` реальное время хранится в `habitLogs.actualMinutes`.

Использовать его для:
- monthly summary;
- отображения практики конкретной minute habit;
- будущей аналитики.

Не создавать отдельную систему skill levels по часам.

Если нужен lifetime total для habit, вычислять из logs или аккуратно кэшировать только как производное значение. Источник истины — logs.

---

# 12. Визуальный стиль

Ориентир: светлый современный life-sim UI, но не копия The Sims.

- тёплый светлый фон;
- dark navy / graphite text;
- lime actions/checks/today;
- purple progress/XP;
- rounded rows/cards;
- мягкие shadows;
- много воздуха;
- крупные tactile circles;
- минимум декоративного шума.

Главная по композиции:
- sidebar слева;
- avatar card в sidebar;
- tracker занимает основную площадь;
- right side каждой habit row = stage/progress самой привычки.

---

# 13. Микроанимации и game feel

При completion:
1. circle pop;
2. check;
3. короткий `+10 XP`;
4. если minute habit — можно кратко показать `+35 мин`;
5. habitStrength bar плавно дорастает;
6. краткие sparkles без визуального шума.

При stage change / player level-up:
- toast;
- glow/sparkles;
- короткий avatar bounce;
- не блокировать интерфейс.

Legacy expression PNG не использовать.

---

# 14. Сообщения

Сообщения должны создавать ощущение живого игрового интерфейса, но **не быть назойливыми**. Тон смешанный: лёгкая ирония + иногда прямая тёплая поддержка.

## 14.1 Правила показа

- не показывать текст после каждой галочки;
- обычный completion: toast примерно в `20–25%` случаев;
- первая выполненная привычка дня: иногда;
- новая стадия привычки: всегда;
- player level-up: всегда;
- все запланированные привычки дня выполнены: всегда, максимум один toast;
- хороший день без 100%: иногда;
- возвращение после заметного перерыва: один раз при возвращении;
- при снятии галочки позитивный toast не показывать;
- максимум **один основной toast на одно действие**.

При выборе обычного редкого сообщения смешивать ироничные и поддерживающие варианты. Не делать приложение постоянно саркастичным и не превращать его в чрезмерно восторженного коуча.

## 14.2 Иногда после completion

Ироничные:
- «Вот так незаметно и портится репутация прокрастинатора.»
- «Кажется, система работает. Подозрительно.»
- «Сделано. Да, вот так просто.»
- «Ещё одна галочка. Коллекция растёт.»
- «Так. Это можно вычёркивать. Приятно.»
- «Сделано раньше, чем успело стать проблемой.»

Тёплые:
- «Красиво сделано.»
- «Вот это было сильно.»
- «Ты хорошо идёшь.»
- «Вот это уже похоже на прогресс.»
- «Кажется, у тебя действительно получается.»
- «Маленький плюс к большим планам.»
- «Прогресс принят и сохранён.»

## 14.3 Первый шаг дня

- «Ну что ж. Первый ход сделан.»
- «Ну вот. Уже началось.»
- «Начало положено. Отступать пока ещё можно, но зачем.»

## 14.4 Пробую → Приживается

- male: «О. Ты пришёл ещё раз. Это уже подозрительно.»
- female: «О. Ты пришла ещё раз. Это уже подозрительно.»
- «Ну что ж. Одной случайностью это уже не объяснить.»
- «Она всё ещё здесь. Хороший знак.»
- «Похоже, эксперимент продолжается.»

## 14.5 Приживается → Поймал ритм

- «Кажется, ты нашёл кнопку „повторить“.»
- «Ритм найден. Просьба не терять.»
- «Всё. Ритм пойман. Теперь главное — не пугать его.»

## 14.6 Поймал ритм → Уже привычно

- «Когда-то для этого требовалась сила воли. Забавные времена.»
- male: «Как будто ты это всегда делал. Почти.»
- female: «Как будто ты это всегда делала. Почти.»

## 14.7 Уже привычно → Почти на автомате

- «Автопилот прогревается.»
- «Всё меньше переговоров. Всё больше дела.»

## 14.8 Почти на автомате → Часть жизни

- «Вот и всё. Теперь это просто то, что ты делаешь.»
- «Встроено. Работает. Не трогаем.»
- «Ещё немного — и это уже выглядит как твоя обычная жизнь.»

## 14.9 Player level-up

- «Новый уровень разблокирован. DLC не требуется.»
- «Новый уровень. Босса пока не завезли.»
- «Можно добавить +1 к самодовольству.»
- «Вот за это можно собой немного гордиться.»
- «Смотри-ка. Ты действительно это делаешь.»

## 14.10 Return after break

- «Мы сделали вид, что это был запланированный перерыв.»
- «О, продолжение сезона вышло.»
- «Пауза была. Прогресс остался. Удобно.»
- «Сохранение найдено. Продолжаем.»
- male: «Никто не спрашивает, где ты был. Играем дальше.»
- female: «Никто не спрашивает, где ты была. Играем дальше.»

## 14.11 All done today

Ироничные:
- «Все галочки собраны. Теперь можно ничего не доказывать.»
- «100%. Даже придраться не к чему.»
- «На сегодня основной сюжет закончен.»
- «Все галочки на месте. Подозрительно красиво.»
- «День закрыт. Побочные задания можно проигнорировать.»
- «Mission complete. Да, мы тоже умеем по-английски.»

Тёплые:
- «Всё сделано. Красиво.»
- «Вот это день. Есть чем гордиться.»
- male: «Ты лучший. Таблица подтверждает.»
- female: «Ты лучшая. Таблица подтверждает.»
- «Все галочки собраны. Сильно.»
- male: «Ты сегодня хорош.»
- female: «Ты сегодня хороша.»

## 14.12 Хороший день, но не 100%

Использовать иногда, например если выполнена большая часть запланированного дня, но не всё.

- «Неплохо. Подозрительно неплохо.»
- «Хороший ход. Следующий — завтра.»
- «Сегодня без идеала. Зато с прогрессом.»
- «Неполное комбо тоже комбо.»
- «Не всё. Но вполне достаточно, чтобы засчитать день.»
- «Сильный день.»
- male: «Сегодня ты явно был на своей стороне.»
- female: «Сегодня ты явно была на своей стороне.»

Gendered messages выбирать через `avatar.bodyType`.

---

# 15. Экран «Привычки»

- active habits list;
- `+ Новая привычка`;
- edit;
- archive;
- schedule;
- goal;
- stage;
- для minute habit — можно показывать practice time компактно.

Не удалять history при archive.

---

# 16. Экран «Персонаж»

Использовать тот же Avatar v3 renderer, что onboarding.

Controls:
- пол;
- hairstyle;
- hair color;
- eye color;
- hoodie color;
- сохранить.

Avatar сейчас заморожен; не полировать без явной необходимости.

---

# 17. Экран «Профиль»

- имя;
- email;
- player level / XP;
- registration date;
- logout;
- password reset.

---

# 18. Responsive

Desktop:
- sidebar visible;
- tracker max width.

Tablet:
- sidebar narrower/collapsible;
- days horizontally scrollable.

Mobile:
- sidebar → drawer/compact nav;
- 31 days не пытаться ужать в экран;
- day area horizontal scroll;
- today auto-scroll ближе к центру;
- right progress info можно переносить под habit row.

---

# 19. Dates/timezone

- habit log date = local calendar date `YYYY-MM-DD`;
- timestamps = Firebase server timestamps;
- helper `getLocalDateKey()`;
- week Monday → Sunday;
- month 28/29/30/31 days корректно.

---

# 20. Рекомендуемая структура src

Существующие файлы не переименовывать без необходимости.

Целевой смысл:

```text
src/
  firebase/
  router/
  screens/
    login.js
    register.js
    onboarding.js
    dashboard.js
    habits.js
    character.js
    profile.js
    skills.js        # legacy, не развивать и убрать из nav
  components/
    sidebar.js
    avatar.js
    habitRow.js
    monthTracker.js
    modal.js
    toast.js
  services/
    userService.js
    habitService.js
    logService.js
  logic/
    habitStrength.js
    playerXp.js
    schedules.js
    dates.js
  data/
    avatarConfig.js
    colors.js
    messages.js
  styles/
```

Legacy skills files можно оставить, чтобы не тратить лимит на безопасное удаление. Они не должны влиять на основной UX.

---

# 21. Текущий статус разработки и следующие этапы

Уже сделано:
- Vite / routing;
- Firebase Auth + Google;
- Firestore user docs;
- Avatar v3 + onboarding;
- Habits CRUD;
- Skills CRUD существует, но теперь **legacy**;
- месячный tracker / logs частично или полностью реализованы в текущем коде.

## Следующий приоритет

### Этап A — переход на habits-only UI
- убрать «Навыки» из navigation;
- не показывать skill blocks на dashboard;
- убрать skill selection из habit form;
- не удалять Firestore skills/skillLogs;
- правую часть tracker row использовать для habit stage + habitStrength + practice time.

### Этап B — Progress
- habitStrength recalculation **без штрафов за пропуски**;
- stages;
- player XP;
- корректный uncheck/edit history;
- minute totals.

### Этап C — Game feel
- animations;
- stage/player level toasts;
- sparkles;
- approved messages.

### Этап D — Responsive
- tablet/mobile;
- horizontal calendar scroll;
- sidebar/drawer.

### Этап E — GitHub Pages
- production build;
- Vite base;
- hash routes;
- Firebase authorized domain;
- verify Auth/Firestore;
- не коммитить `.env.local`.

---

# 22. Definition of Done MVP

Пользователь может:
1. зарегистрироваться / войти через email или Google;
2. создать персонажа;
3. создать привычку;
4. выбрать daily / selectedDays / timesPerWeek;
5. выбрать check / minutes;
6. редактировать и архивировать привычку;
7. видеть привычки в месячном tracker;
8. отмечать today/past dates и не отмечать future;
9. для minute habit записать фактическое время;
10. видеть habitStrength и текущую стадию;
11. видеть общий XP и player level;
12. снять/исправить историческую отметку без поломки прогресса;
13. перезагрузить сайт без потери данных;
14. другой аккаунт не видит чужие данные;
15. использовать сайт на mobile без развала интерфейса;
16. `npm run build` проходит;
17. сайт опубликован на GitHub Pages.

---

# 23. Post-MVP

Можно вернуть/добавить позже только после реального пользовательского теста:
- отдельные Skills, если пользователям реально нужна иерархия «навык → несколько привычек»;
- one-off practice вне расписания;
- skin tones;
- дополнительные hairstyles/clothes;
- achievements;
- analytics;
- reminders;
- social features;
- shop/currency;
- более сложную модель автоматичности.

---

# 24. Финальный принцип

**Пользователь не должен думать, куда отнести действие — в привычки или навыки.**

В MVP есть одна понятная сущность: то, что человек хочет делать регулярно.

Он открывает «Понемногу» и сразу видит:
1. персонажа;
2. привычки за месяц;
3. сегодняшние отметки;
4. как регулярность каждой привычки постепенно растёт;
5. общий игровой XP.

Ощущение игры создают **персонаж, habit strength, стадии, XP, progress bars, реакции и микроанимации**, а не количество сущностей.
