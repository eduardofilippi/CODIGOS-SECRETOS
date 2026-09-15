import type { Prize } from '../types/promo';

import playstation5 from '../assets/prizes/playstation-5.webp';
import nintendoSwitchOled from '../assets/prizes/nintendo-switch-oled.webp';
import kitVolantePedales from '../assets/prizes/kit-volante-pedales.webp';
import columpioJardin from '../assets/prizes/columpio-jardin.webp';
import camaElastica from '../assets/prizes/cama-elastica.webp';
import sillaGamer from '../assets/prizes/silla-gamer.webp';
import tabletAcer from '../assets/prizes/tablet-acer.webp';
import aroBasketball from '../assets/prizes/aro-basketball.webp';
import piscinaBestway from '../assets/prizes/piscina-bestway.webp';
import monopatinGlobber from '../assets/prizes/monopatin-globber.webp';
import bicicletaAro24 from '../assets/prizes/bicicleta-aro-24.webp';
import jblFlip7 from '../assets/prizes/jbl-flip-7.webp';
import bicicletaAro20 from '../assets/prizes/bicicleta-aro-20.webp';
import miniGloboLoco from '../assets/prizes/mini-globo-loco.webp';
import bicicletaAro16 from '../assets/prizes/bicicleta-aro-16.webp';
import smartfyGameBoy from '../assets/prizes/smartfy-game-boy.webp';
import rollersFerrari from '../assets/prizes/rollers-ferrari.webp';
import auricularesJbl from '../assets/prizes/auriculares-jbl-520bt.webp';
import skateMediano from '../assets/prizes/skate-mediano.webp';

import tPlaystation5 from '../assets/prizes/thumbs/playstation-5.webp';
import tNintendoSwitchOled from '../assets/prizes/thumbs/nintendo-switch-oled.webp';
import tKitVolantePedales from '../assets/prizes/thumbs/kit-volante-pedales.webp';
import tColumpioJardin from '../assets/prizes/thumbs/columpio-jardin.webp';
import tCamaElastica from '../assets/prizes/thumbs/cama-elastica.webp';
import tSillaGamer from '../assets/prizes/thumbs/silla-gamer.webp';
import tTabletAcer from '../assets/prizes/thumbs/tablet-acer.webp';
import tAroBasketball from '../assets/prizes/thumbs/aro-basketball.webp';
import tPiscinaBestway from '../assets/prizes/thumbs/piscina-bestway.webp';
import tMonopatinGlobber from '../assets/prizes/thumbs/monopatin-globber.webp';
import tBicicletaAro24 from '../assets/prizes/thumbs/bicicleta-aro-24.webp';
import tJblFlip7 from '../assets/prizes/thumbs/jbl-flip-7.webp';
import tBicicletaAro20 from '../assets/prizes/thumbs/bicicleta-aro-20.webp';
import tMiniGloboLoco from '../assets/prizes/thumbs/mini-globo-loco.webp';
import tBicicletaAro16 from '../assets/prizes/thumbs/bicicleta-aro-16.webp';
import tSmartfyGameBoy from '../assets/prizes/thumbs/smartfy-game-boy.webp';
import tRollersFerrari from '../assets/prizes/thumbs/rollers-ferrari.webp';
import tAuricularesJbl from '../assets/prizes/thumbs/auriculares-jbl-520bt.webp';
import tSkateMediano from '../assets/prizes/thumbs/skate-mediano.webp';

/**
 * CATÁLOGO DE PREMIOS — Códigos Secretos 2026.
 * -------------------------------------------------------------------------
 * Los 19 tipos de premio de la campaña, transcritos de
 * `recursos/premios/Calendario de Premios 2026.xlsx`. El detalle del cruce
 * entre hojas está en `docs/PREMIOS-2026.md`.
 *
 * Qué sale de dónde:
 *   name      hoja NOMBRE WEB, pasada a nombre comercial legible
 *   detail    hoja PREMIOS (descripción completa del producto)
 *   quantity  hoja NOMBRE WEB, auditada contra CALENDARIO y CANTIDADES
 *   article   definido a mano; no se deduce por código
 *   image     `recursos/premios`, reencodado a webp en `src/assets/prizes`
 *
 * MOCK. El backend expondrá este catálogo vía `promoApi.getPrizes()` y será
 * el dueño de la disponibilidad real. `quantity` acá es informativo: son las
 * unidades planificadas de toda la campaña, NO stock restante. El frontend no
 * descuenta ni decide nada con ese número.
 *
 * El calendario de adjudicación (89 fechas y horas) NO vive en el frontend a
 * propósito: publicarlo en el bundle dejaría la mecánica a la vista en
 * DevTools. Es responsabilidad del backend.
 */
