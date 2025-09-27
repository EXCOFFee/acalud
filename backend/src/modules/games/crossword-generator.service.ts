import { Injectable } from '@nestjs/common';
import { CrosswordPuzzle, CrosswordGrid } from './crossword-puzzle.entity';

interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical';
  clue: string;
}

@Injectable()
export class CrosswordGeneratorService {
  /**
   * Generar crucigrama automáticamente
   */
  generateCrossword(
    words: string[], 
    clues: string[], 
    gridSize: number = 15
  ): { grid: CrosswordGrid; placements: WordPlacement[] } {
    const grid: CrosswordGrid = {
      rows: gridSize,
      cols: gridSize,
      cells: Array(gridSize).fill(null).map((_, row) => 
        Array(gridSize).fill(null).map((_, col) => ({
          row,
          col,
          letter: '',
          belongsToWords: []
        }))
      )
    };

    const placements: WordPlacement[] = [];
    
    // Algoritmo simple de colocación de palabras
    for (let i = 0; i < words.length && i < clues.length; i++) {
      const word = words[i].toUpperCase();
      const clue = clues[i];
      
      const placement = this.findBestPlacement(word, grid, placements);
      if (placement) {
        this.placeWord(word, placement, grid);
        placements.push({
          word,
          clue,
          ...placement
        });
      }
    }

    return { grid, placements };
  }

  /**
   * Encontrar la mejor posición para una palabra
   */
  private findBestPlacement(
    word: string, 
    grid: CrosswordGrid, 
    existingPlacements: WordPlacement[]
  ): { startRow: number; startCol: number; direction: 'horizontal' | 'vertical' } | null {
    const directions: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];
    
    for (const direction of directions) {
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          if (this.canPlaceWord(word, row, col, direction, grid)) {
            return { startRow: row, startCol: col, direction };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Verificar si se puede colocar una palabra
   */
  private canPlaceWord(
    word: string, 
    startRow: number, 
    startCol: number, 
    direction: 'horizontal' | 'vertical', 
    grid: CrosswordGrid
  ): boolean {
    const rowDelta = direction === 'vertical' ? 1 : 0;
    const colDelta = direction === 'horizontal' ? 1 : 0;

    // Verificar límites
    const endRow = startRow + (rowDelta * (word.length - 1));
    const endCol = startCol + (colDelta * (word.length - 1));
    
    if (endRow >= grid.rows || endCol >= grid.cols) {
      return false;
    }

    // Verificar conflictos con letras existentes
    for (let i = 0; i < word.length; i++) {
      const row = startRow + (rowDelta * i);
      const col = startCol + (colDelta * i);
      const cell = grid.cells[row][col];
      
      if (cell && cell.letter && cell.letter !== word[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Colocar palabra en el grid
   */
  private placeWord(
    word: string, 
    placement: { startRow: number; startCol: number; direction: 'horizontal' | 'vertical' }, 
    grid: CrosswordGrid
  ): void {
    const rowDelta = placement.direction === 'vertical' ? 1 : 0;
    const colDelta = placement.direction === 'horizontal' ? 1 : 0;

    for (let i = 0; i < word.length; i++) {
      const row = placement.startRow + (rowDelta * i);
      const col = placement.startCol + (colDelta * i);
      grid.cells[row][col].letter = word[i];
    }
  }

  /**
   * Validar solución de crucigrama
   */
  validateSolution(
    userGrid: string[][], 
    correctGrid: CrosswordGrid
  ): { isCorrect: boolean; errors: Array<{row: number; col: number}> } {
    const errors: Array<{row: number; col: number}> = [];
    let isCorrect = true;

    for (let row = 0; row < correctGrid.rows; row++) {
      for (let col = 0; col < correctGrid.cols; col++) {
        const correctCell = correctGrid.cells[row][col];
        const userLetter = userGrid[row]?.[col]?.toUpperCase() || '';
        
        if (correctCell && correctCell.letter && correctCell.letter !== userLetter) {
          errors.push({ row, col });
          isCorrect = false;
        }
      }
    }

    return { isCorrect, errors };
  }
}
