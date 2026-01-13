
import { GameState } from '../types';

const STORAGE_KEY = 'marias_pro_pwa_save';

export const saveGame = (state: GameState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game', e);
  }
};

export const loadGame = (): GameState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load game', e);
    return null;
  }
};

export const clearGame = () => {
  localStorage.removeItem(STORAGE_KEY);
};
