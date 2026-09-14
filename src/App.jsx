import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Boxes, Wrench, Truck, ShoppingCart, PoundSterling,
  Search, Filter, Plus, X, Edit3, Trash2, Save, Copy, Upload, Download,
  ChevronDown, ChevronRight, ArrowRight, Package, MapPin, Building2,
  Calendar, Camera, Image as ImageIcon, Check, AlertCircle, Clock,
  RefreshCw, Sparkles, TrendingUp, PackageCheck, PackageOpen, Settings
} from 'lucide-react';

/* ============================================================
   TDM EQUIPMENT HUB — one home for TDM Gym, Gym Unity, WBAK
   Persistent storage via window.storage. Personal scope.
   ============================================================ */

// ---------- CONSTANTS ----------

const CATEGORIES = ['Chest', 'Shoulders', 'Back', 'Legs', 'Arms', 'Cardio', 'Powerlifting', 'Accessories', 'Other'];

const SUBCATEGORIES = {
  Chest: ['Presses', 'Pec Decs / Flies'],
  Shoulders: ['Presses', 'Laterals', 'Rear Delts'],
  Back: ['Pulldowns', 'Rows', 'Pullover', 'Back Ext'],
  Legs: ['Compounds', 'Leg Curls', 'Leg Extensions', 'Glutes / Hips', 'Adductors', 'Calves'],
  Arms: ['Triceps', 'Biceps'],
  Cardio: ['Treadmill', 'Bike', 'Rower', 'Stair', 'Elliptical'],
  Powerlifting: ['Racks', 'Benches', 'Platforms', 'Bars', 'Plates'],
  Accessories: ['Attachments', 'Storage', 'Other'],
  Other: ['Other']
};

const MACHINE_TYPES = ['Selectorised', 'Plate Loaded', 'Cable', 'Free Weight', 'Bodyweight', 'Cardio', 'Other'];

const LOCATIONS = [
  'WBAK HQ', 'At Craigs', 'At Nytram', 'At JP', 'Other Refurbisher',
  'TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth',
  'Incoming (with seller)', 'For Sale', 'Sold', 'Undecided'
];

const REFURBISHERS = ['Craigs', 'Nytram', 'JP', 'Other'];

const DESTINATIONS = [
  'TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth', 'Unity 5',
  'For Sale', 'Undecided'
];

// "Unity 5" has no physical site yet -- kit destined there is syphoned-off stock still
// sitting at WBAK, not a location it can be marked "landed" at.
const GYM_DESTINATIONS = DESTINATIONS.filter(d => d !== 'For Sale' && d !== 'Undecided' && d !== 'Unity 5');

// Simple 7-way view of "where is it": each of the 5 gyms, WBAK (everything not yet
// placed at a gym -- HQ, at a refurbisher, incoming, for sale, undecided), or Unity 5
// (syphoned-off stock earmarked for the new site). Every item falls into exactly one.
const LOCATION_BUCKETS = ['TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth', 'WBAK', 'Unity 5'];
function getLocationBucket(e) {
  if (GYM_DESTINATIONS.includes(e.currentLocation)) return e.currentLocation;
  if (e.destination === 'Unity 5') return 'Unity 5';
  return 'WBAK';
}

const STATUSES = [
  'Incoming', 'At HQ', 'In Refurb', 'Ready to Deploy', 'In Use', 'Listed for Sale', 'Sold'
];

const REFURB_STAGES = ['Landed', 'Refurb', 'Upholstery', 'Sweat Cover', 'Livery', 'Complete'];

const REFURB_STAGE_COLORS = {
  'Landed':        { bg: 'bg-blue-500/25',   text: 'text-blue-200',   border: 'border-blue-400/50' },
  'Refurb':        { bg: 'bg-orange-500/25', text: 'text-orange-200', border: 'border-orange-400/50' },
  'Upholstery':    { bg: 'bg-purple-500/25', text: 'text-purple-200', border: 'border-purple-400/50' },
  'Sweat Cover':   { bg: 'bg-pink-500/25',   text: 'text-pink-200',   border: 'border-pink-400/50' },
  'Livery':        { bg: 'bg-amber-500/25',  text: 'text-amber-200',  border: 'border-amber-400/50' },
  'Complete':      { bg: 'bg-emerald-500/25',text: 'text-emerald-200',border: 'border-emerald-400/50' }
};

const STATUS_COLORS = {
  'Incoming':        { bg: 'bg-blue-500/25',    text: 'text-blue-200',    dot: 'bg-blue-400' },
  'At HQ':           { bg: 'bg-stone-400/25',   text: 'text-stone-200',   dot: 'bg-stone-400' },
  'In Refurb':       { bg: 'bg-orange-500/25',  text: 'text-orange-200',  dot: 'bg-orange-400' },
  'Ready to Deploy': { bg: 'bg-cyan-500/25',    text: 'text-cyan-200',    dot: 'bg-cyan-400' },
  'In Use':          { bg: 'bg-emerald-500/25', text: 'text-emerald-100', dot: 'bg-emerald-400' },
  'Listed for Sale': { bg: 'bg-amber-500/25',   text: 'text-amber-200',   dot: 'bg-amber-400' },
  'Sold':            { bg: 'bg-zinc-500/25',    text: 'text-zinc-200',    dot: 'bg-zinc-500' }
};

// Storage keys
const K = {
  EQUIP: 'equip:v1',
  SALES: 'sales:v1',
  VANRUNS: 'vanruns:v2',
  IMG: (id) => `img:v1:${id}`,
  SEEDED: 'seeded:v1',
  MIGRATED_REFURB_V1: 'migrated:refurb-v1',
  MIGRATED_UNITY_ROSTER_V1: 'migrated:unity-roster-v1',
  MIGRATED_TDMREF_V1: 'migrated:tdmref-v1',
  MIGRATED_DUPLICATES_V1: 'migrated:duplicates-v1',
  MIGRATED_DUPLICATES_V2: 'migrated:duplicates-v2',
  MIGRATED_ORDER_DATES_V1: 'migrated:order-dates-v1',
  MIGRATED_ORDER_DATES_V2: 'migrated:order-dates-v2'
};

// ---------- SEED DATA ----------
// Focused on live WBAK refurb pipeline + TDM Gym permanent kit + Unity active items.
// Each item has a stable ID so future updates from Claude can MERGE without overwriting your edits.

const mkId = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const seedItem = (o) => ({
  id: o.id,
  name: o.name,
  brand: o.brand,
  category: o.category,
  subcategory: o.subcategory || '',
  machineType: o.machineType || '',
  tdmRef: o.tdmRef || '',
  cost: o.cost || 0,
  marketValue: o.marketValue || 0,
  currentLocation: o.currentLocation || 'WBAK HQ',
  destination: o.destination || 'Undecided',
  status: o.status || 'At HQ',
  refurbStage: o.refurbStage || '',
  refurbisher: o.refurbisher || '',
  deliveryDate: o.deliveryDate || '',   // when we take it to refurbisher
  returnDate: o.returnDate || '',       // when refurbisher returns it
  arrivalDate: o.arrivalDate || '',     // when it originally arrived at HQ
  orderDate: o.orderDate || '',         // when we ordered it
  seller: o.seller || '',
  notes: o.notes || '',
  addedAt: Date.now(),
  updatedAt: Date.now()
});

// Example/placeholder Unity gym items from the original artifact seed, superseded
// by the real Sept 2026 asset roster exports. No longer part of SEED_EQUIPMENT_BASE
// below, but a live database seeded before this update still has them stored --
// this list lets the one-time migration in load() strip them out.
const FABRICATED_UNITY_PLACEHOLDER_IDS = [
  'unity-lich-flex-deltoid', 'unity-burton-cybex-vr2-lc', 'unity-fradley-magnum-mid-row',
  'unity-tam-precor-donkey-calf', 'unity-tam-cybex-vr2-cp', 'unity-lich-cybex-v1-squat',
  'unity-burton-flex-incline', 'unity-tam-booty-back-ext', 'unity-burton-booty-v8'
];

// Records confirmed (by Liam) to be duplicate DB entries for a machine already
// tracked correctly elsewhere -- a WBAK-tagged record for something that's
// actually the same physical unit as its TDM-Gym-landed counterpart, or a
// second entry for a ref that was double-recorded. No longer part of
// SEED_EQUIPMENT_BASE; this list lets the one-time migration in load() remove
// them from a live database that already has them.
const CONFIRMED_DUPLICATE_IDS = [
  'naut-2st-vert-chest','naut-xpload-incline','magnum-biangular-upper-chest','naut-nitro-pec-fly-rear-delt',
  'bodymasters-pec-fly-rear-delt','naut-2st-shoulder-press','strive-lateral-raise','lf-pro1-lateral',
  'precor-pulldown','hd-xpload-pulldown','cybex-eagle-incline-pull','panatta-fantastic-row',
  'hd-magnum-biangular-row','hs-iso-row','naut-nitro-back-ext','naut-nitro-pullover','hs-pullover',
  'atlantis-precision-lp','icarian-lying-lp','hoist-rocit-lc','atlantis-precision-lying-lc',
  'atlantis-precision-seated-lc','cybex-vr-leg-ext','strive-smart-leg-ext','naut-nitro-ab-ad',
  'flex-classic-adductor','naut-glute-drive','cybex-vr2-rotary-calf','bodymasters-standing-calf',
  'bodymasters-overhead-tri','naut-nitro-sa-tri','naut-nitro-sa-bicep','hoist-rocit-cable-curl',
  'flex-bisolator','strive-pl-preacher','bodymasters-selectorised-bicep','lf-cable-crossover',
  'lf-mj8-jungle','cybex-bravo','cybex-v2-smith','naut-smith','naut-nitro-ab-crunch',
  'wbak-145', 'hoist-star-pulldown-tdm2', 'wbak-222', 'unity-lichfield-ref256-2'
];

// Second batch found in the full duplicate sweep -- same pattern (same brand/
// location, cost matching exactly or within the usual rounding), confirmed by
// Liam. A separate list/migration since MIGRATED_DUPLICATES_V1 already ran on
// devices synced before this batch was found.
const CONFIRMED_DUPLICATE_IDS_V2 = [
  'tdm-atlantis-p443-incline', 'tdm-atlantis-e449-shoulder', 'tdm-atlantis-c212-pendulum',
  'tdm-flex-classic-incline', 'tdm-flex-deltoid-raise-black', 'tdm-cybex-classic-lateral',
  'tdm-paramount-rotary-chest', 'tdm-concept2-rower'
];

// Order dates transcribed from the Incoming Equipment log, keyed by TDM ref.
// Used only by the one-time migration below to backfill orderDate on an
// already-synced live record -- SEED_EQUIPMENT_BASE items already carry
// their own orderDate directly.
const ORDER_DATES_BY_REF = {"101":"2025-02-22","102":"2025-02-22","103":"2025-02-22","104":"2025-07-10","105":"2025-07-10","106":"2025-07-10","107":"2025-07-10","108":"2025-07-10","109":"2025-07-10","110":"2025-07-10","111":"2025-07-10","112":"2025-07-10","113":"2025-07-10","114":"2025-07-10","115":"2025-07-10","116":"2025-07-10","117":"2025-07-10","118":"2025-07-10","119":"2025-07-10","120":"2025-07-14","121":"2025-07-14","122":"2025-07-14","123":"2025-07-14","124":"2025-07-14","125":"2025-07-14","126":"2025-07-14","127":"2025-07-14","128":"2025-07-14","129":"2025-07-14","130":"2025-07-14","131":"2025-07-14","132":"2025-07-14","133":"2025-07-16","134":"2025-07-16","135":"2025-07-16","136":"2025-07-16","137":"2025-07-16","138":"2025-07-16","139":"2025-07-16","140":"2025-07-23","141":"2025-07-23","142":"2025-08-02","143":"2025-08-02","144":"2025-08-05","145":"2025-08-05","146":"2025-08-05","147":"2025-08-05","148":"2025-08-09","149":"2025-08-09","150":"2025-08-09","151":"2025-08-09","152":"2025-08-09","153":"2025-08-09","154":"2025-08-09","155":"2025-10-16","156":"2025-10-16","157":"2025-10-16","158":"2025-10-16","159":"2025-10-16","160":"2025-10-16","161":"2025-10-20","162":"2025-10-20","163":"2025-10-20","167":"2025-10-20","170":"2025-10-20","171":"2025-10-20","172":"2025-10-20","173":"2025-10-20","174":"2025-10-20","175":"2025-10-20","176":"2025-10-20","177":"2025-10-20","178":"2025-10-20","179":"2025-10-20","180":"2025-10-20","181":"2025-10-23","182":"2025-10-23","183":"2025-10-23","184":"2025-10-23","185":"2025-10-23","186":"2025-10-23","187":"2025-10-23","188":"2025-10-23","189":"2025-10-23","190":"2025-10-23","191":"2025-08-20","192":"2025-08-20","193":"2025-08-20","194":"2025-08-20","195":"2025-08-20","196":"2025-08-20","197":"2025-10-20","198":"2025-10-20","199":"2025-10-20","200":"2025-10-28","201":"2025-10-28","202":"2025-10-28","203":"2025-10-28","204":"2025-10-28","205":"2025-05-15","206":"2025-05-15","207":"2025-05-15","208":"2025-05-15","209":"2025-05-15","210":"2025-05-15","211":"2025-05-15","212":"2025-05-15","213":"2025-05-15","214":"2025-05-15","215":"2025-05-15","216":"2025-05-15","217":"2025-05-15","218":"2025-05-15","219":"2026-02-20","220":"2026-03-25","221":"2026-03-25","222":"2026-03-25","223":"2026-03-25","224":"2026-03-25","225":"2026-03-24","226":"2026-03-24","227":"2026-03-24","228":"2026-03-24","229":"2026-03-24","230":"2026-03-24","231":"2026-03-24","232":"2026-03-24","233":"2026-03-24","234":"2026-03-24","235":"2026-03-24","236":"2026-03-21","237":"2026-03-21","240":"2026-03-21","242":"2026-03-21","243":"2026-03-21","244":"2026-03-26","245":"2026-03-26","246":"2026-04-03","247":"2026-04-03","248":"2026-04-03","249":"2026-04-03","250":"2026-04-02","251":"2026-04-02","253":"2026-04-02","254":"2026-04-02","255":"2026-04-06","256":"2026-04-06","257":"2026-04-09","258":"2026-04-09","259":"2026-04-09","260":"2026-04-09","261":"2026-04-09","267":"2026-04-19","268":"2026-04-19","269":"2026-04-19","270":"2026-04-19","271":"2026-04-21","272":"2026-04-21","273":"2026-04-23","274":"2026-04-26","275":"2026-04-26","276":"2026-04-26","277":"2026-04-26","278":"2026-04-26","279":"2026-04-26","280":"2026-04-26","281":"2026-04-26","282":"2026-04-26","283":"2026-04-27","284":"2026-04-27","285":"2026-05-03","286":"2026-05-03","287":"2026-05-03","288":"2026-05-03","289":"2026-05-03","290":"2026-05-03","291":"2026-05-03","292":"2026-05-06","293":"2026-05-06","294":"2026-05-06","295":"2026-05-06","306":"2026-05-16","307":"2026-05-16","308":"2026-05-18","309":"2026-05-18","310":"2026-05-18","311":"2026-06-01","312":"2026-06-01","313":"2026-06-01","314":"2026-06-01","315":"2026-06-01","316":"2026-06-10","317":"2026-06-10","318":"2026-06-05","319":"2026-06-11","320":"2026-06-13","321":"2026-06-13","322":"2026-06-13","323":"2026-06-12","324":"2026-06-12","325":"2026-06-08","326":"2026-06-08","327":"2026-06-08","328":"2026-06-08","329":"2026-06-08","330":"2026-06-08","331":"2026-06-08","332":"2026-06-17","333":"2026-06-17","334":"2026-06-20","335":"2026-06-20","336":"2026-06-20","337":"2026-06-20","338":"2026-06-20","339":"2026-06-20","340":"2026-06-20","341":"2026-06-20","342":"2026-06-20","343":"2026-06-20","344":"2026-06-20","345":"2026-06-20","346":"2026-06-20","347":"2026-06-20","348":"2026-06-20","349":"2026-06-20","350":"2026-06-20","351":"2026-07-03","352":"2026-07-03","353":"2026-07-03","354":"2026-07-03","355":"2026-07-03","356":"2026-07-03","357":"2026-07-03","358":"2026-07-04","359":"2026-07-04","360":"2026-07-04","366":"2026-06-18","367":"2026-06-18","368":"2026-06-13","369":"2026-07-08","370":"2026-07-08","371":"2026-07-08","372":"2026-07-08","373":"2026-07-08","374":"2026-07-08","375":"2026-07-08","376":"2026-07-08","377":"2026-07-08","378":"2026-07-08","379":"2026-07-08","380":"2026-07-08","381":"2026-07-15","382":"2026-07-24","383":"2026-07-19","384":"2026-07-24","385":"2026-07-24","386":"2026-07-30","387":"2026-08-07","388":"2026-09-09","389":"2026-09-09","390":"2026-09-09","391":"2026-09-09","392":"2026-09-09","393":"2026-09-09","394":"2026-09-09","395":"2026-09-09","396":"2026-09-09","397":"2026-09-09","398":"2026-09-09","399":"2026-09-11","400":"2026-09-11"};
const UNITY_GYM_LOCATIONS = ['Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth'];
// Random placeholder purchase dates, keyed by item id, for the 148 items with no real
// order date on record (Liam's instruction: TDM Gym items randomised across
// Oct 2025 - May 2026, WBAK items randomised across Feb 2026 - May 2026). Used only by
// the one-time migration below to backfill an already-synced live record's blank
// orderDate -- SEED_EQUIPMENT_BASE items already carry their own orderDate directly.
const RANDOM_ORDER_DATES_BY_ID = {"atlantis-precision-lp-tdm2":"2026-01-20","atlantis-precision-lying-lc-tdm2":"2026-04-01","atlantis-precision-seated-lc-tdm2":"2026-02-10","bodymasters-overhead-tri-tdm2":"2026-01-31","bodymasters-selectorised-bicep-tdm2":"2025-12-25","bodymasters-standing-calf-tdm2":"2026-05-20","cybex-bravo-tdm2":"2026-01-09","cybex-classic-row":"2025-10-08","cybex-eagle-incline-pull-tdm2":"2026-01-18","cybex-kneeling-lc":"2026-03-13","cybex-treadmill-1":"2026-01-04","cybex-treadmill-2":"2026-05-09","cybex-treadmill-3":"2026-04-15","cybex-treadmill-4":"2026-01-03","cybex-v1-leg-press-tdm2":"2026-02-09","cybex-v1-squat-press-tdm2":"2026-04-20","cybex-v2-smith-tdm2":"2026-01-29","cybex-vr-leg-ext-tdm2":"2025-10-14","cybex-vr2-rotary-calf-tdm2":"2026-05-28","elite-fts-monolift":"2026-04-28","flex-hamtractor":"2026-02-12","hd-magnum-biangular-row-tdm2":"2026-04-20","hd-xpload-pulldown-tdm2":"2026-05-01","hoist-rocit-cable-curl-tdm2":"2026-04-23","hoist-rocit-lc-tdm2":"2026-03-26","hs-iso-row-tdm2":"2026-05-01","hs-pullover-tdm2":"2026-05-14","icarian-ghr":"2025-11-01","jordan-ghr":"2026-05-05","lf-cable-crossover-tdm2":"2026-01-05","lf-mj8-jungle-tdm2":"2026-05-12","lf-pro1-lateral-tdm2":"2026-05-30","magnum-leg-ext":"2026-02-20","matrix-plate-trees":"2026-03-02","medx-leg-ext":"2026-01-04","naut-2st-vert-chest-tdm2":"2025-12-28","naut-glute-drive-tdm2":"2025-10-11","naut-nitro-ab-ad-tdm2":"2025-12-23","naut-nitro-ab-crunch-tdm2":"2025-12-16","naut-nitro-back-ext-tdm2":"2025-11-03","naut-nitro-pec-fly-rear-delt-tdm2":"2026-05-01","naut-nitro-pullover-tdm2":"2026-04-18","naut-nitro-sa-bicep-tdm2":"2026-05-09","naut-nitro-sa-tri-tdm2":"2025-12-09","naut-smith-tdm2":"2026-05-07","naut-xpload-incline-tdm2":"2025-10-30","panatta-fantastic-row-tdm2":"2026-04-09","paramount-rotary-pulldown":"2026-04-20","precor-pulldown-tdm2":"2026-02-19","ss-comp-bench-a":"2025-12-20","ss-comp-bench-b":"2026-04-25","ss-deadlift-platform":"2026-04-12","ss-deadlift-platform-2":"2025-11-24","ss-ghr":"2026-03-31","ss-riot-combo-rack":"2026-04-07","ss-thor-cage-3":"2025-12-21","strive-lateral-raise-tdm2":"2026-03-16","strive-smart-leg-ext-tdm2":"2025-12-09","strive-smart-prone-lc-tdm2":"2025-10-25","tdm-cybex-eagle-abdominal":"2026-04-27","tdm-gym-401":"2026-01-21","tdm-gym-402":"2026-05-19","tdm-gym-46":"2026-01-03","tdm-gym-59":"2026-01-20","tdm-gym-60":"2025-12-01","tdm-gym-61":"2026-02-08","tdm-gym-62":"2026-03-31","tdm-gym-63":"2025-12-26","tdm-gym-64":"2026-04-22","tdm-gym-65":"2025-10-03","tdm-gym-66":"2026-04-07","tdm-gym-67":"2026-04-07","tdm-gym-68":"2026-02-19","tdm-gym-69":"2026-04-11","tdm-gym-70":"2025-12-18","tdm-gym-71":"2026-01-30","tdm-gym-72":"2025-11-02","tdm-gym-73":"2025-11-29","tdm-gym-74":"2026-01-22","tdm-gym-75":"2025-11-06","tdm-gym-76":"2026-05-16","tdm-gym-77":"2026-01-11","tdm-gym-78":"2025-12-04","tdm-gym-79":"2026-01-26","tdm-gym-81":"2026-03-15","tdm-gym-82":"2025-10-01","tdm-gym-83":"2025-11-24","tdm-gym-84":"2025-12-06","tdm-gym-85":"2025-10-08","tdm-texas-deadlift-bar":"2025-11-29","unity5-cybex-eagle-leg-press":"2026-05-27","unity5-paramount-pl-flat-chest-press":"2026-02-13","unity5-precor-shoulder-press":"2026-02-11","wbak-303":"2026-03-04","wbak-304":"2026-03-12","wbak-364":"2026-03-22","wbak-801":"2026-02-14","wbak-802":"2026-05-27","wbak-803":"2026-03-21","wbak-804":"2026-02-04","wbak-805":"2026-03-04","wbak-806":"2026-04-19","wbak-807":"2026-03-28","wbak-808":"2026-04-02","wbak-809":"2026-02-23","wbak-810":"2026-02-11","wbak-811":"2026-02-02","wbak-812":"2026-02-25","wbak-813":"2026-04-13","wbak-814":"2026-05-30","wbak-815":"2026-03-15","wbak-816":"2026-04-14","wbak-817":"2026-04-07","wbak-818":"2026-03-02","wbak-819":"2026-05-26","wbak-820":"2026-05-05","wbak-821":"2026-03-28","wbak-822":"2026-03-31","wbak-823":"2026-03-09","wbak-824":"2026-05-20","wbak-825":"2026-04-27","wbak-826":"2026-03-05","wbak-827":"2026-03-26","wbak-828":"2026-03-19","wbak-829":"2026-03-25","wbak-830":"2026-05-18","wbak-831":"2026-05-10","wbak-832":"2026-05-27","wbak-833":"2026-04-20","wbak-834":"2026-05-13","wbak-835":"2026-04-14","wbak-836":"2026-05-11","wbak-837":"2026-03-09","wbak-838":"2026-05-20","wbak-839":"2026-05-01","wbak-840":"2026-04-09","wbak-841":"2026-05-16","wbak-842":"2026-03-12","wbak-843":"2026-04-03","wbak-844":"2026-03-10","wbak-845":"2026-02-12","wbak-846":"2026-04-23","wbak-uncertain-363":"2026-05-17","wbak-uncertain-365":"2026-04-09","wbak-uncertain-847":"2026-03-17","wbak-uncertain-848":"2026-03-02","wbak-uncertain-849":"2026-02-15","wbak-uncertain-850":"2026-05-18"};

