import { DataSource } from 'typeorm';
import { Game, GameType, Subject, DifficultyLevel, EducationLevel } from '../../modules/games/game.entity';
import { Question, QuestionType } from '../../modules/games/question.entity';
import { User } from '../../modules/users/user.entity';

/**
 * 🎮 SEEDER SIMPLIFICADO DE JUEGOS DEMO
 * Crea 1 juego de trivia completamente funcional para demostración
 */
export async function seedGamesSimple(dataSource: DataSource) {
  const gameRepository = dataSource.getRepository(Game);
  const questionRepository = dataSource.getRepository(Question);
  const userRepository = dataSource.getRepository(User);

  const existingGames = await gameRepository.count();
  if (existingGames > 0) {
    console.log('🔄 Games already exist, skipping seed...');
    return;
  }

  console.log('🌱 Seeding demo game...');

  const teacher = await userRepository.findOne({ where: { email: 'teacher@demo.com' } });
  if (!teacher) {
    console.error('❌ Teacher user not found. Please run user seed first.');
    return;
  }

  // ==========================================
  // 🧮 JUEGO DEMO: TRIVIA DE MATEMÁTICAS
  // ==========================================
  
  const triviaGame = gameRepository.create({
    title: '🧮 Trivia de Matemáticas: Números y Operaciones',
    description: 'Pon a prueba tus conocimientos matemáticos con esta divertida trivia. Incluye operaciones básicas, fracciones y problemas de lógica.',
    type: GameType.TRIVIA,
    subject: Subject.MATHEMATICS,
    difficulty: DifficultyLevel.INTERMEDIATE,
    educationLevel: EducationLevel.PRIMARY,
    maxPoints: 1000,
    timeLimit: 600,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    tags: ['matemáticas', 'operaciones', 'lógica', 'números', 'primaria'],
    gameConfig: {
      questionCount: 10,
      shuffleQuestions: true,
      shuffleOptions: true,
      showExplanations: true,
    },
    createdById: teacher.id,
  });

  const savedGame = await gameRepository.save(triviaGame);

  // Preguntas
  const questions = [
    {
      questionText: '¿Cuánto es 15 + 28?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['41', '43', '42', '44'],
      correctAnswer: '43',
      explanation: 'La suma de 15 + 28 = 43',
      points: 100,
      timeLimit: 30,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.BEGINNER,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['suma'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Cuál es el resultado de 9 × 7?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['56', '63', '72', '54'],
      correctAnswer: '63',
      explanation: 'La multiplicación de 9 × 7 = 63',
      points: 100,
      timeLimit: 30,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.BEGINNER,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['multiplicación'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Es 48 divisible por 6?',
      type: QuestionType.TRUE_FALSE,
      options: ['Verdadero', 'Falso'],
      correctAnswer: 'Verdadero',
      explanation: 'Sí, 48 ÷ 6 = 8',
      points: 100,
      timeLimit: 30,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.BEGINNER,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['división'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Qué fracción es equivalente a 3/4?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['6/8', '4/5', '5/6', '7/9'],
      correctAnswer: '6/8',
      explanation: '6/8 = 3/4. Son fracciones equivalentes.',
      points: 150,
      timeLimit: 45,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['fracciones'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Cuánto es el 25% de 80?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['15', '20', '25', '30'],
      correctAnswer: '20',
      explanation: 'El 25% de 80 = 20',
      points: 150,
      timeLimit: 45,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['porcentajes'],
      gameId: savedGame.id,
    },
    {
      questionText: 'Si un triángulo tiene ángulos de 60°, 60° y x°, ¿cuánto vale x?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['30°', '45°', '60°', '90°'],
      correctAnswer: '60°',
      explanation: 'x = 60°. Es un triángulo equilátero.',
      points: 150,
      timeLimit: 60,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['geometría'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Cuál es el siguiente número en la secuencia: 2, 6, 12, 20, ?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['24', '28', '30', '32'],
      correctAnswer: '30',
      explanation: 'El siguiente número es 30. Patrón: 1×2, 2×3, 3×4, 4×5, 5×6',
      points: 200,
      timeLimit: 60,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.ADVANCED,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['secuencias'],
      gameId: savedGame.id,
    },
    {
      questionText: 'María tiene el doble de años que Juan. Si Juan tiene 8 años, ¿cuántos años tendrá María dentro de 3 años?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['16', '18', '19', '22'],
      correctAnswer: '19',
      explanation: 'María tendrá 19 años. Ahora: 8 × 2 = 16. Dentro de 3 años: 16 + 3 = 19',
      points: 200,
      timeLimit: 90,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.ADVANCED,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['problemas'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Cuántos centímetros hay en 2.5 metros?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['25 cm', '125 cm', '250 cm', '2500 cm'],
      correctAnswer: '250 cm',
      explanation: 'Hay 250 cm en 2.5 metros. 1 metro = 100 cm, entonces 2.5 × 100 = 250 cm',
      points: 100,
      timeLimit: 30,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.BEGINNER,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['medidas'],
      gameId: savedGame.id,
    },
    {
      questionText: '¿Es el número 17 un número primo?',
      type: QuestionType.TRUE_FALSE,
      options: ['Verdadero', 'Falso'],
      correctAnswer: 'Verdadero',
      explanation: 'Verdadero. 17 es un número primo porque solo es divisible por 1 y por sí mismo',
      points: 150,
      timeLimit: 45,
      subject: Subject.MATHEMATICS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      educationLevel: EducationLevel.PRIMARY,
      tags: ['números primos'],
      gameId: savedGame.id,
    },
  ];

  for (const questionData of questions) {
    const question = questionRepository.create(questionData);
    await questionRepository.save(question);
  }

  console.log('✅ Trivia de Matemáticas creada con 10 preguntas');
  console.log('🎮 ¡Juego demo creado exitosamente!');
}
