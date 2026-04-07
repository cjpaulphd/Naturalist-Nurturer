/**
 * Indigenous names for species, keyed by scientific name (lowercase).
 *
 * This module provides a curated mapping of indigenous names for species
 * found around the world. It is designed to be extensible — contributions
 * for additional languages and regions are welcome.
 *
 * Sources:
 *   - Te Reo Māori names: NZ Department of Conservation, Te Ara Encyclopedia
 *   - Hawaiian names: Bishop Museum, DLNR
 *   - Aboriginal Australian names: Various published sources
 */

import { IndigenousName } from "./types";

/**
 * Map language codes to approximate geographic bounding boxes.
 * Indigenous names are only shown when the user's quiz location
 * falls within the corresponding region.
 */
const LANGUAGE_REGIONS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  mi:  { latMin: -48, latMax: -34, lngMin: 165, lngMax: 179 },  // New Zealand
  haw: { latMin: 18,  latMax: 23,  lngMin: -161, lngMax: -154 }, // Hawaiʻi
  wrh: { latMin: -44, latMax: -10, lngMin: 112, lngMax: 154 },   // Australia
  pjt: { latMin: -44, latMax: -10, lngMin: 112, lngMax: 154 },   // Australia
};

function isInRegion(
  coords: { lat: number; lng: number },
  region: { latMin: number; latMax: number; lngMin: number; lngMax: number }
): boolean {
  return (
    coords.lat >= region.latMin &&
    coords.lat <= region.latMax &&
    coords.lng >= region.lngMin &&
    coords.lng <= region.lngMax
  );
}