export const MOCK_PRIZES: Prize[] = [
  {
    id: 'playstation-5',
    avimovilId: 12,
    name: 'PlayStation 5',
    article: 'un',
    quantity: 4,
    image: playstation5,
    thumb: tPlaystation5,
    detail: 'PlayStation Sony PS5 CFI-2015A con disco, Slim 1TB, Gran Turismo 7 + Astro Bot',
  },
  {
    id: 'nintendo-switch-oled',
    avimovilId: 8,
    name: 'Nintendo Switch OLED',
    article: 'una',
    quantity: 4,
    image: nintendoSwitchOled,
    thumb: tNintendoSwitchOled,
    detail: 'Consola Nintendo Switch OLED 64 GB',
  },
  {
    id: 'kit-volante-pedales',
    avimovilId: 10,
    name: 'Kit volante + pedales',
    article: 'un',
    quantity: 2,
    image: kitVolantePedales,
    thumb: tKitVolantePedales,
    detail: 'Kit volante + pedales Logitech G29 Driving Force Racing PS4/PS5',
    sku: '941-000111',
  },
  {
    id: 'columpio-jardin',
    avimovilId: 7,
    name: 'Columpio de jardín',
    article: 'un',
    quantity: 3,
    image: columpioJardin,
    thumb: tColumpioJardin,
    detail: 'Columpio de jardín de tres módulos Intex 144121',
    sku: 'MKP055195',
  },
  {
    id: 'cama-elastica',
    avimovilId: 6,
    name: 'Cama elástica',
    article: 'una',
    quantity: 5,
    image: camaElastica,
    thumb: tCamaElastica,
    detail: 'Cama elástica Zensei Level LVF 6FT, 1,83 m',
  },
  {
    id: 'silla-gamer',
    avimovilId: 14,
    name: 'Silla gamer',
    article: 'una',
    quantity: 3,
    image: sillaGamer,
    thumb: tSillaGamer,
    detail: 'Silla gamer Empoli EM-G01 roja con reposapiés',
    sku: 'MKP050970',
  },
  {
    id: 'tablet-acer',
    avimovilId: 17,
    name: 'Tablet Acer',
    article: 'una',
    quantity: 5,
    image: tabletAcer,
    thumb: tTabletAcer,
    detail: 'Tablet Acer A10-11-K4U7 4 GB / 64 GB / 10" HD, Android 11',
    sku: 'MKP065068',
  },
  {
    id: 'aro-basketball',
    avimovilId: 1,
    name: 'Aro de basketball',
    article: 'un',
    quantity: 5,
    image: aroBasketball,
    thumb: tAroBasketball,
    detail: 'Aro de basketball Level, altura regulable de 1,79 a 2,13 m',
  },
  {
    id: 'piscina-bestway',
    avimovilId: 11,
    name: 'Piscina Bestway',
    article: 'una',
    quantity: 5,
    image: piscinaBestway,
    thumb: tPiscinaBestway,
    detail: 'Piscina Bestway Steel Pro Max 6.473 L, estructura metálica',
    sku: '56416',
  },
  {
    id: 'monopatin-globber',
    avimovilId: 19,
    name: 'Monopatín Globber',
    article: 'un',
    quantity: 5,
    image: monopatinGlobber,
    thumb: tMonopatinGlobber,
    detail: 'Monopatín Globber Primo azul con luces',
    sku: 'MKP054916',
  },
  {
    id: 'bicicleta-aro-24',
    avimovilId: 5,
    name: 'Bicicleta Milano aro 24',
    article: 'una',
    quantity: 3,
    image: bicicletaAro24,
    thumb: tBicicletaAro24,
    detail: 'Bicicleta Milano aro 24" 18 velocidades, azul, MTB Action caballero',
  },
  {
    id: 'jbl-flip-7',
    avimovilId: 16,
    name: 'Speaker JBL Flip 7',
    article: 'un',
    quantity: 3,
    image: jblFlip7,
    thumb: tJblFlip7,
    detail: 'Speaker JBL Flip 7 waterproof, negro',
    sku: '97846-0',
  },
  {
    id: 'bicicleta-aro-20',
    avimovilId: 4,
    name: 'Bicicleta Milano aro 20',
    article: 'una',
    quantity: 3,
    image: bicicletaAro20,
    thumb: tBicicletaAro20,
    detail: 'Bicicleta Milano aro 20" BMX Campione, azul',
  },
  {
    id: 'mini-globo-loco',
    avimovilId: 18,
    name: 'Mini Globo Loco Bestway',
    article: 'un',
    quantity: 6,
    image: miniGloboLoco,
    thumb: tMiniGloboLoco,
    detail: 'Mini Globo Loco Bestway Ballon',
    sku: 'MKP003781',
  },
  {
    id: 'bicicleta-aro-16',
    avimovilId: 3,
    name: 'Bicicleta Milano aro 16',
    article: 'una',
    quantity: 3,
    image: bicicletaAro16,
    thumb: tBicicletaAro16,
    detail: 'Bicicleta Milano aro 16" BMX Bambino, roja',
    sku: '4101208MR',
  },
  {
    id: 'smartfy-game-boy',
    avimovilId: 9,
    name: 'Consola Smartfy Game Boy',
    article: 'una',
    quantity: 6,
    image: smartfyGameBoy,
    thumb: tSmartfyGameBoy,
    detail: 'Consola Smartfy Game Boy Switch GP01T, blanca',
    sku: 'MKP13555',
  },
  {
    id: 'rollers-ferrari',
    avimovilId: 13,
    name: 'Rollers Ferrari',
    article: 'unos',
    quantity: 8,
    image: rollersFerrari,
    thumb: tRollersFerrari,
    detail: 'Rollers Flashing Wheels Ferrari Movelmax',
    sku: 'MKP035990',
  },
  {
    id: 'auriculares-jbl-520bt',
    avimovilId: 2,
    name: 'Auriculares JBL Tune 520BT',
    article: 'unos',
    quantity: 8,
    image: auricularesJbl,
    thumb: tAuricularesJbl,
    detail: 'Auricular JBL Bluetooth Tune 520BT',
    sku: '47560-0',
  },
  {
    id: 'skate-mediano',
    avimovilId: 15,
    name: 'Skate mediano',
    article: 'un',
    quantity: 8,
    image: skateMediano,
    thumb: tSkateMediano,
    detail: 'Skate mediano PT1705 FAS',
    sku: 'MKP029323',
  },
];

