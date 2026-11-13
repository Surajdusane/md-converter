const CSV_SAMPLE = `Quarter,Revenue,Customers,Top product
Q1 2026,48200,1312,Analytics Lite
Q2 2026,53150,1458,Analytics Lite
Q3 2026,61800,1591,Reports Pro
Q4 2026,72400,1784,Reports Pro`;

const RTF_SAMPLE = `{\\rtf1\\ansi\\ansicpg1252\\deff0
{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}
\\pard\\f0\\fs24
\\b\\fs28 Project retro - notes\\b0\\par
\\pard\\sb120\\sa120
What went well:\\par
\\bullet Cross-team reviews caught two edge cases early\\par
\\bullet The new CI pipeline cut release time in half\\par
\\bullet Support tickets dropped after the onboarding rewrite\\par
\\par
What to improve:\\par
\\bullet Start sprints with a design sign-off\\par
\\bullet Tag flaky tests instead of skipping them\\par
\\par
\\b Next steps\\b0\\par
1. Ship the beta to the pilot group by Friday\\par
2. Collect feedback in the shared doc\\par
3. Decide on the Q3 scope in Monday's planning\\par
}`;

function fileFromText(name: string, text: string, type: string): File {
  return new File([new TextEncoder().encode(text)], name, { type });
}

export const SAMPLES: Array<{ name: string; label: string; file: () => File }> =
  [
    { name: "report.csv", label: "report.csv", file: () => fileFromText("report.csv", CSV_SAMPLE, "text/csv") },
    { name: "notes.rtf", label: "notes.rtf", file: () => fileFromText("notes.rtf", RTF_SAMPLE, "application/rtf") },
  ];
