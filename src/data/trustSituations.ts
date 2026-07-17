export type TrustSituationIllustrationId =
  | "sound"
  | "visitor"
  | "movement"
  | "last-step";

export type TrustActionIconId =
  | "pause"
  | "voice"
  | "reach"
  | "space"
  | "follow"
  | "wait";

export interface TrustAction {
  id: string;
  icon: TrustActionIconId;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface TrustSituation {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  illustration: TrustSituationIllustrationId;
  success: string;
  actions: readonly TrustAction[];
}

export const trustSituations: readonly TrustSituation[] = [
  {
    id: "door-sound",
    eyebrow: "Неожиданный звук",
    title: "В коридоре хлопнула дверь",
    description: "Питомец вздрогнул, замер и смотрит, безопасно ли рядом.",
    illustration: "sound",
    success: "Тишина и возможность осмотреться возвращают ощущение безопасности.",
    actions: [
      {
        id: "pause-and-wait",
        icon: "pause",
        label: "Остановиться и дать ему осмотреться",
        correct: true,
        feedback: "Так бережнее: спокойная пауза показывает, что опасности нет.",
      },
      {
        id: "call-louder",
        icon: "voice",
        label: "Позвать его немного громче",
        correct: false,
        feedback: "После резкого звука громкий голос добавляет напряжения. Лучше ненадолго замереть и говорить тише.",
      },
      {
        id: "pick-up",
        icon: "reach",
        label: "Сразу подойти и взять на руки",
        correct: false,
        feedback: "Даже добрый контакт сейчас может напугать. Сначала питомцу важно самому убедиться, что рядом спокойно.",
      },
    ],
  },
  {
    id: "stranger-hand",
    eyebrow: "Новый человек",
    title: "Гость тянется погладить питомца",
    description: "Питомец отводит взгляд и переносит вес назад — он пока не готов к прикосновению.",
    illustration: "visitor",
    success: "Когда у питомца остаётся выбор дистанции, знакомство становится спокойнее.",
    actions: [
      {
        id: "protect-choice",
        icon: "space",
        label: "Попросить гостя остановиться и подождать",
        correct: true,
        feedback: "Верно: питомец сможет сам решить, когда сократить дистанцию.",
      },
      {
        id: "hand-to-face",
        icon: "reach",
        label: "Поднести ладонь ближе к морде",
        correct: false,
        feedback: "Ладонь у морды может ощущаться как давление. Лучше оставить пространство и не торопить знакомство.",
      },
      {
        id: "call-over",
        icon: "voice",
        label: "Активно звать питомца к гостю",
        correct: false,
        feedback: "Настойчивый зов не делает контакт безопаснее. Спокойное ожидание понятнее и бережнее.",
      },
    ],
  },
  {
    id: "sudden-movement",
    eyebrow: "Резкое движение",
    title: "Вы быстро встали — питомец отскочил",
    description: "Он остановился чуть дальше и внимательно следит за вашими движениями.",
    illustration: "movement",
    success: "Медленные предсказуемые движения помогают снова расслабиться рядом с человеком.",
    actions: [
      {
        id: "turn-sideways",
        icon: "pause",
        label: "Замереть и дальше двигаться медленнее",
        correct: true,
        feedback: "Хороший выбор: предсказуемый темп помогает питомцу снова почувствовать контроль.",
      },
      {
        id: "follow-pet",
        icon: "follow",
        label: "Сразу пойти за ним следом",
        correct: false,
        feedback: "Если идти следом, питомцу придётся снова увеличивать дистанцию. Лучше остановиться и дать ему выдохнуть.",
      },
      {
        id: "repeat-movement",
        icon: "reach",
        label: "Повторить движение, чтобы он привык",
        correct: false,
        feedback: "Повторять пугающее движение сейчас рано. Сначала нужен спокойный и понятный темп.",
      },
    ],
  },
  {
    id: "final-approach",
    eyebrow: "Последний шаг",
    title: "Питомец подошёл ближе, но остановился",
    description: "Он уже рядом, принюхивается и решает, можно ли сделать ещё один шаг.",
    illustration: "last-step",
    success: "Доверие закрепляется, когда последний шаг животное может сделать самостоятельно.",
    actions: [
      {
        id: "wait-in-place",
        icon: "wait",
        label: "Остаться на месте и спокойно подождать",
        correct: true,
        feedback: "Именно так: отсутствие давления превращает любопытство в доверие.",
      },
      {
        id: "pat-head",
        icon: "reach",
        label: "Сразу потянуться сверху к голове",
        correct: false,
        feedback: "Рука сверху может напугать в последний момент. Лучше позволить питомцу самому завершить сближение.",
      },
      {
        id: "encourage-loudly",
        icon: "voice",
        label: "Подбодрить его громким голосом",
        correct: false,
        feedback: "Сейчас важна тишина: громкое поощрение может снова увеличить дистанцию.",
      },
    ],
  },
] as const;
