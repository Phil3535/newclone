import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface ProposalData {
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  systemSize: number;
  panelCount: number;
  systemCost: number;
  taxCredit: number;
  netCost: number;
  monthlySavings: number;
  annualSavings: number;
  paybackYears: number;
  totalSavings25Years: number;
  co2Offset: number;
  repName: string;
  repPhone: string;
  repEmail: string;
  date: string;
}

export function generateProposalHTML(data: ProposalData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Solar Proposal - ${data.customerName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; }
        .header h1 { font-size: 32px; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .section { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .section-title { font-size: 18px; font-weight: 600; color: #f59e0b; margin-bottom: 16px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .info-item { }
        .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 18px; font-weight: 600; color: #1e293b; }
        .savings-highlight { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border-radius: 16px; padding: 32px; text-align: center; margin: 30px 0; }
        .savings-amount { font-size: 48px; font-weight: 800; }
        .savings-label { font-size: 16px; opacity: 0.9; }
        .cost-breakdown { }
        .cost-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .cost-row:last-child { border-bottom: none; }
        .cost-row.total { font-weight: 700; font-size: 20px; color: #f59e0b; border-top: 2px solid #f59e0b; margin-top: 8px; padding-top: 16px; }
        .green { color: #22c55e; }
        .footer { text-align: center; margin-top: 40px; padding: 24px; background: #1e293b; color: white; border-radius: 12px; }
        .footer p { margin-bottom: 8px; }
        .cta { background: #f59e0b; color: white; padding: 16px 32px; border-radius: 8px; font-weight: 700; display: inline-block; margin-top: 16px; text-decoration: none; }
        .benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
        .benefit { text-align: center; padding: 16px; background: white; border-radius: 8px; }
        .benefit-icon { font-size: 32px; margin-bottom: 8px; }
        .benefit-text { font-size: 14px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">☀️ SOLAR EMPIRE</div>
          <h1>Your Custom Solar Proposal</h1>
          <p>Prepared exclusively for ${data.customerName}</p>
        </div>

        <div class="section">
          <div class="section-title">Customer Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${data.customerName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${data.customerEmail}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Property Address</div>
              <div class="info-value">${data.customerAddress}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Proposal Date</div>
              <div class="info-value">${data.date}</div>
            </div>
          </div>
        </div>

        <div class="savings-highlight">
          <div class="savings-label">Your Estimated 25-Year Savings</div>
          <div class="savings-amount">$${data.totalSavings25Years.toLocaleString()}</div>
          <div class="savings-label">That's $${data.monthlySavings}/month back in your pocket!</div>
        </div>

        <div class="section">
          <div class="section-title">System Specifications</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">System Size</div>
              <div class="info-value">${data.systemSize} kW</div>
            </div>
            <div class="info-item">
              <div class="info-label">Number of Panels</div>
              <div class="info-value">${data.panelCount} panels</div>
            </div>
            <div class="info-item">
              <div class="info-label">Annual Savings</div>
              <div class="info-value green">$${data.annualSavings.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Payback Period</div>
              <div class="info-value">${data.paybackYears} years</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Investment Breakdown</div>
          <div class="cost-breakdown">
            <div class="cost-row">
              <span>System Cost</span>
              <span>$${data.systemCost.toLocaleString()}</span>
            </div>
            <div class="cost-row green">
              <span>Federal Tax Credit (30%)</span>
              <span>-$${data.taxCredit.toLocaleString()}</span>
            </div>
            <div class="cost-row total">
              <span>Your Net Investment</span>
              <span>$${data.netCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Environmental Impact</div>
          <p>By going solar, you'll offset approximately <strong>${data.co2Offset.toLocaleString()} kg of CO2</strong> every year - that's like planting <strong>${Math.round(data.co2Offset / 22)} trees</strong> annually!</p>
          <div class="benefits">
            <div class="benefit">
              <div class="benefit-icon">🌱</div>
              <div class="benefit-text">Reduce Carbon Footprint</div>
            </div>
            <div class="benefit">
              <div class="benefit-icon">💰</div>
              <div class="benefit-text">Lock in Energy Costs</div>
            </div>
            <div class="benefit">
              <div class="benefit-icon">🏠</div>
              <div class="benefit-text">Increase Home Value</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Your Solar Consultant</strong></p>
          <p>${data.repName}</p>
          <p>${data.repPhone} | ${data.repEmail}</p>
          <a href="tel:${data.repPhone}" class="cta">Schedule Installation →</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateAndShareProposal(data: ProposalData): Promise<boolean> {
  try {
    const html = generateProposalHTML(data);
    
    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Share the PDF
    if (Platform.OS === 'web') {
      // On web, open in new tab
      window.open(uri, '_blank');
    } else if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Solar Proposal for ${data.customerName}`,
        UTI: 'com.adobe.pdf',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Proposal generation error:', error);
    return false;
  }
}
