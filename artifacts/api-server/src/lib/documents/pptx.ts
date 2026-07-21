import pptxgen from "pptxgenjs";
import type { DocumentType } from "../ai/generator";

// Brand theme
const VIOLET = "7C3AED";
const DARK = "1E293B";
const GRAY = "94A3B8";
const WHITE = "FFFFFF";
const LIGHT = "F8FAFC";

const str = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? (v as unknown[]).map(str) : [];

function addTitleSlide(prs: pptxgen, title: string, subtitle: string, presenter: string) {
  const slide = prs.addSlide();
  // Full violet bg
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: VIOLET } });
  // White accent bar
  slide.addShape(prs.ShapeType.rect, { x: 0, y: "65%", w: "30%", h: "6%", fill: { color: WHITE } });
  slide.addText(title, { x: 0.5, y: 1.2, w: 9, h: 1.4, fontSize: 36, bold: true, color: WHITE, fontFace: "Calibri" });
  slide.addText(subtitle, { x: 0.5, y: 2.9, w: 9, h: 0.6, fontSize: 18, color: "D4B8FF", fontFace: "Calibri" });
  slide.addText(presenter, { x: 0.5, y: 4.8, w: 9, h: 0.4, fontSize: 12, color: "D4B8FF", fontFace: "Calibri" });
}

function addContentSlide(
  prs: pptxgen,
  slideTitle: string,
  bodyText?: string,
  bullets?: string[]
) {
  const slide = prs.addSlide();
  // Header bar
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "14%", fill: { color: VIOLET } });
  slide.addText(slideTitle, { x: 0.4, y: 0.1, w: 9, h: 0.7, fontSize: 22, bold: true, color: WHITE, fontFace: "Calibri" });
  // Thin accent line
  slide.addShape(prs.ShapeType.rect, { x: 0.4, y: "14%", w: 1.2, h: "1.5%", fill: { color: VIOLET } });

  let yPos = 1.2;
  if (bodyText) {
    slide.addText(bodyText, {
      x: 0.4, y: yPos, w: 9, h: 1.2,
      fontSize: 13, color: DARK, fontFace: "Calibri",
      wrap: true,
    });
    yPos += 1.4;
  }
  if (bullets && bullets.length > 0) {
    const bulletObjs = bullets.map((b) => ({
      text: b,
      options: { bullet: { type: "bullet" as const }, fontSize: 13, color: DARK, fontFace: "Calibri", paraSpaceAfter: 8 },
    }));
    slide.addText(bulletObjs, { x: 0.4, y: yPos, w: 9, h: 5.5 - yPos, valign: "top" });
  }
}

function addTwoColumnSlide(
  prs: pptxgen,
  slideTitle: string,
  leftTitle: string,
  leftItems: string[],
  rightTitle: string,
  rightItems: string[]
) {
  const slide = prs.addSlide();
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "14%", fill: { color: VIOLET } });
  slide.addText(slideTitle, { x: 0.4, y: 0.1, w: 9, h: 0.7, fontSize: 22, bold: true, color: WHITE, fontFace: "Calibri" });

  // Left column
  slide.addShape(prs.ShapeType.rect, { x: 0.4, y: 1.1, w: 4.2, h: 0.35, fill: { color: VIOLET } });
  slide.addText(leftTitle, { x: 0.4, y: 1.1, w: 4.2, h: 0.35, fontSize: 11, bold: true, color: WHITE, fontFace: "Calibri", align: "center" });
  const leftBullets = leftItems.map((b) => ({ text: b, options: { bullet: { type: "bullet" as const }, fontSize: 12, color: DARK, fontFace: "Calibri", paraSpaceAfter: 6 } }));
  slide.addText(leftBullets, { x: 0.4, y: 1.5, w: 4.2, h: 4, valign: "top" });

  // Right column
  slide.addShape(prs.ShapeType.rect, { x: 5, y: 1.1, w: 4.4, h: 0.35, fill: { color: DARK } });
  slide.addText(rightTitle, { x: 5, y: 1.1, w: 4.4, h: 0.35, fontSize: 11, bold: true, color: WHITE, fontFace: "Calibri", align: "center" });
  const rightBullets = rightItems.map((b) => ({ text: b, options: { bullet: { type: "bullet" as const }, fontSize: 12, color: DARK, fontFace: "Calibri", paraSpaceAfter: 6 } }));
  slide.addText(rightBullets, { x: 5, y: 1.5, w: 4.4, h: 4, valign: "top" });
}

function addTableSlide(
  prs: pptxgen,
  slideTitle: string,
  headers: string[],
  rows: string[][]
) {
  const slide = prs.addSlide();
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "14%", fill: { color: VIOLET } });
  slide.addText(slideTitle, { x: 0.4, y: 0.1, w: 9, h: 0.7, fontSize: 22, bold: true, color: WHITE, fontFace: "Calibri" });

  const tableData = [
    headers.map((h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: VIOLET }, fontSize: 12 } })),
    ...rows.map((row, ri) =>
      row.map((cell) => ({ text: cell, options: { color: DARK, fill: { color: ri % 2 === 0 ? WHITE : LIGHT }, fontSize: 11 } }))
    ),
  ];
  slide.addTable(tableData, { x: 0.4, y: 1.1, w: 9, colW: headers.map(() => 9 / headers.length) });
}

