import './styles.css';
import { KathmanduChaos } from './game/KathmanduChaos.js';

const game = new KathmanduChaos({
  canvas: document.querySelector('#game'),
  ui: {
    overlay: document.querySelector('#overlay'),
    overlayText: document.querySelector('#overlayText'),
    startButton: document.querySelector('#startButton'),
    levelName: document.querySelector('#levelName'),
    routeTitle: document.querySelector('#routeTitle'),
    routeStory: document.querySelector('#routeStory'),
    levelIndex: document.querySelector('#levelIndex'),
    score: document.querySelector('#score'),
    passengers: document.querySelector('#passengers'),
    time: document.querySelector('#time'),
    hearts: document.querySelector('#hearts'),
    progressBar: document.querySelector('#progressBar')
  }
});

game.boot();
