import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Game } from './game.entity';

export interface CrosswordCell {
  row: number;
  col: number;
  letter: string;
  isStartOfWord?: boolean;
  wordNumber?: number;
  belongsToWords: string[]; // IDs de las palabras que pasan por esta celda
}

export interface CrosswordWord {
  id: string;
  word: string;
  clue: string;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical';
  number: number;
  difficulty: number;
}

export interface CrosswordGrid {
  rows: number;
  cols: number;
  cells: (CrosswordCell | null)[][];
}

@Entity('crossword_puzzles')
export class CrosswordPuzzle {
  @ApiProperty({ description: 'ID único del crucigrama' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del juego base' })
  @Column()
  gameId: string;

  @ApiProperty({ description: 'Título del crucigrama' })
  @Column()
  title: string;

  @ApiProperty({ description: 'Descripción del crucigrama', required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Tamaño del grid (filas)' })
  @Column({ default: 15 })
  gridRows: number;

  @ApiProperty({ description: 'Tamaño del grid (columnas)' })
  @Column({ default: 15 })
  gridCols: number;

  @ApiProperty({ description: 'Grid del crucigrama con todas las celdas' })
  @Column({ type: 'jsonb' })
  grid: CrosswordGrid;

  @ApiProperty({ description: 'Lista de palabras del crucigrama' })
  @Column({ type: 'jsonb' })
  words: CrosswordWord[];

  @ApiProperty({ description: 'Pistas horizontales' })
  @Column({ type: 'jsonb' })
  horizontalClues: Array<{
    number: number;
    clue: string;
    answer: string;
    startRow: number;
    startCol: number;
  }>;

  @ApiProperty({ description: 'Pistas verticales' })
  @Column({ type: 'jsonb' })
  verticalClues: Array<{
    number: number;
    clue: string;
    answer: string;
    startRow: number;
    startCol: number;
  }>;

  @ApiProperty({ description: 'Configuración de dificultad' })
  @Column({ type: 'jsonb', default: {} })
  difficultySettings: {
    wordLengthMin: number;
    wordLengthMax: number;
    intersectionDensity: number;
    vocabularyLevel: string;
  };

  @ApiProperty({ description: 'Estado del crucigrama' })
  @Column({ default: 'active' })
  status: string;

  @ApiProperty({ description: 'Tiempo estimado para completar en minutos' })
  @Column({ default: 15 })
  estimatedTime: number;

  @ApiProperty({ description: 'Número de palabras en el crucigrama' })
  @Column({ default: 0 })
  wordCount: number;

  @ApiProperty({ description: 'Porcentaje de celdas llenas' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  density: number;

  @ApiProperty({ description: 'Tags para categorización' })
  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relaciones
  @OneToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  // Métodos para la lógica del crucigrama
  
  /**
   * Valida si una palabra se puede colocar en la posición especificada
   */
  canPlaceWord(
    word: string,
    row: number,
    col: number,
    direction: 'horizontal' | 'vertical',
    existingWords: CrosswordWord[]
  ): boolean {
    // Verificar límites del grid
    if (direction === 'horizontal' && col + word.length > this.gridCols) return false;
    if (direction === 'vertical' && row + word.length > this.gridRows) return false;

    // Verificar intersecciones válidas
    for (let i = 0; i < word.length; i++) {
      const currentRow = direction === 'horizontal' ? row : row + i;
      const currentCol = direction === 'horizontal' ? col + i : col;
      
      const cellContent = this.getCellContent(currentRow, currentCol);
      
      if (cellContent !== null && cellContent !== word[i]) {
        return false; // Conflicto con letra existente
      }
    }

    return true;
  }

  /**
   * Obtiene el contenido de una celda específica
   */
  getCellContent(row: number, col: number): string | null {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return null;
    }
    
    const cell = this.grid.cells[row]?.[col];
    return cell ? cell.letter : null;
  }

  /**
   * Coloca una palabra en el grid
   */
  placeWord(word: CrosswordWord): void {
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'horizontal' ? word.startRow : word.startRow + i;
      const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
      
      if (!this.grid.cells[row]) {
        this.grid.cells[row] = [];
      }
      
      if (!this.grid.cells[row][col]) {
        this.grid.cells[row][col] = {
          row,
          col,
          letter: word.word[i],
          belongsToWords: [word.id],
        };
      } else {
        this.grid.cells[row][col]!.belongsToWords.push(word.id);
      }
      
      // Marcar inicio de palabra
      if (i === 0) {
        this.grid.cells[row][col]!.isStartOfWord = true;
        this.grid.cells[row][col]!.wordNumber = word.number;
      }
    }
  }

  /**
   * Encuentra intersecciones posibles entre dos palabras
   */
  findIntersections(word1: string, word2: string): Array<{
    word1Index: number;
    word2Index: number;
    letter: string;
  }> {
    const intersections = [];
    
    for (let i = 0; i < word1.length; i++) {
      for (let j = 0; j < word2.length; j++) {
        if (word1[i].toLowerCase() === word2[j].toLowerCase()) {
          intersections.push({
            word1Index: i,
            word2Index: j,
            letter: word1[i],
          });
        }
      }
    }
    
    return intersections;
  }

  /**
   * Calcula la densidad del crucigrama
   */
  calculateDensity(): number {
    const totalCells = this.gridRows * this.gridCols;
    let filledCells = 0;
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        if (this.grid.cells[row]?.[col]) {
          filledCells++;
        }
      }
    }
    
    return (filledCells / totalCells) * 100;
  }

  /**
   * Valida que el crucigrama esté correctamente formado
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Verificar que todas las palabras estén en el grid
    for (const word of this.words) {
      if (!this.canPlaceWord(word.word, word.startRow, word.startCol, word.direction, [])) {
        errors.push(`La palabra "${word.word}" no se puede colocar en la posición especificada`);
      }
    }
    
    // Verificar que no haya palabras huérfanas (sin intersecciones)
    if (this.words.length > 1) {
      for (const word of this.words) {
        let hasIntersection = false;
        for (const otherWord of this.words) {
          if (word.id !== otherWord.id) {
            const intersections = this.findIntersections(word.word, otherWord.word);
            if (intersections.length > 0) {
              hasIntersection = true;
              break;
            }
          }
        }
        if (!hasIntersection) {
          errors.push(`La palabra "${word.word}" no tiene intersecciones con otras palabras`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