/** Unidades planificadas para toda la campaña. Informativo: 89. */
export const TOTAL_PRIZE_UNITS = MOCK_PRIZES.reduce((n, p) => n + (p.quantity ?? 0), 0);

/** Índice por id de Avimovil (0–19) para resolver el premio ganado en O(1). */
const PRIZE_BY_AVIMOVIL_ID = new Map<number, Prize>(
  MOCK_PRIZES.filter((p) => p.avimovilId !== undefined).map((p) => [p.avimovilId as number, p]),
);

/**
 * Premio del catálogo a partir del id de Avimovil que manda el backend
 * (`premio-<id>-<nombre>`). Es la pieza que le pone imagen y copy al premio
 * ganado: la respuesta del backend sólo trae id y nombre.
 *
 * Devuelve `undefined` si el id no está en el catálogo (p. ej. el premio de
 * prueba, id 0). El que llama decide el fallback —normalmente, mostrar el
 * nombre que vino del backend sin imagen— antes que inventar un premio.
 */
export function prizeByAvimovilId(avimovilId: number): Prize | undefined {
  return PRIZE_BY_AVIMOVIL_ID.get(avimovilId);
}

/**
 * Premios que asoman del cofre en el hover del Home (sólo decorativo).
 * No es el catálogo: son tres siluetas reconocibles al tamaño de un ícono. Que
 * salgan los 19 no aportaría nada y ensuciaría la animación.
 */
export const MOCK_CHEST_PREVIEW: Prize[] = [
  { id: 'preview-playstation', name: 'PlayStation 5', image: playstation5 },
  { id: 'preview-nintendo', name: 'Nintendo Switch OLED', image: nintendoSwitchOled },
  { id: 'preview-skate', name: 'Skate', image: skateMediano },
];
