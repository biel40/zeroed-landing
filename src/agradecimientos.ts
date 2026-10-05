import './style.css';
import { startEmbers } from './embers';

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

startEmbers(document.querySelector<HTMLCanvasElement>('#embers')!, window.matchMedia('(prefers-reduced-motion: reduce)'));
