import {
  BookOpenTextIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileType2Icon,
  FileIcon,
  PresentationIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Format } from "@/lib/wasm";

export type FormatMeta = {
  format: Format;
  label: string;
  short: string;
  icon: LucideIcon;
};

const META: Record<Format, Omit<FormatMeta, "format">> = {
  doc: { label: "Word 97–2003", short: "doc", icon: FileTextIcon },
  docx: { label: "Word", short: "docx", icon: FileTextIcon },
  odt: { label: "OpenDocument text", short: "odt", icon: FileTextIcon },
  pdf: { label: "PDF", short: "pdf", icon: FileIcon },
  ppt: { label: "PowerPoint 97–2003", short: "ppt", icon: PresentationIcon },
  pptx: { label: "PowerPoint", short: "pptx", icon: PresentationIcon },
  odp: { label: "OpenDocument presentation", short: "odp", icon: PresentationIcon },
  xlsx: { label: "Excel", short: "xlsx", icon: FileSpreadsheetIcon },
  ods: { label: "OpenDocument spreadsheet", short: "ods", icon: FileSpreadsheetIcon },
  csv: { label: "CSV", short: "csv", icon: FileSpreadsheetIcon },
  rtf: { label: "Rich text", short: "rtf", icon: FileType2Icon },
  epub: { label: "eBook", short: "epub", icon: BookOpenTextIcon },
};

export const SUPPORTED_FORMATS: FormatMeta[] = (Object.keys(META) as Format[]).map(
  (format) => ({ format, ...META[format] }),
);

export function formatMeta(format: Format | string | null | undefined): FormatMeta | null {
  if (!format) {
    return null;
  }
  const meta = META[format as Format];
  return meta ? { format: format as Format, ...meta } : null;
}