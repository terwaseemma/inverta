import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// Proposal PDF — structured after the classic Nigerian installer quote
// (load analysis → recommendation → cost breakdown → payment → contact),
// dressed in the Inverta brand (navy + orange).
//
// Built-in Helvetica only: WinAnsi encoding can't render the ₦ glyph, so all
// money renders as "NGN 1,234".

const ORANGE = '#ff7a33';
const NAVY = '#16161f';
const MUTED = '#6b6b76';
const BORDER = '#e3e3e8';
const ZEBRA = '#f7f7f9';

export interface ProposalPdfData {
  installer: {
    businessName: string;
    phone: string;
    email: string;
    address: string | null;
    websiteUrl: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  };
  /** Pre-fetched logo bytes; react-pdf supports png/jpg only */
  logo: { data: Buffer; format: 'png' | 'jpg' } | null;
  customerName: string;
  createdAt: Date;
  validUntil: Date | null;
  customMessage: string | null;
  /** e.g. "5 kVA Solar Installation" — headline of the document */
  systemLabel: string;
  /** e.g. "5kVA inverter · 10kWh lithium battery · 2.7kWp solar panels" */
  recommendation: string | null;
  loadRows: {
    name: string;
    powerW: number;
    quantity: number;
    totalPowerW: number;
    hours: number;
    energyWh: number;
  }[];
  loadTotals: { powerW: number; energyWh: number } | null;
  items: {
    name: string;
    description: string | null;
    quantity: number;
    unitPriceKobo: number;
  }[];
  totalKobo: number;
}

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9.5, fontFamily: 'Helvetica', color: NAVY },

  // Header band
  band: { backgroundColor: NAVY, paddingVertical: 22, paddingHorizontal: 40 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bandLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 4 },
  businessName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  bandContact: { fontSize: 8, color: '#b9b9c4', marginTop: 3 },
  bandDate: { fontSize: 9, color: '#b9b9c4', textAlign: 'right' },
  accent: { height: 4, backgroundColor: ORANGE },

  body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 80 },

  docTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  docSub: { fontSize: 9, color: MUTED, marginTop: 3 },
  fluctuation: {
    fontSize: 8,
    color: MUTED,
    marginTop: 6,
    fontFamily: 'Helvetica-Oblique',
  },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ORANGE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Tables
  th: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  trZebra: { backgroundColor: ZEBRA },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#fff1e8',
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
  },

  // Load table columns
  lNo: { width: '6%' },
  lName: { width: '30%' },
  lPower: { width: '13%', textAlign: 'right' },
  lQty: { width: '10%', textAlign: 'right' },
  lTotal: { width: '14%', textAlign: 'right' },
  lHours: { width: '12%', textAlign: 'right' },
  lEnergy: { width: '15%', textAlign: 'right' },

  // Cost table columns
  cItem: { width: '46%' },
  cQty: { width: '12%', textAlign: 'right' },
  cUnit: { width: '20%', textAlign: 'right' },
  cPrice: { width: '22%', textAlign: 'right' },
  itemDesc: { fontSize: 7.5, color: MUTED, marginTop: 1.5 },

  investmentLabel: { width: '78%', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  investmentValue: {
    width: '22%',
    textAlign: 'right',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: ORANGE,
  },

  recommendation: {
    backgroundColor: '#fff1e8',
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
    padding: 10,
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  recommendationLabel: { fontFamily: 'Helvetica-Bold' },

  message: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
    lineHeight: 1.5,
    color: '#333',
  },

  payment: {
    backgroundColor: NAVY,
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: { color: '#b9b9c4', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentValue: { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  terms: { marginTop: 16, fontSize: 8, color: MUTED, lineHeight: 1.6 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  footerThanks: {
    color: ORANGE,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 4,
  },
  footerGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  footerCell: { fontSize: 7, color: '#b9b9c4', maxWidth: '32%' },
  footerCellLabel: { fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  powered: { fontSize: 6.5, color: '#8a8a96', marginTop: 6, textAlign: 'center' },
});

function ngn(kobo: number): string {
  return `NGN ${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function n(v: number): string {
  return v.toLocaleString('en-NG', { maximumFractionDigits: 1 });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildProposalPdf(data: ProposalPdfData) {
  const { installer } = data;
  const hasPayment = Boolean(installer.bankAccountNumber);

  return (
    <Document
      title={`${data.systemLabel} — ${data.customerName}`}
      author={installer.businessName}
    >
      <Page size="A4" style={s.page}>
        {/* Brand band */}
        <View style={s.band} fixed>
          <View style={s.bandRow}>
            <View style={s.bandLeft}>
              {data.logo && (
                <Image
                  style={s.logo}
                  src={{ data: data.logo.data, format: data.logo.format }}
                />
              )}
              <View>
                <Text style={s.businessName}>{installer.businessName}</Text>
                <Text style={s.bandContact}>
                  {installer.phone} · {installer.email}
                  {installer.websiteUrl ? ` · ${installer.websiteUrl}` : ''}
                </Text>
              </View>
            </View>
            <Text style={s.bandDate}>{fmtDate(data.createdAt)}</Text>
          </View>
        </View>
        <View style={s.accent} fixed />

        <View style={s.body}>
          <Text style={s.docTitle}>{data.systemLabel} Proposal & Quote</Text>
          <Text style={s.docSub}>Prepared for {data.customerName}</Text>
          <Text style={s.fluctuation}>
            Note: this quote is subject to price fluctuations.
            {data.validUntil ? ` Valid until ${fmtDate(data.validUntil)}.` : ''}
          </Text>

          {data.customMessage && (
            <View style={s.section}>
              <View style={s.message}>
                <Text>{data.customMessage}</Text>
              </View>
            </View>
          )}

          {/* Electrical load analysis */}
          {data.loadRows.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Electrical Load Analysis</Text>
              <View style={s.th}>
                <Text style={s.lNo}>No</Text>
                <Text style={s.lName}>Load name</Text>
                <Text style={s.lPower}>Power (W)</Text>
                <Text style={s.lQty}>Qty</Text>
                <Text style={s.lTotal}>Total (W)</Text>
                <Text style={s.lHours}>Hours</Text>
                <Text style={s.lEnergy}>Energy (Wh)</Text>
              </View>
              {data.loadRows.map((row, i) => (
                <View key={i} style={[s.tr, ...(i % 2 ? [s.trZebra] : [])]}>
                  <Text style={s.lNo}>{i + 1}</Text>
                  <Text style={s.lName}>{row.name}</Text>
                  <Text style={s.lPower}>{n(row.powerW)}</Text>
                  <Text style={s.lQty}>{n(row.quantity)}</Text>
                  <Text style={s.lTotal}>{n(row.totalPowerW)}</Text>
                  <Text style={s.lHours}>{n(row.hours)}</Text>
                  <Text style={s.lEnergy}>{n(row.energyWh)}</Text>
                </View>
              ))}
              {data.loadTotals && (
                <View style={s.totalRow}>
                  <Text style={{ width: '46%' }}>Totals</Text>
                  <Text style={s.lPower} />
                  <Text style={s.lTotal}>{n(data.loadTotals.powerW)} W</Text>
                  <Text style={s.lHours} />
                  <Text style={s.lEnergy}>{n(data.loadTotals.energyWh)} Wh</Text>
                </View>
              )}
            </View>
          )}

          {/* Recommendation */}
          {data.recommendation && (
            <View style={s.section}>
              <View style={s.recommendation}>
                <Text>
                  <Text style={s.recommendationLabel}>Recommendation: </Text>
                  {data.recommendation}
                </Text>
              </View>
            </View>
          )}

          {/* Cost breakdown */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cost Breakdown</Text>
            <View style={s.th}>
              <Text style={s.cItem}>Item</Text>
              <Text style={s.cQty}>Qty</Text>
              <Text style={s.cUnit}>Unit price</Text>
              <Text style={s.cPrice}>Price</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={[s.tr, ...(i % 2 ? [s.trZebra] : [])]}>
                <View style={s.cItem}>
                  <Text>{item.name}</Text>
                  {item.description ? (
                    <Text style={s.itemDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={s.cQty}>{item.quantity}</Text>
                <Text style={s.cUnit}>{ngn(item.unitPriceKobo)}</Text>
                <Text style={s.cPrice}>{ngn(item.quantity * item.unitPriceKobo)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.investmentLabel}>Investment</Text>
              <Text style={s.investmentValue}>{ngn(data.totalKobo)}</Text>
            </View>
          </View>

          {/* Payment details */}
          {hasPayment && (
            <View style={s.section}>
              <View style={s.payment}>
                <View>
                  <Text style={s.paymentLabel}>Payment details</Text>
                  <Text style={s.paymentValue}>
                    {installer.bankAccountNumber}
                    {installer.bankName ? ` · ${installer.bankName}` : ''}
                  </Text>
                </View>
                {installer.bankAccountName && (
                  <View>
                    <Text style={s.paymentLabel}>Account name</Text>
                    <Text style={s.paymentValue}>{installer.bankAccountName}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={s.terms}>
            <Text>
              Prices include supply of listed equipment. Installation timelines are
              confirmed on acceptance. Terms of payment to be agreed with{' '}
              {installer.businessName}.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerThanks}>THANK YOU</Text>
          <View style={s.footerGrid}>
            <Text style={s.footerCell}>
              <Text style={s.footerCellLabel}>Phone{'\n'}</Text>
              {installer.phone}
            </Text>
            {installer.address && (
              <Text style={s.footerCell}>
                <Text style={s.footerCellLabel}>Address{'\n'}</Text>
                {installer.address}
              </Text>
            )}
            <Text style={s.footerCell}>
              <Text style={s.footerCellLabel}>Email{'\n'}</Text>
              {installer.email}
              {installer.websiteUrl ? `\n${installer.websiteUrl}` : ''}
            </Text>
          </View>
          <Text style={s.powered}>Generated with Inverta — inverta.app</Text>
        </View>
      </Page>
    </Document>
  );
}
