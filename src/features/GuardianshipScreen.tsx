import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { NumberedSteps } from "../components/NumberedSteps";
import type { Animal } from "../types/app";

interface GuardianshipScreenProps {
  animal: Animal;
  onBack: () => void;
  onContinue: () => void;
}

const careDirections = [
  "Повседневный уход и корм",
  "Здоровье и лечение",
  "Прогулки и социализация",
  "Фотографии, истории и поиск дома",
  "Внимание, подарки и участие в жизни",
].map((label) => ({
  id: label,
  label,
}));

export function GuardianshipScreen({ animal, onBack, onContinue }: GuardianshipScreenProps) {
  return (
    <main className="screen guardianship-screen">
      <AppHeader onBack={onBack} right="Что такое опека" />
      <div className="guardianship-layout">
        <section className="guardianship-intro">
          <AnimalPhoto src={animal.photo} name={animal.name} />
          <div>
            <h1>Забота нужна каждый день.</h1>
            <p>
              Опека — это регулярное участие в жизни конкретного животного: содержание, здоровье,
              доверие, внимание и помощь в поиске дома.
            </p>
          </div>
        </section>

        <section className="team-section">
          <span className="team-kicker">Команда до пяти опекунов</span>
          <h2>Одному человеку не нужно делать всё</h2>
          <p>У {animal.name} может быть команда до пяти опекунов.</p>
          <NumberedSteps steps={careDirections} label="Направления помощи" tone="dark" />
          <p className="directions-note">Это направления совместной помощи, а не жёстко закреплённые роли.</p>
        </section>
      </div>
      <div className="screen-actions sticky-actions">
        <Button fullWidth onClick={onContinue}>Завершить паспорт</Button>
      </div>
    </main>
  );
}