const SEED_EQUIPMENT_BASE = [
  { id: "naut-1stgen-bench-iii", name: "Nautilus 1st Gen Bench Press III", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "277", cost: 1200, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-04-26", seller: "Belmont, NC" },
  { id: "megamass-lev-incline", name: "Megamass Leverage Incline Press", brand: "Megamass", category: "Chest", subcategory: "Presses", tdmRef: "261", cost: 2995, marketValue: 4500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-09", seller: "Belfast" },
  { id: "magnum-biangular-chest", name: "Magnum Biangular Chest", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "151", cost: 1500, marketValue: 2250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-08-09", seller: "Bellevue, IL", notes: "Metal plate needed both sides top of stack tower + green globe on stack casing" },
  { id: "atlantis-converging-incline", name: "Atlantis Converging Incline Press", brand: "Atlantis", category: "Chest", subcategory: "Presses", tdmRef: "101", cost: 4700, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-02-22", seller: "Laval, Quebec" },
  { id: "icarian-incline-bench", name: "Icarian Incline Bench Press", brand: "Icarian", category: "Chest", subcategory: "Presses", tdmRef: "317", cost: 250, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-06-10", notes: "Needs Icarian stickers (NOT Precor)" },
  { id: "flex-deltoid-fly", name: "Flex Fitness Deltoid Fly", brand: "Flex Fitness", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "270", cost: 2500, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-17", orderDate: "2026-04-19", seller: "Baltimore, MD" },
  { id: "paramount-pec-fly-ap3400", name: "Paramount Pec Fly Rear Delt AP3400", brand: "Paramount", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "320", cost: 2000, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-09", orderDate: "2026-06-13" },
  { id: "naut-1stgen-10-fly", name: "Nautilus 1st Gen 10 Degree Fly", brand: "Nautilus", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "284", cost: 3300, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2026-04-27", seller: "Indiana, IN" },
  { id: "arsenal-reloaded-incline-fly", name: "Arsenal Reloaded Incline Fly", brand: "Arsenal", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "244", cost: 3300, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-03-26", seller: "Knoxville, TN" },
  { id: "cybex-galileo-chest-press", name: "Cybex Galileo Chest Press", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "368", cost: 1000, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Refurb", orderDate: "2026-06-13", notes: "Deliver to JP then back to us 20/7" },
  { id: "gymleco-shoulder-030", name: "Gymleco Shoulder Press 030", brand: "Gymleco", category: "Shoulders", subcategory: "Presses", tdmRef: "282", cost: 3450, marketValue: 3450, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-26", seller: "Eskilstuna" },
  { id: "flex-leverage-shoulder", name: "Flex Fitness Leverage Shoulder Press", brand: "Flex Fitness", category: "Shoulders", subcategory: "Presses", tdmRef: "200", cost: 4000, marketValue: 4500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-10-28", seller: "Moncton" },
  { id: "atlantis-converging-shoulder", name: "Atlantis Converging Shoulder Press", brand: "Atlantis", category: "Shoulders", subcategory: "Presses", tdmRef: "102", cost: 4700, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-02-22", seller: "Laval, Quebec" },
  { id: "megamass-chain-lateral", name: "Megamass Chain Driven Lateral Raise", brand: "Megamass", category: "Shoulders", subcategory: "Laterals", tdmRef: "260", cost: 2995, marketValue: 3700, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-04-09", seller: "Dezhou" },
  { id: "flex-deltoid-raise", name: "Flex Fitness Deltoid Raise", brand: "Flex Fitness", category: "Shoulders", subcategory: "Laterals", tdmRef: "173", cost: 3000, marketValue: 3250, currentLocation: "At Nytram", destination: "Unity Lichfield", status: "In Use", refurbStage: "Refurb", refurbisher: "Nytram", orderDate: "2025-10-20", seller: "Florence" },
  { id: "bodymasters-321-lateral", name: "Bodymasters 321 Lateral Raise", brand: "Bodymasters", category: "Shoulders", subcategory: "Laterals", tdmRef: "309", cost: 2500, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Complete", deliveryDate: "2026-07-10", returnDate: "2026-07-24", orderDate: "2026-05-18", seller: "Johnston, RI" },
  { id: "cybex-eagle-lateral", name: "Cybex Classic Eagle Lateral Raise", brand: "Cybex", category: "Shoulders", subcategory: "Laterals", tdmRef: "281", cost: 2200, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2026-04-26", seller: "Longview, TX" },
  { id: "arsenal-standing-lateral", name: "Arsenal Standing Lateral Raise", brand: "Arsenal", category: "Shoulders", subcategory: "Laterals", tdmRef: "240", cost: 3300, marketValue: 4250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-17", orderDate: "2026-03-21", seller: "Santa Ana, CA" },
  { id: "strive-pl-pulldown", name: "Strive PL Pulldown", brand: "Strive", category: "Back", subcategory: "Pulldowns", tdmRef: "175", cost: 5500, marketValue: 7500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-10-20", seller: "Winnipeg" },
  { id: "paramount-rotary-pulldown", name: "Paramount Rotary Pulldown", brand: "Paramount", category: "Back", subcategory: "Pulldowns", tdmRef: "404", cost: 2100, marketValue: 2500, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", seller: "Mount Vernon, WA" },
  { id: "granite-lev-pulldown", name: "Granite Leverage Pulldown 2.0", brand: "Granite", category: "Back", subcategory: "Pulldowns", tdmRef: "321", cost: 2700, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Refurb", orderDate: "2026-06-13", notes: "Deliver to JP then back 24/7. Custom sticker where Flex Leverage would normally go" },
  { id: "hoist-star-pulldown", name: "Hoist Star Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "191", cost: 1000, marketValue: 2500, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", orderDate: "2025-08-20", seller: "Redditch", notes: "Remake info plate both sides + period-correct Hoist logo" },
  { id: "cybex-vr2-pulldown", name: "Cybex VR2 Pulldown", brand: "Cybex", category: "Back", subcategory: "Pulldowns", tdmRef: "236", cost: 2000, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-03-21", seller: "Redgranite, WI" },
  { id: "megamass-tbar-linear-row", name: "Megamass T Bar Linear Row", brand: "Megamass", category: "Back", subcategory: "Rows", tdmRef: "258", cost: 2995, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-04-09", seller: "Belfast" },
  { id: "megamass-45-iso-row-pro", name: "Megamass 45 Degree Iso Linear Row Pro", brand: "Megamass", category: "Back", subcategory: "Rows", tdmRef: "261", cost: 4195, marketValue: 5500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-04-09", seller: "Belfast" },
  { id: "cybex-classic-row", name: "Cybex Classic Row (VR2)", brand: "Cybex", category: "Back", subcategory: "Rows", cost: 770, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Refurb", refurbStage: "Landed", seller: "Jackson, MS" },
  { id: "flex-lev-row", name: "Flex Fitness Leverage Row", brand: "Flex Fitness", category: "Back", subcategory: "Rows", tdmRef: "333", cost: 6300, marketValue: 9000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", arrivalDate: "2026-07-23", orderDate: "2026-06-17", notes: "ETA 23rd July. Deliver to Craig 24/7" },
  { id: "flex-dorsiflexor", name: "Flex Fitness Dorsiflexor", brand: "Flex Fitness", category: "Back", subcategory: "Rows", tdmRef: "255", cost: 2850, marketValue: 3250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-06", seller: "Durango" },
  { id: "bodymasters-tbar-row", name: "Bodymasters T Bar Row", brand: "Bodymasters", category: "Back", subcategory: "Rows", tdmRef: "310", cost: 2500, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-05-18", seller: "Wrexham" },
  { id: "strive-pl-extreme-row", name: "Strive PL Extreme Row", brand: "Strive", category: "Back", subcategory: "Rows", tdmRef: "176", cost: 3000, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-10-20", seller: "Wroclaw" },
  { id: "prime-pl-seated-row", name: "Prime PL Seated Row", brand: "Prime", category: "Back", subcategory: "Rows", tdmRef: "190", cost: 1900, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", arrivalDate: "2026-07-23", orderDate: "2025-10-23", seller: "Franklin, PA" },
  { id: "booty-back-ext", name: "Booty Builder Back Extension", brand: "Booty Builder", category: "Back", subcategory: "Back Ext", tdmRef: "221", cost: 4025, marketValue: 4500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-03-25", seller: "London", notes: "3D gel text logo + info plate" },
  { id: "naut-super-pullover-ii", name: "Nautilus Super Pullover II", brand: "Nautilus", category: "Back", subcategory: "Pullover", tdmRef: "272", cost: 3250, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2026-04-21", seller: "Reynoldsville, PA" },
  { id: "cybex-v1-leg-press", name: "Cybex V1 Leg Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "128", cost: 4200, marketValue: 6000, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", orderDate: "2025-07-14", seller: "Bellevue, IL" },
  { id: "cybex-v1-squat-press", name: "Cybex V1 Squat Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "171", cost: 6000, marketValue: 7000, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", orderDate: "2025-10-20", seller: "Bellevue, IL", notes: "Big sticker both sides as on Cybex leg press" },
  { id: "cybex-v1-hack", name: "Cybex V1 Hack Squat", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "132", cost: 5500, marketValue: 8000, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", orderDate: "2025-07-14", seller: "Bellevue, IL" },
  { id: "nebula-45-proto", name: "Nebula 45 Degree Prototype", brand: "Nebula", category: "Legs", subcategory: "Compounds", tdmRef: "156", cost: 3000, marketValue: 7500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-10-16", seller: "Oregon, OH" },
  { id: "nebula-defiant-35", name: "Nebula Defiant 35 Degree", brand: "Nebula", category: "Legs", subcategory: "Compounds", tdmRef: "358", cost: 4750, marketValue: 5500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Complete", orderDate: "2026-07-04", seller: "Wrexham" },
  { id: "nebula-vertical-lp", name: "Nebula Vertical Leg Press", brand: "Nebula", category: "Legs", subcategory: "Compounds", tdmRef: "308", cost: 4500, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Complete", deliveryDate: "2026-07-10", returnDate: "2026-07-24", orderDate: "2026-05-18", seller: "Caldwell, ID" },
  { id: "magnum-hip-press", name: "Magnum Hip Press", brand: "Magnum", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "275", cost: 1500, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-04-26", seller: "Wrexham" },
  { id: "randy-coyle-swingsquat", name: "Randy Coyle Swingsquat", brand: "Randy Coyle", category: "Legs", subcategory: "Compounds", tdmRef: "360", cost: 7000, marketValue: 10000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-07-04" },
  { id: "powernetics-supercat", name: "Powernetics Supercat Bear Squat", brand: "Powernetics", category: "Legs", subcategory: "Compounds", tdmRef: "273", cost: 2000, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2026-04-23", seller: "Manchester, RI" },
  { id: "bodymasters-hack-squat", name: "Bodymasters Hack Squat", brand: "Bodymasters", category: "Legs", subcategory: "Compounds", tdmRef: "145", cost: 2950, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-08-05", seller: "Caldwell, ID" },
  { id: "atlantis-pendulum-squat", name: "Atlantis Pendulum Squat", brand: "Atlantis", category: "Legs", subcategory: "Compounds", tdmRef: "103", cost: 7100, marketValue: 8000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-02-22", seller: "Laval, Quebec" },
  { id: "flex-thighsolator", name: "Flex Fitness Thighsolator", brand: "Flex Fitness", category: "Legs", subcategory: "Adductors", tdmRef: "140", cost: 3000, marketValue: 3750, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2025-07-23", seller: "Detroit, MI" },
  { id: "tru-squat", name: "Tru Squat", brand: "Tru Squat", category: "Legs", subcategory: "Compounds", tdmRef: "219", cost: 6000, marketValue: 7000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-02-20", seller: "Wheeling, IL", notes: "Tru Squat vertical sticker on front" },
  { id: "flex-hamtractor", name: "Flex Fitness Hamtractor", brand: "Flex Fitness", category: "Legs", subcategory: "Leg Curls", tdmRef: "19", cost: 7000, marketValue: 15000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", seller: "Laredo, TX" },
  { id: "bodymasters-cx109-lying-curl", name: "Bodymasters CX109 Super Lying Leg Curl", brand: "Bodymasters", category: "Legs", subcategory: "Leg Curls", tdmRef: "160", cost: 3500, marketValue: 7000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-15", orderDate: "2025-10-16", seller: "Tucson, AZ" },
  { id: "cybex-kneeling-lc", name: "Cybex Kneeling Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "20", cost: 2800, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", seller: "Denver, CO" },
  { id: "strive-smart-prone-lc", name: "Strive Smart Strength Prone Leg Curl", brand: "Strive", category: "Legs", subcategory: "Leg Curls", tdmRef: "251", cost: 2500, marketValue: 3500, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Refurb", refurbStage: "Landed", orderDate: "2026-04-02", seller: "Walsall" },
  { id: "prime-pl-leg-ext", name: "Prime PL Leg Extension", brand: "Prime", category: "Legs", subcategory: "Leg Extensions", tdmRef: "183", cost: 3800, marketValue: 4500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", arrivalDate: "2026-07-23", orderDate: "2025-10-23", seller: "Franklin, PA" },
  { id: "magnum-leg-ext", name: "Magnum Leg Extension", brand: "Magnum", category: "Legs", subcategory: "Leg Extensions", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Refurb", refurbisher: "JP", returnDate: "2026-07-15" },
  { id: "bodymasters-cx109-leg-ext", name: "Bodymasters CX109 Super Leg Extension", brand: "Bodymasters", category: "Legs", subcategory: "Leg Extensions", tdmRef: "159", cost: 3500, marketValue: 7000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-09", orderDate: "2025-10-16", seller: "Tucson, AZ" },
  { id: "flex-leg-ext", name: "Flex Fitness Leg Extension", brand: "Flex Fitness", category: "Legs", subcategory: "Leg Extensions", tdmRef: "124", cost: 3400, marketValue: 4500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-07-14", seller: "Tokyo" },
  { id: "granite-glutinator", name: "Granite Glutinator", brand: "Granite", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "322", cost: 2800, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Refurb", orderDate: "2026-06-13", notes: "Deliver to JP then back 24/7" },
  { id: "prime-hybrid-inner-thigh", name: "Prime Hybrid Inner Thigh", brand: "Prime", category: "Legs", subcategory: "Adductors", tdmRef: "181", cost: 4500, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", arrivalDate: "2026-07-23", orderDate: "2025-10-23", seller: "Franklin, PA" },
  { id: "booty-v8-hip-thrust", name: "Booty Builder V8 Hip Thrust", brand: "Booty Builder", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "222", cost: 4435, marketValue: 5500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-03-25", seller: "London", notes: "3D gel text logo + BB sticker + info plate" },
  { id: "paramount-fw500-tri-ext", name: "Paramount FW500 Tricep Extension", brand: "Paramount", category: "Arms", subcategory: "Triceps", tdmRef: "268", cost: 3200, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-17", orderDate: "2026-04-19", seller: "Edmonton" },
  { id: "arsenal-overhead-tri", name: "Arsenal Overhead Tricep", brand: "Arsenal", category: "Arms", subcategory: "Triceps", tdmRef: "242", cost: 5700, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-03-21", seller: "Knoxville, TN" },
  { id: "strive-tri-ext", name: "Strive Tricep Extension", brand: "Strive", category: "Arms", subcategory: "Triceps", tdmRef: "243", cost: 2700, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-03-21", seller: "Conway, AK" },
  { id: "flex-dip-machine", name: "Flex Fitness Dip Machine", brand: "Flex Fitness", category: "Arms", subcategory: "Triceps", tdmRef: "269", cost: 2500, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-17", orderDate: "2026-04-19", seller: "Cheyenne, WY" },
  { id: "naut-1stgen-tri-ext", name: "Nautilus 1st Gen Tricep Extension", brand: "Nautilus", category: "Arms", subcategory: "Triceps", tdmRef: "366", cost: 1350, marketValue: 2500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Complete", deliveryDate: "2026-07-17", returnDate: "2026-07-24", orderDate: "2026-06-18", seller: "Cardiff, Wales" },
  { id: "naut-1stgen-bicep", name: "Nautilus 1st Gen Bicep Curl", brand: "Nautilus", category: "Arms", subcategory: "Biceps", tdmRef: "283", cost: 3000, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", orderDate: "2026-04-27", seller: "Indiana, PA" },
  { id: "magnum-bicep-curl", name: "Magnum Bicep Curl", brand: "Magnum", category: "Arms", subcategory: "Biceps", tdmRef: "139", cost: 1500, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2025-07-16", seller: "Bellevue, IL" },
  { id: "ss-riot-combo-rack", name: "Strength Shop Riot Combo Rack", brand: "Strength Shop", category: "Powerlifting", subcategory: "Racks", tdmRef: "35", cost: 885, marketValue: 885, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "ss-comp-bench-a", name: "Strength Shop Competition Bench Press A", brand: "Strength Shop", category: "Powerlifting", subcategory: "Benches", tdmRef: "36", cost: 600, marketValue: 600, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "ss-comp-bench-b", name: "Strength Shop Competition Bench Press B", brand: "Strength Shop", category: "Powerlifting", subcategory: "Benches", tdmRef: "37", cost: 600, marketValue: 600, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", returnDate: "2026-07-10", seller: "Glasgow" },
  { id: "ss-deadlift-platform", name: "Strength Shop Deadlift Platform", brand: "Strength Shop", category: "Powerlifting", subcategory: "Platforms", tdmRef: "38", cost: 400, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "elite-fts-monolift", name: "Elite FTS Monolift", brand: "Elite FTS", category: "Powerlifting", subcategory: "Racks", tdmRef: "41", cost: 4000, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Somerset" },
  { id: "cybex-v1-smith", name: "Cybex V1 Smith Machine", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "202", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Complete", deliveryDate: "2026-07-17", returnDate: "2026-07-24", orderDate: "2025-10-28" },
  { id: "atlantis-ab-crunch", name: "Atlantis Ab Crunch", brand: "Atlantis", category: "Other", subcategory: "Other", tdmRef: "359", cost: 2250, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", refurbStage: "Landed", orderDate: "2026-07-04" },
  { id: "tdm-bull-strong-belt-squat", name: "Bull Strong Belt Squat", brand: "Bull Strong", category: "Legs", subcategory: "Compounds", tdmRef: "215", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-05-15", notes: "Acquired from Bull Strong, no fee" },
  { id: "tdm-rogue-platform", name: "Rogue Deadlift Platform + 12 Mats", brand: "Rogue", category: "Powerlifting", subcategory: "Platforms", tdmRef: "210", cost: 1100, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-05-15" },
  { id: "tdm-lf-preacher-curl", name: "Life Fitness Preacher Curl", brand: "Life Fitness", category: "Arms", subcategory: "Biceps", tdmRef: "217", cost: 1140, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-05-15" },
  { id: "tdm-naut-nitro-v-tri", name: "Nautilus Nitro V-Triceps Extension", brand: "Nautilus", category: "Arms", subcategory: "Triceps", tdmRef: "218", cost: 1700, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-05-15", notes: "Bought from Paul, paid in cash" },
  { id: "tdm-cybex-eagle-abdominal", name: "Cybex Eagle Abdominal", brand: "Cybex", category: "Other", subcategory: "Other", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Use" },
  { id: "tdm-sportkraft-deadlift-bar", name: "Sportkraft Deadlifter Bar", brand: "Sportkraft", category: "Powerlifting", subcategory: "Bars", tdmRef: "285", cost: 371, marketValue: 300, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03", seller: "Kalle Rasenen" },
  { id: "tdm-aoa-deadlift-bar", name: "AOA Deadlift Bar (British 2019)", brand: "AOA", category: "Powerlifting", subcategory: "Bars", tdmRef: "292", cost: 150, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-06", seller: "Dan Davies" },
  { id: "tdm-texas-deadlift-bar", name: "Texas Deadlift Bar", brand: "Texas", category: "Powerlifting", subcategory: "Bars", tdmRef: "80", cost: 491, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-lf-powermill", name: "Life Fitness Powermill Climber", brand: "Life Fitness", category: "Cardio", subcategory: "Stair", tdmRef: "318", cost: 1700, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", arrivalDate: "2026-06-05", orderDate: "2026-06-05", seller: "Elahi" },
  { id: "unity-burton-ref167", name: "Flex Fitness Incline Press", brand: "Flex Fitness", category: "Chest", subcategory: "Presses", tdmRef: "167", cost: 0, marketValue: 4000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref643", name: "Nautilus One Chest Press", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "643", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-hammer-strength-incline-bench", name: "Hammer Strength Incline Bench", brand: "Hammer Strength", category: "Chest", subcategory: "Presses", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref378", name: "Panatta Fantastic Line Incline Chest Press", brand: "Panatta", category: "Chest", subcategory: "Presses", tdmRef: "378", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref644", name: "Cybex Classic PL Converging Chest Press", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "644", cost: 0, marketValue: 3000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref645", name: "Hammer Strength ISO-Lateral Horizontal Bench Press", brand: "Hammer Strength", category: "Chest", subcategory: "Presses", tdmRef: "645", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref646", name: "Precor PL Discovery Chest Press", brand: "Precor", category: "Chest", subcategory: "Presses", tdmRef: "646", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref647", name: "Precor PL Discovery Incline Press", brand: "Precor", category: "Chest", subcategory: "Presses", tdmRef: "647", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref648", name: "Nautilus Inspiration Pec Fly / Rear Delt", brand: "Nautilus", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "648", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref274", name: "Force Pec Dec", brand: "Force", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "274", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref650", name: "Precor Icarian 505 Pec Fly / Rear Delt", brand: "Precor Icarian", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "650", cost: 0, marketValue: 2000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref651", name: "White PL Shrug", brand: "", category: "Shoulders", tdmRef: "651", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref652", name: "Hammer Strength Iso-Lateral Shoulder Press", brand: "Hammer Strength", category: "Shoulders", subcategory: "Presses", tdmRef: "652", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref653", name: "Cybex VR3 Overhead Press", brand: "Cybex", category: "Shoulders", subcategory: "Presses", tdmRef: "653", cost: 0, marketValue: 2450, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref654", name: "Nautilus Nitro Overhead Press", brand: "Nautilus", category: "Shoulders", subcategory: "Presses", tdmRef: "654", cost: 0, marketValue: 2200, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref655", name: "Precor Icarian FT555 Shoulder Press", brand: "Precor Icarian", category: "Shoulders", subcategory: "Presses", tdmRef: "655", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref657", name: "Hammer Strength MTS Front Pulldown", brand: "Hammer Strength", category: "Back", subcategory: "Pulldowns", tdmRef: "657", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref658", name: "Hoist HD-2300 Lat Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "658", cost: 0, marketValue: 1200, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref659", name: "Ironborn PL Pulldown", brand: "Ironborn", category: "Back", subcategory: "Pulldowns", tdmRef: "659", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref660", name: "Nautilus ONE Lat Pulldown", brand: "Nautilus", category: "Back", subcategory: "Pulldowns", tdmRef: "660", cost: 0, marketValue: 1400, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref661", name: "Hoist ROC-IT Lat Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "661", cost: 0, marketValue: 1400, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref662", name: "SportsArt PL Lat Pulldown", brand: "SportsArt", category: "Back", subcategory: "Pulldowns", tdmRef: "662", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref663", name: "Cybex VR1 Lat Pulldown", brand: "Cybex", category: "Back", subcategory: "Pulldowns", tdmRef: "663", cost: 0, marketValue: 1200, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref664", name: "Nytram T-Bar Row", brand: "Nytram", category: "Back", subcategory: "Rows", tdmRef: "664", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref665", name: "Precor Icarian FT332 Row", brand: "Precor Icarian", category: "Back", subcategory: "Rows", tdmRef: "665", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref666", name: "Hammer Strength Iso-Lateral Low Row", brand: "Hammer Strength", category: "Back", subcategory: "Rows", tdmRef: "666", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref667", name: "Nautilus Row", brand: "Nautilus", category: "Back", subcategory: "Rows", tdmRef: "667", cost: 0, marketValue: 1200, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref668", name: "Cutler Extreme Row", brand: "Cutler", category: "Back", subcategory: "Rows", tdmRef: "668", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref669", name: "Cybex Plate Loaded Row", brand: "Cybex", category: "Back", subcategory: "Rows", tdmRef: "669", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref670", name: "Hammer Strength MTS Row", brand: "Hammer Strength", category: "Back", subcategory: "Rows", tdmRef: "670", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref671", name: "T-Bar Row", brand: "", category: "Back", subcategory: "Rows", tdmRef: "671", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref672", name: "Elite Gym Gear Standing Tibialis Raise", brand: "Elite Gym Gear", category: "Back", tdmRef: "672", cost: 0, marketValue: 350, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref673", name: "Life Fitness Pro1 Lateral Raise", brand: "Life Fitness", category: "Back", tdmRef: "673", cost: 0, marketValue: 3000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref155", name: "Bodymasters Pullover", brand: "Bodymasters", category: "Back", subcategory: "Pullover", tdmRef: "155", cost: 0, marketValue: 4000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref649", name: "Life Fitness Pro Linear Leg Press", brand: "Life Fitness", category: "Legs", subcategory: "Compounds", tdmRef: "649", cost: 0, marketValue: 2000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref674", name: "Cybex Squat Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "674", cost: 0, marketValue: 3500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref675", name: "Cybex Hack Squat", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "675", cost: 0, marketValue: 3500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref676", name: "Primal Strength Squat", brand: "Primal Strength", category: "Legs", subcategory: "Compounds", tdmRef: "676", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref677", name: "Cybex VR2 Seated Leg Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "677", cost: 0, marketValue: 2500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref375", name: "Bodymasters 300A Power Squat", brand: "Bodymasters", category: "Legs", subcategory: "Compounds", tdmRef: "375", cost: 0, marketValue: 1800, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref678", name: "Life Fitness Pro1 Horizontal Leg Press", brand: "Life Fitness", category: "Legs", subcategory: "Compounds", tdmRef: "678", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref656", name: "Hammer Strength PL Leg Press", brand: "Hammer Strength", category: "Legs", subcategory: "Compounds", tdmRef: "656", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref679", name: "Life Fitness Pro1 Lying Leg Curl", brand: "Life Fitness", category: "Legs", subcategory: "Leg Curls", tdmRef: "679", cost: 0, marketValue: 1400, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref680", name: "Cybex VR1 Leg Extension / Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "680", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref681", name: "Cybex VR3 PL Kneeling Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "681", cost: 0, marketValue: 2000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref682", name: "Life Fitness Pro1 Standing Leg Curl", brand: "Life Fitness", category: "Legs", subcategory: "Leg Curls", tdmRef: "682", cost: 0, marketValue: 700, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref246", name: "Cybex VR2 Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "246", cost: 0, marketValue: 1800, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref684", name: "Hammer Strength PL Leg Extension", brand: "Hammer Strength", category: "Legs", subcategory: "Leg Extensions", tdmRef: "684", cost: 0, marketValue: 950, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref685", name: "Cybex VR2", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "685", cost: 0, marketValue: 1800, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref367", name: "Magnum Leg Extension", brand: "Magnum", category: "Legs", subcategory: "Leg Extensions", tdmRef: "367", cost: 0, marketValue: 2500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref683", name: "Dual Adjustable Pulley", brand: "", category: "Legs", tdmRef: "683", cost: 0, marketValue: 0, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref686", name: "Body-Solid Pro Clubline Vertical Knee Raise / Dip / Pull-Up (VKR)", brand: "Body-Solid", category: "Legs", tdmRef: "686", cost: 0, marketValue: 600, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref687", name: "Pendulum Squat", brand: "", category: "Legs", subcategory: "Compounds", tdmRef: "687", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref688", name: "Nautilus Glute Drive", brand: "Nautilus", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "688", cost: 0, marketValue: 2500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref689", name: "Bull Strong Belt Squat", brand: "Bull Strong", category: "Legs", subcategory: "Compounds", tdmRef: "689", cost: 0, marketValue: 450, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref690", name: "Nautilus Impact Standing Calf", brand: "Nautilus", category: "Legs", subcategory: "Calves", tdmRef: "690", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref691", name: "Precor Icarian Abductor", brand: "Precor Icarian", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "691", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref692", name: "Precor Icarian Adductor", brand: "Precor Icarian", category: "Legs", subcategory: "Adductors", tdmRef: "692", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref693", name: "Hammer Strength GHD", brand: "Hammer Strength", category: "Legs", tdmRef: "693", cost: 0, marketValue: 600, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref223", name: "Booty Builder V8 Hip Thrust", brand: "Booty Builder", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "223", cost: 0, marketValue: 4000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref694", name: "Cybex Classic PL Seated Calf Raise", brand: "Cybex", category: "Legs", subcategory: "Calves", tdmRef: "694", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref695", name: "Nautilus 2ST Dip", brand: "Nautilus", category: "Arms", subcategory: "Triceps", tdmRef: "695", cost: 0, marketValue: 2000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref338", name: "Nautilus Nitro Plus Bicep Curl", brand: "Nautilus", category: "Arms", subcategory: "Biceps", tdmRef: "338", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref696", name: "Paramount FL-35 Biceps / Triceps", brand: "Paramount", category: "Arms", tdmRef: "696", cost: 0, marketValue: 3500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref697", name: "Cybex PL Advance Bicep", brand: "Cybex", category: "Arms", subcategory: "Biceps", tdmRef: "697", cost: 0, marketValue: 1100, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref698", name: "Hoist ROC-IT Biceps Curl", brand: "Hoist", category: "Arms", subcategory: "Biceps", tdmRef: "698", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref699", name: "Hammer Strength Smith Machine", brand: "Hammer Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "699", cost: 0, marketValue: 2000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref700", name: "Cybex Smith Machine", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "700", cost: 0, marketValue: 2500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref701", name: "VMX Multi-Mode Rope Trainer", brand: "VMX Multi-Mode", category: "Cardio", tdmRef: "701", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref702", name: "Schwinn Airdyne AD8 Pro Air Bike", brand: "Schwinn", category: "Cardio", subcategory: "Bike", tdmRef: "702", cost: 0, marketValue: 250, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref703", name: "Life Fitness Integrity Series Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "703", cost: 0, marketValue: 700, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref704", name: "Woodway-style clone Curve Manual Treadmill", brand: "Woodway-style clone", category: "Cardio", subcategory: "Treadmill", tdmRef: "704", cost: 0, marketValue: 700, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref705", name: "Life Fitness Lifecycle Recumbent Bike", brand: "Life Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "705", cost: 0, marketValue: 350, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref706", name: "Life Fitness Lifecycle", brand: "Life Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "706", cost: 0, marketValue: 350, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref707", name: "Star Trac TreadClimber", brand: "Star Trac", category: "Cardio", subcategory: "Stair", tdmRef: "707", cost: 0, marketValue: 700, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref708", name: "Life Fitness 8 Series PowerMill", brand: "Life Fitness", category: "Cardio", subcategory: "Stair", tdmRef: "708", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref709", name: "StairMaster Gauntlet 8Gx", brand: "StairMaster", category: "Cardio", subcategory: "Stair", tdmRef: "709", cost: 0, marketValue: 1000, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref710", name: "Life Fitness Integrity Series Cross-Trainer", brand: "Life Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "710", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref711", name: "Life Fitness Integrity Series Cross-Trainer", brand: "Life Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "711", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref712", name: "Life Fitness Integrity Series Cross-Trainer", brand: "Life Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "712", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref713", name: "Life Fitness Integrity Series Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "713", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref714", name: "Life Fitness Integrity Series Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "714", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref715", name: "Life Fitness Integrity Series Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "715", cost: 0, marketValue: 1500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref716", name: "Concept2 SkiErg PM", brand: "Concept2", category: "Cardio", tdmRef: "716", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref717", name: "Nautilus Dual Adjustable Pulley", brand: "Nautilus", category: "Other", tdmRef: "717", cost: 0, marketValue: 2500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref718", name: "Super Gym Dual Adjustable Pulley", brand: "Super Gym", category: "Other", tdmRef: "718", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref719", name: "Viking Press", brand: "", category: "Other", tdmRef: "719", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref720", name: "Pull-up / Dip", brand: "", category: "Other", tdmRef: "720", cost: 0, marketValue: 500, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref721", name: "PL Abdominal Crunch Bench", brand: "", category: "Other", tdmRef: "721", cost: 0, marketValue: 300, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref722", name: "Ab Bench", brand: "", category: "Other", tdmRef: "722", cost: 0, marketValue: 150, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-burton-ref723", name: "Red GHD", brand: "", category: "Other", tdmRef: "723", cost: 0, marketValue: 150, currentLocation: "Unity Burton", destination: "Unity Burton", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref724", name: "Life Fitness Incline Chest Press", brand: "Life Fitness", category: "Chest", subcategory: "Presses", tdmRef: "724", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref725", name: "Life Fitness Pectoral Fly", brand: "Life Fitness", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "725", cost: 0, marketValue: 850, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref726", name: "Life Fitness Chest Press", brand: "Life Fitness", category: "Chest", subcategory: "Presses", tdmRef: "726", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref727", name: "Plate Loaded Flat Chest Press", brand: "", category: "Chest", subcategory: "Presses", tdmRef: "727", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref728", name: "Ironborn Chest Fly", brand: "Ironborn", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "728", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref729", name: "Ironborn Decline Press", brand: "Ironborn", category: "Chest", subcategory: "Presses", tdmRef: "729", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref279", name: "Hoist Pec Fly", brand: "Hoist", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "279", cost: 0, marketValue: 1750, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref730", name: "Ironborn Incline Press", brand: "Ironborn", category: "Chest", subcategory: "Presses", tdmRef: "730", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref731", name: "Strength Shop Competition Bench", brand: "Strength Shop", category: "Chest", subcategory: "Presses", tdmRef: "731", cost: 0, marketValue: 800, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref732", name: "Life Fitness Shoulder Press", brand: "Life Fitness", category: "Shoulders", subcategory: "Presses", tdmRef: "732", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref733", name: "Side Lateral Raise", brand: "", category: "Shoulders", subcategory: "Laterals", tdmRef: "733", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref734", name: "Icarian Lateral Raise", brand: "Icarian", category: "Shoulders", subcategory: "Laterals", tdmRef: "734", cost: 0, marketValue: 1200, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref735", name: "Ironborn Shoulder Press", brand: "Ironborn", category: "Shoulders", subcategory: "Presses", tdmRef: "735", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref736", name: "Life Fitness Lat Pulldown", brand: "Life Fitness", category: "Back", subcategory: "Pulldowns", tdmRef: "736", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref737", name: "Life Fitness Lat Pulldown", brand: "Life Fitness", category: "Back", subcategory: "Pulldowns", tdmRef: "737", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref738", name: "Davis Lat Pulldown", brand: "Davis", category: "Back", subcategory: "Pulldowns", tdmRef: "738", cost: 0, marketValue: 1350, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref739", name: "Nautilus Compound Row", brand: "Nautilus", category: "Back", subcategory: "Rows", tdmRef: "739", cost: 0, marketValue: 3000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref740", name: "Power Sport Seated Row", brand: "Power Sport", category: "Back", subcategory: "Rows", tdmRef: "740", cost: 0, marketValue: 700, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref741", name: "Life Fitness Seated Row", brand: "Life Fitness", category: "Back", subcategory: "Rows", tdmRef: "741", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref742", name: "Taurus T-Bar Row", brand: "Taurus", category: "Back", subcategory: "Rows", tdmRef: "742", cost: 0, marketValue: 650, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref743", name: "Ironborn Seated Row", brand: "Ironborn", category: "Back", subcategory: "Rows", tdmRef: "743", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref744", name: "Life Fitness Pullover", brand: "Life Fitness", category: "Back", subcategory: "Pullover", tdmRef: "744", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref745", name: "Life Fitness Leg Press", brand: "Life Fitness", category: "Legs", subcategory: "Compounds", tdmRef: "745", cost: 0, marketValue: 1800, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref746", name: "Davis Leg Press", brand: "Davis", category: "Legs", subcategory: "Compounds", tdmRef: "746", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref747", name: "Hammer Strength Hack Squat", brand: "Hammer Strength", category: "Legs", subcategory: "Compounds", tdmRef: "747", cost: 0, marketValue: 2000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref748", name: "Primal Strength Squat", brand: "Primal Strength", category: "Legs", subcategory: "Compounds", tdmRef: "748", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref749", name: "Life Fitness Seated Leg Curl", brand: "Life Fitness", category: "Legs", subcategory: "Leg Curls", tdmRef: "749", cost: 0, marketValue: 1250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref750", name: "Ironborn Standing Hamstring Curl", brand: "Ironborn", category: "Legs", subcategory: "Leg Curls", tdmRef: "750", cost: 0, marketValue: 450, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref751", name: "Cybex Prone Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "751", cost: 0, marketValue: 2000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref752", name: "Cybex Eagle Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "752", cost: 0, marketValue: 2500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref753", name: "Life Fitness Leg Extension", brand: "Life Fitness", category: "Legs", subcategory: "Leg Extensions", tdmRef: "753", cost: 0, marketValue: 1200, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref754", name: "Cybex PL Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "754", cost: 0, marketValue: 1700, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref755", name: "Life Fitness Hip Adductor", brand: "Life Fitness", category: "Legs", subcategory: "Adductors", tdmRef: "755", cost: 0, marketValue: 850, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref756", name: "Nautilus Glute Drive", brand: "Nautilus", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "756", cost: 0, marketValue: 2500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref757", name: "Life Fitness Hip Abductor", brand: "Life Fitness", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "757", cost: 0, marketValue: 850, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref758", name: "Life Fitness Standing Calf", brand: "Life Fitness", category: "Legs", subcategory: "Calves", tdmRef: "758", cost: 0, marketValue: 850, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref759", name: "Plate Loaded Seated Calf", brand: "", category: "Legs", subcategory: "Calves", tdmRef: "759", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref760", name: "Life Fitness Arm Extension", brand: "Life Fitness", category: "Arms", subcategory: "Triceps", tdmRef: "760", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref138", name: "Magnum Bicep Curl", brand: "Magnum", category: "Arms", subcategory: "Biceps", tdmRef: "138", cost: 0, marketValue: 2700, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref761", name: "Life Fitness Arm Curl", brand: "Life Fitness", category: "Arms", subcategory: "Biceps", tdmRef: "761", cost: 0, marketValue: 900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref762", name: "Preacher Curl", brand: "", category: "Arms", subcategory: "Biceps", tdmRef: "762", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-primal-bench", name: "Primal Strength Bench", brand: "Primal Strength", category: "Powerlifting", subcategory: "Benches", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref763", name: "Incline Barbell Bench", brand: "", category: "Powerlifting", subcategory: "Benches", tdmRef: "763", cost: 0, marketValue: 400, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref764", name: "Cybex Smith Machine", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "764", cost: 0, marketValue: 2900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref765", name: "Strength Systems Power Rack", brand: "Strength Systems", category: "Powerlifting", subcategory: "Racks", tdmRef: "765", cost: 0, marketValue: 0, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref766", name: "Strength Systems Power Rack", brand: "Strength Systems", category: "Powerlifting", subcategory: "Racks", tdmRef: "766", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref767", name: "Strength Systems Squat Rack", brand: "Strength Systems", category: "Powerlifting", subcategory: "Racks", tdmRef: "767", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref768", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "768", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref769", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "769", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref770", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "770", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref771", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "771", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref772", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "772", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref773", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "773", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref774", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "774", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref775", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "775", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref776", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "776", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref777", name: "Keiser Spin Bike", brand: "Keiser", category: "Cardio", subcategory: "Bike", tdmRef: "777", cost: 0, marketValue: 250, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref778", name: "Star Trac Treadmill", brand: "Star Trac", category: "Cardio", subcategory: "Treadmill", tdmRef: "778", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref779", name: "Star Trac Treadmill", brand: "Star Trac", category: "Cardio", subcategory: "Treadmill", tdmRef: "779", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref780", name: "Star Trac Treadmill", brand: "Star Trac", category: "Cardio", subcategory: "Treadmill", tdmRef: "780", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref781", name: "Star Trac Treadmill", brand: "Star Trac", category: "Cardio", subcategory: "Treadmill", tdmRef: "781", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref782", name: "Star Trac Treadmill", brand: "Star Trac", category: "Cardio", subcategory: "Treadmill", tdmRef: "782", cost: 0, marketValue: 1500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref783", name: "Matrix Bike", brand: "Matrix", category: "Cardio", subcategory: "Bike", tdmRef: "783", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref784", name: "Cybex Bike", brand: "Cybex", category: "Cardio", subcategory: "Bike", tdmRef: "784", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref785", name: "Cybex Bike", brand: "Cybex", category: "Cardio", subcategory: "Bike", tdmRef: "785", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref786", name: "Life Fitness Bike", brand: "Life Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "786", cost: 0, marketValue: 400, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref787", name: "Life Fitness Bike", brand: "Life Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "787", cost: 0, marketValue: 400, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref788", name: "TechnoGym Stairmaster", brand: "TechnoGym", category: "Cardio", subcategory: "Stair", tdmRef: "788", cost: 0, marketValue: 3500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref789", name: "Life Fitness PowerMill", brand: "Life Fitness", category: "Cardio", subcategory: "Stair", tdmRef: "789", cost: 0, marketValue: 3500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref790", name: "Concept2 Rower (silver)", brand: "Concept2", category: "Cardio", subcategory: "Rower", tdmRef: "790", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref791", name: "Concept2 Rower (black)", brand: "Concept2", category: "Cardio", subcategory: "Rower", tdmRef: "791", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref792", name: "Concept2 Rower (black)", brand: "Concept2", category: "Cardio", subcategory: "Rower", tdmRef: "792", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref793", name: "Star Trac Cross Trainer", brand: "Star Trac", category: "Cardio", subcategory: "Elliptical", tdmRef: "793", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref794", name: "Star Trac Cross Trainer", brand: "Star Trac", category: "Cardio", subcategory: "Elliptical", tdmRef: "794", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref795", name: "Assault Bike", brand: "", category: "Cardio", subcategory: "Bike", tdmRef: "795", cost: 0, marketValue: 500, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref796", name: "Concept2 Ski Erg", brand: "Concept2", category: "Cardio", tdmRef: "796", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref797", name: "TechnoGym Air Runner", brand: "TechnoGym", category: "Cardio", subcategory: "Treadmill", tdmRef: "797", cost: 0, marketValue: 1900, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref798", name: "Life Fitness Cable Machine", brand: "Life Fitness", category: "Other", tdmRef: "798", cost: 0, marketValue: 1800, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref799", name: "Life Fitness Cable Machine", brand: "Life Fitness", category: "Other", tdmRef: "799", cost: 0, marketValue: 1800, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-fradley-ref800", name: "Cable Machine", brand: "", category: "Other", tdmRef: "800", cost: 0, marketValue: 1000, currentLocation: "Unity Fradley", destination: "Unity Fradley", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref280", name: "Nautilus Nitro Incline Press", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "280", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref573", name: "Paramount Seated Chest", brand: "Paramount", category: "Chest", subcategory: "Presses", tdmRef: "573", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref574", name: "Life Fitness Pec / Rear Delt", brand: "Life Fitness", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "574", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref201", name: "Magnum Biangular Upper Chest", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "201", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref575", name: "Cybex Chest Press (red seat)", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "575", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref576", name: "Precor PL Incline Press", brand: "Precor", category: "Chest", subcategory: "Presses", tdmRef: "576", cost: 0, marketValue: 1750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref578", name: "Incline Bench", brand: "", category: "Chest", subcategory: "Presses", tdmRef: "578", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref579", name: "Strength Shop Competition Bench", brand: "Strength Shop", category: "Chest", subcategory: "Presses", tdmRef: "579", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref580", name: "Cutler PL Bench", brand: "Cutler", category: "Chest", subcategory: "Presses", tdmRef: "580", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref335", name: "Nautilus Nitro Pec Fly Rear Delt", brand: "Nautilus", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "335", cost: 0, marketValue: 2500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref581", name: "Flat Bench", brand: "", category: "Chest", subcategory: "Presses", tdmRef: "581", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref208", name: "Nautilus Xpload Overhead Press", brand: "Nautilus", category: "Shoulders", subcategory: "Presses", tdmRef: "208", cost: 0, marketValue: 4000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref582", name: "Nautilus 2ST Overhead Press", brand: "Nautilus", category: "Shoulders", subcategory: "Presses", tdmRef: "582", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref583", name: "Plate Loaded Seated Shrug", brand: "", category: "Shoulders", tdmRef: "583", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref584", name: "Viking Press", brand: "", category: "Shoulders", tdmRef: "584", cost: 0, marketValue: 250, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref256", name: "Flex Fitness Deltoid Raise", brand: "Flex Fitness", category: "Shoulders", subcategory: "Laterals", tdmRef: "256", cost: 0, marketValue: 4000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref585", name: "Pullum PL Pulldown", brand: "Pullum", category: "Back", subcategory: "Pulldowns", tdmRef: "585", cost: 0, marketValue: 900, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref586", name: "Precor PL Pulldown", brand: "Precor", category: "Back", subcategory: "Pulldowns", tdmRef: "586", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref587", name: "Hoist Roc-it Lat Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "587", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref588", name: "Life Fitness Selectorised Pulldown (black)", brand: "Life Fitness", category: "Back", subcategory: "Pulldowns", tdmRef: "588", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref589", name: "Life Fitness Selectorised Pulldown (red seat)", brand: "Life Fitness", category: "Back", subcategory: "Pulldowns", tdmRef: "589", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref590", name: "TechnoGym Low Row", brand: "TechnoGym", category: "Back", subcategory: "Rows", tdmRef: "590", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref591", name: "Primal Strength Seated Horizontal Pulley", brand: "Primal Strength", category: "Back", subcategory: "Rows", tdmRef: "591", cost: 0, marketValue: 1750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref592", name: "Cybex Eagle Row", brand: "Cybex", category: "Back", subcategory: "Rows", tdmRef: "592", cost: 0, marketValue: 5000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref337", name: "Nautilus Nitro Mid Row", brand: "Nautilus", category: "Back", subcategory: "Rows", tdmRef: "337", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref593", name: "Primal Strength T-Bar Row", brand: "Primal Strength", category: "Back", subcategory: "Rows", tdmRef: "593", cost: 0, marketValue: 900, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref594", name: "PL Standing Lateral Raise", brand: "", category: "Shoulders", subcategory: "Laterals", tdmRef: "594", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref220", name: "Booty Builder Loaded Back Extension", brand: "Booty Builder", category: "Back", subcategory: "Back Ext", tdmRef: "220", cost: 0, marketValue: 5000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref595", name: "Precor Deltoid Raise", brand: "Precor", category: "Shoulders", subcategory: "Laterals", tdmRef: "595", cost: 0, marketValue: 1900, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref146", name: "Bodymasters LXp 740 40 Degree Leg Press", brand: "Bodymasters", category: "Legs", subcategory: "Compounds", tdmRef: "146", cost: 0, marketValue: 3500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref596", name: "Star Trac Hack Squat", brand: "Star Trac", category: "Legs", subcategory: "Compounds", tdmRef: "596", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref597", name: "PL Rear Kick", brand: "", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "597", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref129", name: "Cybex V1 Squat Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "129", cost: 0, marketValue: 7000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref598", name: "Nautilus Impact Standing Calf", brand: "Nautilus", category: "Legs", subcategory: "Calves", tdmRef: "598", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref599", name: "Bull Strong Squat", brand: "Bull Strong", category: "Legs", subcategory: "Compounds", tdmRef: "599", cost: 0, marketValue: 400, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref600", name: "Nautilus Impact Seated Leg Press", brand: "Nautilus", category: "Legs", subcategory: "Compounds", tdmRef: "600", cost: 0, marketValue: 2500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref601", name: "Ironborn Pendulum Squat", brand: "Ironborn", category: "Legs", subcategory: "Compounds", tdmRef: "601", cost: 0, marketValue: 1200, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref602", name: "Cybex NX Eagle", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "602", cost: 0, marketValue: 2500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref603", name: "Standing Leg Curl (black and yellow)", brand: "", category: "Legs", subcategory: "Leg Curls", tdmRef: "603", cost: 0, marketValue: 750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref136", name: "Magnum Prone Leg Curl", brand: "Magnum", category: "Legs", subcategory: "Leg Curls", tdmRef: "136", cost: 0, marketValue: 2750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref135", name: "Magnum Leg Extension", brand: "Magnum", category: "Legs", subcategory: "Leg Extensions", tdmRef: "135", cost: 0, marketValue: 2500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref604", name: "Nautilus Nitro Plus Leg Extension", brand: "Nautilus", category: "Legs", subcategory: "Leg Extensions", tdmRef: "604", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref605", name: "Matrix Adductor", brand: "Matrix", category: "Legs", subcategory: "Adductors", tdmRef: "605", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref606", name: "Matrix Abductor", brand: "Matrix", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "606", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref607", name: "Life Fitness PL Calf Raise", brand: "Life Fitness", category: "Legs", subcategory: "Calves", tdmRef: "607", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref608", name: "Hammer Strength PL Kneeling Leg Curl", brand: "Hammer Strength", category: "Legs", subcategory: "Leg Curls", tdmRef: "608", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref609", name: "Life Fitness Pro1 Arm Extension", brand: "Life Fitness", category: "Arms", subcategory: "Triceps", tdmRef: "609", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref610", name: "Taurus Seated Dip", brand: "Taurus", category: "Arms", subcategory: "Triceps", tdmRef: "610", cost: 0, marketValue: 1300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref611", name: "Precor PL Bicep Curl", brand: "Precor", category: "Arms", subcategory: "Biceps", tdmRef: "611", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref204", name: "Bodymasters 410 Arm Curl", brand: "Bodymasters", category: "Arms", subcategory: "Biceps", tdmRef: "204", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref612", name: "Cybex Eagle NX Arm Curl", brand: "Cybex", category: "Arms", subcategory: "Biceps", tdmRef: "612", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref613", name: "Multipower Grey Smith Machine", brand: "Multipower", category: "Powerlifting", subcategory: "Racks", tdmRef: "613", cost: 0, marketValue: 0, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref614", name: "Life Fitness Smith Machine", brand: "Life Fitness", category: "Powerlifting", subcategory: "Racks", tdmRef: "614", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref627", name: "Primal Strength Squat Rack", brand: "Primal Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "627", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref626", name: "Primal Strength Squat Rack", brand: "Primal Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "626", cost: 0, marketValue: 600, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref625", name: "Primal Strength Squat Rack", brand: "Primal Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "625", cost: 0, marketValue: 600, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref615", name: "Primal Strength Squat Rack", brand: "Primal Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "615", cost: 0, marketValue: 600, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref616", name: "Strength Shop Deadlift Platform", brand: "Strength Shop", category: "Powerlifting", subcategory: "Platforms", tdmRef: "616", cost: 0, marketValue: 200, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref617", name: "Assault Fitness Air Runner Manual Treadmill", brand: "Assault Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "617", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref629", name: "Pulse Fitness U Cycle", brand: "Pulse Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "629", cost: 0, marketValue: 300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref631", name: "Pulse Fitness U Cycle", brand: "Pulse Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "631", cost: 0, marketValue: 300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref630", name: "Pulse Fitness U Cycle", brand: "Pulse Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "630", cost: 0, marketValue: 300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref628", name: "Pulse Fitness U Cycle", brand: "Pulse Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "628", cost: 0, marketValue: 300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref618", name: "Pulse Fitness U Cycle", brand: "Pulse Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "618", cost: 0, marketValue: 300, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref632", name: "Assault Fitness Air Bike", brand: "Assault Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "632", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref619", name: "Assault Fitness Air Bike", brand: "Assault Fitness", category: "Cardio", subcategory: "Bike", tdmRef: "619", cost: 0, marketValue: 1000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref633", name: "Ski Trainer Ski Erg", brand: "Ski Trainer", category: "Cardio", tdmRef: "633", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref620", name: "Ski Trainer Ski Erg", brand: "Ski Trainer", category: "Cardio", tdmRef: "620", cost: 0, marketValue: 500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref621", name: "StairMaster Gauntlet StepMill 8 Series", brand: "StairMaster", category: "Cardio", subcategory: "Stair", tdmRef: "621", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref622", name: "Life Fitness PowerMill Climber", brand: "Life Fitness", category: "Cardio", subcategory: "Stair", tdmRef: "622", cost: 0, marketValue: 3000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref623", name: "Marpo Kinetics VMX Functional Rope Trainer", brand: "Marpo Kinetics", category: "Cardio", tdmRef: "623", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref624", name: "Pulse Fitness Cross Trainer", brand: "Pulse Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "624", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref634", name: "Pulse Fitness Cross Trainer", brand: "Pulse Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "634", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref635", name: "Pulse Fitness Cross Trainer", brand: "Pulse Fitness", category: "Cardio", subcategory: "Elliptical", tdmRef: "635", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-cybex-360-dap", name: "Cybex 360 Dap", brand: "Cybex", category: "Other", cost: 0, marketValue: 800, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-grey-on-wall-bicep-tricep", name: "Grey On-Wall Bicep / Tricep", brand: "", category: "Other", cost: 0, marketValue: 800, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-precor-icarian-cable-machine", name: "Precor Icarian Cable Machine", brand: "Precor Icarian", category: "Other", cost: 0, marketValue: 2000, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-exigo-dual-adjustable-pulley", name: "Exigo Dual Adjustable Pulley", brand: "Exigo", category: "Other", cost: 0, marketValue: 1500, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-black-ghd", name: "Black GHD", brand: "", category: "Other", cost: 0, marketValue: 450, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-precor-abdominal-crunch", name: "Precor Abdominal Crunch", brand: "Precor", category: "Other", cost: 0, marketValue: 750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-life-fitness-adjustable-decline-ab-crunch", name: "Life Fitness Adjustable Decline Ab Crunch", brand: "Life Fitness", category: "Other", cost: 0, marketValue: 750, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-lichfield-ref377", name: "David Tricep Pushdown", brand: "David", category: "Arms", subcategory: "Triceps", tdmRef: "377", cost: 0, marketValue: 0, currentLocation: "Unity Lichfield", destination: "Unity Lichfield", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref500", name: "Nautilus Impact Chest Press", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "500", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref501", name: "Precor Discovery Chest Press", brand: "Precor", category: "Chest", subcategory: "Presses", tdmRef: "501", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref502", name: "Life Fitness Signature Pec Fly / Rear Delt", brand: "Life Fitness", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "502", cost: 0, marketValue: 1100, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref503", name: "Precor Icarian Pec Fly / Rear Delt", brand: "Precor Icarian", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "503", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref105", name: "Cybex VR2 Chest Press (white)", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "105", cost: 0, marketValue: 1250, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref504", name: "Cutler Reloaded Pec Fly", brand: "Cutler", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "504", cost: 0, marketValue: 600, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref505", name: "Cybex VR3 Plate Loaded Incline Chest Press", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "505", cost: 0, marketValue: 1800, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref506", name: "Hammer Strength Plate Loaded Iso-Lateral Press", brand: "Hammer Strength", category: "Chest", subcategory: "Presses", tdmRef: "506", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref372", name: "Magnum Badger Incline", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "372", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref507", name: "Pec Dec / Rear Delt", brand: "", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "507", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref354", name: "Magnum Lateral Raise", brand: "Magnum", category: "Shoulders", subcategory: "Laterals", tdmRef: "354", cost: 0, marketValue: 2000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref508", name: "Precor Shoulder Press", brand: "Precor", category: "Shoulders", subcategory: "Presses", tdmRef: "508", cost: 0, marketValue: 1300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref509", name: "Precor Shoulder Press FT555", brand: "Precor", category: "Shoulders", subcategory: "Presses", tdmRef: "509", cost: 0, marketValue: 1300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref510", name: "Plate Loaded Viking Press", brand: "", category: "Shoulders", tdmRef: "510", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref511", name: "Plate Loaded Seated Shrug", brand: "", category: "Shoulders", tdmRef: "511", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref512", name: "Precor Icarian Lat Pulldown", brand: "Precor Icarian", category: "Back", subcategory: "Pulldowns", tdmRef: "512", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref513", name: "Hoist CL 2201 Lat Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "513", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref514", name: "Hoist Roc-It Lat Pulldown", brand: "Hoist", category: "Back", subcategory: "Pulldowns", tdmRef: "514", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref515", name: "Nautilus Inspiration Fixed Lat Pulldown", brand: "Nautilus", category: "Back", subcategory: "Pulldowns", tdmRef: "515", cost: 0, marketValue: 1100, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref516", name: "Hammer Strength Plate Loaded Row", brand: "Hammer Strength", category: "Back", subcategory: "Rows", tdmRef: "516", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref373", name: "Magnum Badger Pulldown", brand: "Magnum", category: "Back", subcategory: "Pulldowns", tdmRef: "373", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref517", name: "Ironborn Plate Loaded Row", brand: "Ironborn", category: "Back", subcategory: "Rows", tdmRef: "517", cost: 0, marketValue: 700, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref518", name: "Precor Seated Row", brand: "Precor", category: "Back", subcategory: "Rows", tdmRef: "518", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref519", name: "Precor Icarian Dual Stack Row", brand: "Precor Icarian", category: "Back", subcategory: "Rows", tdmRef: "519", cost: 0, marketValue: 2000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref520", name: "T-Bar Row", brand: "", category: "Back", subcategory: "Rows", tdmRef: "520", cost: 0, marketValue: 400, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref521", name: "Hoist HS 1725 Mid Row", brand: "Hoist", category: "Back", subcategory: "Rows", tdmRef: "521", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref522", name: "Hoist Roc-It Mid Row", brand: "Hoist", category: "Back", subcategory: "Rows", tdmRef: "522", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref379", name: "Paramount Mid Row", brand: "Paramount", category: "Back", subcategory: "Rows", tdmRef: "379", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref523", name: "Cybex Row / Rear Delt", brand: "Cybex", category: "Back", subcategory: "Rows", tdmRef: "523", cost: 0, marketValue: 2500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-row-rear-delt-unspecified", name: "Row / Rear Delt (unspecified)", brand: "", category: "Back", cost: 0, marketValue: 3800, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref524", name: "Power Sport Pullover", brand: "Power Sport", category: "Back", subcategory: "Pullover", tdmRef: "524", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref525", name: "Cybex Eagle Leg Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "525", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref526", name: "Rogers Rep Power Squat", brand: "Rogers Rep", category: "Legs", subcategory: "Compounds", tdmRef: "526", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref527", name: "Precor Angled Leg Press", brand: "Precor", category: "Legs", subcategory: "Compounds", tdmRef: "527", cost: 0, marketValue: 2000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref528", name: "Cybex VR3 Squat Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "528", cost: 0, marketValue: 3800, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref529", name: "Exigo Plate Loaded ISO Leg Press", brand: "Exigo", category: "Legs", subcategory: "Compounds", tdmRef: "529", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref530", name: "Nautilus Plate Loaded Hack Squat", brand: "Nautilus", category: "Legs", subcategory: "Compounds", tdmRef: "530", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref531", name: "Watson Pendulum Squat", brand: "Watson", category: "Legs", subcategory: "Compounds", tdmRef: "531", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref532", name: "Hack Squat", brand: "", category: "Legs", subcategory: "Compounds", tdmRef: "532", cost: 0, marketValue: 800, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref533", name: "Primal Strength Leverage Squat", brand: "Primal Strength", category: "Legs", subcategory: "Compounds", tdmRef: "533", cost: 0, marketValue: 800, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref534", name: "Precor Seated Leg Curl", brand: "Precor", category: "Legs", subcategory: "Leg Curls", tdmRef: "534", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref535", name: "Cybex VR3 Kneeling Leg Curl", brand: "Cybex", category: "Legs", subcategory: "Leg Curls", tdmRef: "535", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref536", name: "Life Fitness Pro1 Prone Leg Curl", brand: "Life Fitness", category: "Legs", subcategory: "Leg Curls", tdmRef: "536", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref537", name: "Cybex VR Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "537", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref538", name: "Cybex VR3 Plate Loaded Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "538", cost: 0, marketValue: 1500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref539", name: "Precor Leg Extension", brand: "Precor", category: "Legs", subcategory: "Leg Extensions", tdmRef: "539", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref540", name: "Life Fitness Standing Calf", brand: "Life Fitness", category: "Legs", subcategory: "Calves", tdmRef: "540", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref541", name: "BodyMax Rear Kick", brand: "BodyMax", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "541", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref542", name: "Life Fitness Plate Loaded Calf Raise", brand: "Life Fitness", category: "Legs", subcategory: "Calves", tdmRef: "542", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref543", name: "Hammer Strength GHD", brand: "Hammer Strength", category: "Legs", tdmRef: "543", cost: 0, marketValue: 650, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref544", name: "Precor Icarian Abductor", brand: "Precor Icarian", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "544", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref545", name: "Nautilus Inspiration Abductor / Adductor", brand: "Nautilus", category: "Legs", subcategory: "Adductors", tdmRef: "545", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref224", name: "Booty Builder V8 Hip Thrust", brand: "Booty Builder", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "224", cost: 0, marketValue: 3000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref147", name: "Precor Icarian Donkey Calf", brand: "Precor Icarian", category: "Legs", subcategory: "Calves", tdmRef: "147", cost: 0, marketValue: 3500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref546", name: "Nautilus Glute Drive (Plate Loaded)", brand: "Nautilus", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "546", cost: 0, marketValue: 2500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref547", name: "Dip Machine", brand: "", category: "Arms", subcategory: "Triceps", tdmRef: "547", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref548", name: "Nautilus Nitro SA Tricep Extension", brand: "Nautilus", category: "Arms", subcategory: "Triceps", tdmRef: "548", cost: 0, marketValue: 1200, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref549", name: "Preacher Bench", brand: "", category: "Arms", subcategory: "Biceps", tdmRef: "549", cost: 0, marketValue: 100, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref351", name: "Magnum Bicep Curl", brand: "Magnum", category: "Arms", subcategory: "Biceps", tdmRef: "351", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref550", name: "Life Fitness Bicep Curl", brand: "Life Fitness", category: "Arms", subcategory: "Biceps", tdmRef: "550", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref551", name: "Strength Shop Competition Bench", brand: "Strength Shop", category: "Powerlifting", subcategory: "Benches", tdmRef: "551", cost: 0, marketValue: 600, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref552", name: "Strength Shop Competition Bench", brand: "Strength Shop", category: "Powerlifting", subcategory: "Benches", tdmRef: "552", cost: 0, marketValue: 600, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref553", name: "Primal Strength Squat Rack", brand: "Primal Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "553", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref554", name: "Half Rack", brand: "", category: "Powerlifting", subcategory: "Racks", tdmRef: "554", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref172", name: "Cybex V1 Smith Machine", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "172", cost: 0, marketValue: 5000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref640", name: "Hammer Strength Rack", brand: "Hammer Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "640", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref555", name: "Hammer Strength Rack", brand: "Hammer Strength", category: "Powerlifting", subcategory: "Racks", tdmRef: "555", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref641", name: "StairMaster StairMaster", brand: "StairMaster", category: "Powerlifting", tdmRef: "641", cost: 0, marketValue: 3500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref556", name: "StairMaster StairMaster", brand: "StairMaster", category: "Cardio", subcategory: "Stair", tdmRef: "556", cost: 0, marketValue: 3500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref557", name: "Life Fitness PowerMill", brand: "Life Fitness", category: "Cardio", subcategory: "Stair", tdmRef: "557", cost: 0, marketValue: 3500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref558", name: "Jacobs Ladder Ladder", brand: "Jacobs Ladder", category: "Cardio", subcategory: "Stair", tdmRef: "558", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref642", name: "Precor Bike", brand: "Precor", category: "Cardio", subcategory: "Bike", tdmRef: "642", cost: 0, marketValue: 300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref559", name: "Precor Bike", brand: "Precor", category: "Cardio", subcategory: "Bike", tdmRef: "559", cost: 0, marketValue: 300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref636", name: "Life Fitness Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "636", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref637", name: "Life Fitness Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "637", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref638", name: "Life Fitness Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "638", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref639", name: "Life Fitness Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "639", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref560", name: "Life Fitness Treadmill", brand: "Life Fitness", category: "Cardio", subcategory: "Treadmill", tdmRef: "560", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref561", name: "TechnoGym Curved Treadmill", brand: "TechnoGym", category: "Cardio", subcategory: "Treadmill", tdmRef: "561", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref562", name: "Watt Bike Bike", brand: "Watt Bike", category: "Cardio", subcategory: "Bike", tdmRef: "562", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref563", name: "Matrix Recumbent Bike", brand: "Matrix", category: "Cardio", subcategory: "Bike", tdmRef: "563", cost: 0, marketValue: 300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref564", name: "Precor C846i Recumbent Bike", brand: "Precor", category: "Cardio", subcategory: "Bike", tdmRef: "564", cost: 0, marketValue: 300, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref565", name: "Precor EFX 556i Elliptical", brand: "Precor", category: "Cardio", subcategory: "Elliptical", tdmRef: "565", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref566", name: "Concept2 SkiErg", brand: "Concept2", category: "Cardio", tdmRef: "566", cost: 0, marketValue: 500, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref567", name: "Hoist Cable Crossover", brand: "Hoist", category: "Other", tdmRef: "567", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref568", name: "Life Fitness Cable Crossover", brand: "Life Fitness", category: "Other", tdmRef: "568", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref569", name: "Life Fitness DAP", brand: "Life Fitness", category: "Other", tdmRef: "569", cost: 0, marketValue: 0, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref570", name: "DAP", brand: "", category: "Other", tdmRef: "570", cost: 0, marketValue: 0, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref571", name: "Precor Seated DAP", brand: "Precor", category: "Other", tdmRef: "571", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-ref572", name: "Precor Assisted Chin / Dip", brand: "Precor", category: "Other", tdmRef: "572", cost: 0, marketValue: 900, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "unity-tamworth-boxing-ring", name: "Boxing Ring", brand: "", category: "Other", cost: 0, marketValue: 1000, currentLocation: "Unity Tamworth", destination: "Unity Tamworth", status: "In Use", orderDate: "2026-02-01" },
  { id: "medx-leg-ext", name: "MedX Leg Extension", brand: "MedX", category: "Legs", subcategory: "Leg Extensions", tdmRef: "403", cost: 1500, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", notes: "Remake all stickers in theme" },
  { id: "cybex-galileo-leg-ext", name: "Cybex Galileo Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "323", cost: 500, marketValue: 1500, currentLocation: "WBAK HQ", destination: "TDM Gym", status: "In Refurb", refurbStage: "Landed", orderDate: "2026-06-12", notes: "Cybex sticker on stack casing & remake info sticker" },
  { id: "ss-thor-cage-3", name: "Strength Shop Thor Cage 3", brand: "Strength Shop", category: "Powerlifting", subcategory: "Racks", tdmRef: "40", cost: 0, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "ss-deadlift-platform-2", name: "Strength Shop Deadlift Platform", brand: "Strength Shop", category: "Powerlifting", subcategory: "Platforms", tdmRef: "39", cost: 400, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "cybex-treadmill-1", name: "Cybex Treadmill", brand: "Cybex", category: "Cardio", subcategory: "Treadmill", tdmRef: "42", cost: 850, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "cybex-treadmill-2", name: "Cybex Treadmill", brand: "Cybex", category: "Cardio", subcategory: "Treadmill", tdmRef: "43", cost: 850, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "cybex-treadmill-3", name: "Cybex Treadmill", brand: "Cybex", category: "Cardio", subcategory: "Treadmill", tdmRef: "44", cost: 850, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "cybex-treadmill-4", name: "Cybex Treadmill", brand: "Cybex", category: "Cardio", subcategory: "Treadmill", tdmRef: "45", cost: 850, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "matrix-plate-trees", name: "Matrix Plate Trees", brand: "Matrix", category: "Accessories", subcategory: "Storage", cost: 80, marketValue: 0, currentLocation: "WBAK HQ", destination: "For Sale", status: "In Use", notes: "Qty: 3" },
  { id: "icarian-ghr", name: "Icarian GHR", brand: "Icarian", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "56", cost: 250, marketValue: 500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "jordan-ghr", name: "Jordan GHR", brand: "Jordan", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "57", cost: 250, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "ss-ghr", name: "Strength Shop GHR", brand: "Strength Shop", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "58", cost: 467, marketValue: 467, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "naut-2st-vert-chest-tdm2", name: "Nautilus 2ST Vertical Chest Press", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "1", cost: 1000, marketValue: 2750, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Manassas, VA" },
  { id: "naut-xpload-incline-tdm2", name: "Nautilus Xpload Incline Press", brand: "Nautilus", category: "Chest", subcategory: "Presses", tdmRef: "2", cost: 5000, marketValue: 7000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Greenville, SC" },
  { id: "magnum-biangular-upper-chest-tdm2", name: "Magnum Biangular Upper Chest", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "153", cost: 1700, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-08-09", seller: "Bellevue, IL" },
  { id: "naut-nitro-pec-fly-rear-delt-tdm2", name: "Nautilus Nitro Pec Fly / Rear Delt", brand: "Nautilus", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "3", cost: 2000, marketValue: 2700, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "bodymasters-pec-fly-rear-delt-tdm2", name: "Bodymasters Pec Fly / Rear Delt", brand: "Bodymasters", category: "Chest", subcategory: "Pec Decs / Flies", tdmRef: "149", cost: 1200, marketValue: 3200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-08-09", seller: "Morelia" },
  { id: "naut-2st-shoulder-press-tdm2", name: "Nautilus 2ST Shoulder Press", brand: "Nautilus", category: "Shoulders", subcategory: "Presses", tdmRef: "253", cost: 1500, marketValue: 2500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-02", seller: "Moxee, WA" },
  { id: "flex-deltoid-raise-tdm2", name: "Flex Fitness Deltoid Raise", brand: "Flex Fitness", category: "Shoulders", subcategory: "Laterals", tdmRef: "209", cost: 2900, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-05-15", seller: "Florence" },
  { id: "strive-lateral-raise-tdm2", name: "Strive Lateral Raise", brand: "Strive", category: "Shoulders", subcategory: "Laterals", tdmRef: "4", cost: 3000, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Guadalajara" },
  { id: "lf-pro1-lateral-tdm2", name: "Life Fitness Pro 1 Lateral Raise", brand: "Life Fitness", category: "Shoulders", subcategory: "Laterals", tdmRef: "5", cost: 1300, marketValue: 1500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Southampton" },
  { id: "precor-pulldown-tdm2", name: "Precor Pulldown", brand: "Precor", category: "Back", subcategory: "Pulldowns", tdmRef: "6", cost: 0, marketValue: 750, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Lichfield" },
  { id: "hd-xpload-pulldown-tdm2", name: "HD (Xpload) Pulldown", brand: "HD", category: "Back", subcategory: "Pulldowns", tdmRef: "7", cost: 1800, marketValue: 2200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Stockport" },
  { id: "cybex-eagle-incline-pull-tdm2", name: "Cybex Eagle Incline Pull", brand: "Cybex", category: "Back", subcategory: "Pulldowns", tdmRef: "9", cost: 1000, marketValue: 1500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "panatta-fantastic-row-tdm2", name: "Panatta Fantastic Chain-Driven Row", brand: "Panatta", category: "Back", subcategory: "Rows", tdmRef: "10", cost: 500, marketValue: 1200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Leeds" },
  { id: "hd-magnum-biangular-row-tdm2", name: "HD (Magnum) Biangular Row", brand: "HD", category: "Back", subcategory: "Rows", tdmRef: "11", cost: 1650, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Stockport" },
  { id: "hs-iso-row-tdm2", name: "Hammer Strength Iso Row", brand: "Hammer Strength", category: "Back", subcategory: "Rows", tdmRef: "12", cost: 1600, marketValue: 1800, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Magnolia, TX" },
  { id: "naut-nitro-back-ext-tdm2", name: "Nautilus Nitro Back Extension", brand: "Nautilus", category: "Back", subcategory: "Back Ext", tdmRef: "13", cost: 550, marketValue: 550, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "naut-nitro-pullover-tdm2", name: "Nautilus Nitro Pullover", brand: "Nautilus", category: "Back", subcategory: "Pullover", tdmRef: "14", cost: 2000, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Laredo, TX" },
  { id: "hs-pullover-tdm2", name: "Hammer Strength Pullover", brand: "Hammer Strength", category: "Back", subcategory: "Pullover", tdmRef: "15", cost: 1600, marketValue: 1800, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Harrogate" },
  { id: "cybex-v1-leg-press-tdm2", name: "Cybex V1 Leg Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "16", cost: 4200, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Bellevue, IL" },
  { id: "cybex-v1-squat-press-tdm2", name: "Cybex V1 Squat Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "17", cost: 6000, marketValue: 7000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Bellevue, IL" },
  { id: "cybex-v1-hack-tdm2", name: "Cybex V1 Hack Squat", brand: "Cybex", category: "Legs", subcategory: "Compounds", tdmRef: "131", cost: 6200, marketValue: 11000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-07-14", seller: "Bellevue, IL" },
  { id: "atlantis-precision-lp-tdm2", name: "Atlantis Precision Leg Press", brand: "Atlantis", category: "Legs", subcategory: "Compounds", tdmRef: "18", cost: 3500, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "icarian-lying-lp-tdm2", name: "Icarian Lying Leg Press", brand: "Icarian", category: "Legs", subcategory: "Compounds", tdmRef: "125", cost: 1500, marketValue: 2500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-07-14", seller: "Albuquerque, NM" },
  { id: "strive-smart-prone-lc-tdm2", name: "Strive Smart Strength Prone Leg Curl", brand: "Strive", category: "Legs", subcategory: "Leg Curls", tdmRef: "21", cost: 3100, marketValue: 3600, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Walsall" },
  { id: "hoist-rocit-lc-tdm2", name: "Hoist Roc-It Leg Curl", brand: "Hoist", category: "Legs", subcategory: "Leg Curls", tdmRef: "22", cost: 1900, marketValue: 2250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Rochester, MN" },
  { id: "atlantis-precision-lying-lc-tdm2", name: "Atlantis Precision Lying Leg Curl", brand: "Atlantis", category: "Legs", subcategory: "Leg Curls", tdmRef: "23", cost: 2000, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Boise, ID" },
  { id: "atlantis-precision-seated-lc-tdm2", name: "Atlantis Precision Seated Leg Curl", brand: "Atlantis", category: "Legs", subcategory: "Leg Curls", tdmRef: "24", cost: 2000, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Boise, ID" },
  { id: "cybex-vr-leg-ext-tdm2", name: "Cybex VR Leg Extension", brand: "Cybex", category: "Legs", subcategory: "Leg Extensions", tdmRef: "25", cost: 750, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Oxford" },
  { id: "strive-smart-leg-ext-tdm2", name: "Strive Smart Strength Leg Extension", brand: "Strive", category: "Legs", subcategory: "Leg Extensions", tdmRef: "26", cost: 3100, marketValue: 3600, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Walsall" },
  { id: "naut-nitro-ab-ad-tdm2", name: "Nautilus Nitro Ab/Adductor", brand: "Nautilus", category: "Legs", subcategory: "Adductors", tdmRef: "27", cost: 2000, marketValue: 2250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Tucson, AZ" },
  { id: "flex-classic-adductor-tdm2", name: "Flex Fitness Classic Adductor", brand: "Flex Fitness", category: "Legs", subcategory: "Adductors", tdmRef: "319", cost: 1700, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-06-11" },
  { id: "naut-glute-drive-tdm2", name: "Nautilus Glute Drive", brand: "Nautilus", category: "Legs", subcategory: "Glutes / Hips", tdmRef: "28", cost: 2300, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Leicester" },
  { id: "cybex-vr2-rotary-calf-tdm2", name: "Cybex VR2 Rotary Calf", brand: "Cybex", category: "Legs", subcategory: "Calves", tdmRef: "29", cost: 1700, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Lincoln, NE" },
  { id: "bodymasters-standing-calf-tdm2", name: "Bodymasters Standing Calf", brand: "Bodymasters", category: "Legs", subcategory: "Calves", tdmRef: "30", cost: 1500, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Portland, OR" },
  { id: "bodymasters-overhead-tri-tdm2", name: "Bodymasters Overhead Tricep", brand: "Bodymasters", category: "Arms", subcategory: "Triceps", tdmRef: "31", cost: 3000, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Madison, WI" },
  { id: "naut-nitro-sa-tri-tdm2", name: "Nautilus Nitro SA Tricep Extension", brand: "Nautilus", category: "Arms", subcategory: "Triceps", tdmRef: "32", cost: 1100, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "naut-nitro-sa-bicep-tdm2", name: "Nautilus Nitro SA Bicep Curl", brand: "Nautilus", category: "Arms", subcategory: "Biceps", tdmRef: "33", cost: 2000, marketValue: 2250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "hoist-rocit-cable-curl-tdm2", name: "Hoist Roc-It Cable Curl", brand: "Hoist", category: "Arms", subcategory: "Biceps", tdmRef: "34", cost: 1800, marketValue: 2400, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Birmingham, AL" },
  { id: "strive-pl-preacher-tdm2", name: "Strive PL Preacher Curl", brand: "Strive", category: "Arms", subcategory: "Biceps", tdmRef: "177", cost: 2700, marketValue: 3750, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-10-20", seller: "Salt Lake City, UT" },
  { id: "bodymasters-selectorised-bicep-tdm2", name: "Bodymasters Selectorised Bicep Curl", brand: "Bodymasters", category: "Arms", subcategory: "Biceps", tdmRef: "86", cost: 1400, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Brooklyn, NY" },
  { id: "lf-cable-crossover-tdm2", name: "Life Fitness Older Cable Crossover", brand: "Life Fitness", category: "Other", subcategory: "Other", tdmRef: "47", cost: 1150, marketValue: 2600, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "lf-mj8-jungle-tdm2", name: "Life Fitness MJ8 Jungle Gym", brand: "Life Fitness", category: "Other", subcategory: "Other", tdmRef: "48", cost: 7500, marketValue: 8000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Redditch" },
  { id: "cybex-bravo-tdm2", name: "Cybex Bravo", brand: "Cybex", category: "Other", subcategory: "Other", tdmRef: "49", cost: 5500, marketValue: 5500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Bristol" },
  { id: "cybex-v2-smith-tdm2", name: "Cybex V2 Smith Machine", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "50", cost: 2200, marketValue: 3000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Bristol" },
  { id: "naut-smith-tdm2", name: "Nautilus Smith Machine", brand: "Nautilus", category: "Powerlifting", subcategory: "Racks", tdmRef: "51", cost: 1900, marketValue: 2250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "naut-nitro-ab-crunch-tdm2", name: "Nautilus Nitro Ab Crunch", brand: "Nautilus", category: "Other", subcategory: "Other", tdmRef: "52", cost: 1200, marketValue: 1200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Wrexham" },
  { id: "flex-bisolator-tdm2", name: "Flex Fitness Bisolator", brand: "Flex Fitness", category: "Arms", subcategory: "Biceps", tdmRef: "170", cost: 4000, marketValue: 10000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-10-20", seller: "Tokyo" },
  { id: "tdm-gym-259", name: "Nautilus Leverage Chest Press", brand: "Nautilus", category: "Other", tdmRef: "259", cost: 2900, marketValue: 3200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-09" },
  { id: "tdm-gym-383", name: "Nautilus Pec Fly", brand: "Nautilus", category: "Other", tdmRef: "383", cost: 2900, marketValue: 3250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-19" },
  { id: "tdm-gym-267", name: "Cybex Eagle Kneeling Lateral", brand: "Cybex", category: "Other", tdmRef: "267", cost: 3000, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-04-19" },
  { id: "tdm-gym-374", name: "Bodymasters Pulldown", brand: "Bodymasters", category: "Other", tdmRef: "374", cost: 750, marketValue: 1500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-08" },
  { id: "tdm-gym-382", name: "Citadel Pulldown", brand: "Citadel", category: "Other", tdmRef: "382", cost: 3300, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-24", seller: "Brisbane" },
  { id: "tdm-gym-104", name: "Cybex VR Row", brand: "Cybex", category: "Other", tdmRef: "104", cost: 770, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-07-10", seller: "Jackson, MS" },
  { id: "tdm-gym-398", name: "MedX Selectorised Row", brand: "MedX", category: "Other", tdmRef: "398", cost: 5500, marketValue: 6000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-09-09" },
  { id: "tdm-gym-355", name: "Magnum Mid Row", brand: "Magnum", category: "Other", tdmRef: "355", cost: 1220, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-03" },
  { id: "tdm-gym-370", name: "Magnum T Bar Row", brand: "Magnum", category: "Other", tdmRef: "370", cost: 500, marketValue: 1200, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-08" },
  { id: "tdm-gym-399", name: "Jamn Squat", brand: "Jamn", category: "Other", tdmRef: "399", cost: 3300, marketValue: 4000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-09-11" },
  { id: "tdm-gym-400", name: "Rogers Pit Shark", brand: "Rogers", category: "Other", tdmRef: "400", cost: 3500, marketValue: 5000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-09-11" },
  { id: "tdm-gym-386", name: "Atlantis Hack Squat", brand: "Atlantis", category: "Other", tdmRef: "386", cost: 4000, marketValue: 7500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-30" },
  { id: "tdm-gym-397", name: "Star Trac Hamtractor", brand: "Star Trac", category: "Other", tdmRef: "397", cost: 4800, marketValue: 8000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-09-09" },
  { id: "tdm-gym-381", name: "MedX Leg Curl", brand: "MedX", category: "Other", tdmRef: "381", cost: 2000, marketValue: 3500, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-07-15" },
  { id: "tdm-gym-46", name: "Cybex 750C Bike", brand: "Cybex", category: "Other", tdmRef: "46", cost: 600, marketValue: 1000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-401", name: "Matrix Stairmaster", brand: "Matrix", category: "Other", tdmRef: "401", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-402", name: "Matrix Stairmaster", brand: "Matrix", category: "Other", tdmRef: "402", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-192", name: "Life Fitness Dip Pull Up", brand: "Life Fitness", category: "Other", tdmRef: "192", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2025-08-20" },
  { id: "tdm-gym-59", name: "Strength Shop Double Deadlift Jack", brand: "Strength Shop", category: "Other", tdmRef: "59", cost: 90, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-60", name: "Strength Shop Double Deadlift Jack", brand: "Strength Shop", category: "Other", tdmRef: "60", cost: 90, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-61", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "61", cost: 250, marketValue: 750, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-62", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "62", cost: 250, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-63", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "63", cost: 250, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-64", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "64", cost: 250, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-65", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "65", cost: 250, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-66", name: "Strength Shop Heavy Duty Utility Bench", brand: "Strength Shop", category: "Other", tdmRef: "66", cost: 250, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-67", name: "Strength Shop Adjustable Plyo Box Squat", brand: "Strength Shop", category: "Other", tdmRef: "67", cost: 0, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", seller: "Glasgow" },
  { id: "tdm-gym-68", name: "Strength Shop Wall Mounted Bar Holder", brand: "Strength Shop", category: "Other", tdmRef: "68", cost: 0, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-69", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "69", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-70", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "70", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-71", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "71", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-72", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "72", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-73", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "73", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-74", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "74", cost: 106, marketValue: 0, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-75", name: "Strength Shop 2029 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "75", cost: 106, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-76", name: "Strength Shop 2028 Power Bar", brand: "Strength Shop", category: "Other", tdmRef: "76", cost: 128, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-77", name: "Strength Shop 35mm 25kg Squat Bar", brand: "Strength Shop", category: "Other", tdmRef: "77", cost: 283, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-78", name: "Strength Shop Riot Olympic Safety Squat Bar", brand: "Strength Shop", category: "Other", tdmRef: "78", cost: 163, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-79", name: "Strength Shop Olympic Cambered Bar", brand: "Strength Shop", category: "Other", tdmRef: "79", cost: 127, marketValue: 25, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-81", name: "Texas Deadlift Bar", brand: "Texas", category: "Other", tdmRef: "81", cost: 491, marketValue: 400, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-82", name: "Texas Deadlift Bar", brand: "Texas", category: "Other", tdmRef: "82", cost: 0, marketValue: 400, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-83", name: "Eleiko Combo Rack", brand: "Eleiko", category: "Other", tdmRef: "83", cost: 4315, marketValue: 4315, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-84", name: "Eleiko Competition Bar", brand: "Eleiko", category: "Other", tdmRef: "84", cost: 523, marketValue: 523, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-85", name: "Eleiko Competition Bar", brand: "Eleiko", category: "Other", tdmRef: "85", cost: 555, marketValue: 555, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use" },
  { id: "tdm-gym-286", name: "Sportkraft Xtreme Squat Bar 30kg", brand: "Sportkraft", category: "Other", tdmRef: "286", cost: 587, marketValue: 450, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "tdm-gym-287", name: "Sportkraft Xtreme Bench Bar 25kg", brand: "Sportkraft", category: "Other", tdmRef: "287", cost: 432, marketValue: 350, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "tdm-gym-288", name: "Sportkraft Buffalo Bar", brand: "Sportkraft", category: "Other", tdmRef: "288", cost: 336, marketValue: 250, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "tdm-gym-289", name: "Sportkraft Bench Camber Bar", brand: "Sportkraft", category: "Other", tdmRef: "289", cost: 155, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "tdm-gym-290", name: "Sportkraft Swiss Bar", brand: "Sportkraft", category: "Other", tdmRef: "290", cost: 155, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "tdm-gym-291", name: "Sportkraft 210cm Fat Bar", brand: "Sportkraft", category: "Other", tdmRef: "291", cost: 104, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-03" },
  { id: "wbak-303", name: "Cybex VR1 Chest Press", brand: "Cybex", category: "Other", tdmRef: "303", cost: 450, marketValue: 850, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-203", name: "Cybex VR2 Lat Pulldown", brand: "Cybex", category: "Other", tdmRef: "203", cost: 2000, marketValue: 2600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-28" },
  { id: "wbak-801", name: "Cybex Eagle Chest Press", brand: "Cybex", category: "Other", tdmRef: "801", cost: 950, marketValue: 1600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-802", name: "Cybex Eagle Lat Pulldown (blue)", brand: "Cybex", category: "Other", tdmRef: "802", cost: 950, marketValue: 1600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-803", name: "Cybex Eagle Lat Pulldown (silver and tan)", brand: "Cybex", category: "Other", tdmRef: "803", cost: 100, marketValue: 1600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-804", name: "Cybex Eagle Pec Fly / Rear Delt", brand: "Cybex", category: "Other", tdmRef: "804", cost: 100, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-805", name: "Cybex Eagle Torso Rotation", brand: "Cybex", category: "Other", tdmRef: "805", cost: 100, marketValue: 600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-806", name: "Cybex Eagle Overhead Press", brand: "Cybex", category: "Other", tdmRef: "806", cost: 950, marketValue: 1500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-807", name: "Cybex Eagle Arm Curl", brand: "Cybex", category: "Other", tdmRef: "807", cost: 0, marketValue: 1500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-808", name: "Cybex Plate-Loaded Bench Press", brand: "Cybex", category: "Other", tdmRef: "808", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-364", name: "Cybex FT360S Functional Trainer", brand: "Cybex", category: "Other", tdmRef: "364", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "TDM Gym", status: "At HQ" },
  { id: "wbak-809", name: "Cybex Treadmill", brand: "Cybex", category: "Other", tdmRef: "809", cost: 1000, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-161", name: "Flex Fitness Leverage Shoulder Press", brand: "Flex Fitness", category: "Other", tdmRef: "161", cost: 4500, marketValue: 5000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-20" },
  { id: "wbak-162", name: "Flex Fitness Leverage Shoulder Press", brand: "Flex Fitness", category: "Other", tdmRef: "162", cost: 4500, marketValue: 5000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-20" },
  { id: "wbak-206", name: "Flex Fitness Incline Press", brand: "Flex Fitness", category: "Other", tdmRef: "206", cost: 3000, marketValue: 3750, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-05-15" },
  { id: "wbak-134", name: "Flex Fitness Classic Angled Leg Press", brand: "Flex Fitness", category: "Other", tdmRef: "134", cost: 0, marketValue: 3500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-16" },
  { id: "wbak-123", name: "Flex Fitness Leg Extension (black and white)", brand: "Flex Fitness", category: "Other", tdmRef: "123", cost: 3400, marketValue: 5000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-14" },
  { id: "wbak-141", name: "Flex Fitness Leg Extension with Adjustable Cam", brand: "Flex Fitness", category: "Other", tdmRef: "141", cost: 3400, marketValue: 5000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-23" },
  { id: "wbak-376", name: "Flex Fitness Abdominal Machine", brand: "Flex Fitness", category: "Other", tdmRef: "376", cost: 1000, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-07-08" },
  { id: "wbak-810", name: "Bodymasters 213 Row", brand: "Bodymasters", category: "Other", tdmRef: "810", cost: 0, marketValue: 2700, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-120", name: "Bodymasters MD3318 Incline Press", brand: "Bodymasters", category: "Other", tdmRef: "120", cost: 2400, marketValue: 2750, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-14" },
  { id: "wbak-121", name: "Bodymasters CX114 Abductor", brand: "Bodymasters", category: "Other", tdmRef: "121", cost: 2000, marketValue: 2200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-14" },
  { id: "wbak-811", name: "Bodymasters MD214A Low Row", brand: "Bodymasters", category: "Other", tdmRef: "811", cost: 900, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-157", name: "Bodymasters CX Leg Extension", brand: "Bodymasters", category: "Other", tdmRef: "157", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-16" },
  { id: "wbak-158", name: "Bodymasters CX Leg Curl", brand: "Bodymasters", category: "Other", tdmRef: "158", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-16" },
  { id: "wbak-812", name: "Nautilus Inspiration Glute Press", brand: "Nautilus", category: "Other", tdmRef: "812", cost: 0, marketValue: 800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-813", name: "Nautilus Nitro Plus Seated Leg Curl", brand: "Nautilus", category: "Other", tdmRef: "813", cost: 140, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-814", name: "Nautilus Nitro Plus Leg Press", brand: "Nautilus", category: "Other", tdmRef: "814", cost: 140, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-348", name: "Nautilus Fixed Lat Pulldown", brand: "Nautilus", category: "Other", tdmRef: "348", cost: 0, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-06-20" },
  { id: "wbak-815", name: "Nautilus Xpload Plate-Loaded Seated Dip", brand: "Nautilus", category: "Other", tdmRef: "815", cost: 0, marketValue: 1800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-816", name: "Nautilus Bicep / Tricep Machine", brand: "Nautilus", category: "Other", tdmRef: "816", cost: 0, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-817", name: "Nautilus Upright Bike", brand: "Nautilus", category: "Other", tdmRef: "817", cost: 140, marketValue: 150, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-818", name: "Nautilus Bench", brand: "Nautilus", category: "Other", tdmRef: "818", cost: 140, marketValue: 700, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-237", name: "Precor Icarian Smith Machine", brand: "Precor", category: "Other", tdmRef: "237", cost: 2500, marketValue: 3000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-03-21" },
  { id: "wbak-819", name: "Precor Angled Leg Press", brand: "Precor", category: "Other", tdmRef: "819", cost: 0, marketValue: 1800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-820", name: "Precor Seated Row", brand: "Precor", category: "Other", tdmRef: "820", cost: 0, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-821", name: "Precor Icarian Leg Extension 605", brand: "Precor", category: "Other", tdmRef: "821", cost: 1200, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-822", name: "Precor Bicep Curl / Tricep Extension", brand: "Precor", category: "Other", tdmRef: "822", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-823", name: "Precor Infinity Line Lat Pulldown", brand: "Precor", category: "Other", tdmRef: "823", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-824", name: "Precor Icarian Decline Bench Press", brand: "Precor", category: "Other", tdmRef: "824", cost: 0, marketValue: 300, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-825", name: "Precor Treadmill x2", brand: "Precor", category: "Other", tdmRef: "825", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-826", name: "Life Fitness Pulley Machine", brand: "Life Fitness", category: "Other", tdmRef: "826", cost: 0, marketValue: 2200, currentLocation: "WBAK HQ", destination: "TDM Gym", status: "At HQ" },
  { id: "wbak-827", name: "Life Fitness Bicep Curl", brand: "Life Fitness", category: "Other", tdmRef: "827", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "TDM Gym", status: "At HQ" },
  { id: "wbak-828", name: "Life Fitness Pec Fly", brand: "Life Fitness", category: "Other", tdmRef: "828", cost: 0, marketValue: 800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-829", name: "Life Fitness Pro 1 Tricep Machine", brand: "Life Fitness", category: "Other", tdmRef: "829", cost: 0, marketValue: 800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-830", name: "Hammer Strength Selectorised Leg Extension", brand: "Hammer Strength", category: "Other", tdmRef: "830", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-831", name: "Hammer Strength Plate-Loaded Leg Curl", brand: "Hammer Strength", category: "Other", tdmRef: "831", cost: 300, marketValue: 600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-832", name: "Hammer Strength MTS-Style Selectorised Chest Press", brand: "Hammer Strength", category: "Other", tdmRef: "832", cost: 0, marketValue: 600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-833", name: "Panatta Fit 200 Shoulder Press", brand: "Panatta", category: "Other", tdmRef: "833", cost: 100, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-834", name: "Panatta Fit 2000 Pec Deck", brand: "Panatta", category: "Other", tdmRef: "834", cost: 100, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-835", name: "Panatta Tricep Machine", brand: "Panatta", category: "Other", tdmRef: "835", cost: 0, marketValue: 600, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-207", name: "Paramount Rotary Chest Press", brand: "Paramount", category: "Other", tdmRef: "207", cost: 0, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-05-15" },
  { id: "wbak-198", name: "Paramount Vertical Butterfly PL3-100", brand: "Paramount", category: "Other", tdmRef: "198", cost: 300, marketValue: 900, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-10-20" },
  { id: "wbak-214", name: "Hoist Mid Row", brand: "Hoist", category: "Other", tdmRef: "214", cost: 450, marketValue: 1300, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-05-15" },
  { id: "wbak-836", name: "Magnum Vertical Bench", brand: "Magnum", category: "Other", tdmRef: "836", cost: 1500, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-837", name: "Primal Strength T-Bar Row", brand: "Primal Strength", category: "Other", tdmRef: "837", cost: 0, marketValue: 100, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-838", name: "Primal Strength Plate-Loaded Leg Extension", brand: "Primal Strength", category: "Other", tdmRef: "838", cost: 0, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-839", name: "Primal Strength Plate-Loaded Shoulder Press", brand: "Primal Strength", category: "Other", tdmRef: "839", cost: 0, marketValue: 500, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-276", name: "Strive Smart Strength Plate-Loaded Tricep Extension", brand: "Strive", category: "Other", tdmRef: "276", cost: 1200, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-04-26" },
  { id: "wbak-316", name: "Concept2 Rower", brand: "Concept2", category: "Other", tdmRef: "316", cost: 800, marketValue: 800, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-06-10" },
  { id: "wbak-840", name: "Cutler Adductor", brand: "Cutler", category: "Other", tdmRef: "840", cost: 0, marketValue: 350, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-841", name: "Cutler Abductor", brand: "Cutler", category: "Other", tdmRef: "841", cost: 0, marketValue: 350, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-842", name: "Guardian Power Sport Chest Press", brand: "Guardian", category: "Other", tdmRef: "842", cost: 50, marketValue: 350, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-843", name: "Integra Jungle Gym", brand: "Integra", category: "Other", tdmRef: "843", cost: 50, marketValue: 350, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-130", name: "Streamline Pec Fly", brand: "Streamline", category: "Other", tdmRef: "130", cost: 700, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-14" },
  { id: "wbak-844", name: "Strength Shop Rack x2", brand: "Strength Shop", category: "Other", tdmRef: "844", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "TDM Gym", status: "At HQ" },
  { id: "wbak-845", name: "TechnoGym Lat Pulldown", brand: "TechnoGym", category: "Other", tdmRef: "845", cost: 750, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-846", name: "Plate-Loaded Chest Press", brand: "", category: "Other", tdmRef: "846", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ" },
  { id: "wbak-uncertain-847", name: "Star Trac leverage curl", brand: "", category: "Other", tdmRef: "847", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-848", name: "Cybex eagle NX leg extension", brand: "", category: "Other", tdmRef: "848", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-849", name: "Precor lateral raise", brand: "", category: "Other", tdmRef: "849", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-353", name: "Magnum lying leg curl", brand: "Magnum", category: "Other", tdmRef: "353", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-07-03", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-357", name: "Magnum pulldown", brand: "Magnum", category: "Other", tdmRef: "357", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2026-07-03", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-363", name: "Matrix calf raise", brand: "Matrix", category: "Other", tdmRef: "363", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-365", name: "Life Fitness crossover (newer)", brand: "Life Fitness", category: "Other", tdmRef: "365", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "wbak-uncertain-850", name: "Cybex prone leg curl (from Lichfield?)", brand: "", category: "Other", tdmRef: "850", cost: 0, marketValue: 0, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", notes: "From Aug 2026 WBAK stock list, no value/notes recorded -- needs verification" },
  { id: "unity5-ref356", name: "Magnum Biangular Chest Press", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "356", cost: 0, marketValue: 3000, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ", orderDate: "2026-07-03" },
  { id: "unity5-ref352", name: "Magnum Leg Extension", brand: "Magnum", category: "Legs", subcategory: "Leg Extensions", tdmRef: "352", cost: 0, marketValue: 1800, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ", orderDate: "2026-07-03" },
  { id: "unity5-ref150", name: "Bodymasters 410 Bicep", brand: "Bodymasters", category: "Arms", subcategory: "Biceps", tdmRef: "150", cost: 0, marketValue: 3000, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ", orderDate: "2025-08-09" },
  { id: "unity5-magnum-e-series-incline-chest", name: "Magnum E Series Incline Chest", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "371", cost: 500, marketValue: 1500, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ", orderDate: "2026-07-08" },
  { id: "unity5-paramount-pl-flat-chest-press", name: "Paramount PL Flat Chest Press", brand: "Paramount", category: "Chest", subcategory: "Presses", cost: 0, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ" },
  { id: "unity5-precor-shoulder-press", name: "Precor Shoulder Press", brand: "Precor", category: "Shoulders", subcategory: "Presses", cost: 0, marketValue: 1000, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ" },
  { id: "unity5-cybex-eagle-leg-press", name: "Cybex Eagle Leg Press", brand: "Cybex", category: "Legs", subcategory: "Compounds", cost: 0, marketValue: 3000, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ" },
  { id: "unity5-bodymasters-lying-leg-curl", name: "Bodymasters Lying Leg Curl", brand: "Bodymasters", category: "Legs", subcategory: "Leg Curls", tdmRef: "369", cost: 1200, marketValue: 2500, currentLocation: "WBAK HQ", destination: "Unity 5", status: "At HQ", orderDate: "2026-07-08" },
  { id: "wbak-304", name: "Cybex VR2 Chest Press", brand: "Cybex", category: "Chest", subcategory: "Presses", tdmRef: "304", cost: 300, marketValue: 1200, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", seller: "Jackie", notes: "From Incoming Equipment log (order 38) -- missing from the WBAK stock list transcription" },
  { id: "wbak-126", name: "Magnum Biangular Chest", brand: "Magnum", category: "Chest", subcategory: "Presses", tdmRef: "126", cost: 1800, marketValue: 2000, currentLocation: "WBAK HQ", destination: "Undecided", status: "At HQ", orderDate: "2025-07-14", seller: "Paul", notes: "From Incoming Equipment log (order 3, ref 126). Also the WBAK Aug 2026 stock list line previously dropped as an unresolved Ref 151 conflict (that entry valued it at GBP2,200) -- it is this unit, not a duplicate of the TDM Gym Magnum Biangular Chest which correctly keeps Ref 151." },
  { id: "tdm-gym-293", name: "Strength Shop Bow Bar", brand: "Strength Shop", category: "Powerlifting", subcategory: "Bars", tdmRef: "293", cost: 50, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-06", seller: "Dan Davies" },
  { id: "tdm-gym-294", name: "Strength Shop Axle Bar", brand: "Strength Shop", category: "Powerlifting", subcategory: "Bars", tdmRef: "294", cost: 50, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-06", seller: "Dan Davies" },
  { id: "tdm-gym-295", name: "Strength Shop Power Bar (British 2019)", brand: "Strength Shop", category: "Powerlifting", subcategory: "Bars", tdmRef: "295", cost: 50, marketValue: 100, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-05-06", seller: "Dan Davies" },
  { id: "tdm-gym-387", name: "Cybex Power Cage", brand: "Cybex", category: "Powerlifting", subcategory: "Racks", tdmRef: "387", cost: 800, marketValue: 2000, currentLocation: "TDM Gym", destination: "TDM Gym", status: "In Use", orderDate: "2026-08-07", seller: "FB", notes: "From Incoming Equipment log (order 60) -- shown as not yet arrived as of that sheet; confirmed by Liam as a real TDM Gym unit." },
];

// Items whose only existing record is destined elsewhere (For Sale / a Unity
// gym / Undecided) but which the July 2026 TDM Gym equipment audit also
// lists — per that audit, these are a second physical unit destined for
// TDM Gym, not the same piece, so we clone rather than reassign.
const TDM_SECOND_INSTANCE_IDS = [
  'paramount-rotary-pulldown',
  'cybex-classic-row'
];

const SEED_EQUIPMENT = [
  ...SEED_EQUIPMENT_BASE,
  ...SEED_EQUIPMENT_BASE
    .filter(i => TDM_SECOND_INSTANCE_IDS.includes(i.id))
    .map(i => ({ ...i, id: i.id + '-tdm2', destination: 'TDM Gym' }))
].map(seedItem);

// ---------- SEED SALES ----------

const seedSale = (o) => ({
  id: o.id, itemName: o.itemName, buyer: o.buyer, buyerContact: o.buyerContact || '',
  saleDate: o.saleDate || '', price: o.price || 0, cost: o.cost || 0, profit: o.profit || 0,
  deposit: o.deposit || 0, paid: !!o.paid, fulfilled: !!o.fulfilled,
  channel: o.channel || 'direct', deliveryAddress: o.deliveryAddress || '',
  notes: o.notes || '', addedAt: Date.now(), updatedAt: Date.now()
});

const SEED_SALES = [
  { id: 'sale-jamie-mucle-hut-1', itemName: 'V1 Cybex Hack + Atlantis Hack + Atlantis Leg Ext + Strive Dip + Cybex Bravo + Cybex Bravo Tall', buyer: 'Jamie (Muscle Hut)', buyerContact: '07446 006267', price: 34640, profit: 12280, channel: 'regulars', paid: true, fulfilled: true, notes: 'Muscle Hut Glasgow' },
  { id: 'sale-jamie-mucle-hut-2', itemName: 'Flex Bisolator + Cybex VR2 Shoulder Press', buyer: 'Jamie (Muscle Hut)', buyerContact: '07446 006267', price: 7840, channel: 'regulars', paid: true, fulfilled: true, deliveryAddress: 'Glasgow, 60 Hillington Rd South, G52 2AA' },
  { id: 'sale-jamie-prime-order', itemName: 'Prime Hybrid Inner Thigh + PL arm curl + PL leg extension + PL lat pulldown + PL prone leg curl + PL seated row', buyer: 'Jamie (Muscle Hut)', buyerContact: '07446 006267', saleDate: '2026-03-22', price: 26250, deposit: 10000, paid: false, fulfilled: false, channel: 'regulars' },
  { id: 'sale-david-jones', itemName: 'Flex Fitness Hamtractor', buyer: 'David Jones (Planet Fitness)', buyerContact: '07981 825785', saleDate: '2025-10-21', price: 9200, profit: 2142, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-luke-breen-1', itemName: 'Hammer Strength MTS Chest + Shoulder + Row + Pulldown', buyer: 'Luke Breen (Breens Gym Essex)', buyerContact: '07421 139034', saleDate: '2025-12-03', price: 5600, profit: 3360, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-daniel-ewen-hack', itemName: 'Cybex V1 HackSquat', buyer: 'Daniel Ewen', saleDate: '2026-04-20', price: 9100, cost: 6200, profit: 2900, deposit: 1000, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-jamie-flex-bisolator', itemName: 'Flex Bisolator (order 17)', buyer: 'Jamie (Muscle Hut)', buyerContact: '07446 006267', price: 7840, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-jackgrace-hs-lp', itemName: 'HammerStrength Linear Leg Press', buyer: 'Jack Grace', saleDate: '2026-06-16', price: 4800, channel: 'regulars', paid: false, fulfilled: false },
  { id: 'sale-adam-eagle-arm-ext', itemName: 'Cybex Eagle Arm Extension + Arm Curl + Row', buyer: 'Adam Whitlock (Le Sport)', buyerContact: '07741 250906', saleDate: '2026-03-30', price: 6675, profit: 6210, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-mike-fnt', itemName: 'Cybex Eagle Row', buyer: 'Mike FNT', buyerContact: '07752 277323', saleDate: '2026-04-26', price: 3800, profit: 1250, paid: true, fulfilled: true, notes: 'Paid £3500 + Force pec dec swap', channel: 'regulars' },
  { id: 'sale-marc-wirral', itemName: 'Pulsestar Lying Leg Press', buyer: 'Marc (Wirral Body Transformations)', buyerContact: '07734 623954', saleDate: '2026-01-29', price: 590, profit: 109, paid: true, fulfilled: true, channel: 'regulars' },
  { id: 'sale-nathan-eagle-ab', itemName: 'Cybex Eagle Abdominal', buyer: 'Nathan', saleDate: '2026-05-23', price: 895, deposit: 500, paid: false, fulfilled: false, channel: 'facebook' }
].map(seedSale);

// ---------- SEED VAN RUNS ----------
// Sourced from the team's live Notion "Van Runs / Jobs" database (WeBuyAnyKit
// space). Job/People/Equipment/Notes mirror that schema directly rather than
// a pickup/dropoff model, since that's not how the team actually tracks runs.

const PEOPLE = ['Layton', 'Callum', 'Daisy', 'Liam', 'Cam', 'Tim', 'Sarah', 'Elena', 'Elle', 'Gunner', 'Mitch', 'Bailey'];

const seedVanRun = (o) => ({
  id: o.id, job: o.job, date: o.date,
  people: o.people || [], equipment: o.equipment || '', notes: o.notes || '',
  status: o.status || 'scheduled',
  addedAt: Date.now(), updatedAt: Date.now()
});

const SEED_VAN_RUNS = [
  { job: 'JP Kit Collection', date: '2026-07-03', people: ['Callum', 'Bailey'], equipment: 'Flex Adductor\nIcarian Incline Bench', notes: 'Latest arrival 16:00' },
  { job: 'Shoulder Press Delivery', date: '2026-07-03', people: ['Callum', 'Bailey'], equipment: 'Life Fitness Shoulder Press', notes: 'Delivery by mid-morning in Dorset' },
  { job: 'WBAK Runs', date: '2026-07-06', people: ['Daisy', 'Elle'], equipment: 'Pallets from TDM Gym to upstairs at WBAK\nSpare Life crossover to WBAK\n2x Precor treadmills to WBAK' },
  { job: 'Fix Aj’s 2ST Ab Crunch', date: '2026-07-06', people: ['Layton', 'Bailey'], equipment: '2ST ab crunch' },
  { job: 'Paul Kit Collection', date: '2026-07-07', people: ['Layton', 'Mitch'], equipment: 'Nebula VLP\nNebula Leg Press boxes\nBodymasters lateral\nNautilus leverage chest press' },
  { job: 'Gym Unity Day', date: '2026-07-08', people: ['Daisy', 'Elle'], equipment: 'Nitro swaps & maintenance', notes: 'All in task list' },
  { job: 'JP Kit Collection', date: '2026-07-09', people: ['Daisy', 'Bailey'], equipment: 'Paramount pec dec\nBodymasters super leg ex' },
  { job: 'Nytram Kit Collection', date: '2026-07-10', people: ['Layton', 'Elena'], equipment: 'TAKE ALL OF THE PADS FOR MIGUEL\nNautilus Super Pullover II\nHoist Roc It Bicep Curl\nNautilus 2ST Vertical Chest\nFlex Thighsolator' },
  { job: 'Craig Kit Collection', date: '2026-07-10', people: ['Bailey', 'Mitch'], equipment: '- Deliver Bodymasters lateral\n- Deliver Nebula VLP\n* Collect Supercat\n* Collect Gen 1 bicep\n* Collect Gen 1 fly\n* Collect SS bench\n* Collect Cybex lateral\n* Collect scales' },
  { job: 'Craig Kit Collection', date: '2026-07-20', people: ['Layton', 'Bailey'], equipment: '- Deliver V1 Cybex smith\n- Deliver Gen 1 tricep\n- Collect Flex deltoid fly\n- Collect Flex dip\n- Collect Arsenal lateral\n- Collect Paramount triceps' },
  { job: 'Craig Kit Collection', date: '2026-07-24', people: ['Daisy', 'Mitch'], equipment: '- Deliver Flex leverage row\n- Collect Bodymasters lateral\n- Collect Nebula VLP\n- Collect V1 Cybex smith\n- Collect Gen 1 tricep' }
].map(o => seedVanRun({ ...o, id: mkId(`van-${o.job}-${o.date}`) }));

// ---------- STORAGE HELPERS ----------

async function loadKey(key, fallback = null) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
    return true;
  } catch (e) { console.error('Save failed', key, e); return false; }
}
async function deleteKey(key) {
  try { await window.storage.delete(key); return true; }
  catch { return false; }
}

// Merge seed data with stored data — only adds missing IDs, never overwrites edits.
async function mergeSeed(current, seed) {
  const existing = new Set(current.map(i => i.id));
  const additions = seed.filter(s => !existing.has(s.id));
  return additions.length ? [...current, ...additions] : current;
}

// One-time correction: there is no in-house refurb (only Craigs/Nytram/JP), and
// Paul is a supplier (relevant to incoming machines only), not a refurbisher.
// Anything already landed at its destination gym should use that gym as its
// location rather than still reading WBAK HQ / At Pauls.
function migrateRefurbModelItem(item) {
  let next = item;
  if (next.refurbisher === 'In-House (WBAK)' || next.refurbisher === 'Pauls') {
    next = { ...next, refurbisher: '' };
  }
  if (next.currentLocation === 'At Pauls') {
    const landed = GYM_DESTINATIONS.includes(next.destination) ? next.destination : 'WBAK HQ';
    next = { ...next, currentLocation: landed, refurbStage: next.refurbStage === 'Refurb' ? 'Complete' : next.refurbStage };
  }
  if (next.currentLocation === 'WBAK HQ' && next.status === 'In Use' && GYM_DESTINATIONS.includes(next.destination)) {
    next = { ...next, currentLocation: next.destination };
  }
  return next === item ? item : { ...next, updatedAt: Date.now() };
}

// ---------- IMAGE HELPERS ----------

async function resizeImage(file, maxDim = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- FORMATTERS ----------

const gbp = (n) => n ? `£${Number(n).toLocaleString('en-GB')}` : '—';
const fmtDate = (s) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
};
const daysUntil = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return null;
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};
// Whole calendar months between an order date and now, based on its order date.
const monthsOwned = (s) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months < 0) return null;
  return months;
};
// How long we've held a piece of kit, based on its order date.
const timeOwned = (s) => {
  const months = monthsOwned(s);
  if (months === null) return null;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (months < 1) return 'Less than a month';
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (remMonths || !years) parts.push(`${remMonths} mo${remMonths === 1 ? '' : 's'}`);
  return parts.join(' ');
};

// ---------- FUZZY NAME MATCHING ----------
// Tolerant matching for duplicates. Team writes names inconsistently — this catches
// "Cybex VR2 Chest Press" vs "Cybex VR2 CP" or "Nautilus Shoulder" vs "Nautilus Xpload Shoulder Press".
// Strategy: tokenize brand+name, boost matches on brand and body-part/machine-type keywords.

const STOPWORDS = new Set(['the','and','for','with','from','plus','ii','iii','iv','one','a','of','on','at','in']);
const BODY_PART_KEYWORDS = ['chest','shoulder','shoulders','back','leg','legs','arm','arms','tricep','triceps','bicep','biceps','glute','glutes','calf','calves','abdominal','abs','pec','delt','delts','lat','lats','hamstring'];
const MACHINE_TYPE_KEYWORDS = ['press','curl','row','extension','fly','raise','pulldown','pullover','squat','deadlift','hack','crossover','abduction','adduction','abductor','adductor','thrust','dip','ext','sq'];
// Aliases — when the team writes shorthand, expand it
const ALIASES = {
  'ext': 'extension', 'sq': 'squat', 'cp': 'chest press', 'sp': 'shoulder press',
  'lp': 'leg press', 'lr': 'lateral raise', 'lc': 'leg curl', 'pd': 'pulldown',
  'delt': 'shoulder', 'delts': 'shoulder', 'pec': 'chest', 'lat': 'back', 'lats': 'back'
};

function tokenize(str) {
  return str.toLowerCase()
    .replace(/[()\/\-,.]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w))
    .flatMap(w => ALIASES[w] ? [w, ...ALIASES[w].split(' ')] : [w]);
}

function fuzzyScore(a, b) {
  if (!a || !b) return 0;
  const tokensA = new Set(tokenize(`${a.brand || ''} ${a.name || ''}`));
  const tokensB = new Set(tokenize(`${b.brand || ''} ${b.name || ''}`));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const brandA = (a.brand || '').toLowerCase().trim();
  const brandB = (b.brand || '').toLowerCase().trim();
  const brandMatch = brandA && brandA === brandB;

  const bodyPartsA = [...tokensA].filter(t => BODY_PART_KEYWORDS.includes(t));
  const bodyPartsB = [...tokensB].filter(t => BODY_PART_KEYWORDS.includes(t));
  const bodyMatch = bodyPartsA.some(t => bodyPartsB.includes(t));

  const machineA = [...tokensA].filter(t => MACHINE_TYPE_KEYWORDS.includes(t));
  const machineB = [...tokensB].filter(t => MACHINE_TYPE_KEYWORDS.includes(t));
  const machineMatch = machineA.some(t => machineB.includes(t));

  // Base score: Jaccard overlap
  const overlap = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  let score = union > 0 ? overlap / union : 0;

  // Bonuses
  if (brandMatch) score += 0.25;
  if (bodyMatch && machineMatch) score += 0.20;
  else if (bodyMatch || machineMatch) score += 0.08;

  return Math.min(1, score);
}

function findSimilarItems(item, allItems, threshold = 0.55) {
  return allItems
    .filter(other => other.id !== item.id)
    .map(other => ({ item: other, score: fuzzyScore(item, other) }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ---------- APP ----------

export default function App() {
  const [tab, setTab] = useState('overview');
  const [equipment, setEquipment] = useState([]);
  const [sales, setSales] = useState([]);
  const [vanRuns, setVanRuns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showAddRun, setShowAddRun] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  // Global filters
  const [search, setSearch] = useState('');
  const [filterLocations, setFilterLocations] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterBrands, setFilterBrands] = useState([]);
  const [filterNoRef, setFilterNoRef] = useState(false);

  // Load on mount
  useEffect(() => { load(); }, []);

  // Live sync — reflect changes made by other users/devices in real time.
  useEffect(() => {
    if (!window.storage.subscribe) return;
    const unsubs = [
      window.storage.subscribe(K.EQUIP, setEquipment),
      window.storage.subscribe(K.SALES, setSales),
      window.storage.subscribe(K.VANRUNS, setVanRuns)
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  async function load() {
    const [e, s, v, seeded, migratedRefurb, migratedUnityRoster, migratedTdmRef, migratedDuplicates, migratedDuplicatesV2, migratedOrderDates, migratedOrderDatesV2] = await Promise.all([
      loadKey(K.EQUIP, []),
      loadKey(K.SALES, []),
      loadKey(K.VANRUNS, []),
      loadKey(K.SEEDED, false),
      loadKey(K.MIGRATED_REFURB_V1, false),
      loadKey(K.MIGRATED_UNITY_ROSTER_V1, false),
      loadKey(K.MIGRATED_TDMREF_V1, false),
      loadKey(K.MIGRATED_DUPLICATES_V1, false),
      loadKey(K.MIGRATED_DUPLICATES_V2, false),
      loadKey(K.MIGRATED_ORDER_DATES_V1, false),
      loadKey(K.MIGRATED_ORDER_DATES_V2, false)
    ]);
    let eq = e, sl = s, vr = v;
    if (!seeded) {
      eq = SEED_EQUIPMENT; sl = SEED_SALES;
      await saveKey(K.EQUIP, eq); await saveKey(K.SALES, sl);
      await saveKey(K.SEEDED, true);
    }
    if (vr.length === 0) {
      vr = SEED_VAN_RUNS;
      await saveKey(K.VANRUNS, vr);
    }
    if (!migratedRefurb) {
      let changed = 0;
      const migratedEq = eq.map(item => {
        const m = migrateRefurbModelItem(item);
        if (m !== item) changed++;
        return m;
      });
      if (changed > 0) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_REFURB_V1, true);
    }
    if (!migratedUnityRoster) {
      const before = eq.length;
      eq = eq.filter(item => !FABRICATED_UNITY_PLACEHOLDER_IDS.includes(item.id));
      if (eq.length !== before) {
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_UNITY_ROSTER_V1, true);
    }
    if (!migratedTdmRef) {
      // Backfill: mergeSeed() only adds brand-new ids, so a TDM ref assigned
      // (or corrected) in the seed script after an item was already synced to
      // this device's live store never actually reached it. Fill in any live
      // record's missing ref from the current seed, once -- never touches a
      // ref that's already on record, so nothing anyone entered is at risk.
      const seedById = Object.fromEntries(SEED_EQUIPMENT.map(i => [i.id, i]));
      let changed = 0;
      const migratedEq = eq.map(item => {
        if (item.tdmRef) return item;
        const match = seedById[item.id];
        if (match && match.tdmRef) { changed++; return { ...item, tdmRef: match.tdmRef, updatedAt: Date.now() }; }
        return item;
      });
      if (changed > 0) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_TDMREF_V1, true);
    }
    if (!migratedDuplicates) {
      // Liam confirmed a batch of WBAK-tagged "no ref" records were duplicate
      // DB entries for a machine already correctly tracked (usually its
      // TDM-Gym-landed counterpart, which already carries the real ref) --
      // remove them, and correct location/destination on a few others he
      // identified as mis-tagged, since mergeSeed() never removes or
      // corrects an already-synced record on its own.
      const relocations = {
        'cybex-classic-row': { currentLocation: 'TDM Gym', destination: 'TDM Gym' },
        'magnum-leg-ext': { currentLocation: 'TDM Gym', destination: 'TDM Gym' },
        'tdm-flex-classic-incline': { currentLocation: 'WBAK HQ', destination: 'For Sale' },
        'tdm-paramount-rotary-chest': { currentLocation: 'WBAK HQ', destination: 'For Sale' },
        'tdm-cybex-eagle-abdominal': { currentLocation: 'WBAK HQ', destination: 'For Sale' },
        'tdm-concept2-rower': { currentLocation: 'WBAK HQ', destination: 'For Sale' },
        'matrix-plate-trees': { currentLocation: 'WBAK HQ', destination: 'For Sale' }
      };
      const before = eq.length;
      let changed = 0;
      let migratedEq = eq.filter(item => !CONFIRMED_DUPLICATE_IDS.includes(item.id));
      migratedEq = migratedEq.map(item => {
        const r = relocations[item.id];
        if (!r) return item;
        changed++;
        return { ...item, ...r, updatedAt: Date.now() };
      });
      if (migratedEq.length !== before || changed > 0) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_DUPLICATES_V1, true);
    }
    if (!migratedDuplicatesV2) {
      // Second batch of confirmed duplicates found in the full sweep.
      const before = eq.length;
      const migratedEq = eq.filter(item => !CONFIRMED_DUPLICATE_IDS_V2.includes(item.id));
      if (migratedEq.length !== before) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_DUPLICATES_V2, true);
    }
    if (!migratedOrderDates) {
      // Backfill "how long we've owned it": Unity-gym-landed items all get
      // 1 Feb 2026 (Liam's instruction -- individual arrival dates per gym
      // aren't tracked), everything else gets its real order date from the
      // Incoming Equipment log where the ref matches. Only ever fills a
      // blank orderDate, so nothing already on record is at risk.
      let changed = 0;
      const migratedEq = eq.map(item => {
        if (item.orderDate) return item;
        if (UNITY_GYM_LOCATIONS.includes(item.currentLocation)) { changed++; return { ...item, orderDate: '2026-02-01' }; }
        const d = item.tdmRef && ORDER_DATES_BY_REF[item.tdmRef];
        if (d) { changed++; return { ...item, orderDate: d }; }
        return item;
      });
      if (changed > 0) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_ORDER_DATES_V1, true);
    }
    if (!migratedOrderDatesV2) {
      // Remaining items had no real order date to pull from any source doc --
      // Liam asked for these to be randomised instead (TDM Gym across
      // Oct 2025-May 2026, WBAK across Feb 2026-May 2026). Only ever fills a
      // blank orderDate, so nothing already on record is at risk.
      let changed = 0;
      const migratedEq = eq.map(item => {
        if (item.orderDate) return item;
        const d = RANDOM_ORDER_DATES_BY_ID[item.id];
        if (d) { changed++; return { ...item, orderDate: d }; }
        return item;
      });
      if (changed > 0) {
        eq = migratedEq;
        await saveKey(K.EQUIP, eq);
      }
      await saveKey(K.MIGRATED_ORDER_DATES_V2, true);
    }
    setEquipment(eq); setSales(sl); setVanRuns(vr); setLoaded(true);
  }

  async function syncSeed() {
    const mergedEq = await mergeSeed(equipment, SEED_EQUIPMENT);
    const mergedSl = await mergeSeed(sales, SEED_SALES);
    const mergedVr = await mergeSeed(vanRuns, SEED_VAN_RUNS);
    const added = (mergedEq.length - equipment.length) + (mergedSl.length - sales.length) + (mergedVr.length - vanRuns.length);
    setEquipment(mergedEq); setSales(mergedSl); setVanRuns(mergedVr);
    await saveKey(K.EQUIP, mergedEq); await saveKey(K.SALES, mergedSl); await saveKey(K.VANRUNS, mergedVr);
    showToast(added ? `Synced — ${added} new item${added > 1 ? 's' : ''} added` : 'Already up to date');
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function upsertItem(item) {
    const updated = { ...item, updatedAt: Date.now() };
    const next = equipment.some(e => e.id === updated.id)
      ? equipment.map(e => e.id === updated.id ? updated : e)
      : [...equipment, { ...updated, addedAt: Date.now() }];
    setEquipment(next); await saveKey(K.EQUIP, next);
    showToast('Saved');
  }
  async function deleteItem(id) {
    const next = equipment.filter(e => e.id !== id);
    setEquipment(next); await saveKey(K.EQUIP, next);
    await deleteKey(K.IMG(id));
    setSelectedItem(null);
    showToast('Deleted');
  }
  async function upsertSale(s) {
    const updated = { ...s, updatedAt: Date.now() };
    const next = sales.some(x => x.id === updated.id)
      ? sales.map(x => x.id === updated.id ? updated : x)
      : [...sales, { ...updated, addedAt: Date.now() }];
    setSales(next); await saveKey(K.SALES, next);
    showToast('Sale saved');
  }
  async function deleteSale(id) {
    const next = sales.filter(x => x.id !== id);
    setSales(next); await saveKey(K.SALES, next);
    setSelectedSale(null); showToast('Sale deleted');
  }
  async function upsertRun(r) {
    const updated = { ...r, updatedAt: Date.now() };
    const next = vanRuns.some(x => x.id === updated.id)
      ? vanRuns.map(x => x.id === updated.id ? updated : x)
      : [...vanRuns, { ...updated, addedAt: Date.now() }];
    setVanRuns(next); await saveKey(K.VANRUNS, next);
    showToast('Van run saved');
  }
  async function deleteRun(id) {
    const next = vanRuns.filter(x => x.id !== id);
    setVanRuns(next); await saveKey(K.VANRUNS, next);
    setSelectedRun(null); showToast('Van run deleted');
  }

  async function exportAll() {
    const dump = { version: 1, exportedAt: new Date().toISOString(), equipment, sales, vanRuns };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tdm-equipment-hub-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported');
  }
  async function importAll(json) {
    try {
      const data = JSON.parse(json);
      if (data.equipment) { setEquipment(data.equipment); await saveKey(K.EQUIP, data.equipment); }
      if (data.sales) { setSales(data.sales); await saveKey(K.SALES, data.sales); }
      if (data.vanRuns) { setVanRuns(data.vanRuns); await saveKey(K.VANRUNS, data.vanRuns); }
      showToast('Imported');
    } catch (e) { showToast('Import failed — invalid JSON'); }
  }

  // Derived: unique brands (sorted, from actual data)
  const allBrands = useMemo(() => {
    const s = new Set(equipment.map(e => e.brand).filter(Boolean));
    return [...s].sort();
  }, [equipment]);

  // Filter application
  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter(e => {
      if (q && !(`${e.name} ${e.brand} ${e.notes} ${e.seller} ${e.tdmRef}`.toLowerCase().includes(q))) return false;
      if (filterLocations.length && !filterLocations.includes(getLocationBucket(e))) return false;
      if (filterCategories.length && !filterCategories.includes(e.category)) return false;
      if (filterBrands.length && !filterBrands.includes(e.brand)) return false;
      if (filterNoRef && e.tdmRef) return false;
      return true;
    });
  }, [equipment, search, filterLocations, filterCategories, filterBrands, filterNoRef]);

  const hasActiveFilters = filterLocations.length + filterCategories.length + filterBrands.length > 0 || search.length > 0 || filterNoRef;
  const noRefCount = useMemo(() => equipment.filter(e => !e.tdmRef).length, [equipment]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#4C5C4A] flex items-center justify-center text-[#B8C0B1]">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'van', label: 'Van Schedule', icon: Truck },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'purchases', label: 'Purchases', icon: PoundSterling }
  ];

  return (
    <div className="min-h-screen bg-[#4C5C4A] text-[#F5F5F0]" style={{ fontFamily: '"Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#3F4D3E]/95 backdrop-blur border-b border-[#3D4A3B]">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-[#2A362A]">T</div>
            <div>
              <div className="font-semibold tracking-tight text-[15px]">TDM Equipment Hub</div>
              <div className="text-xs text-[#96A093]">Gym Unity · TDM Gym · WBAK</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncSeed} title="Merge new seed items from Claude"
              className="text-xs px-3 py-1.5 rounded-md bg-[#3F4D3E] border border-[#3D4A3B] hover:border-amber-500/50 text-[#DBE0D6] hover:text-amber-400 transition flex items-center gap-1.5">
              <RefreshCw size={12} /> Sync
            </button>
            <button onClick={() => setShowSettings(true)} title="Settings & data"
              className="text-xs px-3 py-1.5 rounded-md bg-[#3F4D3E] border border-[#3D4A3B] hover:border-[#8FA087] text-[#DBE0D6] flex items-center gap-1.5">
              <Settings size={12} /> Data
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-1 overflow-x-auto">
          {tabs.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition ${active ? 'border-amber-500 text-amber-400' : 'border-transparent text-[#B8C0B1] hover:text-[#EAEEE5]'}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {tab === 'overview' && (
          <OverviewTab equipment={equipment} setTab={setTab} />
        )}
        {tab === 'inventory' && (
          <InventoryTab
            equipment={filteredEquipment} totalCount={equipment.length}
            allBrands={allBrands} hasActiveFilters={hasActiveFilters}
            search={search} setSearch={setSearch}
            filterLocations={filterLocations} setFilterLocations={setFilterLocations}
            filterCategories={filterCategories} setFilterCategories={setFilterCategories}
            filterBrands={filterBrands} setFilterBrands={setFilterBrands}
            filterNoRef={filterNoRef} setFilterNoRef={setFilterNoRef} noRefCount={noRefCount}
            onSelect={setSelectedItem} onAdd={() => setShowAddItem(true)} />
        )}
        {tab === 'van' && (
          <VanTab vanRuns={vanRuns}
            onSelect={setSelectedRun} onAdd={() => setShowAddRun(true)} />
        )}
        {tab === 'sales' && (
          <SalesTab sales={sales} onSelect={setSelectedSale} onAdd={() => setShowAddSale(true)} />
        )}
        {tab === 'purchases' && (
          <PurchasesTab equipment={equipment} onSelect={setSelectedItem} />
        )}
      </main>

      {selectedItem && (
        <ItemModal item={selectedItem} allItems={equipment}
          onClose={() => setSelectedItem(null)}
          onSave={upsertItem} onDelete={deleteItem} />
      )}
      {selectedRun && (
        <VanRunModal run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onSave={upsertRun} onDelete={deleteRun} />
      )}
      {selectedSale && (
        <SaleModal sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onSave={upsertSale} onDelete={deleteSale} />
      )}
      {showAddItem && (
        <ItemModal item={null} allItems={equipment}
          onClose={() => setShowAddItem(false)}
          onSave={(x) => { upsertItem(x); setShowAddItem(false); }}
          onDelete={() => {}} />
      )}
      {showAddSale && (
        <SaleModal sale={null}
          onClose={() => setShowAddSale(false)}
          onSave={(x) => { upsertSale(x); setShowAddSale(false); }}
          onDelete={() => {}} />
      )}
      {showAddRun && (
        <VanRunModal run={null}
          onClose={() => setShowAddRun(false)}
          onSave={(x) => { upsertRun(x); setShowAddRun(false); }}
          onDelete={() => {}} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)}
          onExport={exportAll} onImport={importAll} onSync={syncSeed}
          counts={{ equipment: equipment.length, sales: sales.length, vanRuns: vanRuns.length }} />
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#3F4D3E] border border-[#8FA087] px-4 py-2.5 rounded-lg text-sm shadow-xl z-50 flex items-center gap-2">
          <Check size={14} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

// ================ OVERVIEW ================

function OverviewTab({ equipment, setTab }) {
  const stats = useMemo(() => {
    const owned = equipment.filter(e => e.status !== 'Sold');
    const totalValue = owned.reduce((n, e) => n + (e.marketValue || e.cost || 0), 0);

    // Every owned item lands in exactly one bucket, so the breakdown always sums to the total.
    const buckets = {};
    LOCATION_BUCKETS.forEach(b => buckets[b] = { count: 0, value: 0 });
    owned.forEach(e => {
      const b = buckets[getLocationBucket(e)];
      b.count++;
      b.value += e.marketValue || e.cost || 0;
    });

    const breakdown = LOCATION_BUCKETS.map(b => ({
      label: b === 'WBAK' ? 'WBAK (We Buy Any Kit)' : b,
      ...buckets[b]
    }));

    return { totalValue, breakdown };
  }, [equipment]);

  const maxValue = Math.max(...stats.breakdown.map(b => b.value), 1);

  const exportCSV = () => {
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (arr) => arr.map(esc).join(',') + '\r\n';

    const owned = equipment.filter(e => e.status !== 'Sold');
    const byBucket = {};
    LOCATION_BUCKETS.forEach(b => byBucket[b] = []);
    owned.forEach(e => byBucket[getLocationBucket(e)].push(e));

    let csv = row(['Location', 'TDM Ref', 'Name', 'Brand', 'Category', 'Subcategory', 'Cost', 'Market Value', 'Date of Purchase', 'Months Owned', 'Status']);
    LOCATION_BUCKETS.forEach(bucket => {
      const items = byBucket[bucket].slice().sort((a, b) => a.name.localeCompare(b.name));
      const label = bucket === 'WBAK' ? 'WBAK (We Buy Any Kit)' : bucket;
      items.forEach(e => {
        csv += row([label, e.tdmRef || '', e.name, e.brand, e.category, e.subcategory || '', e.cost || 0, e.marketValue || 0, e.orderDate || '', monthsOwned(e.orderDate) ?? '', e.status]);
      });
      const subtotal = items.reduce((n, e) => n + (e.marketValue || e.cost || 0), 0);
      csv += row([`${label} subtotal`, '', '', '', '', '', '', subtotal, '', '', `${items.length} items`]);
      csv += row([]);
    });
    csv += row(['TOTAL', '', '', '', '', '', '', stats.totalValue, '', '', `${owned.length} items`]);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDM Equipment Hub - Valuation - ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">Total Kit Valuation</div>
        <div className="text-5xl font-semibold text-[#F5F5F0]">{gbp(stats.totalValue)}</div>
        <button onClick={exportCSV}
          className="mt-4 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#3F4D3E] border border-[#3D4A3B] hover:border-amber-500/50 text-[#DBE0D6] hover:text-amber-400 transition">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl divide-y divide-[#3D4A3B] overflow-hidden">
        {stats.breakdown.map(b => (
          <button key={b.label} onClick={() => setTab('inventory')}
            className="w-full text-left px-5 py-4 hover:bg-[#4C5C4A]/40 transition">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-sm font-medium text-[#EAEEE5]">{b.label}</div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[#F5F5F0]">{gbp(b.value)}</div>
                <div className="text-[11px] text-[#96A093]">{b.count} item{b.count === 1 ? '' : 's'}</div>
              </div>
            </div>
            <div className="h-1.5 bg-[#4C5C4A] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${(b.value / maxValue) * 100}%` }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ================ INVENTORY ================

function InventoryTab({
  equipment, totalCount, allBrands, hasActiveFilters,
  search, setSearch,
  filterLocations, setFilterLocations,
  filterCategories, setFilterCategories,
  filterBrands, setFilterBrands,
  filterNoRef, setFilterNoRef, noRefCount,
  onSelect, onAdd
}) {
  const [view, setView] = useState('grid');

  const clearAll = () => {
    setSearch(''); setFilterLocations([]); setFilterCategories([]);
    setFilterBrands([]); setFilterNoRef(false);
  };

  return (
    <div className="space-y-4">
      {/* Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96A093]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, brand, seller, TDM ref, notes…"
            className="w-full bg-[#3F4D3E] border border-[#3D4A3B] rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-[#7A867A] focus:border-amber-500/50 focus:outline-none" />
        </div>
        <div className="flex bg-[#3F4D3E] border border-[#3D4A3B] rounded-lg p-0.5">
          <button onClick={() => setView('grid')} className={`px-2.5 py-1.5 rounded text-xs ${view === 'grid' ? 'bg-[#5D6E5C] text-[#F5F5F0]' : 'text-[#96A093]'}`}>Cards</button>
          <button onClick={() => setView('table')} className={`px-2.5 py-1.5 rounded text-xs ${view === 'table' ? 'bg-[#5D6E5C] text-[#F5F5F0]' : 'text-[#96A093]'}`}>Table</button>
        </div>
        <button onClick={onAdd}
          className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-2.5 rounded-lg flex items-center gap-1.5">
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterDropdown label="Location" options={LOCATION_BUCKETS} selected={filterLocations} onChange={setFilterLocations} />
        <FilterDropdown label="Body Part" options={CATEGORIES} selected={filterCategories} onChange={setFilterCategories} />
        <FilterDropdown label="Brand" options={allBrands} selected={filterBrands} onChange={setFilterBrands} scrollable />
        <button onClick={() => setFilterNoRef(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition ${filterNoRef ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-[#3F4D3E] border-[#3D4A3B] text-[#B8C0B1] hover:border-[#8FA087] hover:text-[#EAEEE5]'}`}>
          <AlertCircle size={12} /> No TDM Ref ({noRefCount})
        </button>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-[#B8C0B1] hover:text-amber-400 flex items-center gap-1">
            <X size={11} /> Clear filters
          </button>
        )}
        {hasActiveFilters && (
          <div className="text-xs text-[#96A093] ml-auto">{equipment.length} of {totalCount} items</div>
        )}
      </div>

      {/* Results */}
      {!hasActiveFilters ? (
        <div className="text-center py-20 text-[#96A093]">
          <Filter size={32} className="mx-auto mb-2 opacity-40" />
          <div className="text-sm">Select a location, body part, or brand above to view kit</div>
        </div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-16 text-[#96A093]">
          <Package size={32} className="mx-auto mb-2 opacity-40" />
          <div className="text-sm">No items match those filters</div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {equipment.map(item => <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />)}
        </div>
      ) : (
        <ItemTable items={equipment} onSelect={onSelect} />
      )}
    </div>
  );
}

function FilterDropdown({ label, options, selected, onChange, scrollable }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggle = (opt) => {
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition ${selected.length ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-[#3F4D3E] border-[#3D4A3B] text-[#B8C0B1] hover:border-[#8FA087] hover:text-[#EAEEE5]'}`}>
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-60 bg-[#3F4D3E] border border-[#3D4A3B] rounded-lg p-2 shadow-xl">
          <div className={`flex flex-wrap gap-1.5 ${scrollable ? 'max-h-48 overflow-y-auto' : ''}`}>
            {options.map(opt => {
              const active = selected.includes(opt);
              return (
                <button key={opt} onClick={() => toggle(opt)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-[#4C5C4A] border-[#3D4A3B] text-[#B8C0B1] hover:border-[#8FA087] hover:text-[#EAEEE5]'}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onClick }) {
  const stat = STATUS_COLORS[item.status] || STATUS_COLORS['At HQ'];
  return (
    <button onClick={onClick}
      className="text-left bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-3 hover:border-[#8FA087] transition group">
      <div className="flex items-start justify-between mb-2">
        <div className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${stat.bg} ${stat.text} flex items-center gap-1`}>
          <span className={`w-1 h-1 rounded-full ${stat.dot}`} />
          {item.status}
        </div>
        {item.refurbStage && item.status === 'In Refurb' && (
          <RefurbStageBadge stage={item.refurbStage} />
        )}
        {item.tdmRef ? (
          <span className="text-[10px] font-mono text-[#7A867A]">#{item.tdmRef}</span>
        ) : (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
            <AlertCircle size={9} /> No Ref
          </span>
        )}
      </div>
      <div className="text-sm font-medium text-[#F5F5F0] mb-1 line-clamp-2 group-hover:text-amber-400 transition">{item.name}</div>
      <div className="text-xs text-[#96A093] mb-3">{item.brand}  ·  {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}{item.machineType ? `  ·  ${item.machineType}` : ''}</div>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#3D4A3B]">
        <div className="flex items-center gap-1 text-[#B8C0B1] min-w-0">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{item.currentLocation}</span>
        </div>
        {item.status === 'Incoming' && item.destination && (
          <div className="flex items-center gap-1 text-[#96A093] shrink-0">
            <ArrowRight size={11} />
            <span className="truncate">{item.destination}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function ItemTable({ items, onSelect }) {
  return (
    <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#4C5C4A] border-b border-[#3D4A3B] text-xs uppercase tracking-wider text-[#96A093]">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium">TDM Ref</th>
              <th className="text-left px-3 py-2.5 font-medium">Name</th>
              <th className="text-left px-3 py-2.5 font-medium">Brand</th>
              <th className="text-left px-3 py-2.5 font-medium">Category</th>
              <th className="text-left px-3 py-2.5 font-medium">Type</th>
              <th className="text-left px-3 py-2.5 font-medium">Location</th>
              <th className="text-left px-3 py-2.5 font-medium">→ Going to</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 font-medium">Stage</th>
              <th className="text-left px-3 py-2.5 font-medium">Owned</th>
              <th className="text-right px-3 py-2.5 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const stat = STATUS_COLORS[item.status] || STATUS_COLORS['At HQ'];
              return (
                <tr key={item.id} onClick={() => onSelect(item)}
                  className="border-b border-[#3D4A3B] last:border-b-0 hover:bg-[#5D6E5C]/40 cursor-pointer">
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.tdmRef ? (
                      <span className="text-[#DBE0D6]">#{item.tdmRef}</span>
                    ) : (
                      <span className="uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">No Ref</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#F5F5F0]">{item.name}</td>
                  <td className="px-3 py-2 text-[#DBE0D6]">{item.brand}</td>
                  <td className="px-3 py-2 text-[#B8C0B1] text-xs">{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</td>
                  <td className="px-3 py-2 text-[#B8C0B1] text-xs">{item.machineType || <span className="text-[#7A867A]">—</span>}</td>
                  <td className="px-3 py-2 text-[#DBE0D6]">{item.currentLocation}</td>
                  <td className="px-3 py-2 text-[#B8C0B1]">{item.status === 'Incoming' ? item.destination : <span className="text-[#7A867A]">—</span>}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${stat.bg} ${stat.text}`}>{item.status}</span></td>
                  <td className="px-3 py-2">{item.refurbStage ? <RefurbStageBadge stage={item.refurbStage} /> : <span className="text-[#7A867A]">—</span>}</td>
                  <td className="px-3 py-2 text-[#B8C0B1] text-xs">{timeOwned(item.orderDate) || <span className="text-[#7A867A]">—</span>}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#DBE0D6]">{gbp(item.cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RefurbStageBadge({ stage }) {
  if (!stage) return null;
  const c = REFURB_STAGE_COLORS[stage] || REFURB_STAGE_COLORS['Landed'];
  return <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border whitespace-nowrap`}>{stage}</span>;
}

// ================ ITEM JOURNEY ================
// Every machine's life follows: Arrived at HQ -> (optional) Refurb -> either
// Direct Sale or Keeping at a gym -> outcome. Derived entirely from the item's
// current status/destination/refurbStage — no extra history data needed.

function computeJourney(item) {
  const statusIdx = STATUSES.indexOf(item.status);
  const stateFor = (targetStatus) => {
    const targetIdx = STATUSES.indexOf(targetStatus);
    if (statusIdx > targetIdx) return 'done';
    if (statusIdx === targetIdx) return 'current';
    return 'upcoming';
  };

  const nodes = [];

  nodes.push({
    id: 'arrived',
    label: 'Arrived at HQ',
    icon: 'PackageOpen',
    state: item.status === 'Incoming' ? 'current' : 'done',
    date: item.arrivalDate,
    dateLabel: item.status === 'Incoming' ? 'ETA' : 'Arrived'
  });

  const wentThroughRefurb = !!(item.refurbisher || item.refurbStage || item.status === 'In Refurb');
  if (wentThroughRefurb) {
    nodes.push({
      id: 'refurb',
      label: 'Refurbishment',
      icon: 'Wrench',
      state: stateFor('In Refurb'),
      meta: item.refurbisher,
      date: item.status === 'In Refurb' ? item.returnDate : null,
      dateLabel: 'Due back'
    });
  }

  if (item.destination === 'For Sale') {
    nodes.push({ id: 'for-sale', label: 'Direct Sale', icon: 'ShoppingCart', state: stateFor('Listed for Sale') });
    nodes.push({ id: 'sold', label: 'Sold', icon: 'Check', state: item.status === 'Sold' ? 'current' : 'upcoming' });
  } else if (!item.destination || item.destination === 'Undecided') {
    nodes.push({ id: 'undecided', label: 'Awaiting Decision', icon: 'Clock', state: 'current' });
  } else {
    nodes.push({ id: 'ready', label: 'Ready to Deploy', icon: 'PackageCheck', state: stateFor('Ready to Deploy') });
    nodes.push({ id: 'in-use', label: `In Use — ${item.destination}`, icon: 'Building2', state: item.status === 'In Use' ? 'current' : 'upcoming' });
  }

  return nodes;
}

const JOURNEY_ICONS = { PackageOpen, Wrench, ShoppingCart, Check, PackageCheck, Building2, Clock };

function JourneyDot({ state, icon }) {
  const Icon = JOURNEY_ICONS[icon];
  const cls = state === 'done'
    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
    : state === 'current'
    ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-4 ring-amber-400/15'
    : 'bg-[#3F4D3E] border-[#3D4A3B] text-[#7A867A]';
  return (
    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${cls}`}>
      <Icon size={14} />
    </div>
  );
}

function ItemJourney({ item }) {
  const nodes = useMemo(() => computeJourney(item), [item]);

  return (
    <Section title="Journey">
      <div>
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;
          const labelColor = node.state === 'current' ? 'text-amber-300' : node.state === 'done' ? 'text-[#EAEEE5]' : 'text-[#7A867A]';
          return (
            <div key={node.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <JourneyDot state={node.state} icon={node.icon} />
                {!isLast && <div className={`w-px flex-1 min-h-[20px] ${node.state === 'done' ? 'bg-emerald-500/40' : 'bg-[#3D4A3B]'}`} />}
              </div>
              <div className={isLast ? 'pb-1' : 'pb-5'}>
                <div className={`text-sm font-medium pt-1 ${labelColor}`}>{node.label}</div>
                {(node.date || node.meta) && (
                  <div className="text-xs text-[#96A093] mt-0.5">
                    {node.meta}{node.meta && node.date ? ' · ' : ''}{node.date ? `${node.dateLabel}: ${fmtDate(node.date)}` : ''}
                  </div>
                )}
                {node.id === 'refurb' && node.state === 'current' && (
                  <div className="flex items-center gap-1 mt-2 w-48">
                    {REFURB_STAGES.map(stage => {
                      const passed = REFURB_STAGES.indexOf(stage) <= REFURB_STAGES.indexOf(item.refurbStage);
                      return <div key={stage} title={stage} className={`flex-1 h-1.5 rounded-full ${passed ? 'bg-orange-400' : 'bg-[#3D4A3B]'}`} />;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ================ VAN SCHEDULE ================

function VanTab({ vanRuns, onSelect, onAdd }) {
  const sortedRuns = useMemo(() =>
    [...vanRuns].sort((a, b) => new Date(a.date) - new Date(b.date)), [vanRuns]);

  const now = new Date(); now.setHours(0,0,0,0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Van Schedule</div>
          <div className="text-xs text-[#96A093] mt-0.5">{sortedRuns.length} jobs · synced from Notion</div>
        </div>
        <button onClick={onAdd} className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-2.5 rounded-lg flex items-center gap-1.5">
          <Plus size={14} /> Add Job
        </button>
      </div>

      {sortedRuns.length === 0 ? (
        <div className="text-center py-16 text-[#96A093]">
          <Truck size={32} className="mx-auto mb-2 opacity-40" />
          <div className="text-sm">No van runs scheduled yet</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRuns.map(run => {
            const dt = new Date(run.date);
            const isPast = dt < now;
            return (
              <div key={run.id} onClick={() => onSelect(run)}
                className={`bg-[#3F4D3E] border rounded-xl p-4 cursor-pointer hover:border-[#8FA087] transition ${isPast ? 'border-[#3D4A3B]/50 opacity-60' : 'border-[#3D4A3B]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#4C5C4A] border border-[#3D4A3B] flex flex-col items-center justify-center shrink-0">
                      <div className="text-[10px] uppercase text-[#96A093]">{dt.toLocaleDateString('en-GB', { month: 'short' })}</div>
                      <div className="text-lg font-semibold leading-tight">{dt.getDate()}</div>
                    </div>
                    <div>
                      <div className="font-medium text-[#F5F5F0]">{run.job}</div>
                      <div className="text-xs text-[#96A093] mt-0.5">{dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    </div>
                  </div>
                  {run.people.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                      {run.people.map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[#4C5C4A] border border-[#3D4A3B] text-[#DBE0D6] whitespace-nowrap">{p}</span>
                      ))}
                    </div>
                  )}
                </div>

                {run.equipment && (
                  <div className="text-xs text-[#B8C0B1] whitespace-pre-line pl-3 border-l border-[#3D4A3B]">{run.equipment}</div>
                )}
                {run.notes && <div className="text-xs text-[#7A867A] mt-2 italic">{run.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================ SALES ================

function SalesTab({ sales, onSelect, onAdd }) {
  const sortedSales = useMemo(() =>
    [...sales].sort((a, b) => new Date(b.saleDate || b.addedAt) - new Date(a.saleDate || a.addedAt)), [sales]);

  const totalRevenue = sales.reduce((n, s) => n + (s.price || 0), 0);
  const totalProfit = sales.reduce((n, s) => n + (s.profit || 0), 0);
  const unpaid = sales.filter(s => !s.paid);
  const unfulfilled = sales.filter(s => s.paid && !s.fulfilled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Sales</div>
          <div className="text-xs text-[#96A093] mt-0.5">{sales.length} sales logged</div>
        </div>
        <button onClick={onAdd} className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-2.5 rounded-lg flex items-center gap-1.5">
          <Plus size={14} /> Log Sale
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-4">
          <div className="text-[11px] uppercase text-[#96A093] mb-1">Revenue</div>
          <div className="text-xl font-semibold font-mono">{gbp(totalRevenue)}</div>
        </div>
        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-4">
          <div className="text-[11px] uppercase text-[#96A093] mb-1">Profit</div>
          <div className="text-xl font-semibold font-mono text-emerald-400">{gbp(totalProfit)}</div>
        </div>
        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-4">
          <div className="text-[11px] uppercase text-[#96A093] mb-1">Unpaid</div>
          <div className="text-xl font-semibold font-mono text-amber-400">{unpaid.length}</div>
        </div>
        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-4">
          <div className="text-[11px] uppercase text-[#96A093] mb-1">Paid, not fulfilled</div>
          <div className="text-xl font-semibold font-mono text-orange-400">{unfulfilled.length}</div>
        </div>
      </div>

      {sortedSales.length === 0 ? (
        <div className="text-center py-16 text-[#96A093]">
          <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
          <div className="text-sm">No sales logged yet</div>
        </div>
      ) : (
        <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#4C5C4A] border-b border-[#3D4A3B] text-xs uppercase tracking-wider text-[#96A093]">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Item</th>
                  <th className="text-left px-3 py-2.5 font-medium">Buyer</th>
                  <th className="text-left px-3 py-2.5 font-medium">Date</th>
                  <th className="text-right px-3 py-2.5 font-medium">Price</th>
                  <th className="text-right px-3 py-2.5 font-medium">Profit</th>
                  <th className="text-center px-3 py-2.5 font-medium">Paid</th>
                  <th className="text-center px-3 py-2.5 font-medium">Fulfilled</th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.map(s => (
                  <tr key={s.id} onClick={() => onSelect(s)}
                    className="border-b border-[#3D4A3B] last:border-b-0 hover:bg-[#5D6E5C]/40 cursor-pointer">
                    <td className="px-3 py-2 text-[#F5F5F0] max-w-md truncate">{s.itemName}</td>
                    <td className="px-3 py-2 text-[#DBE0D6]">{s.buyer}</td>
                    <td className="px-3 py-2 text-[#B8C0B1] text-xs">{fmtDate(s.saleDate)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#F5F5F0]">{gbp(s.price)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{gbp(s.profit)}</td>
                    <td className="px-3 py-2 text-center">
                      {s.paid ? <Check size={13} className="inline text-emerald-400" /> : <span className="text-[#7A867A]">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.fulfilled ? <Check size={13} className="inline text-emerald-400" /> : <span className="text-[#7A867A]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ================ PURCHASES ================

function PurchasesTab({ equipment, onSelect }) {
  // group by seller
  const grouped = useMemo(() => {
    const g = {};
    equipment.forEach(e => {
      const key = e.seller || 'Unknown';
      if (!g[key]) g[key] = [];
      g[key].push(e);
    });
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [equipment]);

  const totalSpend = equipment.reduce((n, e) => n + (e.cost || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Purchase History</div>
        <div className="text-xs text-[#96A093] mt-0.5">{equipment.length} items across {grouped.length} sources · total spend {gbp(totalSpend)}</div>
      </div>

      <div className="space-y-3">
        {grouped.map(([seller, items]) => {
          const spend = items.reduce((n, e) => n + (e.cost || 0), 0);
          return (
            <details key={seller} className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl group" open={items.length < 15}>
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-[#5D6E5C]/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-[#96A093] group-open:rotate-90 transition" />
                  <span className="font-medium text-[#F5F5F0]">{seller}</span>
                  <span className="text-xs text-[#96A093]">· {items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-xs font-mono text-[#B8C0B1]">{gbp(spend)}</div>
              </summary>
              <div className="border-t border-[#3D4A3B]">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} onClick={() => onSelect(item)}
                        className="border-b border-[#3F4D3E] last:border-b-0 hover:bg-[#5D6E5C]/40 cursor-pointer">
                        <td className="px-4 py-2 text-[#F5F5F0]">{item.name}</td>
                        <td className="px-3 py-2 text-[#96A093] text-xs">{item.destination}</td>
                        <td className="px-3 py-2 text-right font-mono text-[#DBE0D6]">{gbp(item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ================ ITEM MODAL ================

function ItemModal({ item, allItems, onClose, onSave, onDelete }) {
  const isNew = !item;
  const [form, setForm] = useState(item || {
    id: '', name: '', brand: '', category: 'Chest', subcategory: '',
    cost: 0, marketValue: 0, currentLocation: 'WBAK HQ', destination: 'Undecided',
    status: 'At HQ', refurbStage: '', refurbisher: '',
    deliveryDate: '', returnDate: '', arrivalDate: '', orderDate: '',
    seller: '', notes: ''
  });
  const [images, setImages] = useState({});
  const [uploading, setUploading] = useState('');
  const [dismissedDupes, setDismissedDupes] = useState(false);
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (!isNew) loadKey(K.IMG(item.id), {}).then(setImages);
  }, [item, isNew]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Fuzzy duplicate detection — only for new items with enough content to check
  const similarItems = useMemo(() => {
    if (!isNew || !form.name || !form.brand || form.name.length < 3) return [];
    return findSimilarItems(form, allItems, 0.55);
  }, [isNew, form.name, form.brand, form.category, allItems]);

  const handleSave = () => {
    let toSave = { ...form };
    if (isNew) {
      toSave.id = form.id || mkId(`${form.brand}-${form.name}-${Date.now()}`);
    }
    if (!toSave.name || !toSave.brand) return alert('Name and Brand are required');
    onSave(toSave);
    onClose();
  };

  const handleImage = async (stageKey, file) => {
    if (!file) return;
    setUploading(stageKey);
    try {
      const b64 = await resizeImage(file, 1200, 0.75);
      const next = { ...images, [stageKey]: b64 };
      await saveKey(K.IMG(form.id || item.id), next);
      setImages(next);
    } catch (e) { alert('Image upload failed: ' + e.message); }
    setUploading('');
  };

  const removeImage = async (stageKey) => {
    const next = { ...images };
    delete next[stageKey];
    await saveKey(K.IMG(form.id || item.id), next);
    setImages(next);
  };

  return (
    <Modal onClose={onClose} title={isNew ? 'Add Item' : form.name} width="max-w-4xl">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center gap-2 justify-end">
          <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-1.5 rounded flex items-center gap-1.5">
            <Save size={13} /> Save
          </button>
          {!isNew && (
            <button onClick={() => { if (confirm('Delete this item permanently?')) onDelete(item.id); }}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 flex items-center gap-1.5">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        {!isNew && <ItemJourney item={form} />}

        {/* Basic fields */}
        <Section title="Basics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={v => update('name', v)} />
            <Field label="Brand" value={form.brand} onChange={v => update('brand', v)} />
            <Field type="select" label="Body Part" value={form.category} onChange={v => { update('category', v); update('subcategory', ''); }} options={CATEGORIES} />
            <Field type="select" label="Sub-category" value={form.subcategory} onChange={v => update('subcategory', v)} options={SUBCATEGORIES[form.category] || []} allowEmpty />
            <Field type="select" label="Machine Type" value={form.machineType} onChange={v => update('machineType', v)} options={MACHINE_TYPES} allowEmpty />
            <Field label="TDM Ref" value={form.tdmRef} onChange={v => update('tdmRef', v)} />
            <Field type="number" label="Cost (£)" value={form.cost} onChange={v => update('cost', Number(v))} />
            <Field type="number" label="Market Value (£)" value={form.marketValue} onChange={v => update('marketValue', Number(v))} />
            <Field label="Seller / Source" value={form.seller} onChange={v => update('seller', v)} />
          </div>

          {/* Duplicate warning — only shows on new items with matching existing entries */}
          {similarItems.length > 0 && !dismissedDupes && (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/40 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-amber-300 font-medium">Possible duplicate{similarItems.length > 1 ? 's' : ''}</div>
                  <div className="text-xs text-[#B8C0B1] mt-0.5">These existing items look similar. Sometimes the team writes names differently — check before adding.</div>
                </div>
                <button onClick={() => setDismissedDupes(true)} className="text-[#96A093] hover:text-[#F5F5F0]">
                  <X size={13} />
                </button>
              </div>
              <div className="space-y-1 mt-2">
                {similarItems.map(({ item: sim, score }) => (
                  <div key={sim.id} className="flex items-center justify-between text-xs bg-[#3F4D3E] rounded px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="text-[#F5F5F0] truncate">{sim.name}</div>
                      <div className="text-[#96A093] text-[10px]">{sim.brand} · {sim.currentLocation} · {sim.status}</div>
                    </div>
                    <div className="text-amber-400 font-mono text-[10px] whitespace-nowrap ml-2">{Math.round(score*100)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Location / status */}
        <Section title="Location & Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field type="select" label="Current Location" value={form.currentLocation} onChange={v => update('currentLocation', v)} options={LOCATIONS} />
            <Field type="select" label="Going To" value={form.destination} onChange={v => update('destination', v)} options={DESTINATIONS} />
            <Field type="select" label="Status" value={form.status} onChange={v => update('status', v)} options={STATUSES} />
            <Field type="date" label="Original Arrival Date" value={form.arrivalDate} onChange={v => update('arrivalDate', v)} />
            <Field type="date" label="Order Date" value={form.orderDate} onChange={v => update('orderDate', v)} />
          </div>
          {timeOwned(form.orderDate) && (
            <div className="mt-3 text-xs text-[#96A093]">
              Owned for <span className="text-[#EAEEE5] font-medium">{timeOwned(form.orderDate)}</span> (since {fmtDate(form.orderDate)})
            </div>
          )}
        </Section>

        {/* Refurb workflow */}
        {form.status === 'In Refurb' && (
          <Section title="Refurb Workflow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <Field type="select" label="Refurbisher" value={form.refurbisher} onChange={v => update('refurbisher', v)} options={REFURBISHERS} />
              <Field type="select" label="Current Stage" value={form.refurbStage} onChange={v => update('refurbStage', v)} options={REFURB_STAGES} />
              <Field type="date" label="Delivered To Refurbisher" value={form.deliveryDate} onChange={v => update('deliveryDate', v)} />
              <Field type="date" label="Expected Back" value={form.returnDate} onChange={v => update('returnDate', v)} />
            </div>

            {/* Stage progress bar */}
            <div className="mb-4">
              <div className="text-xs text-[#96A093] mb-2">Progress</div>
              <div className="flex items-center gap-1">
                {REFURB_STAGES.map((s, idx) => {
                  const currentIdx = REFURB_STAGES.indexOf(form.refurbStage);
                  const done = idx <= currentIdx;
                  const c = REFURB_STAGE_COLORS[s];
                  return (
                    <button key={s} onClick={() => update('refurbStage', s)}
                      className={`flex-1 py-1.5 rounded text-[10px] uppercase tracking-wider transition ${done ? `${c.bg} ${c.text} ${c.border} border` : 'bg-[#3F4D3E] border border-[#3D4A3B] text-[#7A867A]'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photos per stage */}
            <div>
              <div className="text-xs text-[#96A093] mb-2">Photos per stage</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REFURB_STAGES.map(stage => {
                  const stageKey = stage.toLowerCase().replace(/\s+/g, '_');
                  const img = images[stageKey];
                  return (
                    <div key={stage} className="bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg overflow-hidden">
                      <div className="px-2.5 py-1.5 text-[11px] uppercase text-[#B8C0B1] border-b border-[#3D4A3B] flex items-center justify-between">
                        {stage}
                        {img && (
                          <button onClick={() => removeImage(stageKey)} className="text-[#96A093] hover:text-red-400">
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      {img ? (
                        <div className="aspect-video bg-[#4C5C4A] flex items-center justify-center overflow-hidden">
                          <img src={img} alt={stage} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <label className="aspect-video flex flex-col items-center justify-center text-[#7A867A] cursor-pointer hover:text-[#B8C0B1] hover:bg-[#3F4D3E]/50 transition">
                          {uploading === stageKey ? (
                            <div className="text-xs animate-pulse">Uploading…</div>
                          ) : (
                            <>
                              <Camera size={18} />
                              <div className="text-[10px] mt-1">Add photo</div>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e => handleImage(stageKey, e.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-[#7A867A] mt-2">Photos are resized to ~1200px and stored locally. Max ~5MB per stage.</div>
            </div>
          </Section>
        )}

        <Section title="Notes">
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-amber-500/50"
            placeholder="Refurb requirements, condition notes, buyer preferences…" />
        </Section>
      </div>
    </Modal>
  );
}

// ================ SALE MODAL ================

function SaleModal({ sale, onClose, onSave, onDelete }) {
  const isNew = !sale;
  const [form, setForm] = useState(sale || {
    id: `sale-${Date.now()}`, itemName: '', buyer: '', buyerContact: '',
    saleDate: '', price: 0, cost: 0, profit: 0, deposit: 0,
    paid: false, fulfilled: false, channel: 'direct',
    deliveryAddress: '', notes: ''
  });

  const update = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'price' || k === 'cost') next.profit = (next.price || 0) - (next.cost || 0);
    return next;
  });

  const handleSave = () => {
    if (!form.itemName || !form.buyer) return alert('Item name and buyer are required');
    onSave(form); onClose();
  };

  return (
    <Modal onClose={onClose} title={isNew ? 'Log Sale' : form.itemName} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-1.5 rounded flex items-center gap-1.5">
            <Save size={13} /> Save
          </button>
          {!isNew && (
            <button onClick={() => { if (confirm('Delete this sale?')) onDelete(sale.id); }}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 flex items-center gap-1.5">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Item(s) Sold" value={form.itemName} onChange={v => update('itemName', v)} />
          <Field label="Buyer" value={form.buyer} onChange={v => update('buyer', v)} />
          <Field label="Buyer Contact" value={form.buyerContact} onChange={v => update('buyerContact', v)} />
          <Field type="date" label="Sale Date" value={form.saleDate} onChange={v => update('saleDate', v)} />
          <Field type="number" label="Sale Price (£)" value={form.price} onChange={v => update('price', Number(v))} />
          <Field type="number" label="Our Cost (£)" value={form.cost} onChange={v => update('cost', Number(v))} />
          <Field type="number" label="Profit (£)" value={form.profit} onChange={v => update('profit', Number(v))} />
          <Field type="number" label="Deposit Received (£)" value={form.deposit} onChange={v => update('deposit', Number(v))} />
          <Field type="select" label="Channel" value={form.channel} onChange={v => update('channel', v)}
            options={['regulars', 'ebay', 'facebook', 'direct']} />
          <Field label="Delivery Address" value={form.deliveryAddress} onChange={v => update('deliveryAddress', v)} />
        </div>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.paid} onChange={e => update('paid', e.target.checked)}
              className="w-4 h-4 accent-amber-500" />
            <span>Paid in full</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.fulfilled} onChange={e => update('fulfilled', e.target.checked)}
              className="w-4 h-4 accent-amber-500" />
            <span>Fulfilled / delivered</span>
          </label>
        </div>

        <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
          className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-amber-500/50"
          placeholder="Notes…" />
      </div>
    </Modal>
  );
}

// ================ VAN RUN MODAL ================

function VanRunModal({ run, onClose, onSave, onDelete }) {
  const isNew = !run;
  const [form, setForm] = useState(run || {
    id: `van-${Date.now()}`, job: '', date: '',
    people: [], equipment: '', notes: '', status: 'scheduled'
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (p) => update('people', form.people.includes(p) ? form.people.filter(x => x !== p) : [...form.people, p]);

  const handleSave = () => {
    if (!form.job || !form.date) return alert('Job and date are required');
    onSave(form); onClose();
  };

  return (
    <Modal onClose={onClose} title={isNew ? 'Add Job' : form.job} width="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-1.5 rounded flex items-center gap-1.5">
            <Save size={13} /> Save
          </button>
          {!isNew && (
            <button onClick={() => { if (confirm('Delete this job?')) onDelete(run.id); }}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 flex items-center gap-1.5">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Job" value={form.job} onChange={v => update('job', v)} />
          <Field type="date" label="Date" value={form.date} onChange={v => update('date', v)} />
        </div>

        <div>
          <div className="text-[11px] text-[#96A093] mb-1.5">People</div>
          <div className="flex flex-wrap gap-1.5">
            {PEOPLE.map(p => {
              const active = form.people.includes(p);
              return (
                <button key={p} onClick={() => togglePerson(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-[#4C5C4A] border-[#3D4A3B] text-[#B8C0B1] hover:border-[#8FA087]'}`}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <div className="text-[11px] text-[#96A093] mb-1">Equipment</div>
          <textarea value={form.equipment} onChange={e => update('equipment', e.target.value)}
            className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:border-amber-500/50"
            placeholder="One item per line…" />
        </label>

        <Field label="Notes" value={form.notes} onChange={v => update('notes', v)} />
      </div>
    </Modal>
  );
}

// ================ SETTINGS MODAL ================

function SettingsModal({ onClose, onExport, onImport, onSync, counts }) {
  const [importing, setImporting] = useState('');

  return (
    <Modal onClose={onClose} title="Data & Settings" width="max-w-2xl">
      <div className="space-y-6">
        <Section title="Storage">
          <div className="text-sm text-[#B8C0B1] space-y-1 mb-3">
            <div>{counts.equipment} equipment items · {counts.sales} sales · {counts.vanRuns} van runs</div>
            <div className="text-xs text-[#96A093]">Data stored locally in this browser only (personal scope). No one else can see it.</div>
          </div>
        </Section>

        <Section title="Backup & Restore">
          <div className="flex gap-2">
            <button onClick={onExport}
              className="flex-1 bg-[#3F4D3E] border border-[#3D4A3B] hover:border-[#8FA087] rounded-lg px-3 py-2.5 text-sm flex items-center justify-center gap-2">
              <Download size={14} /> Export JSON
            </button>
            <label className="flex-1 bg-[#3F4D3E] border border-[#3D4A3B] hover:border-[#8FA087] rounded-lg px-3 py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return;
                setImporting('...');
                const txt = await file.text();
                onImport(txt);
                setImporting('');
              }} />
            </label>
          </div>
          <div className="text-[11px] text-[#96A093] mt-2">Import replaces everything currently in the dashboard. Export first if you want a backup.</div>
        </Section>

        <Section title="Sync with Claude's latest seed">
          <button onClick={onSync}
            className="bg-[#3F4D3E] border border-[#3D4A3B] hover:border-amber-500/50 rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 text-[#DBE0D6] hover:text-amber-400">
            <Sparkles size={14} /> Pull new items from latest seed
          </button>
          <div className="text-[11px] text-[#96A093] mt-2">When Claude ships an updated version of this dashboard with new items, this button will add any missing items without touching your edits.</div>
        </Section>

        <Section title="How to use">
          <div className="text-xs text-[#B8C0B1] space-y-2">
            <p><strong className="text-[#EAEEE5]">Inventory tab:</strong> master list with stackable filters. Combine any of Location + Body Part + Brand + Status + Going-to.</p>
            <p><strong className="text-[#EAEEE5]">Refurb tab:</strong> Kanban board by stage or refurbisher. Click any card to update stage + upload photos per stage.</p>
            <p><strong className="text-[#EAEEE5]">Van Schedule:</strong> chronological view of Luton runs. Link items to pickups/dropoffs so the driver knows what to move.</p>
            <p><strong className="text-[#EAEEE5]">Sales:</strong> log completed sales with buyer info, paid/fulfilled flags, and profit tracking.</p>
            <p><strong className="text-[#EAEEE5]">Purchases:</strong> grouped by seller — see who you've spent what with.</p>
          </div>
        </Section>
      </div>
    </Modal>
  );
}

// ================ SHARED PRIMITIVES ================

function Modal({ children, onClose, title, width = 'max-w-2xl' }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-[#4C5C4A] border border-[#3D4A3B] rounded-xl w-full ${width} my-8 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#3F4D3E]/95 backdrop-blur border-b border-[#3D4A3B] px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-medium text-[#F5F5F0] truncate pr-4">{title}</div>
          <button onClick={onClose} className="text-[#96A093] hover:text-[#EAEEE5]"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#96A093] mb-3">{title}</div>
      {children}
    </div>
  );
}

function Field({ type = 'text', label, value, onChange, options, allowEmpty }) {
  return (
    <label className="block">
      <div className="text-[11px] text-[#96A093] mb-1">{label}</div>
      {type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50">
          {allowEmpty && <option value="">—</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
          className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50" />
      )}
    </label>
  );
}