// Lookup table keyed by lowercase scientific name
const INDIGENOUS_NAMES: Record<string, IndigenousName[]> = {
  // ── Aotearoa / New Zealand — Te Reo Māori ──────────────────────────

  // Kiwi
  "apteryx mantelli": [{ name: "Kiwi", language: "Te Reo Māori", languageCode: "mi" }],
  "apteryx australis": [{ name: "Tokoeka", language: "Te Reo Māori", languageCode: "mi" }],
  "apteryx owenii": [{ name: "Kiwi Pukupuku", language: "Te Reo Māori", languageCode: "mi" }],
  "apteryx haastii": [{ name: "Roroa", language: "Te Reo Māori", languageCode: "mi" }],
  "apteryx rowi": [{ name: "Rowi", language: "Te Reo Māori", languageCode: "mi" }],

  // Iconic NZ birds
  "prosthemadera novaeseelandiae": [{ name: "Tūī", language: "Te Reo Māori", languageCode: "mi" }],
  "anthornis melanura": [{ name: "Korimako", language: "Te Reo Māori", languageCode: "mi" }],
  "nestor meridionalis": [{ name: "Kākā", language: "Te Reo Māori", languageCode: "mi" }],
  "nestor notabilis": [{ name: "Kea", language: "Te Reo Māori", languageCode: "mi" }],
  "strigops habroptilus": [{ name: "Kākāpō", language: "Te Reo Māori", languageCode: "mi" }],
  "cyanoramphus novaezelandiae": [{ name: "Kākāriki", language: "Te Reo Māori", languageCode: "mi" }],
  "cyanoramphus auriceps": [{ name: "Kākāriki", language: "Te Reo Māori", languageCode: "mi" }],
  "todiramphus sanctus vagans": [{ name: "Kōtare", language: "Te Reo Māori", languageCode: "mi" }],
  "todiramphus sanctus": [{ name: "Kōtare", language: "Te Reo Māori", languageCode: "mi" }],
  "rhipidura fuliginosa": [{ name: "Pīwakawaka", language: "Te Reo Māori", languageCode: "mi" }],
  "petroica macrocephala": [{ name: "Miromiro", language: "Te Reo Māori", languageCode: "mi" }],
  "petroica longipes": [{ name: "Toutouwai", language: "Te Reo Māori", languageCode: "mi" }],
  "petroica australis": [{ name: "Toutouwai", language: "Te Reo Māori", languageCode: "mi" }],
  "gerygone igata": [{ name: "Riroriro", language: "Te Reo Māori", languageCode: "mi" }],
  "mohoua albicilla": [{ name: "Pōpokotea", language: "Te Reo Māori", languageCode: "mi" }],
  "mohoua ochrocephala": [{ name: "Mohua", language: "Te Reo Māori", languageCode: "mi" }],
  "notiomystis cincta": [{ name: "Hihi", language: "Te Reo Māori", languageCode: "mi" }],
  "philesturnus rufusater": [{ name: "Tīeke", language: "Te Reo Māori", languageCode: "mi" }],
  "philesturnus carunculatus": [{ name: "Tīeke", language: "Te Reo Māori", languageCode: "mi" }],
  "callaeas wilsoni": [{ name: "Kōkako", language: "Te Reo Māori", languageCode: "mi" }],
  "xenicus gilviventris": [{ name: "Tītipounamu", language: "Te Reo Māori", languageCode: "mi" }],
  "acanthisitta chloris": [{ name: "Tītipounamu", language: "Te Reo Māori", languageCode: "mi" }],
  "zosterops lateralis": [{ name: "Tauhou", language: "Te Reo Māori", languageCode: "mi" }],

  // Waterfowl & wading birds
  "porphyrio melanotus": [{ name: "Pūkeko", language: "Te Reo Māori", languageCode: "mi" }],
  "porphyrio hochstetteri": [{ name: "Takahē", language: "Te Reo Māori", languageCode: "mi" }],
  "tadorna variegata": [{ name: "Pūtangitangi", language: "Te Reo Māori", languageCode: "mi" }],
  "hymenolaimus malacorhynchos": [{ name: "Whio", language: "Te Reo Māori", languageCode: "mi" }],
  "anas chlorotis": [{ name: "Pāteke", language: "Te Reo Māori", languageCode: "mi" }],
  "anas superciliosa": [{ name: "Pārera", language: "Te Reo Māori", languageCode: "mi" }],
  "anas gracilis": [{ name: "Tētē", language: "Te Reo Māori", languageCode: "mi" }],
  "spatula rhynchotis": [{ name: "Kuruwhengi", language: "Te Reo Māori", languageCode: "mi" }],
  "anas rhynchotis": [{ name: "Kuruwhengi", language: "Te Reo Māori", languageCode: "mi" }],
  "aythya novaeseelandiae": [{ name: "Pāpango", language: "Te Reo Māori", languageCode: "mi" }],
  "cygnus atratus": [{ name: "Kakīānau", language: "Te Reo Māori", languageCode: "mi" }],
  "podiceps cristatus": [{ name: "Kāmana", language: "Te Reo Māori", languageCode: "mi" }],
  "poliocephalus rufopectus": [{ name: "Weweia", language: "Te Reo Māori", languageCode: "mi" }],
  "fulica atra australis": [{ name: "Pūtaitai", language: "Te Reo Māori", languageCode: "mi" }],
  "gallirallus philippensis": [{ name: "Moho-pererū", language: "Te Reo Māori", languageCode: "mi" }],
  "porzana tabuensis": [{ name: "Koitareke", language: "Te Reo Māori", languageCode: "mi" }],
  "botaurus poiciloptilus": [{ name: "Matuku-hūrepo", language: "Te Reo Māori", languageCode: "mi" }],
  "egretta novaehollandiae": [{ name: "Matuku Moana", language: "Te Reo Māori", languageCode: "mi" }],
  "ardea alba modesta": [{ name: "Kōtuku", language: "Te Reo Māori", languageCode: "mi" }],
  "ardea alba": [{ name: "Kōtuku", language: "Te Reo Māori", languageCode: "mi" }],
  "platalea regia": [{ name: "Kōtuku Ngutupapa", language: "Te Reo Māori", languageCode: "mi" }],
  "phalacrocorax varius": [{ name: "Kāruhiruhi", language: "Te Reo Māori", languageCode: "mi" }],
  "phalacrocorax carbo": [{ name: "Kawau", language: "Te Reo Māori", languageCode: "mi" }],
  "phalacrocorax sulcirostris": [{ name: "Kawau Tūī", language: "Te Reo Māori", languageCode: "mi" }],
  "microcarbo melanoleucos": [{ name: "Kawaupaka", language: "Te Reo Māori", languageCode: "mi" }],
  "stictocarbo punctatus": [{ name: "Pārekareka", language: "Te Reo Māori", languageCode: "mi" }],

  // Seabirds & coastal
  "diomedea antipodensis": [{ name: "Toroa", language: "Te Reo Māori", languageCode: "mi" }],
  "diomedea epomophora": [{ name: "Toroa", language: "Te Reo Māori", languageCode: "mi" }],
  "thalassarche cauta": [{ name: "Toroa", language: "Te Reo Māori", languageCode: "mi" }],
  "thalassarche salvini": [{ name: "Toroa", language: "Te Reo Māori", languageCode: "mi" }],
  "eudyptes pachyrhynchus": [{ name: "Tawaki", language: "Te Reo Māori", languageCode: "mi" }],
  "megadyptes antipodes": [{ name: "Hoiho", language: "Te Reo Māori", languageCode: "mi" }],
  "eudyptula minor": [{ name: "Kororā", language: "Te Reo Māori", languageCode: "mi" }],
  "puffinus griseus": [{ name: "Tītī", language: "Te Reo Māori", languageCode: "mi" }],
  "ardenna grisea": [{ name: "Tītī", language: "Te Reo Māori", languageCode: "mi" }],
  "procellaria westlandica": [{ name: "Tāiko", language: "Te Reo Māori", languageCode: "mi" }],
  "pterodroma macroptera": [{ name: "Ōi", language: "Te Reo Māori", languageCode: "mi" }],
  "pelecanoides urinatrix": [{ name: "Kuaka", language: "Te Reo Māori", languageCode: "mi" }],
  "morus serrator": [{ name: "Tākapu", language: "Te Reo Māori", languageCode: "mi" }],
  "sterna striata": [{ name: "Tara", language: "Te Reo Māori", languageCode: "mi" }],
  "sternula nereis": [{ name: "Tara Iti", language: "Te Reo Māori", languageCode: "mi" }],
  "larus dominicanus": [{ name: "Karoro", language: "Te Reo Māori", languageCode: "mi" }],
  "chroicocephalus novaehollandiae scopulinus": [{ name: "Tarāpunga", language: "Te Reo Māori", languageCode: "mi" }],
  "chroicocephalus novaehollandiae": [{ name: "Tarāpunga", language: "Te Reo Māori", languageCode: "mi" }],
  "haematopus unicolor": [{ name: "Tōrea", language: "Te Reo Māori", languageCode: "mi" }],
  "haematopus finschi": [{ name: "Tōrea", language: "Te Reo Māori", languageCode: "mi" }],
  "himantopus novaezelandiae": [{ name: "Kakī", language: "Te Reo Māori", languageCode: "mi" }],
  "himantopus himantopus leucocephalus": [{ name: "Poaka", language: "Te Reo Māori", languageCode: "mi" }],
  "anarhynchus frontalis": [{ name: "Ngutu Pare", language: "Te Reo Māori", languageCode: "mi" }],
  "charadrius obscurus": [{ name: "Tūturiwhatu", language: "Te Reo Māori", languageCode: "mi" }],
  "charadrius bicinctus": [{ name: "Tūturiwhatu", language: "Te Reo Māori", languageCode: "mi" }],

  // Raptors & owls
  "circus approximans": [{ name: "Kāhu", language: "Te Reo Māori", languageCode: "mi" }],
  "ninox novaeseelandiae": [{ name: "Ruru", language: "Te Reo Māori", languageCode: "mi" }],
  "falco novaeseelandiae": [{ name: "Kārearea", language: "Te Reo Māori", languageCode: "mi" }],

  // Other notable NZ birds
  "gallirallus australis": [{ name: "Weka", language: "Te Reo Māori", languageCode: "mi" }],
  "aptornis otidiformis": [{ name: "Adzebill", language: "Te Reo Māori", languageCode: "mi" }],
  "hemiphaga novaeseelandiae": [{ name: "Kererū", language: "Te Reo Māori", languageCode: "mi" }],
  "corvus antipodum": [{ name: "Kōkako", language: "Te Reo Māori", languageCode: "mi" }],
  "anthus novaeseelandiae": [{ name: "Pīhoihoi", language: "Te Reo Māori", languageCode: "mi" }],
  "prosthemadera novaeseelandiae novaeseelandiae": [{ name: "Tūī", language: "Te Reo Māori", languageCode: "mi" }],
  "vanellus miles novaehollandiae": [{ name: "Ngūruru", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Trees (Rākau) ─────────────────────────

  "agathis australis": [{ name: "Kauri", language: "Te Reo Māori", languageCode: "mi" }],
  "dacrydium cupressinum": [{ name: "Rimu", language: "Te Reo Māori", languageCode: "mi" }],
  "podocarpus totara": [{ name: "Tōtara", language: "Te Reo Māori", languageCode: "mi" }],
  "dacrycarpus dacrydioides": [{ name: "Kahikatea", language: "Te Reo Māori", languageCode: "mi" }],
  "prumnopitys taxifolia": [{ name: "Mataī", language: "Te Reo Māori", languageCode: "mi" }],
  "prumnopitys ferruginea": [{ name: "Miro", language: "Te Reo Māori", languageCode: "mi" }],
  "phyllocladus trichomanoides": [{ name: "Tānekaha", language: "Te Reo Māori", languageCode: "mi" }],
  "metrosideros excelsa": [{ name: "Pōhutukawa", language: "Te Reo Māori", languageCode: "mi" }],
  "metrosideros robusta": [{ name: "Rātā", language: "Te Reo Māori", languageCode: "mi" }],
  "metrosideros umbellata": [{ name: "Rātā", language: "Te Reo Māori", languageCode: "mi" }],
  "vitex lucens": [{ name: "Pūriri", language: "Te Reo Māori", languageCode: "mi" }],
  "beilschmiedia tawa": [{ name: "Tawa", language: "Te Reo Māori", languageCode: "mi" }],
  "weinmannia racemosa": [{ name: "Kāmahi", language: "Te Reo Māori", languageCode: "mi" }],
  "knightia excelsa": [{ name: "Rewarewa", language: "Te Reo Māori", languageCode: "mi" }],
  "sophora microphylla": [{ name: "Kōwhai", language: "Te Reo Māori", languageCode: "mi" }],
  "sophora tetraptera": [{ name: "Kōwhai", language: "Te Reo Māori", languageCode: "mi" }],
  "hoheria populnea": [{ name: "Houhere", language: "Te Reo Māori", languageCode: "mi" }],
  "alectryon excelsus": [{ name: "Tītoki", language: "Te Reo Māori", languageCode: "mi" }],
  "nestegis cunninghamii": [{ name: "Maire", language: "Te Reo Māori", languageCode: "mi" }],
  "rhopalostylis sapida": [{ name: "Nīkau", language: "Te Reo Māori", languageCode: "mi" }],
  "cordyline australis": [{ name: "Tī Kōuka", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Plants (Tipu) ────────────────────────

  "leptospermum scoparium": [{ name: "Mānuka", language: "Te Reo Māori", languageCode: "mi" }],
  "kunzea ericoides": [{ name: "Kānuka", language: "Te Reo Māori", languageCode: "mi" }],
  "kunzea robusta": [{ name: "Kānuka", language: "Te Reo Māori", languageCode: "mi" }],
  "phormium tenax": [{ name: "Harakeke", language: "Te Reo Māori", languageCode: "mi" }],
  "phormium cookianum": [{ name: "Wharariki", language: "Te Reo Māori", languageCode: "mi" }],
  "piper excelsum": [{ name: "Kawakawa", language: "Te Reo Māori", languageCode: "mi" }],
  "cyathea dealbata": [{ name: "Ponga", language: "Te Reo Māori", languageCode: "mi" }],
  "cyathea medullaris": [{ name: "Mamaku", language: "Te Reo Māori", languageCode: "mi" }],
  "dicksonia squarrosa": [{ name: "Whekī", language: "Te Reo Māori", languageCode: "mi" }],
  "asplenium bulbiferum": [{ name: "Pikopiko", language: "Te Reo Māori", languageCode: "mi" }],
  "pteridium esculentum": [{ name: "Rarauhe", language: "Te Reo Māori", languageCode: "mi" }],
  "typha orientalis": [{ name: "Raupō", language: "Te Reo Māori", languageCode: "mi" }],
  "freycinetia banksii": [{ name: "Kiekie", language: "Te Reo Māori", languageCode: "mi" }],
  "austroderia fulvida": [{ name: "Toetoe", language: "Te Reo Māori", languageCode: "mi" }],
  "austroderia toetoe": [{ name: "Toetoe", language: "Te Reo Māori", languageCode: "mi" }],
  "hebe salicifolia": [{ name: "Koromiko", language: "Te Reo Māori", languageCode: "mi" }],
  "veronica salicifolia": [{ name: "Koromiko", language: "Te Reo Māori", languageCode: "mi" }],
  "pomaderris kumeraho": [{ name: "Kumarahou", language: "Te Reo Māori", languageCode: "mi" }],
  "coriaria arborea": [{ name: "Tutu", language: "Te Reo Māori", languageCode: "mi" }],
  "coprosma robusta": [{ name: "Karamū", language: "Te Reo Māori", languageCode: "mi" }],
  "pseudopanax crassifolius": [{ name: "Horoeka", language: "Te Reo Māori", languageCode: "mi" }],
  "arthropodium cirratum": [{ name: "Rengarenga", language: "Te Reo Māori", languageCode: "mi" }],
  "myoporum laetum": [{ name: "Ngaio", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Insects (Pepeke) ─────────────────────

  "deinacrida heteracantha": [{ name: "Wētāpunga", language: "Te Reo Māori", languageCode: "mi" }],
  "deinacrida mahoenui": [{ name: "Wētāpunga", language: "Te Reo Māori", languageCode: "mi" }],
  "hemideina thoracica": [{ name: "Wētā", language: "Te Reo Māori", languageCode: "mi" }],
  "hemideina crassidens": [{ name: "Wētā", language: "Te Reo Māori", languageCode: "mi" }],
  "hemideina femorata": [{ name: "Wētā", language: "Te Reo Māori", languageCode: "mi" }],
  "gymnoplectron acanthocerum": [{ name: "Wētā", language: "Te Reo Māori", languageCode: "mi" }],
  "prionoplus reticularis": [{ name: "Huhu", language: "Te Reo Māori", languageCode: "mi" }],
  "aenetus virescens": [{ name: "Pepe Pūriri", language: "Te Reo Māori", languageCode: "mi" }],
  "kikihia muta": [{ name: "Kihikihi", language: "Te Reo Māori", languageCode: "mi" }],
  "kikihia scutellaris": [{ name: "Kihikihi", language: "Te Reo Māori", languageCode: "mi" }],
  "zephyresthes phoebe": [{ name: "Pepe", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Reptiles (Ngārara) ───────────────────

  "sphenodon punctatus": [{ name: "Tuatara", language: "Te Reo Māori", languageCode: "mi" }],
  "oligosoma grande": [{ name: "Moko", language: "Te Reo Māori", languageCode: "mi" }],
  "oligosoma otagense": [{ name: "Moko", language: "Te Reo Māori", languageCode: "mi" }],
  "naultinus elegans": [{ name: "Moko Kākāriki", language: "Te Reo Māori", languageCode: "mi" }],
  "naultinus gemmeus": [{ name: "Moko Kākāriki", language: "Te Reo Māori", languageCode: "mi" }],
  "mokopirirakau granulatus": [{ name: "Moko", language: "Te Reo Māori", languageCode: "mi" }],
  "woodworthia maculata": [{ name: "Moko", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Mammals (Kararehe) ───────────────────

  "chalinolobus tuberculatus": [{ name: "Pekapeka-tou-roa", language: "Te Reo Māori", languageCode: "mi" }],
  "mystacina tuberculata": [{ name: "Pekapeka-tou-poto", language: "Te Reo Māori", languageCode: "mi" }],
  "arctocephalus forsteri": [{ name: "Kekeno", language: "Te Reo Māori", languageCode: "mi" }],
  "phocarctos hookeri": [{ name: "Whakahao", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Amphibians (Poroka) ──────────────────

  "leiopelma hochstetteri": [{ name: "Pepetuna", language: "Te Reo Māori", languageCode: "mi" }],
  "leiopelma archeyi": [{ name: "Pepetuna", language: "Te Reo Māori", languageCode: "mi" }],
  "leiopelma hamiltoni": [{ name: "Pepetuna", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Aotearoa / New Zealand — Fungi (Harore) ───────────────────────

  "auricularia cornea": [{ name: "Hakeke", language: "Te Reo Māori", languageCode: "mi" }],
  "lycoperdon perlatum": [{ name: "Pukurau", language: "Te Reo Māori", languageCode: "mi" }],
  "entoloma hochstetteri": [{ name: "Werewere-kōkako", language: "Te Reo Māori", languageCode: "mi" }],
  "cordyceps robertsii": [{ name: "Āwheto", language: "Te Reo Māori", languageCode: "mi" }],

  // ── Hawaiʻi — ʻŌlelo Hawaiʻi ──────────────────────────────────────

  "branta sandvicensis": [{ name: "Nēnē", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "moho braccatus": [{ name: "ʻŌʻō", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "corvus hawaiiensis": [{ name: "ʻAlalā", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "himantopus mexicanus knudseni": [{ name: "Aeʻo", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "fulica alai": [{ name: "ʻAlae Keʻokeʻo", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "gallinula galeata sandvicensis": [{ name: "ʻAlae ʻUla", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "drepanis coccinea": [{ name: "ʻIʻiwi", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "vestiaria coccinea": [{ name: "ʻIʻiwi", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "himatione sanguinea": [{ name: "ʻApapane", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "chlorodrepanis virens": [{ name: "ʻAmakihi", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "phoebastria immutabilis": [{ name: "Mōlī", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "phaethon lepturus": [{ name: "Koaʻe Kea", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],
  "gygis alba": [{ name: "Manu-o-Kū", language: "ʻŌlelo Hawaiʻi", languageCode: "haw" }],

  // ── Australia — select Aboriginal names ────────────────────────────

  "dacelo novaeguineae": [{ name: "Guuguubarra", language: "Wiradjuri", languageCode: "wrh" }],
  "dromaius novaehollandiae": [{ name: "Kalaya", language: "Pitjantjatjara", languageCode: "pjt" }],
  "gymnorhina tibicen": [{ name: "Burrugaabu", language: "Wiradjuri", languageCode: "wrh" }],
  "aquila audax": [{ name: "Wallu", language: "Wiradjuri", languageCode: "wrh" }],
  "platycercus eximius": [{ name: "Bunduluk", language: "Wiradjuri", languageCode: "wrh" }],
};

/**
 * Look up indigenous names for a species by its scientific name.
 * When coords are provided, only returns names whose language region
 * contains the given location — so Te Reo Māori names only appear
 * when the user is quizzing in New Zealand, etc.
 */
export function getIndigenousNames(
  scientificName: string,
  coords?: { lat: number; lng: number } | null
): IndigenousName[] {
  const all = INDIGENOUS_NAMES[scientificName.toLowerCase()] || [];
  if (!coords || all.length === 0) return all;
  return all.filter((n) => {
    const code = n.languageCode;
    if (!code) return true; // no code → always show
    const region = LANGUAGE_REGIONS[code];
    if (!region) return true; // unknown region → always show
    return isInRegion(coords, region);
  });
}

/**
 * Attach indigenous names to a species array (mutates in place for efficiency).
 * When coords are provided, filters to only region-appropriate names.
 */
export function attachIndigenousNames(
  species: Species[],
  coords?: { lat: number; lng: number } | null
): void {
  for (const s of species) {
    const names = getIndigenousNames(s.scientificName, coords);
    if (names.length > 0) {
      s.indigenousNames = names;
    }
  }
}

// Re-import to avoid circular dep issues — only used for the type
import type { Species } from "./types";
