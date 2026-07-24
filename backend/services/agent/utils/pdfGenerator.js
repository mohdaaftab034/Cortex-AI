import PDFDocument from "pdfkit";

export const generatePDF = (markdownContent) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: "Generated Document",
                Creator: "CortexAI",
            },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const lines = markdownContent.split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith("# ") && !line.startsWith("## ")) {
                if (doc.y > 100) doc.addPage();
                doc.fontSize(22).font("Helvetica-Bold");
                doc.text(line.slice(2).trim(), { underline: true });
                doc.moveDown(0.8);
            } else if (line.startsWith("## ")) {
                doc.fontSize(16).font("Helvetica-Bold");
                doc.text(line.slice(3).trim());
                doc.moveDown(0.5);
            } else if (line.startsWith("### ")) {
                doc.fontSize(13).font("Helvetica-Bold");
                doc.text(line.slice(4).trim());
                doc.moveDown(0.3);
            } else if (line.startsWith("- ") || line.startsWith("* ")) {
                doc.fontSize(11).font("Helvetica");
                const indent = 20;
                const text = line.slice(2).trim();
                doc.text(text, indent, doc.y, { indent: 0 });
                doc.moveDown(0.2);
            } else if (line.match(/^\d+\.\s/)) {
                doc.fontSize(11).font("Helvetica");
                doc.text(line.trim(), 20, doc.y, { indent: 0 });
                doc.moveDown(0.2);
            } else if (line.startsWith("---") || line.startsWith("***")) {
                doc.moveDown(0.3);
                const y = doc.y;
                doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#999999").stroke();
                doc.moveDown(0.3);
            } else if (line.trim() === "") {
                doc.moveDown(0.3);
            } else if (line.startsWith("> ")) {
                doc.fontSize(11).font("Helvetica-Oblique");
                const text = line.slice(2).trim();
                doc.text(text, 60, doc.y, { indent: 0 });
                doc.moveDown(0.2);
            } else if (line.startsWith("```")) {
                let code = "";
                i++;
                while (i < lines.length && !lines[i].startsWith("```")) {
                    code += lines[i] + "\n";
                    i++;
                }
                if (code.trim()) {
                    doc.fontSize(9).font("Courier");
                    const y = doc.y;
                    doc.rect(55, y, doc.page.width - 110, 0).fillAndStroke("#f5f5f5", "#dddddd");
                    doc.text(code.trim(), 60, doc.y + 5);
                    doc.moveDown(0.3);
                }
            } else {
                doc.fontSize(11).font("Helvetica");
                doc.text(line.trim());
                doc.moveDown(0.2);
            }

            if (doc.y > doc.page.height - 70) {
                doc.addPage();
            }
        }

        doc.end();
    });
};
