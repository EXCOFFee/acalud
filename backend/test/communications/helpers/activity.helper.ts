import { DataSource } from 'typeorm';
import { Activity, ActivityType, DifficultyLevel } from '../../../src/modules/activities/activity.entity';

interface ActivityOptions {
  createdById: string;
  title?: string;
  subject?: string;
  isActive?: boolean;
}

export async function createStandaloneActivity(
  dataSource: DataSource,
  options: ActivityOptions,
): Promise<Activity> {
  const repository = dataSource.getRepository(Activity);

  const activity = repository.create({
    title: options.title ?? `Actividad independiente ${Date.now()}`,
    description:
      'Actividad creada para pruebas end-to-end de CU-20. Incluye una pregunta de selección múltiple.',
    type: ActivityType.QUIZ,
    difficulty: DifficultyLevel.EASY,
    subject: options.subject ?? 'Matematicas',
    content: {
      instructions: 'Selecciona la respuesta correcta.',
      questions: [
        {
          question: '¿Cuanto es 2 + 2?',
          options: ['3', '4', '5'],
          correctAnswer: 1,
          points: 10,
        },
      ],
    },
    rewards: {
      coins: 20,
      experience: 50,
    },
    tags: ['matematicas', 'pruebas'],
    estimatedTime: 10,
    baseExperience: 50,
    isPublic: false,
    isActive: options.isActive ?? true,
    settings: {
      shuffleQuestions: false,
      showCorrectAnswers: true,
    },
  createdById: options.createdById,
  classroomId: null,
  });

  return repository.save(activity);
}
