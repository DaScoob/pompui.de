export const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export const DEFAULT_CROPS = [
  { id: "tomate", name: "Tomate", icon: "T", color: "#e45d43", sowStart: 2, sowEnd: 4, harvestStart: 7, harvestEnd: 10, spacing: 50, note: "Warm vorziehen, nach den Eisheiligen auspflanzen." },
  { id: "karotte", name: "Karotte", icon: "K", color: "#ef8c32", sowStart: 3, sowEnd: 7, harvestStart: 6, harvestEnd: 11, spacing: 5, note: "Direktsaat in lockeren, steinarmen Boden." },
  { id: "salat", name: "Pflücksalat", icon: "S", color: "#78a95a", sowStart: 3, sowEnd: 8, harvestStart: 5, harvestEnd: 10, spacing: 25, note: "Satzweise säen für eine lange Ernte." },
  { id: "bohne", name: "Buschbohne", icon: "B", color: "#4e8c5b", sowStart: 5, sowEnd: 7, harvestStart: 7, harvestEnd: 10, spacing: 10, note: "Erst in ausreichend erwärmten Boden säen." },
  { id: "zucchini", name: "Zucchini", icon: "Z", color: "#86a638", sowStart: 4, sowEnd: 5, harvestStart: 7, harvestEnd: 10, spacing: 100, note: "Benötigt viel Platz und regelmäßige Ernte." },
  { id: "knoblauch", name: "Knoblauch", icon: "Kn", color: "#8f7b9b", sowStart: 9, sowEnd: 11, harvestStart: 6, harvestEnd: 8, spacing: 12, note: "Herbststeckung ist für kräftige Knollen geeignet." },
  { id: "gruenkohl", name: "Grünkohl", icon: "G", color: "#356f4a", sowStart: 5, sowEnd: 7, harvestStart: 10, harvestEnd: 2, spacing: 50, note: "Winterhart; Ernte nach Bedarf bis ins Frühjahr." },
  { id: "radieschen", name: "Radieschen", icon: "R", color: "#c94d73", sowStart: 3, sowEnd: 9, harvestStart: 4, harvestEnd: 10, spacing: 5, note: "Kurze Kulturzeit, gut als Vor- und Nachkultur." },
].map((crop) => ({ ...crop, minSpacing: Math.max(1, Math.round(crop.spacing * 0.8)), maxSpacing: crop.spacing, rating: 1 }));

const cultureProfile = (name, aliases, outdoor, greenhouse, spacing, color) => ({
  name,
  aliases,
  outdoor: { sowStart: outdoor[0], sowEnd: outdoor[1], harvestStart: outdoor[2], harvestEnd: outdoor[3] },
  greenhouse: { sowStart: greenhouse[0], sowEnd: greenhouse[1], harvestStart: greenhouse[2], harvestEnd: greenhouse[3] },
  spacing,
  minSpacing: Math.max(1, Math.round(spacing * 0.8)),
  maxSpacing: spacing,
  color,
});

