import PptxGenJS from "pptxgenjs";

export const generatePPT = (markdownContent) => {
    return new Promise((resolve, reject) => {
        try {
            const pptx = new PptxGenJS();
            pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
            pptx.layout = "WIDE";

            const lines = markdownContent.split("\n");
            let currentSlide = null;
            let titleSlideContent = null;
            let speakerNotes = "";

            const createContentSlide = (title) => {
                const slide = pptx.addSlide();
                const textColor = "1e293b";
                const accentColor = "4f46e5";

                slide.background = { fill: "ffffff" };

                slide.addShape(pptx.ShapeType.rect, {
                    x: 0, y: 0, w: 13.333, h: 1.3,
                    fill: { color: "1e1b4b" },
                });

                slide.addText(title, {
                    x: 0.8, y: 0.3, w: 11.7, h: 0.8,
                    fontSize: 28,
                    fontFace: "Calibri Light",
                    color: "ffffff",
                    bold: true,
                });

                slide.addShape(pptx.ShapeType.rect, {
                    x: 0, y: 1.3, w: 13.333, h: 0.06,
                    fill: { color: "4f46e5" },
                });

                return { slide, contentY: 1.8, notes: "" };
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith("# ") && !line.startsWith("## ")) {
                    titleSlideContent = {
                        title: line.slice(2).trim(),
                    };
                } else if (line.startsWith("## ")) {
                    if (currentSlide) {
                        if (speakerNotes.trim()) {
                            currentSlide.slide.addNotes(speakerNotes.trim());
                        }
                    }
                    speakerNotes = "";
                    const slideTitle = line.slice(3).trim();
                    currentSlide = createContentSlide(slideTitle);
                } else if (currentSlide && (line.startsWith("- ") || line.startsWith("* "))) {
                    const bullet = line.slice(2).trim();
                    if (bullet) {
                        currentSlide.slide.addText(`•  ${bullet}`, {
                            x: 0.8, y: currentSlide.contentY, w: 11.5, h: 0.55,
                            fontSize: 18,
                            fontFace: "Calibri",
                            color: "334155",
                            bullet: false,
                            paraSpaceAfter: 4,
                        });
                        currentSlide.contentY += 0.6;
                    }
                } else if (currentSlide && line.match(/^\d+\.\s/)) {
                    const numbered = line.trim();
                    if (numbered) {
                        currentSlide.slide.addText(numbered, {
                            x: 0.8, y: currentSlide.contentY, w: 11.5, h: 0.55,
                            fontSize: 18,
                            fontFace: "Calibri",
                            color: "334155",
                            paraSpaceAfter: 4,
                        });
                        currentSlide.contentY += 0.6;
                    }
                } else if (line.startsWith("_") && line.endsWith("_") && currentSlide) {
                    const note = line.slice(1, -1).trim();
                    if (note) {
                        speakerNotes += note + "\n";
                        currentSlide.slide.addText(note, {
                            x: 0.8, y: currentSlide.contentY, w: 11.5, h: 0.5,
                            fontSize: 14,
                            fontFace: "Calibri",
                            color: "94a3b8",
                            italic: true,
                            paraSpaceAfter: 2,
                        });
                        currentSlide.contentY += 0.5;
                    }
                } else if (line.startsWith("> ") && currentSlide) {
                    const quote = line.slice(2).trim();
                    if (quote) {
                        currentSlide.slide.addShape(pptx.ShapeType.rect, {
                            x: 0.8, y: currentSlide.contentY, w: 0.06, h: 0.5,
                            fill: { color: "4f46e5" },
                        });
                        currentSlide.slide.addText(quote, {
                            x: 1.1, y: currentSlide.contentY, w: 11, h: 0.5,
                            fontSize: 16,
                            fontFace: "Calibri",
                            color: "64748b",
                            italic: true,
                        });
                        currentSlide.contentY += 0.55;
                    }
                } else if (currentSlide && line && !line.startsWith("```") && !line.startsWith("---") && !line.startsWith("***")) {
                    currentSlide.slide.addText(line, {
                        x: 0.8, y: currentSlide.contentY, w: 11.5, h: 0.5,
                        fontSize: 16,
                        fontFace: "Calibri",
                        color: "475569",
                        paraSpaceAfter: 2,
                    });
                    currentSlide.contentY += 0.5;
                }
            }

            if (currentSlide && speakerNotes.trim()) {
                currentSlide.slide.addNotes(speakerNotes.trim());
            }

            if (titleSlideContent) {
                const titleSlide = pptx.slides[0] || pptx.addSlide();
                titleSlide.background = { fill: "1e1b4b" };

                titleSlide.addShape(pptx.ShapeType.rect, {
                    x: 0, y: 0, w: 13.333, h: 7.5,
                    fill: { color: "1e1b4b" },
                });

                titleSlide.addShape(pptx.ShapeType.rect, {
                    x: 0, y: 3.2, w: 13.333, h: 0.04,
                    fill: { color: "4f46e5" },
                });

                titleSlide.addText(titleSlideContent.title, {
                    x: 1.5, y: 2.0, w: 10.3, h: 1.2,
                    fontSize: 40,
                    fontFace: "Calibri Light",
                    color: "ffffff",
                    bold: true,
                    align: "center",
                });

                titleSlide.addText("CortexAI Presentation", {
                    x: 1.5, y: 3.5, w: 10.3, h: 0.6,
                    fontSize: 18,
                    fontFace: "Calibri",
                    color: "a5b4fc",
                    align: "center",
                });

                if (currentSlide === titleSlide) {
                    currentSlide = null;
                }
            }

            if (pptx.slides.length === 0) {
                const slide = pptx.addSlide();
                slide.background = { fill: "1e1b4b" };
                slide.addText("Presentation", {
                    x: 1, y: 2, w: 11.3, h: 1,
                    fontSize: 36,
                    fontFace: "Calibri Light",
                    color: "ffffff",
                    bold: true,
                    align: "center",
                });
            }

            pptx.write({ outputType: "nodebuffer" }).then(resolve).catch(reject);
        } catch (error) {
            reject(error);
        }
    });
};
