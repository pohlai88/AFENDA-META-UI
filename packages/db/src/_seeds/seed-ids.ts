/**
 * Centralized deterministic UUID pool for ALL seed domains.
 *
 * WHY centralized (not per-domain):
 *   Cross-domain FK references are the norm in ERP — commissions reference
 *   sales order IDs, sales reference product IDs, tax fiscal-positions reference
 *   country IDs. Splitting would create circular imports. Keep this file flat;
 *   add new domain blocks with a comment header.
 *
 * Protocol for new domains (HRM, CRM, Manufacturing, …):
 *   1. Append a new block below with a domain-header comment.
 *   2. Follow the pattern: "000XXYY-0000-4000-8000-000000000YYY"
 *      where XX = domain sequence, YY = entity sequence within domain.
 *
 * IMPORTANT: Changing any UUID alters seed.snapshot and intentionally breaks CI.
 */

export const SEED_IDS = {
  // ── Partners ──────────────────────────────────────────────────────────────
  partnerAccentCorp: "00000001-0000-4000-8000-000000000001",
  partnerBetaTech: "00000002-0000-4000-8000-000000000002",
  partnerGammaServices: "00000003-0000-4000-8000-000000000003",
  partnerDeltaInc: "00000004-0000-4000-8000-000000000004",

  // ── Product Categories ────────────────────────────────────────────────────
  categoryHardware: "00000101-0000-4000-8000-000000000101",
  categorySoftware: "00000102-0000-4000-8000-000000000102",
  categoryServices: "00000103-0000-4000-8000-000000000103",
  categoryComputers: "00000104-0000-4000-8000-000000000104",
  categoryPeripherals: "00000105-0000-4000-8000-000000000105",

  // ── Products ──────────────────────────────────────────────────────────────
  productLaptop: "00000201-0000-4000-8000-000000000201",
  productDesktop: "00000202-0000-4000-8000-000000000202",
  productMonitor: "00000203-0000-4000-8000-000000000203",
  productMouse: "00000204-0000-4000-8000-000000000204",
  productKeyboard: "00000205-0000-4000-8000-000000000205",
  productLicense: "00000206-0000-4000-8000-000000000206",

  // ── Sales Orders ──────────────────────────────────────────────────────────
  orderOne: "00000301-0000-4000-8000-000000000301",
  orderTwo: "00000302-0000-4000-8000-000000000302",
  orderThree: "00000303-0000-4000-8000-000000000303",
  orderFour: "00000304-0000-4000-8000-000000000304",

  // ── Sales Order Lines ─────────────────────────────────────────────────────
  lineOne: "00000401-0000-4000-8000-000000000401",
  lineTwo: "00000402-0000-4000-8000-000000000402",
  lineThree: "00000403-0000-4000-8000-000000000403",
  lineFour: "00000404-0000-4000-8000-000000000404",
  lineFive: "00000405-0000-4000-8000-000000000405",
  lineSix: "00000406-0000-4000-8000-000000000406",
  lineSeven: "00000407-0000-4000-8000-000000000407",
  lineEight: "00000408-0000-4000-8000-000000000408",
  lineNine: "00000409-0000-4000-8000-000000000409",

  // ── Commercial Policy ─────────────────────────────────────────────────────
  paymentTermNet30: "00000501-0000-4000-8000-000000000501",
  paymentTermSplit: "00000502-0000-4000-8000-000000000502",
  paymentTermLineNet30: "00000503-0000-4000-8000-000000000503",
  paymentTermLineSplit1: "00000504-0000-4000-8000-000000000504",
  paymentTermLineSplit2: "00000505-0000-4000-8000-000000000505",
  pricelistUsdStandard: "00000601-0000-4000-8000-000000000601",
  pricelistUsdVip: "00000602-0000-4000-8000-000000000602",
  pricelistItemGlobalStandard: "00000603-0000-4000-8000-000000000603",
  pricelistItemLaptopDiscount: "00000604-0000-4000-8000-000000000604",

  // ── Tax (Phase 0 + Phase 2) ───────────────────────────────────────────────
  taxGroupSalesStandard: "00000701-0000-4000-8000-000000000701",
  taxRateSalesStandard10: "00000702-0000-4000-8000-000000000702",
  taxGroupVat: "00000703-0000-4000-8000-000000000703",
  taxGroupGst: "00000704-0000-4000-8000-000000000704",
  taxRateVat20: "00000705-0000-4000-8000-000000000705",
  taxRateCgst9: "00000706-0000-4000-8000-000000000706",
  taxRateSgst9: "00000707-0000-4000-8000-000000000707",
  taxRateGst18: "00000708-0000-4000-8000-000000000708",
  taxRateCityTax2: "00000709-0000-4000-8000-000000000709",
  fiscalPositionDomesticUs: "0000070A-0000-4000-8000-00000000070A",
  fiscalPositionInternationalEu: "0000070B-0000-4000-8000-00000000070B",
  fiscalPositionIndiaGst: "0000070C-0000-4000-8000-00000000070C",
  fiscalPositionTaxExempt: "0000070D-0000-4000-8000-00000000070D",
  fiscalPositionTaxMapUsToVat: "0000070E-0000-4000-8000-00000000070E",
  fiscalPositionTaxMapExemption: "0000070F-0000-4000-8000-00000000070F",

  // ── Sales Auxiliary (Phase 6) ─────────────────────────────────────────────
  saleOrderLineTaxOne: "00000801-0000-4000-8000-000000000801",
  saleOrderLineTaxTwo: "00000802-0000-4000-8000-000000000802",
  saleOrderLineTaxThree: "00000803-0000-4000-8000-000000000803",
  saleOrderLineTaxFour: "00000804-0000-4000-8000-000000000804",
  saleOrderLineTaxFive: "00000805-0000-4000-8000-000000000805",
  saleOrderLineTaxSix: "00000806-0000-4000-8000-000000000806",
  saleOrderLineTaxSeven: "00000807-0000-4000-8000-000000000807",
  saleOrderLineTaxEight: "00000808-0000-4000-8000-000000000808",
  saleOrderLineTaxNine: "00000809-0000-4000-8000-000000000809",
  saleOrderStatusHistoryOne: "00000901-0000-4000-8000-000000000901",
  saleOrderStatusHistoryTwo: "00000902-0000-4000-8000-000000000902",
  saleOrderStatusHistoryThree: "00000903-0000-4000-8000-000000000903",
  saleOrderTaxSummaryOne: "00001001-0000-4000-8000-000000001001",
  saleOrderTaxSummaryTwo: "00001002-0000-4000-8000-000000001002",
  saleOrderTaxSummaryThree: "00001003-0000-4000-8000-000000001003",
  saleOrderTaxSummaryFour: "00001004-0000-4000-8000-000000001004",
  saleOrderOptionLineOne: "00001005-0000-4000-8000-000000001005",
  saleOrderOptionLineTwo: "00001006-0000-4000-8000-000000001006",

  // ── Consignment (Phase 7) ─────────────────────────────────────────────────
  consignmentAgreementOne: "00001101-0000-4000-8000-000000001101",
  consignmentAgreementLineOne: "00001102-0000-4000-8000-000000001102",
  consignmentAgreementLineTwo: "00001103-0000-4000-8000-000000001103",
  consignmentStockReportOne: "00001104-0000-4000-8000-000000001104",
  consignmentStockReportLineOne: "00001105-0000-4000-8000-000000001105",
  consignmentStockReportLineTwo: "00001106-0000-4000-8000-000000001106",
  consignmentAgreementDraft: "00001107-0000-4000-8000-000000001107",
  consignmentAgreementExpired: "00001108-0000-4000-8000-000000001108",
  consignmentAgreementTerminated: "00001109-0000-4000-8000-000000001109",
  consignmentAgreementLineDraft1: "0000110A-0000-4000-8000-00000000110A",
  consignmentAgreementLineExpired1: "0000110B-0000-4000-8000-00000000110B",
  consignmentAgreementLineTerminated1: "0000110C-0000-4000-8000-00000000110C",
  consignmentStockReportDraft: "0000110D-0000-4000-8000-00000000110D",
  consignmentStockReportInvoiced: "0000110E-0000-4000-8000-00000000110E",
  consignmentStockReportLineDraft1: "0000110F-0000-4000-8000-00000000110F",
  consignmentStockReportLineInvoiced1: "00001110-0000-4000-8000-000000001110",
  consignmentStockReportLineInvoiced2: "00001111-0000-4000-8000-000000001111",

  // ── Returns / RMA (Phase 8) ───────────────────────────────────────────────
  returnReasonDamaged: "00001201-0000-4000-8000-000000001201",
  returnReasonDefective: "00001202-0000-4000-8000-000000001202",
  returnReasonWrongItem: "00001203-0000-4000-8000-000000001203",
  returnReasonUnwanted: "00001204-0000-4000-8000-000000001204",
  returnOrderDraft: "00001205-0000-4000-8000-000000001205",
  returnOrderApproved: "00001206-0000-4000-8000-000000001206",
  returnOrderReceived: "00001207-0000-4000-8000-000000001207",
  returnOrderInspected: "00001208-0000-4000-8000-000000001208",
  returnOrderCredited: "00001209-0000-4000-8000-000000001209",
  returnOrderCancelled: "0000120A-0000-4000-8000-00000000120A",
  returnOrderLineDraft1: "0000120B-0000-4000-8000-00000000120B",
  returnOrderLineApproved1: "0000120C-0000-4000-8000-00000000120C",
  returnOrderLineReceived1: "0000120D-0000-4000-8000-00000000120D",
  returnOrderLineInspected1: "0000120E-0000-4000-8000-00000000120E",
  returnOrderLineCredited1: "0000120F-0000-4000-8000-00000000120F",
  returnOrderLineCancelled1: "00001210-0000-4000-8000-000000001210",

  // ── Subscriptions (Phase 9) ───────────────────────────────────────────────
  subscriptionCloseReasonBudget: "00001301-0000-4000-8000-000000001301",
  subscriptionTemplateMonthlySupport: "00001302-0000-4000-8000-000000001302",
  subscriptionOne: "00001303-0000-4000-8000-000000001303",
  subscriptionLineOne: "00001304-0000-4000-8000-000000001304",
  subscriptionLineTwo: "00001305-0000-4000-8000-000000001305",
  subscriptionLogOne: "00001306-0000-4000-8000-000000001306",

  // ── Commissions & Sales Teams (Phase 10) ──────────────────────────────────
  salesTeamNorthAmerica: "00001401-0000-4000-8000-000000001401",
  salesTeamMemberPrimary: "00001402-0000-4000-8000-000000001402",
  territoryNorthAmericaWest: "00001403-0000-4000-8000-000000001403",
  territoryRuleCalifornia: "00001404-0000-4000-8000-000000001404",
  commissionPlanRevenueStandard: "00001405-0000-4000-8000-000000001405",
  commissionPlanTierRevenueStandard: "00001406-0000-4000-8000-000000001406",
  commissionEntryOrderOne: "00001407-0000-4000-8000-000000001407",
  commissionEntryOrderOneDraft: "00001408-0000-4000-8000-000000001408",
  commissionEntryOrderOnePaid: "00001409-0000-4000-8000-000000001409",

  // ── Product Templates (Phase 5) ───────────────────────────────────────────
  productTmplTShirt: "00001501-0000-4000-8000-000000001501",
  productTmplLaptopPro: "00001502-0000-4000-8000-000000001502",

  // ── Product Attributes (Phase 5) ──────────────────────────────────────────
  attrSize: "00001503-0000-4000-8000-000000001503",
  attrColor: "00001504-0000-4000-8000-000000001504",

  // ── Product Attribute Values (Phase 5) ────────────────────────────────────
  attrValSizeS: "00001505-0000-4000-8000-000000001505",
  attrValSizeM: "00001506-0000-4000-8000-000000001506",
  attrValSizeL: "00001507-0000-4000-8000-000000001507",
  attrValColorRed: "00001508-0000-4000-8000-000000001508",
  attrValColorBlue: "00001509-0000-4000-8000-000000001509",

  // ── Product Template Attribute Lines (Phase 5) ────────────────────────────
  tmplAttrLineTshirtSize: "0000150A-0000-4000-8000-00000000150A",
  tmplAttrLineTshirtColor: "0000150B-0000-4000-8000-00000000150B",

  // ── Product Template Attribute Values (Phase 5) ───────────────────────────
  tmplAttrValTshirtS: "0000150C-0000-4000-8000-00000000150C",
  tmplAttrValTshirtM: "0000150D-0000-4000-8000-00000000150D",
  tmplAttrValTshirtL: "0000150E-0000-4000-8000-00000000150E",
  tmplAttrValTshirtRed: "0000150F-0000-4000-8000-00000000150F",
  tmplAttrValTshirtBlue: "00001510-0000-4000-8000-000000001510",

  // ── Product Variants (Phase 5) ────────────────────────────────────────────
  variantTshirtRedS: "00001511-0000-4000-8000-000000001511",
  variantTshirtRedM: "00001512-0000-4000-8000-000000001512",
  variantTshirtRedL: "00001513-0000-4000-8000-000000001513",
  variantTshirtBlueS: "00001514-0000-4000-8000-000000001514",
  variantTshirtBlueM: "00001515-0000-4000-8000-000000001515",
  variantTshirtBlueL: "00001516-0000-4000-8000-000000001516",

  // ── Product Packaging (Phase 5) ───────────────────────────────────────────
  packagingTshirtBox: "00001517-0000-4000-8000-000000001517",
  packagingLaptopPallet: "00001518-0000-4000-8000-000000001518",

  // ── HRM (future) ── append block here ─────────────────────────────────────
  // ── CRM (future) ── append block here ─────────────────────────────────────
  // ── Manufacturing (future) ── append block here ───────────────────────────
} as const;

export type SeedIds = typeof SEED_IDS;