export const CULTURE_PROFILES = [
  cultureProfile("Artischocke", ["Artischocken"], [2, 4, 8, 10], [1, 3, 6, 11], 90, "#65866a"),
  cultureProfile("Aubergine", ["Eierfrucht"], [1, 3, 7, 10], [1, 2, 5, 11], 60, "#765777"),
  cultureProfile("Blumenkohl", [], [2, 6, 6, 10], [1, 7, 5, 11], 50, "#9a9f78"),
  cultureProfile("Brokkoli", ["Broccoli"], [2, 7, 6, 10], [1, 7, 5, 11], 50, "#3f7650"),
  cultureProfile("Buschbohne", ["Buschbohnen", "Bohne", "Bohnen"], [5, 7, 7, 10], [4, 7, 6, 11], 10, "#4e8c5b"),
  cultureProfile("Chili", ["Chilischote", "Peperoni"], [1, 3, 7, 10], [1, 2, 5, 11], 45, "#c8493f"),
  cultureProfile("Erbse", ["Erbsen", "Markerbse", "Zuckererbse"], [3, 6, 5, 8], [2, 5, 4, 8], 5, "#6d9b52"),
  cultureProfile("Feldsalat", ["Rapunzel"], [7, 9, 9, 3], [8, 11, 10, 4], 10, "#4f7955"),
  cultureProfile("Fenchel", ["Knollenfenchel"], [4, 7, 7, 10], [3, 8, 6, 11], 30, "#79a37c"),
  cultureProfile("Grünkohl", ["Braunkohl"], [5, 7, 10, 2], [4, 7, 9, 3], 50, "#356f4a"),
  cultureProfile("Gurke", ["Gurken", "Salatgurke", "Einlegegurke"], [4, 6, 7, 9], [3, 5, 5, 10], 40, "#5d9252"),
  cultureProfile("Karotte", ["Karotten", "Möhre", "Möhren"], [3, 7, 6, 11], [2, 8, 5, 12], 5, "#ef8c32"),
  cultureProfile("Kartoffel", ["Kartoffeln"], [3, 5, 6, 10], [2, 4, 5, 9], 35, "#a58a57"),
  cultureProfile("Knoblauch", [], [9, 11, 6, 8], [9, 11, 5, 7], 12, "#8f7b9b"),
  cultureProfile("Kohlrabi", [], [2, 7, 5, 10], [1, 9, 3, 12], 25, "#75916f"),
  cultureProfile("Kopfsalat", ["Salat", "Eissalat"], [2, 7, 5, 10], [1, 9, 3, 11], 30, "#78a95a"),
  cultureProfile("Kürbis", ["Kuerbis", "Speisekürbis", "Hokkaido"], [4, 5, 8, 10], [3, 4, 7, 10], 120, "#d77f37"),
  cultureProfile("Lauch", ["Porree"], [1, 5, 7, 3], [1, 4, 6, 3], 15, "#4f8063"),
  cultureProfile("Mais", ["Zuckermais"], [4, 5, 8, 10], [3, 4, 7, 10], 25, "#c9a947"),
  cultureProfile("Mangold", ["Stielmangold"], [4, 7, 6, 11], [2, 8, 5, 12], 30, "#b24757"),
  cultureProfile("Pak Choi", ["Pakchoi", "Senfkohl"], [7, 9, 9, 11], [2, 10, 4, 12], 25, "#5d8759"),
  cultureProfile("Paprika", ["Gemüsepaprika"], [1, 3, 7, 10], [1, 2, 5, 11], 45, "#d75a3b"),
  cultureProfile("Pastinake", ["Pastinaken"], [3, 5, 9, 2], [2, 4, 8, 2], 10, "#b7a675"),
  cultureProfile("Pflücksalat", ["Pfluecksalat", "Schnittsalat"], [3, 8, 5, 10], [1, 10, 3, 12], 25, "#78a95a"),
  cultureProfile("Radieschen", ["Radies"], [3, 9, 4, 10], [1, 11, 2, 12], 5, "#c94d73"),
  cultureProfile("Rosenkohl", [], [2, 4, 9, 2], [1, 3, 8, 2], 50, "#50764e"),
  cultureProfile("Rote Bete", ["Rote Beete", "Randen"], [4, 7, 7, 11], [3, 7, 6, 12], 10, "#9a3e55"),
  cultureProfile("Rucola", ["Rauke"], [3, 9, 4, 11], [1, 11, 2, 12], 10, "#648b4d"),
  cultureProfile("Sellerie", ["Knollensellerie", "Staudensellerie"], [2, 3, 8, 10], [1, 3, 7, 11], 40, "#7f9665"),
  cultureProfile("Spinat", [], [2, 4, 4, 6], [1, 4, 3, 6], 10, "#3f7951"),
  cultureProfile("Stangenbohne", ["Stangenbohnen"], [5, 7, 7, 10], [4, 7, 6, 11], 15, "#477c54"),
  cultureProfile("Süßkartoffel", ["Suesskartoffel", "Batate"], [2, 4, 9, 10], [1, 3, 8, 11], 35, "#b86e48"),
  cultureProfile("Tomate", ["Tomaten"], [2, 4, 7, 10], [1, 3, 5, 11], 50, "#e45d43"),
  cultureProfile("Topinambur", [], [3, 4, 10, 2], [2, 4, 9, 2], 40, "#b58a46"),
  cultureProfile("Weißkohl", ["Weisskohl", "Kappes"], [2, 5, 7, 11], [1, 4, 5, 11], 50, "#779176"),
  cultureProfile("Zucchini", [], [4, 5, 6, 10], [3, 4, 5, 11], 100, "#86a638"),
  cultureProfile("Zwiebel", ["Zwiebeln", "Speisezwiebel"], [2, 4, 8, 9], [1, 3, 6, 9], 10, "#b2965b"),
];

export const EMPTY_BED = Object.freeze({ name: "", width: 1.2, length: 3 });
export const EMPTY_CROP = Object.freeze({ name: "", icon: "", color: "#56845f", growingProfile: "outdoor", sowStart: 3, sowEnd: 5, harvestStart: 6, harvestEnd: 9, spacing: 30, minSpacing: 25, maxSpacing: 30, customSpacing: "", rating: 1, note: "" });
