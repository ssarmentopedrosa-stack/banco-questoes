import raw from "../../public/oficial-view.json";

export type OfficialAlt = { letter: string; text: string };
export type OfficialVariant = {
  id: string;
  year: number;
  day: number;
  booklet: number;
  color: string | null;
  number: number;
  document_id: string;
  sha256: string;
  start_page: number;
  end_page: number;
  statement: string;
  alternatives: OfficialAlt[];
  alternatives_status: string;
  extraction_status: string;
  answer: string | null;
  answer_status: string;
  matching_status: string | null;
  reconstruction_status?: string;
};
export type OfficialImage = {
  variant_id: string;
  page: number;
  index: number;
  width: number;
  height: number;
  status: string;
  raster: null;
};
export type OfficialFigure = {
  src: string;
  kind: "enunciado" | "alternativas" | "expressao";
  label: string;
  width: number;
  height: number;
  source: {
    booklet: number;
    color: string;
    number: number;
    page: number;
    pdf_sha256: string;
    dpi: number;
    text_match: number;
  };
};
export type OfficialView = {
  variants: OfficialVariant[];
  images: OfficialImage[];
  essential_image_unavailable: boolean;
  image_required: boolean;
  diagram_required: boolean;
  matching_status_record: string | null;
  figures?: OfficialFigure[];
  figures_status?: "associada_caderno_azul" | "sem_figura_na_prova" | "nao_associada_variante_sem_caderno_azul";
};

export const oficial = raw as unknown as Record<string, OfficialView>;
