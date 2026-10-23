// Names for generated characters: given names common around 1220 in each part of Mythic Europe,
// keyed to the homeland groups of the Basics step, and the Latin names magi take in the Order.

import { HOMELANDS } from '../../data/lists';
import type { Rng } from '../dice';
import { pick } from './random';

type Names = { male: string[]; female: string[] };

const NAMES: Record<string, Names> = {
  english: {
    male: ['William', 'Robert', 'Richard', 'John', 'Walter', 'Hugh', 'Roger', 'Geoffrey', 'Ralph', 'Thomas', 'Gilbert', 'Simon', 'Henry', 'Peter', 'Adam', 'Osbert'],
    female: ['Alice', 'Agnes', 'Matilda', 'Joan', 'Margery', 'Emma', 'Isabel', 'Cecily', 'Edith', 'Avice', 'Juliana', 'Mabel', 'Beatrice', 'Sibyl', 'Eleanor', 'Rohese'],
  },
  scots: {
    male: ['Alexander', 'Duncan', 'Malcolm', 'Gilchrist', 'Donald', 'Angus', 'Fergus', 'Kenneth', 'Gillespie', 'Lachlan', 'Somerled', 'Dugald', 'Ewen', 'Patrick', 'Walter', 'Uchtred'],
    female: ['Margaret', 'Ada', 'Christina', 'Bethoc', 'Forbhlaith', 'Mor', 'Affrica', 'Muriel', 'Isabel', 'Marjorie', 'Euphemia', 'Ingibiorg', 'Matilda', 'Ela', 'Gormflaith', 'Derbail'],
  },
  irish: {
    male: ['Domnall', 'Conchobar', 'Diarmait', 'Brian', 'Áed', 'Niall', 'Ruaidrí', 'Tadhg', 'Donnchad', 'Cormac', 'Fergal', 'Eógan', 'Lorcán', 'Flann', 'Cathal', 'Muirchertach'],
    female: ['Gormlaith', 'Mór', 'Derbforgaill', 'Órlaith', 'Sadb', 'Gráinne', 'Bébinn', 'Dubchoblaig', 'Étaín', 'Fionnuala', 'Aífe', 'Caílech', 'Lassar', 'Mael Muire', 'Sláine', 'Nuala'],
  },
  french: {
    male: ['Guillaume', 'Jean', 'Pierre', 'Raoul', 'Thibaut', 'Hugues', 'Gautier', 'Renaud', 'Étienne', 'Geoffroi', 'Philippe', 'Robert', 'Simon', 'Aubert', 'Enguerrand', 'Mathieu'],
    female: ['Jeanne', 'Marguerite', 'Isabelle', 'Agnès', 'Béatrice', 'Alix', 'Mahaut', 'Blanche', 'Ermengarde', 'Héloïse', 'Aude', 'Pétronille', 'Perrine', 'Yolande', 'Emmeline', 'Clémence'],
  },
  occitan: {
    male: ['Raimon', 'Bernat', 'Guilhem', 'Peire', 'Arnaut', 'Bertran', 'Jordan', 'Pons', 'Folquet', 'Uc', 'Sicart', 'Aimeric', 'Gaucelm', 'Rostanh', 'Isarn', 'Esteve'],
    female: ['Azalais', 'Ermessenda', 'Esclarmonda', 'Beatritz', 'Garsenda', 'Guillelma', 'Alamanda', 'Ermengarda', 'Maria', 'Tiburga', 'Bruna', 'Saurimonda', 'Clara', 'Fays', 'Raimonda', 'Lombarda'],
  },
  iberian: {
    male: ['Rodrigo', 'Alfonso', 'Fernando', 'Sancho', 'García', 'Pedro', 'Diego', 'Gonzalo', 'Martín', 'Lope', 'Nuño', 'Álvaro', 'Gutierre', 'Pelayo', 'Ramiro', 'Jaume'],
    female: ['Urraca', 'Elvira', 'Jimena', 'Sancha', 'Teresa', 'Berenguela', 'Mayor', 'Leonor', 'Toda', 'María', 'Inés', 'Constanza', 'Aldonza', 'Estefanía', 'Juliana', 'Oria'],
  },
  german: {
    male: ['Heinrich', 'Konrad', 'Friedrich', 'Otto', 'Dietrich', 'Hermann', 'Ulrich', 'Albrecht', 'Gerhard', 'Rudolf', 'Berthold', 'Burkhard', 'Werner', 'Eberhard', 'Walther', 'Hartmann'],
    female: ['Adelheid', 'Gertrud', 'Mechthild', 'Kunigunde', 'Hedwig', 'Irmgard', 'Agnes', 'Elisabeth', 'Gisela', 'Jutta', 'Richenza', 'Sophia', 'Margarete', 'Hildegard', 'Bertha', 'Ida'],
  },
  italian: {
    male: ['Giovanni', 'Pietro', 'Guido', 'Ugolino', 'Ranieri', 'Bonifacio', 'Lorenzo', 'Matteo', 'Niccolò', 'Guglielmo', 'Alberto', 'Ottaviano', 'Corrado', 'Rinaldo', 'Enrico', 'Bonaventura'],
    female: ['Beatrice', 'Giovanna', 'Costanza', 'Matilde', 'Agnese', 'Chiara', 'Bianca', 'Margherita', 'Gemma', 'Lucia', 'Isabella', 'Caterina', 'Sibilla', 'Adelasia', 'Diamante', 'Ermellina'],
  },
  greek: {
    male: ['Ioannes', 'Michael', 'Theodoros', 'Nikephoros', 'Konstantinos', 'Basileios', 'Andronikos', 'Georgios', 'Leon', 'Alexios', 'Demetrios', 'Manuel', 'Nikolaos', 'Stephanos', 'Isaakios', 'Gregorios'],
    female: ['Anna', 'Eirene', 'Maria', 'Theodora', 'Zoe', 'Euphrosyne', 'Helene', 'Eudokia', 'Thekla', 'Sophia', 'Kale', 'Xene', 'Agathe', 'Theophano', 'Martha', 'Kyranna'],
  },
  hungarian: {
    male: ['András', 'Béla', 'Imre', 'István', 'László', 'Géza', 'Kálmán', 'Miklós', 'Pál', 'Péter', 'Bertalan', 'Lőrinc', 'Tamás', 'Dénes', 'Ugrin', 'Csanád'],
    female: ['Erzsébet', 'Margit', 'Ilona', 'Katalin', 'Anna', 'Mária', 'Ágnes', 'Jolán', 'Konstancia', 'Sarolta', 'Judit', 'Gertrúd', 'Ilka', 'Csenge', 'Piroska', 'Aranka'],
  },
  rus: {
    male: ['Yaroslav', 'Vsevolod', 'Mstislav', 'Sviatoslav', 'Vladimir', 'Dmitri', 'Gleb', 'Boris', 'Ivan', 'Oleg', 'Rostislav', 'Igor', 'Vasilko', 'Daniil', 'Yuri', 'Sbyslav'],
    female: ['Olga', 'Anastasia', 'Yevfrosinia', 'Agafia', 'Maria', 'Ksenia', 'Predslava', 'Verkhuslava', 'Feodosia', 'Anna', 'Yelena', 'Malusha', 'Rogneda', 'Sofia', 'Zbyslava', 'Dobrodeia'],
  },
  arabic: {
    male: ['Muhammad', 'Ahmad', 'Ali', 'Hasan', 'Husayn', 'Yusuf', 'Ibrahim', 'Umar', 'Salah', 'Khalil', 'Mahmud', 'Abd Allah', 'Ismail', 'Idris', 'Hamid', 'Musa'],
    female: ['Fatima', 'Aisha', 'Khadija', 'Zaynab', 'Maryam', 'Layla', 'Shajar', 'Safiyya', 'Sitt al-Mulk', 'Hafsa', 'Asma', 'Ruqayya', 'Sukayna', 'Amina', 'Zubayda', 'Nusayba'],
  },
  hebrew: {
    male: ['Moshe', 'Yitzhak', 'Avraham', 'Yaakov', 'Yehuda', 'Shmuel', 'David', 'Meir', 'Yosef', 'Eliezer', 'Menahem', 'Shlomo', 'Asher', 'Natan', 'Baruch', 'Elyakim'],
    female: ['Sarah', 'Rivka', 'Rachel', 'Leah', 'Hannah', 'Dulcea', 'Miriam', 'Zipporah', 'Esther', 'Belleassez', 'Bona', 'Yocheved', 'Belle', 'Gentil', 'Ricca', 'Pucelle'],
  },
  // magi go by Latin names in the Order
  latin: {
    male: ['Aurelius', 'Bartholomaeus', 'Cassius', 'Decimus', 'Fabricius', 'Gaius', 'Hieronymus', 'Ignatius', 'Julianus', 'Lucanus', 'Marcellus', 'Octavian', 'Quintus', 'Severus', 'Tiberius', 'Valerian'],
    female: ['Aemilia', 'Aurelia', 'Cassia', 'Claudia', 'Domitia', 'Fabia', 'Flavia', 'Julia', 'Livia', 'Lucretia', 'Marcella', 'Octavia', 'Prisca', 'Sabina', 'Valeria', 'Vibia'],
  },
};

