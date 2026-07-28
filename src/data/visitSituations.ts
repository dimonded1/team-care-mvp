export type VisitActionIconId =
  | "calendar"
  | "quiet"
  | "observe"
  | "rush"
  | "leash"
  | "gate"
  | "report";

export type VisitPetState = "calm" | "cautious" | "curious" | "leash-ready" | "walking" | "relaxed";

export interface VisitAction {
  id: string;
  label: string;
  description: string;
  icon: VisitActionIconId;
  correct: boolean;
  feedback: string;
}

export interface VisitSituation {
  id: string;
  stepLabel: string;
  title: string;
  prompt: string;
  success: string;
  petState: {
    dog: VisitPetState;
    cat: VisitPetState;
  };
  actions: readonly VisitAction[];
}

export const visitSituations: readonly VisitSituation[] = [
  {
    id: "arrival",
    stepLabel: "Приезд",
    title: "Вы приехали чуть раньше",
    prompt: "Питомец ещё отдыхает, а сотрудник занят. Как начать визит?",
    success: "Спокойное ожидание сохраняет режим приюта и делает встречу предсказуемой.",
    petState: { dog: "calm", cat: "calm" },
    actions: [
      {
        id: "check-in",
        label: "Отметиться у сотрудника и подождать",
        description: "Уточнить, когда питомец будет готов к встрече",
        icon: "calendar",
        correct: true,
        feedback: "Верно. Сотрудник знает распорядок и поможет выбрать спокойный момент.",
      },
      {
        id: "enter-alone",
        label: "Самостоятельно пройти к вольеру",
        description: "Вы уже знаете, где находится питомец",
        icon: "rush",
        correct: false,
        feedback: "Даже знакомый маршрут лучше начинать вместе с сотрудником: обстановка и режим могли измениться.",
      },
      {
        id: "call-loudly",
        label: "Позвать питомца из коридора",
        description: "Пусть заранее услышит знакомый голос",
        icon: "rush",
        correct: false,
        feedback: "Громкий зов может взволновать сразу нескольких животных. Начать лучше тихо.",
      },
      {
        id: "bring-food",
        label: "Сразу достать принесённое угощение",
        description: "Так встреча быстрее станет приятной",
        icon: "observe",
        correct: false,
        feedback: "Рацион и угощения сначала согласуют с сотрудником: у питомца могут быть свои ограничения.",
      },
    ],
  },
  {
    id: "greeting",
    stepLabel: "Знакомство",
    title: "Питомец остаётся у дальней стены",
    prompt: "Он смотрит на вас, но не подходит. Что поможет сохранить доверие?",
    success: "Спокойная поза и свободный путь оставляют питомцу право самому выбрать дистанцию.",
    petState: { dog: "cautious", cat: "cautious" },
    actions: [
      {
        id: "wait-sideways",
        label: "Сесть боком и спокойно подождать",
        description: "Не перекрывать выход и не тянуться первым",
        icon: "quiet",
        correct: true,
        feedback: "Так вы остаётесь рядом, но не требуете контакта.",
      },
      {
        id: "direct-eye-contact",
        label: "Смотреть прямо в глаза",
        description: "Показать, что всё внимание сейчас ему",
        icon: "observe",
        correct: false,
        feedback: "Долгий прямой взгляд может восприниматься как давление. Лучше смотреть мягко и чуть в сторону.",
      },
      {
        id: "reach-hand",
        label: "Протянуть руку поближе",
        description: "Дать понюхать ладонь",
        icon: "rush",
        correct: false,
        feedback: "Даже добрый жест может оказаться слишком быстрым. Первый шаг лучше оставить питомцу.",
      },
      {
        id: "block-exit",
        label: "Сесть у выхода",
        description: "Чтобы питомец не отвлекался на коридор",
        icon: "gate",
        correct: false,
        feedback: "Путь к отступлению должен оставаться свободным — так животному проще чувствовать контроль.",
      },
    ],
  },
  {
    id: "prepare",
    stepLabel: "Подготовка",
    title: "Питомец готов выйти в безопасную зону",
    prompt: "Сотрудник принёс подходящую амуницию или переноску. Что сделать до открытия двери?",
    success: "Проверка креплений и маршрута до выхода снижает риск неожиданного рывка.",
    petState: { dog: "leash-ready", cat: "curious" },
    actions: [
      {
        id: "check-gear",
        label: "Вместе проверить крепления и закрытые выходы",
        description: "Уточнить маршрут и только потом открыть дверь",
        icon: "leash",
        correct: true,
        feedback: "Да. Сначала безопасность пространства и амуниции, затем движение.",
      },
      {
        id: "open-first",
        label: "Сначала открыть дверь",
        description: "Амуницию можно поправить уже снаружи",
        icon: "rush",
        correct: false,
        feedback: "Проверять крепления после выхода поздно. Дверь открывают только когда всё готово.",
      },
      {
        id: "switch-gear",
        label: "Заменить амуницию на свою",
        description: "Она кажется мягче и удобнее",
        icon: "leash",
        correct: false,
        feedback: "Используйте только то, что подготовила команда: эта амуниция уже подобрана питомцу.",
      },
      {
        id: "skip-route",
        label: "Пойти по новому маршруту",
        description: "Новые запахи сделают встречу интереснее",
        icon: "observe",
        correct: false,
        feedback: "На первых визитах лучше придерживаться согласованной безопасной зоны без сюрпризов.",
      },
    ],
  },
  {
    id: "escape",
    stepLabel: "Неожиданность",
    title: "Питомец выскользнул в закрытом дворике",
    prompt: "Он испугался и отбежал, но внешний выход пока закрыт. Как поступить?",
    success: "Закрытый выход, спокойная дистанция и помощь сотрудника безопаснее погони.",
    petState: { dog: "walking", cat: "walking" },
    actions: [
      {
        id: "secure-and-call",
        label: "Проверить выход и спокойно позвать сотрудника",
        description: "Не преследовать и оставить питомцу пространство",
        icon: "gate",
        correct: true,
        feedback: "Верно. Команда знает, как вернуть питомца без дополнительного испуга.",
      },
      {
        id: "chase",
        label: "Быстро догнать",
        description: "Схватить, пока он не спрятался",
        icon: "rush",
        correct: false,
        feedback: "Погоня усиливает страх и может спровоцировать новый рывок. Важно не бежать следом.",
      },
      {
        id: "open-gate",
        label: "Открыть калитку пошире",
        description: "Дать больше места и не загонять в угол",
        icon: "gate",
        correct: false,
        feedback: "Внешний выход должен оставаться закрытым. Пространство дают внутри безопасной зоны.",
      },
      {
        id: "lure-alone",
        label: "Самостоятельно приманить угощением",
        description: "Подойти ближе, пока питомец ест",
        icon: "observe",
        correct: false,
        feedback: "Без согласования не приближайтесь и не используйте еду. Сначала позовите сотрудника.",
      },
    ],
  },
  {
    id: "return",
    stepLabel: "Возвращение",
    title: "Прогулка или спокойное занятие закончились",
    prompt: "Как завершить визит, чтобы следующая встреча стала понятнее?",
    success: "Спокойное возвращение и короткая заметка помогают команде заметить изменения и подготовить следующий визит.",
    petState: { dog: "relaxed", cat: "relaxed" },
    actions: [
      {
        id: "calm-return-report",
        label: "Вернуть по инструкции и передать наблюдения",
        description: "Рассказать, что успокаивало и где появилась тревога",
        icon: "report",
        correct: true,
        feedback: "Верно. Даже короткие наблюдения делают регулярную заботу точнее.",
      },
      {
        id: "extend-anyway",
        label: "Продлить встречу любой ценой",
        description: "Раз всё получилось, стоит побыть ещё",
        icon: "rush",
        correct: false,
        feedback: "Лучше закончить на спокойной ноте, не дожидаясь усталости или перенапряжения.",
      },
      {
        id: "leave-gear",
        label: "Оставить амуницию на питомце",
        description: "Так следующая прогулка начнётся быстрее",
        icon: "leash",
        correct: false,
        feedback: "После возвращения действуйте по инструкции сотрудника и не оставляйте снаряжение без согласования.",
      },
      {
        id: "leave-silently",
        label: "Уйти, ничего не сообщая",
        description: "Ничего необычного ведь не произошло",
        icon: "quiet",
        correct: false,
        feedback: "Спокойные изменения тоже важны. Команде полезно знать, что помогло питомцу сегодня.",
      },
    ],
  },
] as const;
