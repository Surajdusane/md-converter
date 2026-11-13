import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    question: "Which formats can I convert?",
    answer:
      "Word (.doc, .docx), OpenDocument text (.odt), PowerPoint (.ppt, .pptx, .odp), Excel (.xlsx, .ods), CSV, PDF, rich text (.rtf), and ebooks (.epub).",
  },
  {
    question: "Are my documents uploaded anywhere?",
    answer:
      "No. Everything runs inside your browser - the converter is a WebAssembly module that processes each file locally. Nothing leaves this page.",
  },
  {
    question: "Why does a .txt file convert as a different format?",
    answer:
      "The converter detects the real format from the file's content. If a document was saved with the wrong extension, the badge on its card shows what was actually detected.",
  },
  {
    question: "What happens with password-protected files?",
    answer:
      "Encrypted files can't be read without the password, so the file is skipped and the card explains why. Remove the password and try again.",
  },
  {
    question: "Are there size limits?",
    answer:
      "Very large or deeply nested documents may exceed the in-browser safety limits and fail with a clear message. Regular office documents convert fine.",
  },
  {
    question: "How accurate is the token estimate?",
    answer:
      "It's a rough estimate - about 1.3 tokens per word - meant to help you gauge context usage before feeding the markdown to an AI tool.",
  },
] as const;

export function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 md:py-20">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Questions
        </h2>
        <p className="mt-2 text-muted-foreground">
          A few things people usually ask.
        </p>
      </div>
      <Accordion defaultValue={[FAQ[0].question]}>
        {FAQ.map(({ question, answer }) => (
          <AccordionItem key={question} value={question}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionPanel>{answer}</AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}