/** The name region for each homeland group (the start of its label). */
const REGION_BY_GROUP: [string, string][] = [
  ['Stonehenge', 'english'], ['Loch Leglean', 'scots'], ['Hibernian', 'irish'], ['Normandy', 'french'], ['Provençal', 'occitan'], ['Iberian', 'iberian'],
  ['Rhine', 'german'], ['Greater Alps', 'german'], ['Rome', 'italian'], ['Theban', 'greek'], ['Transylvanian', 'hungarian'], ['Novgorod', 'rus'],
  ['Levant', 'arabic'], ['North Africa', 'arabic'], ['Jewish', 'hebrew'],
];

/** The homeland group a saga's Tribunal belongs to (the Tribunal names start the group labels). */
export function homelandGroupFor(tribunal?: string): (typeof HOMELANDS)[number] | undefined {
  if (!tribunal) return undefined;
  const t = tribunal.toLowerCase().slice(0, 6);
  return HOMELANDS.find((h) => h.label.toLowerCase().startsWith(t));
}

export function regionOf(group?: { label: string }): string {
  return REGION_BY_GROUP.find(([g]) => group?.label.startsWith(g))?.[1] ?? 'english';
}

/** A given name for the region (or Latin, for a magus). */
export function givenName(rng: Rng, region: string, female: boolean): string {
  const n = NAMES[region] ?? NAMES.english;
  return pick(rng, female ? n.female : n.male);
}

/** A given name not already in use (when the region has one left), so a covenant has no two Idas. */
export function freshName(rng: Rng, region: string, female: boolean, used: Iterable<string> = []): string {
  const taken = new Set([...used].map((n) => n.toLowerCase()));
  const n = NAMES[region] ?? NAMES.english;
  const free = (female ? n.female : n.male).filter((x) => !taken.has(x.toLowerCase()));
  return free.length ? pick(rng, free) : givenName(rng, region, female);
}
