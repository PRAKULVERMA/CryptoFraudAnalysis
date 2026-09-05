import PDFDocument from 'pdfkit';

class ReportService {
  generateInvestigationReport(investigation, res) {
    const result = investigation?.results || investigation || {};
    const investigationId = investigation?.investigation_id || result?.investigation_id || 'UNKNOWN';
    const filename = `chaintrace-investigation-${investigationId}.pdf`;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `CHAINTRACE AI Investigation Report - ${investigationId}`,
        Author: 'CHAINTRACE AI',
        Subject: 'Automated Blockchain Intelligence Investigation',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc
      .fontSize(25)
      .font('Helvetica-Bold')
      .text('CHAINTRACE AI', { align: 'center' });

    doc
      .moveDown(0.3)
      .fontSize(13)
      .font('Helvetica')
      .text('AUTOMATED BLOCKCHAIN INTELLIGENCE', { align: 'center' });

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('gray')
      .text('INVESTIGATION & FUND-FLOW ANALYSIS REPORT', { align: 'center' });

    doc.fillColor('black');
    doc.moveDown(1.5);

    this.sectionTitle(doc, '1. Executive Summary');
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('CHAINTRACE AI automatically analyzed the submitted blockchain wallet, traced associated fund movements, detected suspicious graph patterns, calculated a risk score, and identified the likely destination entity or service.');

    doc.moveDown(0.8);
    this.field(doc, 'Investigation ID', investigationId);
    this.field(doc, 'Case ID', result.caseId);
    this.field(doc, 'Investigation Status', investigation?.status || result?.status);
    this.field(doc, 'Analysis Mode', result.mode);
    this.field(doc, 'Synthetic / Demo Data', result.synthetic ? 'YES' : 'NO');

    this.sectionTitle(doc, '2. Target Wallet');
    this.field(doc, 'Wallet Address', result.address);
    this.field(doc, 'Blockchain Network', result.network);
    this.field(doc, 'Analysis Timestamp', result.timestamp);

    this.sectionTitle(doc, '3. Risk Assessment');
    this.field(doc, 'Risk Score', result.riskScore !== undefined ? `${result.riskScore}/100` : 'N/A');
    this.field(doc, 'Risk Level', result.riskLevel);
    this.field(doc, 'Confidence', result.confidence);
    doc.moveDown(0.4);

    if (Array.isArray(result.risk_factors) && result.risk_factors.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('Risk Factors:');
      result.risk_factors.forEach((factor, index) => {
        doc.fontSize(9).font('Helvetica').text(`${index + 1}. ${this.formatValue(factor)}`, { indent: 12 });
      });
    } else {
      doc.fontSize(9).font('Helvetica').text('No specific risk factors were returned.');
    }

    this.sectionTitle(doc, '4. Transaction & Fund-Flow Analysis');
    this.field(doc, 'Transactions Analyzed', result.transactionsAnalyzed);
    this.field(doc, 'Funds Traced', result.fundsTraced);
    this.field(doc, 'Maximum Trace Hops', result.hopCount);
    this.field(doc, 'Clustering Analysis', result.clusteringTag);
    this.field(doc, 'Peeling-Chain Analysis', result.peelingChains);

    this.sectionTitle(doc, '5. Destination Attribution');
    this.field(doc, 'Likely Destination', result.destinationExchange);

    if (result.destination) {
      this.field(doc, 'Destination Type', result.destination.destination_type);
      this.field(doc, 'Entity Name', result.destination.entity_name);
      if (result.destination.confidence !== undefined) {
        this.field(doc, 'Attribution Confidence', result.destination.confidence);
      }
    }

    this.sectionTitle(doc, '6. Detected Fraud Patterns');
    if (Array.isArray(result.patterns) && result.patterns.length > 0) {
      result.patterns.forEach((pattern, index) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`Pattern ${index + 1}`);
        this.renderObject(doc, pattern);
        doc.moveDown(0.4);
      });
    } else {
      doc.fontSize(10).font('Helvetica').text('No high-confidence fraud patterns were detected.');
    }

    this.sectionTitle(doc, '7. Blockchain Trace Summary');
    if (result.trace_summary) {
      this.renderObject(doc, result.trace_summary);
    } else {
      doc.fontSize(10).font('Helvetica').text('Trace summary unavailable.');
    }

    this.sectionTitle(doc, '8. Compliance Screening');
    this.field(doc, 'OFAC Match', result.ofacMatch ? 'MATCH DETECTED' : 'NO MATCH DETECTED');

    this.sectionTitle(doc, '9. Investigation Timeline');
    this.field(doc, 'Created At', investigation?.created_at);
    this.field(doc, 'Completed At', investigation?.completed_at || 'N/A');
    this.field(doc, 'Final Progress', `${investigation?.progress ?? 100}%`);

    this.sectionTitle(doc, '10. Automated Investigation Conclusion');
    let conclusion = 'CHAINTRACE AI completed the automated blockchain analysis.';

    if (typeof result.riskScore === 'number') {
      if (result.riskScore >= 75) {
        conclusion += ' The wallet received a HIGH-RISK assessment and should be prioritized for further investigation.';
      } else if (result.riskScore >= 50) {
        conclusion += ' The wallet received a MEDIUM-RISK assessment and warrants additional investigation.';
      } else {
        conclusion += ' The wallet received a LOWER-RISK assessment based on the currently available evidence.';
      }
    }

    doc.fontSize(10).font('Helvetica').text(conclusion);

    this.sectionTitle(doc, '11. Evidence & Limitations');
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('This report contains automated analytical findings generated by CHAINTRACE AI from blockchain transaction and tracing data available during the investigation.');

    doc.moveDown(0.4);
    doc.text('Risk scores, clustering results, and destination attribution represent analytical indicators and should not be interpreted as definitive legal conclusions or proof of criminal activity.');
    doc.moveDown(0.4);

    if (result.synthetic) {
      doc.font('Helvetica-Bold').text('IMPORTANT: This investigation used synthetic/demo blockchain data. Results are intended for demonstration, testing, and prototype evaluation only.');
    } else {
      doc.text('This investigation used live-mode blockchain data. Analysts should independently verify important findings against the underlying blockchain evidence and relevant intelligence sources.');
    }

    doc.moveDown(1.2);
    doc.fontSize(8).fillColor('gray').text(`Generated by CHAINTRACE AI | ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown(0.2).text('Automated Blockchain Intelligence & Fraud Investigation Platform', { align: 'center' });
    doc.end();
  }

  sectionTitle(doc, title) {
    doc.moveDown(0.8).fontSize(13).font('Helvetica-Bold').fillColor('black').text(title);
    doc.moveDown(0.35);
  }

  field(doc, label, value) {
    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(this.formatValue(value));

    doc.moveDown(0.15);
  }

  formatValue(value) {
    if (value === undefined || value === null) {
      return 'N/A';
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }

  renderObject(doc, object, level = 0) {
    if (object === null || object === undefined) {
      return;
    }

    if (typeof object !== 'object') {
      doc.fontSize(9).font('Helvetica').text(String(object));
      return;
    }

    if (Array.isArray(object)) {
      object.forEach((item, index) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`• Item ${index + 1}`);
        this.renderObject(doc, item, level + 1);
      });
      return;
    }

    Object.entries(object).forEach(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

      if (value !== null && typeof value === 'object') {
        doc.fontSize(9).font('Helvetica-Bold').text(`${label}:`);
        this.renderObject(doc, value, level + 1);
      } else {
        this.field(doc, label, value);
      }
    });
  }
}

export default new ReportService();