function addCTASlide(prs: pptxgen, title: string, body: string, steps: string[]) {
  const slide = prs.addSlide();
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: DARK } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: "60%", w: "25%", h: "8%", fill: { color: VIOLET } });
  slide.addText(title, { x: 0.5, y: 0.8, w: 9, h: 1, fontSize: 32, bold: true, color: WHITE, fontFace: "Calibri" });
  slide.addText(body, { x: 0.5, y: 2, w: 9, h: 1.2, fontSize: 14, color: GRAY, fontFace: "Calibri", wrap: true });
  if (steps.length) {
    const stepObjs = steps.map((s, i) => ({
      text: `${i + 1}. ${s}`,
      options: { fontSize: 13, color: "D4B8FF", fontFace: "Calibri", paraSpaceAfter: 10 },
    }));
    slide.addText(stepObjs, { x: 0.5, y: 3.5, w: 9, h: 2 });
  }
}

export async function exportToPPTX(
  type: DocumentType,
  content: Record<string, unknown>
): Promise<Buffer> {
  const prs = new pptxgen();

  prs.layout = "LAYOUT_WIDE";
  prs.author = "AgencyFlow AI";
  prs.title = str(content.title ?? content.projectName ?? "Presentation");

  if (type === "presentation") {
    const slides = content.slides as Array<Record<string, unknown>> | undefined;

    if (Array.isArray(slides)) {
      for (const slide of slides) {
        const st = str(slide.type);
        if (st === "title") {
          addTitleSlide(prs, str(slide.title), str(slide.subtitle ?? ""), str(slide.presenter ?? content.agency ?? ""));
        } else if (st === "agenda") {
          addContentSlide(prs, str(slide.title), undefined, arr(slide.points));
        } else if (st === "overview") {
          addContentSlide(prs, str(slide.title), str(slide.body ?? ""), arr(slide.points));
        } else if (st === "goals") {
          addContentSlide(prs, str(slide.title), undefined, arr(slide.points));
        } else if (st === "audience") {
          addTwoColumnSlide(
            prs,
            str(slide.title),
            "Primary Audience", [str(slide.primary ?? "")],
            "Key Insights", arr(slide.insights)
          );
        } else if (st === "approach") {
          addContentSlide(prs, str(slide.title), str(slide.body ?? ""), arr(slide.pillars));
        } else if (st === "deliverables") {
          const items = slide.items as Array<Record<string, unknown>> | undefined;
          const bullets = Array.isArray(items)
            ? items.map((i) => `${str(i.name)}: ${str(i.description)}`)
            : [];
          addContentSlide(prs, str(slide.title), undefined, bullets);
        } else if (st === "timeline") {
          const phases = slide.phases as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(phases)) {
            const rows = phases.map((p) => [str(p.name), str(p.duration), arr(p.tasks).join(", ")]);
            addTableSlide(prs, str(slide.title), ["Phase", "Duration", "Activities"], rows);
          }
        } else if (st === "investment") {
          const breakdown = slide.breakdown as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(breakdown)) {
            const rows = breakdown.map((b) => [str(b.item), `$${Number(b.amount).toLocaleString()}`]);
            addTableSlide(prs, str(slide.title), ["Item", "Amount"], rows);
          }
        } else if (st === "cta") {
          addCTASlide(prs, str(slide.title), str(slide.body ?? ""), arr(slide.nextSteps));
        } else {
          addContentSlide(prs, str(slide.title), str(slide.body ?? ""), arr(slide.points));
        }
      }
    }
  } else {
    // For proposal, contract, invoice — create a simple summary PPTX
    addTitleSlide(
      prs,
      str(content.projectName ?? content.title ?? "Document"),
      `${type.charAt(0).toUpperCase() + type.slice(1)} | ${str(content.clientName ?? "")}`,
      str(content.agencyName ?? content.preparedBy ?? "AgencyFlow")
    );
    addContentSlide(prs, "Executive Summary", str(content.executiveSummary ?? content.projectDescription ?? ""), undefined);

    if (type === "proposal") {
      addContentSlide(prs, "Campaign Goals", undefined, arr(content.campaignGoals));
      addContentSlide(prs, "Scope of Work", undefined, arr(content.scope));
      addContentSlide(prs, "Why Choose Us", undefined, arr(content.whyUs));
    } else if (type === "contract") {
      addContentSlide(prs, "Scope of Work", undefined, arr(content.scope));
    } else if (type === "invoice") {
      const items = content.items as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(items)) {
        addTableSlide(
          prs,
          "Invoice Items",
          ["Description", "Qty", "Rate", "Amount"],
          items.map((i) => [str(i.description), str(i.quantity), `$${Number(i.rate).toLocaleString()}`, `$${Number(i.amount).toLocaleString()}`])
        );
      }
    }
  }

  const buf = (await prs.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return Buffer.from(buf);
}
