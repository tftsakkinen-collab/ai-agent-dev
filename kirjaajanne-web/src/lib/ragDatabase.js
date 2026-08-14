/**
 * MOCKED RAG (Retrieval-Augmented Generation) Database
 * In a real MVP, this would connect to a local vector database (like Chroma or FAISS)
 * containing embedded "Käypä hoito" guidelines.
 */

const mockGuidelines = [
  {
    id: "kh-tmd",
    keywords: ["leukanivel", "puremalihas", "tmd", "temporomandibulaari", "naksuminen", "kipu"],
    content: "Käypä hoito: Purentaelimistön toimintahäiriöt (TMD). Diagnostiikka perustuu kliiniseen tutkimukseen (esim. leukanivelen äänet, liikkuvuus, palpaatioarkuus). Konservatiivinen hoito (kuten fysioterapia ja purentakiskot) on ensisijainen."
  },
  {
    id: "kh-niskakipu",
    keywords: ["niska", "cervikaalinen", "kranio", "kraniocervikaalinen", "huimaus", "päänsärky"],
    content: "Käypä hoito: Niskakipu. Kraniocervikaalisen alueen tutkiminen on tärkeää jännityspäänsäryn ja niskaperäisen huimauksen erotusdiagnostiikassa. Hoitona suositellaan terapeuttista harjoittelua ja manuaalista terapiaa."
  },
  {
    id: "kh-olkapää",
    keywords: ["olkapää", "kiertäjäkalvosin", "rotator", "cuff", "inpingement", "ahdas"],
    content: "Käypä hoito: Olkapään jännevaivat. Kiertäjäkalvosimen oireyhtymässä konservatiivinen hoito, kuten spesifi fysioterapeuttinen harjoittelu, on ensisijaista. Leikkaushoitoa harkitaan vasta, jos konservatiivinen hoito ei tehoa."
  }
];

export async function retrieveContext(transcribedText) {
  // Simulate network/database delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const lowerText = transcribedText.toLowerCase();

  // Simple keyword matching to simulate vector similarity search
  let bestMatch = null;
  let maxScore = 0;

  for (const guideline of mockGuidelines) {
    let score = 0;
    for (const keyword of guideline.keywords) {
      if (lowerText.includes(keyword)) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = guideline;
    }
  }

  // If we found a relevant guideline, return it. Otherwise, return a generic medical context.
  if (bestMatch) {
    return bestMatch.content;
  }

  return "Yleinen lääketieteellinen konteksti: Varmista termien (esim. anatomiset rakenteet, diagnoosit) oikeinkirjoitus ja muotoile teksti ammattimaiseen SOAP-rakenteeseen (Subjektiivinen, Objektiivinen, Analyysi, Plan).";
}
