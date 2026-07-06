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

const LOCATIONS = [
  'WBAK HQ', 'At Craigs', 'At Nytram', 'At Pauls', 'At JP', 'Other Refurbisher',
  'TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth',
  'Incoming (with seller)', 'For Sale', 'Sold', 'Undecided'
];

const REFURBISHERS = ['In-House (WBAK)', 'Craigs', 'Nytram', 'Pauls', 'JP', 'Legend', 'Other'];

const DESTINATIONS = [
  'TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth',
  'For Sale', 'Undecided'
];

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
  SEEDED: 'seeded:v1'
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

const SEED_EQUIPMENT_BASE = [
  // ===== WBAK REFURB PIPELINE — CHEST PRESSES =====
  { id: 'naut-2st-vert-chest', name: 'Nautilus 2ST Vertical Chest Press', brand: 'Nautilus', category: 'Chest', subcategory: 'Presses', cost: 1000, marketValue: 2750, seller: 'Manassas, VA', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-xpload-incline', name: 'Nautilus Xpload Incline Press', brand: 'Nautilus', category: 'Chest', subcategory: 'Presses', cost: 5000, marketValue: 7000, seller: 'Greenville, SC', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-1stgen-bench-iii', name: 'Nautilus 1st Gen Bench Press III', brand: 'Nautilus', category: 'Chest', subcategory: 'Presses', cost: 1200, marketValue: 2000, seller: 'Belmont, NC', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'megamass-lev-incline', name: 'Megamass Leverage Incline Press', brand: 'Megamass', category: 'Chest', subcategory: 'Presses', cost: 2995, marketValue: 4500, seller: 'Belfast', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'magnum-biangular-chest', name: 'Magnum Biangular Chest', brand: 'Magnum', category: 'Chest', subcategory: 'Presses', cost: 1500, marketValue: 2250, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Metal plate needed both sides top of stack tower + green globe on stack casing' },
  { id: 'magnum-biangular-upper-chest', name: 'Magnum Biangular Upper Chest', brand: 'Magnum', category: 'Chest', subcategory: 'Presses', cost: 1700, marketValue: 2000, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'atlantis-converging-incline', name: 'Atlantis Converging Incline Press', brand: 'Atlantis', category: 'Chest', subcategory: 'Presses', cost: 4700, marketValue: 5000, seller: 'Laval, Quebec', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'icarian-incline-bench', name: 'Icarian Incline Bench Press', brand: 'Icarian', category: 'Chest', subcategory: 'Presses', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Needs Icarian stickers (NOT Precor)' },

  // ===== PEC DECS =====
  { id: 'flex-deltoid-fly', name: 'Flex Fitness Deltoid Fly', brand: 'Flex Fitness', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 2500, marketValue: 3000, seller: 'Baltimore, MD', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-17', destination: 'TDM Gym' },
  { id: 'paramount-pec-fly-ap3400', name: 'Paramount Pec Fly Rear Delt AP3400', brand: 'Paramount', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 1700, marketValue: 2000, currentLocation: 'At JP', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'JP', returnDate: '2026-07-09', destination: 'TDM Gym' },
  { id: 'naut-1stgen-10-fly', name: 'Nautilus 1st Gen 10 Degree Fly', brand: 'Nautilus', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 3300, marketValue: 5000, seller: 'Indiana, IN', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'arsenal-reloaded-incline-fly', name: 'Arsenal Reloaded Incline Fly', brand: 'Arsenal', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 3300, marketValue: 4000, seller: 'Knoxville, TN', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'naut-nitro-pec-fly-rear-delt', name: 'Nautilus Nitro Pec Fly / Rear Delt', brand: 'Nautilus', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 2000, marketValue: 2700, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale', notes: 'Make a rear plate' },
  { id: 'bodymasters-pec-fly-rear-delt', name: 'Bodymasters Pec Fly / Rear Delt', brand: 'Bodymasters', category: 'Chest', subcategory: 'Pec Decs / Flies', cost: 1200, marketValue: 3200, seller: 'Morelia', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'cybex-galileo-chest-press', name: 'Cybex Galileo Chest Press', brand: 'Cybex', category: 'Chest', subcategory: 'Presses', cost: 1000, marketValue: 2000, currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Deliver to JP then back to us 20/7' },

  // ===== SHOULDER PRESSES =====
  { id: 'naut-2st-shoulder-press', name: 'Nautilus 2ST Shoulder Press', brand: 'Nautilus', category: 'Shoulders', subcategory: 'Presses', cost: 1500, marketValue: 2500, seller: 'Moxee, WA', currentLocation: 'At Nytram', status: 'In Refurb', refurbStage: 'Refurb', refurbisher: 'Nytram', returnDate: '2026-07-10', destination: 'For Sale' },
  { id: 'gymleco-shoulder-030', name: 'Gymleco Shoulder Press 030', brand: 'Gymleco', category: 'Shoulders', subcategory: 'Presses', cost: 3450, marketValue: 3450, seller: 'Eskilstuna', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'flex-leverage-shoulder', name: 'Flex Fitness Leverage Shoulder Press', brand: 'Flex Fitness', category: 'Shoulders', subcategory: 'Presses', cost: 4000, marketValue: 4500, seller: 'Moncton', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'atlantis-converging-shoulder', name: 'Atlantis Converging Shoulder Press', brand: 'Atlantis', category: 'Shoulders', subcategory: 'Presses', cost: 4700, marketValue: 5000, seller: 'Laval, Quebec', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },

  // ===== LATERAL RAISES =====
  { id: 'megamass-chain-lateral', name: 'Megamass Chain Driven Lateral Raise', brand: 'Megamass', category: 'Shoulders', subcategory: 'Laterals', cost: 2995, marketValue: 3700, seller: 'Dezhou', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'flex-deltoid-raise', name: 'Flex Fitness Deltoid Raise', brand: 'Flex Fitness', category: 'Shoulders', subcategory: 'Laterals', cost: 2900, marketValue: 3500, seller: 'Florence', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'Unity Lichfield' },
  { id: 'bodymasters-321-lateral', name: 'Bodymasters 321 Lateral Raise', brand: 'Bodymasters', category: 'Shoulders', subcategory: 'Laterals', cost: 2500, marketValue: 3500, seller: 'Johnston, RI', currentLocation: 'At Pauls', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Pauls', deliveryDate: '2026-07-10', returnDate: '2026-07-24', destination: 'TDM Gym' },
  { id: 'cybex-eagle-lateral', name: 'Cybex Classic Eagle Lateral Raise', brand: 'Cybex', category: 'Shoulders', subcategory: 'Laterals', cost: 2200, marketValue: 3500, seller: 'Longview, TX', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'arsenal-standing-lateral', name: 'Arsenal Standing Lateral Raise', brand: 'Arsenal', category: 'Shoulders', subcategory: 'Laterals', cost: 3300, marketValue: 4250, seller: 'Santa Ana, CA', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-17', destination: 'TDM Gym' },
  { id: 'strive-lateral-raise', name: 'Strive Lateral Raise', brand: 'Strive', category: 'Shoulders', subcategory: 'Laterals', cost: 3000, marketValue: 4000, seller: 'Guadalajara', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'lf-pro1-lateral', name: 'Life Fitness Pro 1 Lateral Raise', brand: 'Life Fitness', category: 'Shoulders', subcategory: 'Laterals', cost: 1300, marketValue: 1500, seller: 'Southampton', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale', notes: 'Make a stack casing' },

  // ===== PULLDOWNS =====
  { id: 'precor-pulldown', name: 'Precor Pulldown', brand: 'Precor', category: 'Back', subcategory: 'Pulldowns', cost: 0, marketValue: 750, seller: 'Lichfield', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'hd-xpload-pulldown', name: 'HD (Xpload) Pulldown', brand: 'HD', category: 'Back', subcategory: 'Pulldowns', cost: 1800, marketValue: 2200, seller: 'Stockport', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'strive-pl-pulldown', name: 'Strive PL Pulldown', brand: 'Strive', category: 'Back', subcategory: 'Pulldowns', cost: 5500, marketValue: 7500, seller: 'Winnipeg', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'paramount-rotary-pulldown', name: 'Paramount Rotary Pulldown', brand: 'Paramount', category: 'Back', subcategory: 'Pulldowns', cost: 2100, marketValue: 2500, seller: 'Mount Vernon, WA', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'granite-lev-pulldown', name: 'Granite Leverage Pulldown 2.0', brand: 'Granite', category: 'Back', subcategory: 'Pulldowns', cost: 0, currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Deliver to JP then back 24/7. Custom sticker where Flex Leverage would normally go' },
  { id: 'hoist-star-pulldown', name: 'Hoist Star Pulldown', brand: 'Hoist', category: 'Back', subcategory: 'Pulldowns', cost: 0, marketValue: 1500, seller: 'Redditch', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale', notes: 'Remake info plate both sides + period-correct Hoist logo' },
  { id: 'cybex-vr2-pulldown', name: 'Cybex VR2 Pulldown', brand: 'Cybex', category: 'Back', subcategory: 'Pulldowns', cost: 2000, marketValue: 3500, seller: 'Redgranite, WI', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'cybex-eagle-incline-pull', name: 'Cybex Eagle Incline Pull', brand: 'Cybex', category: 'Back', subcategory: 'Pulldowns', cost: 1000, marketValue: 1500, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== ROWS =====
  { id: 'megamass-tbar-linear-row', name: 'Megamass T Bar Linear Row', brand: 'Megamass', category: 'Back', subcategory: 'Rows', cost: 2995, marketValue: 4000, seller: 'Belfast', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'megamass-45-iso-row-pro', name: 'Megamass 45 Degree Iso Linear Row Pro', brand: 'Megamass', category: 'Back', subcategory: 'Rows', cost: 4195, marketValue: 5500, seller: 'Belfast', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'cybex-classic-row', name: 'Cybex Classic Row (VR2)', brand: 'Cybex', category: 'Back', subcategory: 'Rows', cost: 770, marketValue: 3500, seller: 'Jackson, MS', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'flex-lev-row', name: 'Flex Fitness Leverage Row', brand: 'Flex Fitness', category: 'Back', subcategory: 'Rows', currentLocation: 'Incoming (with seller)', status: 'Incoming', destination: 'TDM Gym', arrivalDate: '2026-07-23', notes: 'ETA 23rd July. Deliver to Craig 24/7' },
  { id: 'flex-dorsiflexor', name: 'Flex Fitness Dorsiflexor', brand: 'Flex Fitness', category: 'Back', subcategory: 'Rows', cost: 2850, marketValue: 3250, seller: 'Durango', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'panatta-fantastic-row', name: 'Panatta Fantastic Chain-Driven Row', brand: 'Panatta', category: 'Back', subcategory: 'Rows', cost: 500, marketValue: 1200, seller: 'Leeds', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'hd-magnum-biangular-row', name: 'HD (Magnum) Biangular Row', brand: 'HD', category: 'Back', subcategory: 'Rows', cost: 1650, marketValue: 2000, seller: 'Stockport', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'bodymasters-tbar-row', name: 'Bodymasters T Bar Row', brand: 'Bodymasters', category: 'Back', subcategory: 'Rows', cost: 2500, marketValue: 3000, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'strive-pl-extreme-row', name: 'Strive PL Extreme Row', brand: 'Strive', category: 'Back', subcategory: 'Rows', cost: 3000, marketValue: 6000, seller: 'Wroclaw', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'prime-pl-seated-row', name: 'Prime PL Seated Row', brand: 'Prime', category: 'Back', subcategory: 'Rows', cost: 1900, marketValue: 3500, seller: 'Franklin, PA', currentLocation: 'Incoming (with seller)', status: 'Incoming', destination: 'TDM Gym', arrivalDate: '2026-07-23' },
  { id: 'hs-iso-row', name: 'Hammer Strength Iso Row', brand: 'Hammer Strength', category: 'Back', subcategory: 'Rows', cost: 1600, marketValue: 1800, seller: 'Magnolia, TX', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== BACK OTHER =====
  { id: 'booty-back-ext', name: 'Booty Builder Back Extension', brand: 'Booty Builder', category: 'Back', subcategory: 'Back Ext', cost: 4025, marketValue: 4500, seller: 'London', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: '3D gel text logo + info plate' },
  { id: 'naut-nitro-back-ext', name: 'Nautilus Nitro Back Extension', brand: 'Nautilus', category: 'Back', subcategory: 'Back Ext', cost: 550, marketValue: 550, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-super-pullover-ii', name: 'Nautilus Super Pullover II', brand: 'Nautilus', category: 'Back', subcategory: 'Pullover', cost: 3250, marketValue: 5000, seller: 'Reynoldsville, PA', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'naut-nitro-pullover', name: 'Nautilus Nitro Pullover', brand: 'Nautilus', category: 'Back', subcategory: 'Pullover', cost: 2000, marketValue: 3500, seller: 'Laredo, TX', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'hs-pullover', name: 'Hammer Strength Pullover', brand: 'Hammer Strength', category: 'Back', subcategory: 'Pullover', cost: 1600, marketValue: 1800, seller: 'Harrogate', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== LEG COMPOUNDS =====
  { id: 'cybex-v1-leg-press', name: 'Cybex V1 Leg Press', brand: 'Cybex', category: 'Legs', subcategory: 'Compounds', cost: 4200, marketValue: 6000, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'cybex-v1-squat-press', name: 'Cybex V1 Squat Press', brand: 'Cybex', category: 'Legs', subcategory: 'Compounds', cost: 6000, marketValue: 7000, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale', notes: 'Big sticker both sides as on Cybex leg press' },
  { id: 'cybex-v1-hack', name: 'Cybex V1 Hack Squat', brand: 'Cybex', category: 'Legs', subcategory: 'Compounds', cost: 6200, marketValue: 11000, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'nebula-45-proto', name: 'Nebula 45 Degree Prototype', brand: 'Nebula', category: 'Legs', subcategory: 'Compounds', cost: 3000, marketValue: 7500, seller: 'Oregon, OH', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'nebula-defiant-35', name: 'Nebula Defiant 35 Degree', brand: 'Nebula', category: 'Legs', subcategory: 'Compounds', cost: 4500, marketValue: 5500, seller: 'Wrexham', currentLocation: 'At Pauls', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Pauls', destination: 'TDM Gym' },
  { id: 'nebula-vertical-lp', name: 'Nebula Vertical Leg Press', brand: 'Nebula', category: 'Legs', subcategory: 'Compounds', cost: 4500, marketValue: 6000, seller: 'Caldwell, ID', currentLocation: 'At Pauls', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Pauls', deliveryDate: '2026-07-10', returnDate: '2026-07-24', destination: 'TDM Gym' },
  { id: 'magnum-hip-press', name: 'Magnum Hip Press', brand: 'Magnum', category: 'Legs', subcategory: 'Glutes / Hips', cost: 1500, marketValue: 3000, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'randy-coyle-swingsquat', name: 'Randy Coyle Swingsquat', brand: 'Randy Coyle', category: 'Legs', subcategory: 'Compounds', cost: 7000, marketValue: 10000, currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'powernetics-supercat', name: 'Powernetics Supercat Bear Squat', brand: 'Powernetics', category: 'Legs', subcategory: 'Compounds', cost: 2000, marketValue: 3000, seller: 'Manchester, RI', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'bodymasters-hack-squat', name: 'Bodymasters Hack Squat', brand: 'Bodymasters', category: 'Legs', subcategory: 'Compounds', cost: 2950, marketValue: 4000, seller: 'Caldwell, ID', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'atlantis-precision-lp', name: 'Atlantis Precision Leg Press', brand: 'Atlantis', category: 'Legs', subcategory: 'Compounds', cost: 3500, marketValue: 4000, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'atlantis-pendulum-squat', name: 'Atlantis Pendulum Squat', brand: 'Atlantis', category: 'Legs', subcategory: 'Compounds', cost: 7100, marketValue: 8000, seller: 'Laval, Quebec', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'flex-thighsolator', name: 'Flex Fitness Thighsolator', brand: 'Flex Fitness', category: 'Legs', subcategory: 'Adductors', cost: 3000, marketValue: 3750, seller: 'Detroit, MI', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'icarian-lying-lp', name: 'Icarian Lying Leg Press', brand: 'Icarian', category: 'Legs', subcategory: 'Compounds', cost: 1500, marketValue: 2500, seller: 'Albuquerque, NM', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'tru-squat', name: 'Tru Squat', brand: 'Tru Squat', category: 'Legs', subcategory: 'Compounds', cost: 6000, marketValue: 7000, seller: 'Wheeling, IL', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym', notes: 'Tru Squat vertical sticker on front' },

  // ===== LEG CURLS =====
  { id: 'flex-hamtractor', name: 'Flex Fitness Hamtractor', brand: 'Flex Fitness', category: 'Legs', subcategory: 'Leg Curls', cost: 7000, marketValue: 15000, seller: 'Laredo, TX', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'bodymasters-cx109-lying-curl', name: 'Bodymasters CX109 Super Lying Leg Curl', brand: 'Bodymasters', category: 'Legs', subcategory: 'Leg Curls', seller: 'Tucson, AZ', currentLocation: 'At JP', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'JP', returnDate: '2026-07-15', destination: 'TDM Gym' },
  { id: 'cybex-kneeling-lc', name: 'Cybex Kneeling Leg Curl', brand: 'Cybex', category: 'Legs', subcategory: 'Leg Curls', cost: 2800, marketValue: 3500, seller: 'Denver, CO', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'strive-smart-prone-lc', name: 'Strive Smart Strength Prone Leg Curl', brand: 'Strive', category: 'Legs', subcategory: 'Leg Curls', cost: 3100, marketValue: 3600, seller: 'Walsall', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'hoist-rocit-lc', name: 'Hoist Roc-It Leg Curl', brand: 'Hoist', category: 'Legs', subcategory: 'Leg Curls', cost: 1900, marketValue: 2250, seller: 'Rochester, MN', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'atlantis-precision-lying-lc', name: 'Atlantis Precision Lying Leg Curl', brand: 'Atlantis', category: 'Legs', subcategory: 'Leg Curls', cost: 2000, marketValue: 2000, seller: 'Boise, ID', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'atlantis-precision-seated-lc', name: 'Atlantis Precision Seated Leg Curl', brand: 'Atlantis', category: 'Legs', subcategory: 'Leg Curls', cost: 2000, marketValue: 2000, seller: 'Boise, ID', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== LEG EXTENSIONS =====
  { id: 'prime-pl-leg-ext', name: 'Prime PL Leg Extension', brand: 'Prime', category: 'Legs', subcategory: 'Leg Extensions', cost: 3800, marketValue: 4500, seller: 'Franklin, PA', currentLocation: 'Incoming (with seller)', status: 'Incoming', destination: 'TDM Gym', arrivalDate: '2026-07-23' },
  { id: 'magnum-leg-ext', name: 'Magnum Leg Extension', brand: 'Magnum', category: 'Legs', subcategory: 'Leg Extensions', currentLocation: 'At JP', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'JP', returnDate: '2026-07-15', destination: 'TDM Gym' },
  { id: 'bodymasters-cx109-leg-ext', name: 'Bodymasters CX109 Super Leg Extension', brand: 'Bodymasters', category: 'Legs', subcategory: 'Leg Extensions', seller: 'Tucson, AZ', currentLocation: 'At JP', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'JP', returnDate: '2026-07-09', destination: 'TDM Gym' },
  { id: 'flex-leg-ext', name: 'Flex Fitness Leg Extension', brand: 'Flex Fitness', category: 'Legs', subcategory: 'Leg Extensions', cost: 3400, marketValue: 4500, seller: 'Tokyo', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'cybex-vr-leg-ext', name: 'Cybex VR Leg Extension', brand: 'Cybex', category: 'Legs', subcategory: 'Leg Extensions', cost: 750, marketValue: 2000, seller: 'Oxford', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'strive-smart-leg-ext', name: 'Strive Smart Strength Leg Extension', brand: 'Strive', category: 'Legs', subcategory: 'Leg Extensions', cost: 3100, marketValue: 3600, seller: 'Walsall', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== LEG OTHER =====
  { id: 'naut-nitro-ab-ad', name: 'Nautilus Nitro Ab/Adductor', brand: 'Nautilus', category: 'Legs', subcategory: 'Adductors', cost: 2000, marketValue: 2250, seller: 'Tucson, AZ', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'flex-classic-adductor', name: 'Flex Fitness Classic Adductor', brand: 'Flex Fitness', category: 'Legs', subcategory: 'Adductors', currentLocation: 'At JP', status: 'In Refurb', refurbStage: 'Refurb', refurbisher: 'JP', returnDate: '2026-06-03', destination: 'Undecided' },
  { id: 'granite-glutinator', name: 'Granite Glutinator', brand: 'Granite', category: 'Legs', subcategory: 'Glutes / Hips', cost: 0, currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Deliver to JP then back 24/7' },
  { id: 'prime-hybrid-inner-thigh', name: 'Prime Hybrid Inner Thigh', brand: 'Prime', category: 'Legs', subcategory: 'Adductors', cost: 4500, marketValue: 6000, seller: 'Franklin, PA', currentLocation: 'Incoming (with seller)', status: 'Incoming', destination: 'TDM Gym', arrivalDate: '2026-07-23' },
  { id: 'booty-v8-hip-thrust', name: 'Booty Builder V8 Hip Thrust', brand: 'Booty Builder', category: 'Legs', subcategory: 'Glutes / Hips', cost: 4435, marketValue: 5500, seller: 'London', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: '3D gel text logo + BB sticker + info plate' },
  { id: 'naut-glute-drive', name: 'Nautilus Glute Drive', brand: 'Nautilus', category: 'Legs', subcategory: 'Glutes / Hips', cost: 2300, marketValue: 3500, seller: 'Leicester', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'cybex-vr2-rotary-calf', name: 'Cybex VR2 Rotary Calf', brand: 'Cybex', category: 'Legs', subcategory: 'Calves', cost: 1700, marketValue: 2000, seller: 'Lincoln, NE', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'bodymasters-standing-calf', name: 'Bodymasters Standing Calf', brand: 'Bodymasters', category: 'Legs', subcategory: 'Calves', cost: 1500, marketValue: 2000, seller: 'Portland, OR', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== TRICEPS =====
  { id: 'bodymasters-overhead-tri', name: 'Bodymasters Overhead Tricep', brand: 'Bodymasters', category: 'Arms', subcategory: 'Triceps', cost: 3000, marketValue: 4000, seller: 'Madison, WI', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'paramount-fw500-tri-ext', name: 'Paramount FW500 Tricep Extension', brand: 'Paramount', category: 'Arms', subcategory: 'Triceps', cost: 3200, marketValue: 4000, seller: 'Edmonton', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-17', destination: 'TDM Gym' },
  { id: 'arsenal-overhead-tri', name: 'Arsenal Overhead Tricep', brand: 'Arsenal', category: 'Arms', subcategory: 'Triceps', cost: 5700, marketValue: 6000, seller: 'Knoxville, TN', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'strive-tri-ext', name: 'Strive Tricep Extension', brand: 'Strive', category: 'Arms', subcategory: 'Triceps', cost: 2700, marketValue: 3500, seller: 'Conway, AK', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'flex-dip-machine', name: 'Flex Fitness Dip Machine', brand: 'Flex Fitness', category: 'Arms', subcategory: 'Triceps', cost: 2500, marketValue: 3000, seller: 'Cheyenne, WY', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-17', destination: 'TDM Gym' },
  { id: 'naut-1stgen-tri-ext', name: 'Nautilus 1st Gen Tricep Extension', brand: 'Nautilus', category: 'Arms', subcategory: 'Triceps', currentLocation: 'At Pauls', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Pauls', deliveryDate: '2026-07-17', returnDate: '2026-07-24', destination: 'TDM Gym' },
  { id: 'naut-nitro-sa-tri', name: 'Nautilus Nitro SA Tricep Extension', brand: 'Nautilus', category: 'Arms', subcategory: 'Triceps', cost: 1100, marketValue: 2000, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== BICEPS =====
  { id: 'naut-nitro-sa-bicep', name: 'Nautilus Nitro SA Bicep Curl', brand: 'Nautilus', category: 'Arms', subcategory: 'Biceps', cost: 2000, marketValue: 2250, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-1stgen-bicep', name: 'Nautilus 1st Gen Bicep Curl', brand: 'Nautilus', category: 'Arms', subcategory: 'Biceps', cost: 3000, marketValue: 5000, seller: 'Indiana, PA', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'hoist-rocit-cable-curl', name: 'Hoist Roc-It Cable Curl', brand: 'Hoist', category: 'Arms', subcategory: 'Biceps', cost: 1800, marketValue: 2400, seller: 'Birmingham, AL', currentLocation: 'At Nytram', status: 'In Refurb', refurbStage: 'Refurb', refurbisher: 'Nytram', returnDate: '2026-07-10', destination: 'For Sale' },
  { id: 'flex-bisolator', name: 'Flex Fitness Bisolator', brand: 'Flex Fitness', category: 'Arms', subcategory: 'Biceps', cost: 4000, marketValue: 6500, seller: 'Tokyo', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'strive-pl-preacher', name: 'Strive PL Preacher Curl', brand: 'Strive', category: 'Arms', subcategory: 'Biceps', cost: 2700, marketValue: 3750, seller: 'Salt Lake City, UT', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'magnum-bicep-curl', name: 'Magnum Bicep Curl', brand: 'Magnum', category: 'Arms', subcategory: 'Biceps', cost: 1500, marketValue: 2000, seller: 'Bellevue, IL', currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },
  { id: 'bodymasters-selectorised-bicep', name: 'Bodymasters Selectorised Bicep Curl', brand: 'Bodymasters', category: 'Arms', subcategory: 'Biceps', cost: 1400, marketValue: 2000, seller: 'Brooklyn, NY', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },

  // ===== POWERLIFTING =====
  { id: 'ss-riot-combo-rack', name: 'Strength Shop Riot Combo Rack', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Racks', cost: 885, marketValue: 885, seller: 'Glasgow', currentLocation: 'WBAK HQ', status: 'Ready to Deploy', destination: 'TDM Gym' },
  { id: 'ss-comp-bench-a', name: 'Strength Shop Competition Bench Press A', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Benches', cost: 600, marketValue: 600, seller: 'Glasgow', currentLocation: 'At Nytram', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Nytram', destination: 'TDM Gym' },
  { id: 'ss-comp-bench-b', name: 'Strength Shop Competition Bench Press B', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Benches', cost: 600, marketValue: 600, seller: 'Glasgow', currentLocation: 'At Craigs', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Craigs', returnDate: '2026-07-10', destination: 'TDM Gym' },
  { id: 'ss-deadlift-platform', name: 'Strength Shop Deadlift Platform', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Platforms', cost: 400, marketValue: 250, seller: 'Glasgow', currentLocation: 'WBAK HQ', status: 'Ready to Deploy', destination: 'TDM Gym' },
  { id: 'elite-fts-monolift', name: 'Elite FTS Monolift', brand: 'Elite FTS', category: 'Powerlifting', subcategory: 'Racks', cost: 4000, marketValue: 4000, seller: 'Somerset', currentLocation: 'WBAK HQ', status: 'Ready to Deploy', destination: 'TDM Gym' },

  // ===== OTHER EQUIPMENT (Refurb) =====
  { id: 'lf-cable-crossover', name: 'Life Fitness Older Cable Crossover', brand: 'Life Fitness', category: 'Other', subcategory: 'Other', cost: 575, marketValue: 2600, currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'lf-mj8-jungle', name: 'Life Fitness MJ8 Jungle Gym', brand: 'Life Fitness', category: 'Other', subcategory: 'Other', cost: 7500, marketValue: 8000, seller: 'Redditch', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'cybex-bravo', name: 'Cybex Bravo', brand: 'Cybex', category: 'Other', subcategory: 'Other', cost: 5500, marketValue: 5500, seller: 'Bristol', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'cybex-v1-smith', name: 'Cybex V1 Smith Machine', brand: 'Cybex', category: 'Powerlifting', subcategory: 'Racks', currentLocation: 'At Pauls', status: 'In Use', refurbStage: 'Refurb', refurbisher: 'Pauls', deliveryDate: '2026-07-17', returnDate: '2026-07-24', destination: 'TDM Gym' },
  { id: 'cybex-v2-smith', name: 'Cybex V2 Smith Machine', brand: 'Cybex', category: 'Powerlifting', subcategory: 'Racks', cost: 2200, marketValue: 3000, seller: 'Bristol', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-smith', name: 'Nautilus Smith Machine', brand: 'Nautilus', category: 'Powerlifting', subcategory: 'Racks', cost: 1900, marketValue: 2250, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'naut-nitro-ab-crunch', name: 'Nautilus Nitro Ab Crunch', brand: 'Nautilus', category: 'Other', subcategory: 'Other', cost: 1200, marketValue: 1200, seller: 'Wrexham', currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'For Sale' },
  { id: 'atlantis-ab-crunch', name: 'Atlantis Ab Crunch', brand: 'Atlantis', category: 'Other', subcategory: 'Other', cost: 2250, currentLocation: 'WBAK HQ', status: 'In Use', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym' },

  // ===== TDM GYM — PERMANENT (IN USE) =====
  { id: 'tdm-flex-classic-incline', name: 'Flex Fitness Classic Incline Press', brand: 'Flex Fitness', category: 'Chest', subcategory: 'Presses', cost: 3000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Bought from Paul, paid in cash' },
  { id: 'tdm-paramount-rotary-chest', name: 'Paramount Rotary Chest Press', brand: 'Paramount', category: 'Chest', subcategory: 'Presses', cost: 1550, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Bought from Gainz, paid in cash' },
  { id: 'tdm-flex-deltoid-raise-black', name: 'Flex Fitness Deltoid Raise (black)', brand: 'Flex Fitness', category: 'Shoulders', subcategory: 'Laterals', cost: 2900, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Bought from Paul, paid via transfer' },
  { id: 'tdm-bull-strong-belt-squat', name: 'Bull Strong Belt Squat', brand: 'Bull Strong', category: 'Legs', subcategory: 'Compounds', cost: 0, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Acquired from Bull Strong, no fee' },
  { id: 'tdm-rogue-platform', name: 'Rogue Deadlift Platform + 12 Mats', brand: 'Rogue', category: 'Powerlifting', subcategory: 'Platforms', cost: 1100, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'tdm-lf-preacher-curl', name: 'Life Fitness Preacher Curl', brand: 'Life Fitness', category: 'Arms', subcategory: 'Biceps', cost: 1140, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'tdm-naut-nitro-v-tri', name: 'Nautilus Nitro V-Triceps Extension', brand: 'Nautilus', category: 'Arms', subcategory: 'Triceps', cost: 1700, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Bought from Paul, paid in cash' },
  { id: 'tdm-cybex-classic-lateral', name: 'Cybex Classic Lateral Raise', brand: 'Cybex', category: 'Shoulders', subcategory: 'Laterals', cost: 2200, marketValue: 3000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', arrivalDate: '2026-06-05', seller: 'George' },
  { id: 'tdm-cybex-eagle-abdominal', name: 'Cybex Eagle Abdominal', brand: 'Cybex', category: 'Other', subcategory: 'Other', currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'tdm-atlantis-p443-incline', name: 'Atlantis P443 Power Series Converging Incline', brand: 'Atlantis', category: 'Chest', subcategory: 'Presses', cost: 4750, marketValue: 5000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', arrivalDate: '2025-09-01', seller: 'George' },
  { id: 'tdm-atlantis-e449-shoulder', name: 'Atlantis E449 Power Series Converging Shoulder', brand: 'Atlantis', category: 'Shoulders', subcategory: 'Presses', cost: 4750, marketValue: 5000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', arrivalDate: '2025-09-01', seller: 'George' },
  { id: 'tdm-atlantis-c212-pendulum', name: 'Atlantis C212 Power Series Pendulum Squat', brand: 'Atlantis', category: 'Legs', subcategory: 'Compounds', cost: 7000, marketValue: 7500, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', arrivalDate: '2025-09-01', seller: 'George' },
  { id: 'tdm-sportkraft-deadlift-bar', name: 'Sportkraft Deadlifter Bar', brand: 'Sportkraft', category: 'Powerlifting', subcategory: 'Bars', cost: 371, marketValue: 300, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', seller: 'Kalle Rasenen' },
  { id: 'tdm-aoa-deadlift-bar', name: 'AOA Deadlift Bar (British 2019)', brand: 'AOA', category: 'Powerlifting', subcategory: 'Bars', cost: 150, marketValue: 250, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', seller: 'Dan Davies' },
  { id: 'tdm-texas-deadlift-bar', name: 'Texas Deadlift Bar', brand: 'Texas', category: 'Powerlifting', subcategory: 'Bars', cost: 491, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'tdm-concept2-rower', name: 'Concept 2 Rower', brand: 'Concept 2', category: 'Cardio', subcategory: 'Rower', cost: 800, marketValue: 1000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', seller: 'Kirk', arrivalDate: '2026-06-10' },
  { id: 'tdm-lf-powermill', name: 'Life Fitness Powermill Climber', brand: 'Life Fitness', category: 'Cardio', subcategory: 'Stair', cost: 2160, marketValue: 3000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', arrivalDate: '2026-06-05', seller: 'Elahi' },

  // ===== UNITY GYMS =====
  { id: 'unity-lich-flex-deltoid', name: 'Flex Fitness Deltoid Raise (white/blue)', brand: 'Flex Fitness', category: 'Shoulders', subcategory: 'Laterals', cost: 2850, marketValue: 3500, currentLocation: 'Unity Lichfield', status: 'In Use', destination: 'Unity Lichfield', arrivalDate: '2026-04-06' },
  { id: 'unity-burton-cybex-vr2-lc', name: 'Cybex VR2 Leg Curl', brand: 'Cybex', category: 'Legs', subcategory: 'Leg Curls', cost: 750, marketValue: 1400, currentLocation: 'Unity Burton', status: 'In Use', destination: 'Unity Burton', arrivalDate: '2026-04-10', seller: 'Andrew' },
  { id: 'unity-fradley-magnum-mid-row', name: 'Magnum Mid Row', brand: 'Magnum', category: 'Back', subcategory: 'Rows', cost: 1220, marketValue: 2200, currentLocation: 'Unity Fradley', status: 'In Use', destination: 'Unity Fradley' },
  { id: 'unity-tam-precor-donkey-calf', name: 'Precor Icarian Donkey Calf', brand: 'Precor', category: 'Legs', subcategory: 'Calves', cost: 2950, marketValue: 4000, currentLocation: 'Unity Tamworth', status: 'In Use', destination: 'Unity Tamworth', arrivalDate: '2026-04-27' },
  { id: 'unity-tam-cybex-vr2-cp', name: 'Cybex VR2 Chest Press', brand: 'Cybex', category: 'Chest', subcategory: 'Presses', cost: 770, marketValue: 1500, currentLocation: 'Unity Tamworth', status: 'In Use', destination: 'Unity Tamworth', arrivalDate: '2026-01-27' },
  { id: 'unity-lich-cybex-v1-squat', name: 'Cybex V1 Squat Press (Unity)', brand: 'Cybex', category: 'Legs', subcategory: 'Compounds', cost: 3700, marketValue: 6375, currentLocation: 'Unity Lichfield', status: 'In Use', destination: 'Unity Lichfield', arrivalDate: '2026-02-23' },
  { id: 'unity-burton-flex-incline', name: 'Flex Fitness Incline Press', brand: 'Flex Fitness', category: 'Chest', subcategory: 'Presses', cost: 3000, currentLocation: 'Unity Burton', status: 'In Use', destination: 'Unity Burton' },
  { id: 'unity-tam-booty-back-ext', name: 'Booty Builder Back Extension (Tam)', brand: 'Booty Builder', category: 'Back', subcategory: 'Back Ext', cost: 3353, marketValue: 4000, currentLocation: 'Unity Tamworth', status: 'In Use', destination: 'Unity Tamworth', arrivalDate: '2026-04-01' },
  { id: 'unity-burton-booty-v8', name: 'Booty Builder V8 (Burton)', brand: 'Booty Builder', category: 'Legs', subcategory: 'Glutes / Hips', cost: 3698, marketValue: 5000, currentLocation: 'Unity Burton', status: 'In Use', destination: 'Unity Burton', arrivalDate: '2026-04-01' },

  // ===== TDM GYM JULY 2026 AUDIT — NEW ITEMS (no prior record) =====
  { id: 'medx-leg-ext', name: 'MedX Leg Extension', brand: 'MedX', category: 'Legs', subcategory: 'Leg Extensions', cost: 0, currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Remake all stickers in theme' },
  { id: 'cybex-galileo-leg-ext', name: 'Cybex Galileo Leg Extension', brand: 'Cybex', category: 'Legs', subcategory: 'Leg Extensions', cost: 0, currentLocation: 'WBAK HQ', status: 'In Refurb', refurbStage: 'Landed', refurbisher: 'In-House (WBAK)', destination: 'TDM Gym', notes: 'Cybex sticker on stack casing & remake info sticker' },
  { id: 'ss-thor-cage-3', name: 'Strength Shop Thor Cage 3', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Racks', cost: 0, marketValue: 250, seller: 'Glasgow', currentLocation: 'WBAK HQ', status: 'Ready to Deploy', destination: 'TDM Gym' },
  { id: 'ss-deadlift-platform-2', name: 'Strength Shop Deadlift Platform', brand: 'Strength Shop', category: 'Powerlifting', subcategory: 'Platforms', cost: 400, marketValue: 250, seller: 'Glasgow', currentLocation: 'TDM Gym', status: 'Ready to Deploy', destination: 'TDM Gym' },
  { id: 'cybex-treadmill-1', name: 'Cybex Treadmill', brand: 'Cybex', category: 'Cardio', subcategory: 'Treadmill', cost: 850, marketValue: 1000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'cybex-treadmill-2', name: 'Cybex Treadmill', brand: 'Cybex', category: 'Cardio', subcategory: 'Treadmill', cost: 850, marketValue: 1000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'cybex-treadmill-3', name: 'Cybex Treadmill', brand: 'Cybex', category: 'Cardio', subcategory: 'Treadmill', cost: 850, marketValue: 1000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'cybex-treadmill-4', name: 'Cybex Treadmill', brand: 'Cybex', category: 'Cardio', subcategory: 'Treadmill', cost: 850, marketValue: 1000, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'matrix-plate-trees', name: 'Matrix Plate Trees', brand: 'Matrix', category: 'Accessories', subcategory: 'Storage', cost: 80, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym', notes: 'Qty: 3' },
  { id: 'icarian-ghr', name: 'Icarian GHR', brand: 'Icarian', category: 'Legs', subcategory: 'Glutes / Hips', cost: 250, marketValue: 500, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'jordan-ghr', name: 'Jordan GHR', brand: 'Jordan', category: 'Legs', subcategory: 'Glutes / Hips', cost: 250, marketValue: 250, currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' },
  { id: 'ss-ghr', name: 'Strength Shop GHR', brand: 'Strength Shop', category: 'Legs', subcategory: 'Glutes / Hips', cost: 467, marketValue: 467, seller: 'Glasgow', currentLocation: 'TDM Gym', status: 'In Use', destination: 'TDM Gym' }
];

// Items whose only existing record is destined elsewhere (For Sale / a Unity
// gym / Undecided) but which the July 2026 TDM Gym equipment audit also
// lists — per that audit, these are a second physical unit destined for
// TDM Gym, not the same piece, so we clone rather than reassign.
const TDM_SECOND_INSTANCE_IDS = [
  'naut-2st-vert-chest', 'naut-xpload-incline', 'magnum-biangular-upper-chest',
  'naut-nitro-pec-fly-rear-delt', 'bodymasters-pec-fly-rear-delt',
  'naut-2st-shoulder-press', 'flex-deltoid-raise', 'strive-lateral-raise', 'lf-pro1-lateral',
  'precor-pulldown', 'hd-xpload-pulldown', 'paramount-rotary-pulldown', 'hoist-star-pulldown', 'cybex-eagle-incline-pull',
  'cybex-classic-row', 'panatta-fantastic-row', 'hd-magnum-biangular-row', 'hs-iso-row',
  'naut-nitro-back-ext', 'naut-nitro-pullover', 'hs-pullover',
  'cybex-v1-leg-press', 'cybex-v1-squat-press', 'cybex-v1-hack', 'atlantis-precision-lp', 'icarian-lying-lp',
  'strive-smart-prone-lc', 'hoist-rocit-lc', 'atlantis-precision-lying-lc', 'atlantis-precision-seated-lc',
  'cybex-vr-leg-ext', 'strive-smart-leg-ext',
  'naut-nitro-ab-ad', 'flex-classic-adductor', 'naut-glute-drive', 'cybex-vr2-rotary-calf', 'bodymasters-standing-calf',
  'bodymasters-overhead-tri', 'naut-nitro-sa-tri',
  'naut-nitro-sa-bicep', 'hoist-rocit-cable-curl', 'flex-bisolator', 'strive-pl-preacher', 'bodymasters-selectorised-bicep',
  'lf-cable-crossover', 'lf-mj8-jungle', 'cybex-bravo', 'cybex-v2-smith', 'naut-smith', 'naut-nitro-ab-crunch'
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
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterDestinations, setFilterDestinations] = useState([]);

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
    const [e, s, v, seeded] = await Promise.all([
      loadKey(K.EQUIP, []),
      loadKey(K.SALES, []),
      loadKey(K.VANRUNS, []),
      loadKey(K.SEEDED, false)
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
      if (q && !(`${e.name} ${e.brand} ${e.notes} ${e.seller}`.toLowerCase().includes(q))) return false;
      if (filterLocations.length && !filterLocations.includes(e.currentLocation)) return false;
      if (filterCategories.length && !filterCategories.includes(e.category)) return false;
      if (filterBrands.length && !filterBrands.includes(e.brand)) return false;
      if (filterStatuses.length && !filterStatuses.includes(e.status)) return false;
      if (filterDestinations.length && !filterDestinations.includes(e.destination)) return false;
      return true;
    });
  }, [equipment, search, filterLocations, filterCategories, filterBrands, filterStatuses, filterDestinations]);

  const hasActiveFilters = filterLocations.length + filterCategories.length + filterBrands.length + filterStatuses.length + filterDestinations.length > 0 || search.length > 0;

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
    { id: 'refurb', label: 'Refurb', icon: Wrench },
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
          <OverviewTab equipment={equipment} sales={sales} vanRuns={vanRuns} setTab={setTab}
            onSelectItem={setSelectedItem} onSelectRun={setSelectedRun} />
        )}
        {tab === 'inventory' && (
          <InventoryTab
            equipment={filteredEquipment} totalCount={equipment.length}
            allBrands={allBrands} hasActiveFilters={hasActiveFilters}
            search={search} setSearch={setSearch}
            filterLocations={filterLocations} setFilterLocations={setFilterLocations}
            filterCategories={filterCategories} setFilterCategories={setFilterCategories}
            filterBrands={filterBrands} setFilterBrands={setFilterBrands}
            filterStatuses={filterStatuses} setFilterStatuses={setFilterStatuses}
            filterDestinations={filterDestinations} setFilterDestinations={setFilterDestinations}
            onSelect={setSelectedItem} onAdd={() => setShowAddItem(true)} />
        )}
        {tab === 'refurb' && (
          <RefurbTab equipment={equipment} onSelect={setSelectedItem} />
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

function OverviewTab({ equipment, sales, vanRuns, setTab, onSelectItem, onSelectRun }) {
  const stats = useMemo(() => {
    const inRefurb = equipment.filter(isInRefurbWorkflow);
    const incoming = equipment.filter(e => e.status === 'Incoming');
    const inUse = equipment.filter(e => e.status === 'In Use');
    const forSale = equipment.filter(e => e.status === 'Listed for Sale' || (e.status === 'In Refurb' && e.destination === 'For Sale'));

    // per gym counts
    const byGym = {};
    ['TDM Gym', 'Unity Lichfield', 'Unity Fradley', 'Unity Burton', 'Unity Tamworth'].forEach(g => {
      byGym[g] = equipment.filter(e => e.currentLocation === g).length;
    });

    // refurb stages breakdown
    const stageCount = {};
    REFURB_STAGES.forEach(s => stageCount[s] = 0);
    inRefurb.forEach(e => { if (stageCount[e.refurbStage] !== undefined) stageCount[e.refurbStage]++; });

    // upcoming van runs
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = vanRuns
      .filter(r => new Date(r.date) >= now && r.status !== 'completed')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // due back this week
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const dueBack = equipment.filter(e => {
      if (!e.returnDate) return false;
      const d = new Date(e.returnDate);
      return d >= now && d <= nextWeek;
    }).sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));

    return { inRefurb, incoming, inUse, forSale, byGym, stageCount, upcoming, dueBack };
  }, [equipment, vanRuns]);

  const StatCard = ({ label, value, sublabel, onClick, accent }) => (
    <button onClick={onClick} disabled={!onClick}
      className={`text-left w-full bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-4 ${onClick ? 'hover:border-[#8FA087] cursor-pointer' : 'cursor-default'} transition`}>
      <div className="text-[11px] uppercase tracking-wider text-[#96A093] mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold ${accent || 'text-[#F5F5F0]'}`}>{value}</div>
      {sublabel && <div className="text-xs text-[#96A093] mt-1">{sublabel}</div>}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Top row: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="In Use" value={stats.inUse.length} sublabel="across 5 gyms" onClick={() => setTab('inventory')} accent="text-emerald-400" />
        <StatCard label="In Refurb" value={stats.inRefurb.length} sublabel="active pipeline" onClick={() => setTab('refurb')} accent="text-orange-400" />
        <StatCard label="Incoming" value={stats.incoming.length} sublabel="still with seller" onClick={() => setTab('inventory')} accent="text-blue-400" />
        <StatCard label="For Sale" value={stats.forSale.length} sublabel="destined to sell" onClick={() => setTab('sales')} accent="text-amber-400" />
      </div>

      {/* Middle row: Per-gym + Refurb stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="By Gym" icon={Building2}>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.byGym).map(([g, n]) => (
              <div key={g} className="flex items-center justify-between p-2.5 rounded-md bg-[#4C5C4A] border border-[#3D4A3B]">
                <div className="text-sm text-[#DBE0D6]">{g}</div>
                <div className="font-mono text-lg text-[#F5F5F0]">{n}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Refurb Pipeline" icon={Wrench}>
          <div className="space-y-1.5">
            {REFURB_STAGES.map(stage => {
              const n = stats.stageCount[stage];
              const c = REFURB_STAGE_COLORS[stage];
              const max = Math.max(...Object.values(stats.stageCount), 1);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`text-xs w-24 ${c.text}`}>{stage}</div>
                  <div className="flex-1 h-6 bg-[#4C5C4A] rounded relative overflow-hidden border border-[#3D4A3B]">
                    <div className={`h-full ${c.bg} border-r ${c.border}`} style={{ width: `${(n/max)*100}%` }} />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-mono">{n}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom row: due back + upcoming van */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Due Back This Week" icon={Clock} action={{ label: 'View refurb', onClick: () => setTab('refurb') }}>
          {stats.dueBack.length === 0 ? (
            <div className="text-sm text-[#96A093] py-4 text-center">Nothing due back in the next 7 days</div>
          ) : (
            <div className="space-y-1">
              {stats.dueBack.slice(0, 8).map(item => (
                <button key={item.id} onClick={() => onSelectItem(item)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-md hover:bg-[#5D6E5C]/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <RefurbStageBadge stage={item.refurbStage} />
                    <div className="min-w-0">
                      <div className="text-sm text-[#EAEEE5] truncate">{item.name}</div>
                      <div className="text-xs text-[#96A093]">{item.refurbisher}  ·  → {item.destination}</div>
                    </div>
                  </div>
                  <div className="text-xs text-amber-400 font-mono whitespace-nowrap">{fmtDate(item.returnDate)}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming Van Runs" icon={Truck} action={{ label: 'View schedule', onClick: () => setTab('van') }}>
          {stats.upcoming.length === 0 ? (
            <div className="text-sm text-[#96A093] py-4 text-center">No van runs scheduled</div>
          ) : (
            <div className="space-y-1">
              {stats.upcoming.slice(0, 5).map(run => (
                <button key={run.id} onClick={() => onSelectRun(run)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-md hover:bg-[#5D6E5C]/50 transition">
                  <div className="min-w-0">
                    <div className="text-sm text-[#EAEEE5] truncate">{run.job}</div>
                    <div className="text-xs text-[#96A093] truncate">{fmtDate(run.date)}{run.people.length ? `  ·  ${run.people.join(', ')}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D4A3B]">
        <div className="flex items-center gap-2 text-sm font-medium text-[#EAEEE5]">
          {Icon && <Icon size={14} className="text-[#B8C0B1]" />}
          {title}
        </div>
        {action && (
          <button onClick={action.onClick} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            {action.label} <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
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
  filterStatuses, setFilterStatuses,
  filterDestinations, setFilterDestinations,
  onSelect, onAdd
}) {
  const [view, setView] = useState('grid');

  const clearAll = () => {
    setSearch(''); setFilterLocations([]); setFilterCategories([]);
    setFilterBrands([]); setFilterStatuses([]); setFilterDestinations([]);
  };

  return (
    <div className="space-y-4">
      {/* Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96A093]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, brand, seller, notes…"
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
        <FilterDropdown label="Location" options={LOCATIONS} selected={filterLocations} onChange={setFilterLocations} />
        <FilterDropdown label="Body Part" options={CATEGORIES} selected={filterCategories} onChange={setFilterCategories} />
        <FilterDropdown label="Brand" options={allBrands} selected={filterBrands} onChange={setFilterBrands} scrollable />
        <FilterDropdown label="Status" options={STATUSES} selected={filterStatuses} onChange={setFilterStatuses} />
        <FilterDropdown label="Going to" options={DESTINATIONS} selected={filterDestinations} onChange={setFilterDestinations} />
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
      {equipment.length === 0 ? (
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
      </div>
      <div className="text-sm font-medium text-[#F5F5F0] mb-1 line-clamp-2 group-hover:text-amber-400 transition">{item.name}</div>
      <div className="text-xs text-[#96A093] mb-3">{item.brand}  ·  {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</div>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#3D4A3B]">
        <div className="flex items-center gap-1 text-[#B8C0B1] min-w-0">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{item.currentLocation}</span>
        </div>
        {item.destination && item.currentLocation !== item.destination && (
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
              <th className="text-left px-3 py-2.5 font-medium">Name</th>
              <th className="text-left px-3 py-2.5 font-medium">Brand</th>
              <th className="text-left px-3 py-2.5 font-medium">Category</th>
              <th className="text-left px-3 py-2.5 font-medium">Location</th>
              <th className="text-left px-3 py-2.5 font-medium">→ Going to</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 font-medium">Stage</th>
              <th className="text-right px-3 py-2.5 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const stat = STATUS_COLORS[item.status] || STATUS_COLORS['At HQ'];
              return (
                <tr key={item.id} onClick={() => onSelect(item)}
                  className="border-b border-[#3D4A3B] last:border-b-0 hover:bg-[#5D6E5C]/40 cursor-pointer">
                  <td className="px-3 py-2 text-[#F5F5F0]">{item.name}</td>
                  <td className="px-3 py-2 text-[#DBE0D6]">{item.brand}</td>
                  <td className="px-3 py-2 text-[#B8C0B1] text-xs">{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</td>
                  <td className="px-3 py-2 text-[#DBE0D6]">{item.currentLocation}</td>
                  <td className="px-3 py-2 text-[#B8C0B1]">{item.destination}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${stat.bg} ${stat.text}`}>{item.status}</span></td>
                  <td className="px-3 py-2">{item.refurbStage ? <RefurbStageBadge stage={item.refurbStage} /> : <span className="text-[#7A867A]">—</span>}</td>
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

// ================ REFURB PIPELINE ================

const REFURBISHER_LOCATIONS = ['At Craigs', 'At Nytram', 'At Pauls', 'At JP', 'Other Refurbisher'];

function isInRefurbWorkflow(e) {
  // Physically at a refurbisher — regardless of ownership status
  if (REFURBISHER_LOCATIONS.includes(e.currentLocation)) return true;
  // At WBAK HQ and has a refurb stage set — actively being worked on
  if (e.currentLocation === 'WBAK HQ' && e.refurbStage && e.status !== 'Ready to Deploy') return true;
  return false;
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

function RefurbTab({ equipment, onSelect }) {
  const [groupBy, setGroupBy] = useState('stage');

  const inRefurb = equipment.filter(isInRefurbWorkflow);

  const grouped = useMemo(() => {
    const g = {};
    if (groupBy === 'stage') {
      REFURB_STAGES.forEach(s => g[s] = []);
      inRefurb.forEach(e => {
        const s = e.refurbStage || 'Landed';
        if (!g[s]) g[s] = [];
        g[s].push(e);
      });
    } else if (groupBy === 'refurbisher') {
      REFURBISHERS.forEach(r => g[r] = []);
      inRefurb.forEach(e => {
        const r = e.refurbisher || 'In-House (WBAK)';
        if (!g[r]) g[r] = [];
        g[r].push(e);
      });
    }
    return g;
  }, [inRefurb, groupBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Refurb Workflow</div>
          <div className="text-xs text-[#96A093] mt-0.5">{inRefurb.length} machines physically at refurbishers or awaiting dispatch — includes gym-bound items</div>
        </div>
        <div className="flex bg-[#3F4D3E] border border-[#3D4A3B] rounded-lg p-0.5">
          <button onClick={() => setGroupBy('stage')} className={`px-3 py-1.5 rounded text-xs ${groupBy === 'stage' ? 'bg-[#5D6E5C] text-[#F5F5F0]' : 'text-[#96A093]'}`}>By Stage</button>
          <button onClick={() => setGroupBy('refurbisher')} className={`px-3 py-1.5 rounded text-xs ${groupBy === 'refurbisher' ? 'bg-[#5D6E5C] text-[#F5F5F0]' : 'text-[#96A093]'}`}>By Refurbisher</button>
        </div>
      </div>

      {groupBy === 'stage' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {REFURB_STAGES.map(stage => {
            const items = grouped[stage] || [];
            const c = REFURB_STAGE_COLORS[stage];
            return (
              <div key={stage} className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl">
                <div className={`px-3 py-2.5 border-b border-[#3D4A3B] flex items-center justify-between`}>
                  <div className={`text-xs uppercase tracking-wider font-medium ${c.text}`}>{stage}</div>
                  <div className="text-xs font-mono text-[#B8C0B1]">{items.length}</div>
                </div>
                <div className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
                  {items.length === 0 && <div className="text-xs text-[#7A867A] text-center py-4">—</div>}
                  {items.map(item => (
                    <button key={item.id} onClick={() => onSelect(item)}
                      className="w-full text-left bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg p-2.5 hover:border-[#8FA087] transition group">
                      <div className="text-xs font-medium text-[#EAEEE5] line-clamp-2 group-hover:text-amber-400">{item.name}</div>
                      <div className="text-[10px] text-[#96A093] mt-1 flex items-center gap-1">
                        <MapPin size={9} /> {item.currentLocation}
                      </div>
                      <div className="text-[10px] text-[#B8C0B1] mt-0.5">→ {item.destination}</div>
                      {item.returnDate && (
                        <div className="text-[10px] text-amber-500/80 mt-1 font-mono">
                          Back: {fmtDate(item.returnDate)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {REFURBISHERS.map(refurbisher => {
            const items = grouped[refurbisher] || [];
            if (items.length === 0) return null;
            return (
              <div key={refurbisher} className="bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl">
                <div className="px-3 py-2.5 border-b border-[#3D4A3B] flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider font-medium text-[#DBE0D6]">{refurbisher}</div>
                  <div className="text-xs font-mono text-[#B8C0B1]">{items.length}</div>
                </div>
                <div className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto">
                  {items.map(item => (
                    <button key={item.id} onClick={() => onSelect(item)}
                      className="w-full text-left bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg p-2.5 hover:border-[#8FA087] transition group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-medium text-[#EAEEE5] line-clamp-2 group-hover:text-amber-400 flex-1">{item.name}</div>
                        <RefurbStageBadge stage={item.refurbStage} />
                      </div>
                      <div className="text-[10px] text-[#96A093] mt-1">→ {item.destination}</div>
                      {item.returnDate && (
                        <div className="text-[10px] text-amber-500/80 mt-1 font-mono">Back: {fmtDate(item.returnDate)}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
