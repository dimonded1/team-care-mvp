export type VisitActionIconId = "calendar" | "quiet" | "observe" | "rush";

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
  actions: readonly VisitAction[];
}

export const visitSituations: readonly VisitSituation[] = [
  {
    id: "plan",
    stepLabel: "До встречи",
    title: "Вы хотите приехать в приют",
    prompt: "Как сделать визит понятным для команды и подопечного?",
    success: "Согласованный визит учитывает режим приюта и помогает сотрудникам подготовить спокойную встречу.",
    actions: [
      {
        id: "coordinate",
        label: "Заранее договориться с сотрудником",
        description: "Выбрать подходящее время и уточнить правила встречи",
        icon: "calendar",
        correct: true,
        feedback: "Да. Визит становится предсказуемым и для команды, и для животного.",
      },
      {
        id: "surprise",
        label: "Приехать без предупреждения",
        description: "Решить всё на месте",
        icon: "rush",
        correct: false,
        feedback: "У подопечного может быть уход, отдых или занятие. Время встречи лучше согласовать заранее.",
      },
      {
        id: "late",
        label: "Приехать перед закрытием",
        description: "Пусть встреча будет короткой, но внезапной",
        icon: "rush",
        correct: false,
        feedback: "Спешка в конце дня мешает спокойному контакту. Лучше выбрать время с небольшим запасом.",
      },
    ],
  },
  {
    id: "contact",
    stepLabel: "В вольере",
    title: "Питомец наблюдает издалека",
    prompt: "Что поможет ему самому выбрать дистанцию?",
    success: "Спокойная поза и отсутствие прямого давления оставляют питомцу контроль над знакомством.",
    actions: [
      {
        id: "sit-sideways",
        label: "Сесть чуть боком и спокойно подождать",
        description: "Не перекрывать путь и не тянуться первым",
        icon: "quiet",
        correct: true,
        feedback: "Так вы остаётесь рядом, но не требуете контакта.",
      },
      {
        id: "tap-gate",
        label: "Постучать и активно позвать",
        description: "Быстрее привлечь внимание",
        icon: "rush",
        correct: false,
        feedback: "Резкий звук и настойчивый зов могут увеличить дистанцию. Лучше сделать обстановку тише.",
      },
      {
        id: "reach",
        label: "Сразу протянуть руку",
        description: "Показать добрые намерения",
        icon: "rush",
        correct: false,
        feedback: "Даже добрый жест может ощущаться как давление. Пусть первый шаг останется за питомцем.",
      },
    ],
  },
  {
    id: "finish",
    stepLabel: "После встречи",
    title: "Визит подходит к концу",
    prompt: "Как завершить его так, чтобы забота продолжилась?",
    success: "Короткая заметка помогает команде видеть изменения, а следующая договорённость делает связь регулярной.",
    actions: [
      {
        id: "share-observation",
        label: "Передать наблюдение и договориться о следующем визите",
        description: "Коротко рассказать, что помогало питомцу чувствовать себя спокойнее",
        icon: "observe",
        correct: true,
        feedback: "Верно. Опека — это повторяющаяся связь, а не одна удачная встреча.",
      },
      {
        id: "extend",
        label: "Остаться подольше любой ценой",
        description: "Не заканчивать встречу, пока питомец рядом",
        icon: "rush",
        correct: false,
        feedback: "Лучше закончить встречу в спокойный момент, чем ждать усталости или перенапряжения.",
      },
      {
        id: "leave-silently",
        label: "Уйти, ничего не сообщая сотрудникам",
        description: "Наблюдения кажутся слишком маленькими",
        icon: "quiet",
        correct: false,
        feedback: "Даже небольшие наблюдения о реакции и настроении могут быть полезны команде.",
      },
    ],
  },
] as const;
