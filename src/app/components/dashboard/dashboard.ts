import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { QuickAddInvoiceItem } from './quick-add-invoice-item/quick-add-invoice-item';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { catchError, forkJoin, of } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { ClientService } from '../../services/client.service';


// Define interfaces based on Mongoose models
interface IClient {
  name: string;
  address: string;
  email: string;
  phone: string;
  gstin: string;
  state: string;
  stateCode: string;
  status: 'Active' | 'Inactive';
}

interface IInvoice {
  /** Backend id for /invoice/form/:id */
  id?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  client: string;
  company: string;
  /** Resolved total for display and charts (API field or computed from line items). */
  totalAmount: number;
  cgstRate?: number;
  sgstRate?: number;
  status: 'Draft' | 'Paid' | 'Cancelled' | 'Finalized';
  dueDate?: Date;
  /** From populated client on API; used for top clients / charts */
  clientState?: string;
}

interface IInvoiceAmount {
  invoice: string;
  subtotal: number;
  cgstAmount?: number;
  sgstAmount?: number;
  grandTotal: number;
  amountInWords: string;
}

interface ITopClient {
  name: string;
  totalInvoices: number;
  totalAmount: number;
  state: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ChartModule,
    CardModule,
    TableModule,
    CommonModule,
    FormsModule,
    QuickAddInvoiceItem,
    RouterLink,
    ButtonModule,
    RippleModule,
    TagModule,
    TooltipModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    InputGroupModule,
    InputGroupAddonModule,
  ],
  templateUrl: './dashboard.html',
  styles: [
    `
      :host {
        @apply block;
      }
      .dashboard-page {
        container-type: inline-size;
      }
      .p-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .p-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      }
      .dark .p-card:hover {
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.25);
      }
      .kpi-card:hover {
        transform: translateY(-3px) scale(1.01);
      }
      .status-draft {
        @apply text-yellow-600 dark:text-yellow-400 font-semibold;
      }
      .status-paid {
        @apply text-green-600 dark:text-green-400 font-semibold;
      }
      .status-cancelled {
        @apply text-red-600 dark:text-red-400 font-semibold;
      }
      .status-finalized {
        @apply text-indigo-600 dark:text-indigo-400 font-semibold;
      }
      .filter-pill {
        @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium;
      }
      .greeting-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .chart-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
      }
      :host ::ng-deep .chart-wrapper canvas {
        max-width: 100% !important;
        max-height: 100% !important;
      }
      /* Dashboard tables: attractive and responsive */
      :host ::ng-deep .dashboard-table-wrapper {
        border-radius: 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.06);
        overflow: hidden;
      }
      :host .p-dark ::ng-deep .dashboard-table-wrapper,
      :host-context(.dark) ::ng-deep .dashboard-table-wrapper {
        border-color: rgba(255, 255, 255, 0.08);
      }
      :host ::ng-deep .dashboard-table .p-datatable-thead > tr > th {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        color: #475569;
        font-weight: 600;
        font-size: 0.75rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e2e8f0;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-thead > tr > th,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-thead > tr > th {
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
        color: #94a3b8;
        border-bottom-color: rgba(255, 255, 255, 0.08);
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
        padding: 0.65rem 1rem;
        font-size: 0.8125rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
        border-bottom-color: rgba(255, 255, 255, 0.06);
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td {
        background: #f8fafc !important;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td {
        background: rgba(51, 65, 85, 0.4) !important;
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td {
        background: rgba(248, 250, 252, 0.6);
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td {
        background: rgba(30, 41, 59, 0.3);
      }
      @media (max-width: 640px) {
        :host ::ng-deep .dashboard-table .p-datatable-thead > tr > th,
        :host ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
          padding: 0.5rem 0.5rem;
          font-size: 0.75rem;
        }
      }
      /* Invoice Explorer: date pickers responsive and tidy */
      :host ::ng-deep .explorer-date.p-datepicker,
      :host ::ng-deep .explorer-filter {
        width: 100%;
        min-width: 0;
      }
      :host ::ng-deep .explorer-date .p-inputtext {
        width: 100%;
        min-width: 0;
        border-radius: 0.5rem;
      }
    `,
  ],
})
export class Dashboard implements OnInit {
  private readonly invoiceService = inject(InvoiceService);
  private readonly clientService = inject(ClientService);

  /** Populated from GET Clients (for name/state when invoice stores only client id). */
  private clientDetailsById = new Map<string, { name: string; state: string }>();

  clients: IClient[] = [];
  invoices: IInvoice[] = [];
  invoiceAmounts: IInvoiceAmount[] = [];

  // Summary data
  summary = {
    totalClients: 0,
    totalInvoices: 0,
    /** Sum of amounts on all invoices (billed value). */
    totalRevenue: 0,
    paidInvoices: 0,
    /** Sum of amounts where status is Paid. */
    paidRevenue: 0,
    /** Draft + Finalized (not yet paid). */
    outstandingInvoices: 0,
    outstandingAmount: 0,
  };

  // Chart data
  invoiceStatusChartData: any;
  /** Revenue by company (top companies). */
  companyRevenueChartData: any;
  monthlyRevenueChartData: any;
  invoiceAgingChartData: any;
  invoiceStatusTrendChartData: any;
  chartOptions: any;
  doughnutChartOptions: any;
  recentInvoices: IInvoice[] = [];
  invoiceAmountMap: { [key: string]: IInvoiceAmount } = {};
  topClients: ITopClient[] = [];
  /** Invoices due in the next 7 days (draft only) */
  invoicesDueSoon: IInvoice[] = [];
  /** Revenue and count for current month (dummy: Jun 2025) */
  thisMonth = { revenue: 0, invoiceCount: 0 };
  /** Greeting and current date */
  today = new Date();

  /** Customizable widget: filters */
  filterStatus: string[] = [];
  filterClient = '';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  /** View mode for customizable widget: table, bar, or line */
  customWidgetView: 'table' | 'bar' | 'line' = 'table';
  customViewOptions = [
    { label: 'Table', value: 'table' },
    { label: 'Bar chart', value: 'bar' },
    { label: 'Line chart', value: 'line' },
  ];
  statusOptions = [
    { label: 'Paid', value: 'Paid' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Finalized', value: 'Finalized' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];
  get clientOptions(): { label: string; value: string }[] {
    return this.clients.map((c) => ({ label: c.name, value: c.name }));
  }

  /** Filtered invoices based on customizable widget filters */
  get filteredInvoices(): IInvoice[] {
    let list = [...this.invoices];
    if (this.filterStatus.length > 0) {
      list = list.filter((i) => this.filterStatus.includes(i.status));
    }
    if (this.filterClient) {
      list = list.filter((i) => i.client === this.filterClient);
    }
    if (this.filterDateFrom) {
      list = list.filter((i) => new Date(i.invoiceDate) >= this.filterDateFrom!);
    }
    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((i) => new Date(i.invoiceDate) <= to);
    }
    return list;
  }

  /** Chart data for filtered invoices (by status count or by month) */
  get filteredChartData(): { labels: string[]; datasets: { label: string; data: number[]; backgroundColor?: string[]; borderColor?: string; fill?: boolean; tension?: number }[] } {
    if (this.customWidgetView === 'bar') {
      const statusCounts = { Paid: 0, Draft: 0, Cancelled: 0, Finalized: 0 };
      this.filteredInvoices.forEach((i) => {
        const k = i.status as keyof typeof statusCounts;
        if (k in statusCounts) statusCounts[k] += 1;
      });
      return {
        labels: ['Paid', 'Draft', 'Finalized', 'Cancelled'],
        datasets: [
          {
            label: 'Count',
            data: [
              statusCounts.Paid,
              statusCounts.Draft,
              statusCounts.Finalized,
              statusCounts.Cancelled,
            ],
            backgroundColor: ['#34D399', '#FBBF24', '#6366F1', '#EF4444'],
          },
        ],
      };
    }
    if (this.customWidgetView === 'line') {
      const byMonth: { [key: string]: number } = {};
      this.filteredInvoices.forEach((i) => {
        const d = new Date(i.invoiceDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + (i.totalAmount || 0);
      });
      const sorted = Object.keys(byMonth).sort();
      return {
        labels: sorted.map((k) => {
          const [y, m] = k.split('-');
          const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
          return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          {
            label: 'Revenue (₹)',
            data: sorted.map((k) => byMonth[k]),
            fill: true,
            borderColor: '#8B5CF6',
            tension: 0.4,
          },
        ],
      };
    }
    return { labels: [], datasets: [] };
  }

  clearCustomFilters(): void {
    this.filterStatus = [];
    this.filterClient = '';
    this.filterDateFrom = null;
    this.filterDateTo = null;
  }

  /** Populated from live data when available (optional; no placeholder copy). */
  activityItems: { icon: string; text: string; time: string; color: string }[] = [];

  ngOnInit() {
    injectVercelAnalytics();
    injectSpeedInsights();
    forkJoin({
      invoices: this.invoiceService.searchInvoices({}).pipe(catchError(() => of(null))),
      clients: this.clientService.getClients().pipe(catchError(() => of(null))),
    }).subscribe(({ invoices: invRes, clients: cliRes }) => {
      this.clientDetailsById = this.buildClientDetailsMap(cliRes);
      const list = invRes === null ? [] : this.extractInvoiceList(invRes);
      if (list.length > 0) {
        this.applyInvoiceListFromApi(list);
      } else {
        this.applyEmptyInvoiceDataset();
      }
      this.initializeData();
      this.initializeCharts();
    });
  }

  /** Consistent display for invoice / due dates (avoids invalid Date pipe output). */
  formatInvoiceDate(d: Date | undefined): string {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /** Route param for invoice form: prefers API id, else invoice number (legacy). */
  invoiceFormRouteId(inv: IInvoice): string {
    return inv.id || inv.invoiceNumber;
  }

  private extractInvoiceList(res: unknown): any[] {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      const o = res as Record<string, unknown>;
      if (Array.isArray(o['data'])) return o['data'] as any[];
      if (Array.isArray(o['invoices'])) return o['invoices'] as any[];
    }
    return [];
  }

  private extractClientList(res: unknown): any[] {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      const o = res as Record<string, unknown>;
      if (Array.isArray(o['data'])) return o['data'] as any[];
      if (Array.isArray(o['clients'])) return o['clients'] as any[];
    }
    return [];
  }

  private buildClientDetailsMap(res: unknown): Map<string, { name: string; state: string }> {
    const map = new Map<string, { name: string; state: string }>();
    for (const c of this.extractClientList(res)) {
      const id = this.extractRefId(c?._id ?? c?.id);
      if (!id) continue;
      map.set(id, {
        name: String(c?.name ?? '').trim() || 'Unknown client',
        state: String(c?.state ?? '').trim(),
      });
    }
    return map;
  }

  /** Mongo extended JSON { $oid }, nested _id, or plain string id. */
  private extractRefId(ref: unknown): string | undefined {
    if (ref == null) return undefined;
    if (typeof ref === 'string' || typeof ref === 'number') {
      const s = String(ref).trim();
      return s || undefined;
    }
    if (typeof ref === 'object') {
      const o = ref as Record<string, unknown>;
      if (typeof o['$oid'] === 'string') return o['$oid'];
      if (o['_id'] != null) return this.extractRefId(o['_id']);
      if (o['id'] != null) return this.extractRefId(o['id']);
    }
    return undefined;
  }

  private isBareMongoOid(obj: unknown): boolean {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      '$oid' in (obj as object) &&
      Object.keys(obj as object).length === 1
    );
  }

  /** Parse API numbers: plain, string, Mongo Decimal128 / Double. */
  private parseNumberish(v: unknown): number | undefined {
    if (v == null || v === '') return undefined;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(String(v).replace(/,/g, '').trim());
      return Number.isFinite(n) ? n : undefined;
    }
    if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>;
      if (typeof o['$numberDecimal'] === 'string') return Number(o['$numberDecimal']);
      if (typeof o['$numberDouble'] === 'string' || typeof o['$numberDouble'] === 'number') {
        return Number(o['$numberDouble']);
      }
      if (typeof o['$numberInt'] === 'string' || typeof o['$numberInt'] === 'number') {
        return Number(o['$numberInt']);
      }
    }
    return undefined;
  }

  private parseApiDate(value: unknown): Date {
    if (value == null) return new Date(NaN);
    if (value instanceof Date) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date(NaN) : d;
    }
    if (typeof value === 'object' && value !== null) {
      const o = value as Record<string, unknown>;
      if (o['$date'] != null) {
        const inner = o['$date'];
        if (typeof inner === 'string' || typeof inner === 'number') return new Date(inner);
        if (inner && typeof inner === 'object' && '$numberLong' in (inner as object)) {
          return new Date(Number((inner as { $numberLong: string }).$numberLong));
        }
      }
    }
    return new Date(NaN);
  }

  /**
   * Same monetary field as search-invoice (`inv.amount`); then other common keys; else line items.
   */
  private resolveGrandTotal(raw: any): number {
    const tryKeys = ['amount', 'grandTotal', 'total', 'totalAmount', 'invoiceAmount'];
    for (const k of tryKeys) {
      const n = this.parseNumberish(raw[k]);
      if (n !== undefined && n >= 0) return n;
    }
    const items = raw.items;
    if (!Array.isArray(items) || items.length === 0) {
      return 0;
    }
    let subtotal = 0;
    for (const it of items) {
      const lineAmt = this.parseNumberish(it?.amount);
      if (lineAmt !== undefined && lineAmt > 0) {
        subtotal += lineAmt;
        continue;
      }
      const q = this.parseNumberish(it?.quantity) ?? 1;
      const r = this.parseNumberish(it?.rate) ?? this.parseNumberish(it?.price) ?? 0;
      subtotal += q * r;
    }
    const cgstAmt = Number(raw.cgstAmount);
    const sgstAmt = Number(raw.sgstAmount);
    const cgstR = Number(raw.cgstRate ?? 0) / 100;
    const sgstR = Number(raw.sgstRate ?? 0) / 100;
    let tax = 0;
    if (Number.isFinite(cgstAmt) && cgstAmt > 0) tax += cgstAmt;
    if (Number.isFinite(sgstAmt) && sgstAmt > 0) tax += sgstAmt;
    if (tax === 0) tax = subtotal * cgstR + subtotal * sgstR;
    const total = subtotal + tax;
    return Math.round(total * 100) / 100;
  }

  private resolveClientFromRaw(raw: any): { name: string; state: string } {
    const cn = raw.clientName != null ? String(raw.clientName).trim() : '';
    if (cn) {
      return { name: cn, state: String(raw.clientState ?? '').trim() };
    }
    const cf = raw.client ?? raw.clientId;
    if (cf && typeof cf === 'object' && !this.isBareMongoOid(cf)) {
      return {
        name: String(cf.name ?? raw.clientName ?? 'Unknown client').trim() || 'Unknown client',
        state: String(cf.state ?? '').trim(),
      };
    }
    const id = this.extractRefId(cf) ?? this.extractRefId(raw.clientId);
    if (id) {
      const d = this.clientDetailsById.get(id);
      if (d) return { name: d.name, state: d.state };
    }
    return { name: 'Unknown client', state: '' };
  }

  private normalizeInvoiceStatus(raw: string | undefined): IInvoice['status'] {
    const s = (raw ?? '').trim();
    if (s === 'Paid' || s === 'Draft' || s === 'Cancelled' || s === 'Finalized') return s;
    return 'Draft';
  }

  private resolveCompanyName(raw: any): string {
    if (raw.companyName != null && String(raw.companyName).trim() !== '') {
      return String(raw.companyName);
    }
    if (raw.company && typeof raw.company === 'object' && raw.company.name != null) {
      return String(raw.company.name);
    }
    if (typeof raw.company === 'string') return raw.company;
    return '';
  }

  private mapApiRow(raw: any): { invoice: IInvoice; amountRow: IInvoiceAmount } {
    const invoiceNumber = String(raw.invoiceNumber ?? raw.invoiceNo ?? '').trim() || '—';
    const grandTotal = this.resolveGrandTotal(raw);
    const cgst = Number(raw.cgstAmount ?? 0);
    const sgst = Number(raw.sgstAmount ?? 0);
    const subtotal = Number(
      raw.subtotal ?? (grandTotal > 0 ? Math.max(0, grandTotal - cgst - sgst) : 0),
    );

    const { name: clientName, state: clientState } = this.resolveClientFromRaw(raw);

    const id = this.extractRefId(raw._id ?? raw.id);

    let invoiceDate = this.parseApiDate(raw.invoiceDate);
    if (isNaN(invoiceDate.getTime())) {
      invoiceDate = this.parseApiDate(raw.createdAt);
    }
    if (isNaN(invoiceDate.getTime())) {
      invoiceDate = new Date();
    }

    let dueDate: Date | undefined;
    if (raw.dueDate != null) {
      const dd = this.parseApiDate(raw.dueDate);
      dueDate = isNaN(dd.getTime()) ? undefined : dd;
    }

    const invoice: IInvoice = {
      id,
      invoiceNumber,
      invoiceDate,
      client: clientName,
      company: this.resolveCompanyName(raw),
      cgstRate: raw.cgstRate,
      sgstRate: raw.sgstRate,
      status: this.normalizeInvoiceStatus(raw.status),
      dueDate,
      clientState,
      totalAmount: grandTotal,
    };

    const amountRow: IInvoiceAmount = {
      invoice: invoiceNumber,
      subtotal,
      cgstAmount: cgst,
      sgstAmount: sgst,
      grandTotal,
      amountInWords: String(raw.amountInWords ?? ''),
    };

    return { invoice, amountRow };
  }

  private applyInvoiceListFromApi(list: any[]) {
    this.invoices = [];
    this.invoiceAmounts = [];
    for (const raw of list) {
      const { invoice, amountRow } = this.mapApiRow(raw);
      this.invoices.push(invoice);
      this.invoiceAmounts.push(amountRow);
    }
  }

  private applyEmptyInvoiceDataset() {
    this.invoices = [];
    this.invoiceAmounts = [];
    this.clients = [];
  }

  private buildClientsFromInvoices(): IClient[] {
    const byName = new Map<string, IClient>();
    for (const inv of this.invoices) {
      if (!inv.client || inv.client === '—') continue;
      if (!byName.has(inv.client)) {
        const state = inv.clientState?.trim() || '';
        byName.set(inv.client, {
          name: inv.client,
          address: '',
          email: '',
          phone: '',
          gstin: '',
          state,
          stateCode: '',
          status: 'Active',
        });
      }
    }
    return Array.from(byName.values());
  }

  initializeData() {
    this.invoiceAmountMap = {};
    this.invoiceAmounts.forEach((ia) => {
      this.invoiceAmountMap[ia.invoice] = ia;
    });

    this.clients = this.buildClientsFromInvoices();

    this.summary.totalClients = this.clients.length;
    this.summary.totalInvoices = this.invoices.length;
    this.summary.totalRevenue = this.invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    this.summary.paidInvoices = this.invoices.filter((i) => i.status === 'Paid').length;
    this.summary.paidRevenue = this.invoices
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const outstanding = this.invoices.filter((i) => i.status === 'Draft' || i.status === 'Finalized');
    this.summary.outstandingInvoices = outstanding.length;
    this.summary.outstandingAmount = outstanding.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const currentDate = this.today;
    const in7Days = new Date(currentDate);
    in7Days.setDate(in7Days.getDate() + 7);
    this.invoicesDueSoon = this.invoices.filter(
      (i) =>
        i.status === 'Draft' &&
        i.dueDate &&
        i.dueDate >= currentDate &&
        i.dueDate <= in7Days,
    );

    this.thisMonth = { revenue: 0, invoiceCount: 0 };
    const y = this.today.getFullYear();
    const m = this.today.getMonth();
    this.invoices
      .filter((i) => {
        const d = new Date(i.invoiceDate);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .forEach((i) => {
        this.thisMonth.invoiceCount += 1;
        this.thisMonth.revenue += i.totalAmount || 0;
      });

    this.recentInvoices = [...this.invoices]
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      .slice(0, 5);

    const clientInvoiceMap = this.invoices.reduce(
      (acc, invoice) => {
        if (!acc[invoice.client]) {
          acc[invoice.client] = { totalInvoices: 0, totalAmount: 0 };
        }
        acc[invoice.client].totalInvoices += 1;
        acc[invoice.client].totalAmount += invoice.totalAmount || 0;
        return acc;
      },
      {} as { [key: string]: { totalInvoices: number; totalAmount: number } },
    );

    this.topClients = Object.keys(clientInvoiceMap)
      .map((clientName) => ({
        name: clientName,
        totalInvoices: clientInvoiceMap[clientName].totalInvoices,
        totalAmount: clientInvoiceMap[clientName].totalAmount,
        state:
          this.clients.find((c) => c.name === clientName)?.state ||
          this.invoices.find((i) => i.client === clientName)?.clientState ||
          '',
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    this.rebuildActivityItems();
  }

  private rebuildActivityItems(): void {
    const sorted = [...this.invoices].sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );
    this.activityItems = sorted.slice(0, 12).map((inv) => ({
      icon: this.getStatusIcon(inv.status),
      text: `${inv.invoiceNumber} · ${inv.client} · ${inv.status} · ${this.formatInr(inv.totalAmount)}`,
      time: this.formatRelativeTime(inv.invoiceDate),
      color: this.getActivityColor(inv.status),
    }));
  }

  private formatInr(n: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n || 0);
  }

  private formatRelativeTime(d: Date): string {
    const t = new Date(d).getTime();
    if (isNaN(t)) return '—';
    const diff = Date.now() - t;
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    return this.formatInvoiceDate(d);
  }

  private getActivityColor(status: string): string {
    switch (status) {
      case 'Paid':
        return 'text-emerald-500';
      case 'Draft':
        return 'text-amber-500';
      case 'Finalized':
        return 'text-indigo-500';
      case 'Cancelled':
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  }

  getSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined | null {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Draft':
        return 'warn';
      case 'Cancelled':
        return 'danger';
      case 'Finalized':
        return 'info';
      default:
        return 'info';
    }
  }

  getStatusIcon(status: string | undefined): string {
    switch (status) {
      case 'Paid':
        return 'pi pi-check-circle';
      case 'Draft':
        return 'pi pi-file-edit';
      case 'Cancelled':
        return 'pi pi-times-circle';
      case 'Finalized':
        return 'pi pi-send';
      default:
        return 'pi pi-info-circle';
    }
  }

  initializeCharts() {
    // Chart options – maintainAspectRatio: false so charts respect container height
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#374151',
            boxWidth: 12,
            padding: 8,
            font: { size: 11 },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: '#374151',
            maxTicksLimit: 6,
            font: { size: 10 },
          },
          grid: {
            color: '#E5E7EB',
          },
        },
        x: {
          ticks: {
            color: '#374151',
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: {
            color: '#E5E7EB',
          },
        },
      },
    };
    this.doughnutChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
            boxWidth: 12,
            padding: 8,
            font: { size: 11 },
          },
        },
      },
    };

    const statusCounts = {
      Paid: this.invoices.filter((i) => i.status === 'Paid').length,
      Draft: this.invoices.filter((i) => i.status === 'Draft').length,
      Finalized: this.invoices.filter((i) => i.status === 'Finalized').length,
      Cancelled: this.invoices.filter((i) => i.status === 'Cancelled').length,
    };

    this.invoiceStatusChartData = {
      labels: ['Paid', 'Draft', 'Finalized', 'Cancelled'],
      datasets: [
        {
          data: [
            statusCounts.Paid,
            statusCounts.Draft,
            statusCounts.Finalized,
            statusCounts.Cancelled,
          ],
          backgroundColor: ['#34D399', '#FBBF24', '#6366F1', '#EF4444'],
          hoverBackgroundColor: ['#10B981', '#F59E0B', '#4F46E5', '#DC2626'],
        },
      ],
    };

    const companyTotals: Record<string, number> = {};
    for (const inv of this.invoices) {
      const key = inv.company?.trim() || 'Unassigned';
      companyTotals[key] = (companyTotals[key] || 0) + (inv.totalAmount || 0);
    }
    const companyEntries = Object.entries(companyTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    this.companyRevenueChartData = {
      labels: companyEntries.length ? companyEntries.map(([k]) => k) : ['No data'],
      datasets: [
        {
          label: 'Total billed (₹)',
          data: companyEntries.length ? companyEntries.map(([, v]) => v) : [0],
          backgroundColor: '#8B5CF6',
          borderColor: '#7C3AED',
          borderWidth: 1,
        },
      ],
    };

    const monthly = this.buildRollingMonthlyRevenue();
    this.monthlyRevenueChartData = {
      labels: monthly.labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: monthly.data,
          fill: false,
          borderColor: '#8B5CF6',
          tension: 0.4,
        },
      ],
    };

    // Invoice Aging Bar Chart
    const currentDate = this.today;
    const agingBuckets = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    this.invoices.forEach((invoice) => {
      if (invoice.status === 'Draft' && invoice.dueDate) {
        const daysOverdue = Math.floor(
          (currentDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysOverdue <= 30) agingBuckets['0-30 Days']++;
        else if (daysOverdue <= 60) agingBuckets['31-60 Days']++;
        else if (daysOverdue <= 90) agingBuckets['61-90 Days']++;
        else agingBuckets['90+ Days']++;
      }
    });

    this.invoiceAgingChartData = {
      labels: Object.keys(agingBuckets),
      datasets: [
        {
          label: 'Invoice Count',
          data: Object.values(agingBuckets),
          backgroundColor: '#F87171',
          borderColor: '#EF4444',
          borderWidth: 1,
        },
      ],
    };

    const trend = this.buildRollingStatusTrend();
    this.invoiceStatusTrendChartData = {
      labels: trend.labels,
      datasets: [
        {
          label: 'Paid',
          data: trend.paid,
          fill: false,
          borderColor: '#34D399',
          tension: 0.4,
        },
        {
          label: 'Draft',
          data: trend.draft,
          fill: false,
          borderColor: '#FBBF24',
          tension: 0.4,
        },
        {
          label: 'Finalized',
          data: trend.finalized,
          fill: false,
          borderColor: '#6366F1',
          tension: 0.4,
        },
        {
          label: 'Cancelled',
          data: trend.cancelled,
          fill: false,
          borderColor: '#EF4444',
          tension: 0.4,
        },
      ],
    };
  }

  /** Last 6 calendar months including current; revenue from invoice totals. */
  private buildRollingMonthlyRevenue(): { labels: string[]; data: number[] } {
    const byMonth: Record<string, number> = {};
    this.invoices.forEach((i) => {
      const d = new Date(i.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (i.totalAmount || 0);
    });
    const labels: string[] = [];
    const data: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
      data.push(byMonth[key] || 0);
    }
    return { labels, data };
  }

  /** Per-month status counts for the same rolling 6-month window. */
  private buildRollingStatusTrend(): {
    labels: string[];
    paid: number[];
    draft: number[];
    finalized: number[];
    cancelled: number[];
  } {
    const now = new Date();
    const keys: string[] = [];
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      labels.push(d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
    }
    const paid = keys.map(() => 0);
    const draft = keys.map(() => 0);
    const finalized = keys.map(() => 0);
    const cancelled = keys.map(() => 0);
    this.invoices.forEach((inv) => {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = keys.indexOf(key);
      if (idx < 0) return;
      if (inv.status === 'Paid') paid[idx] += 1;
      else if (inv.status === 'Draft') draft[idx] += 1;
      else if (inv.status === 'Finalized') finalized[idx] += 1;
      else if (inv.status === 'Cancelled') cancelled[idx] += 1;
    });
    return { labels, paid, draft, finalized, cancelled };
  }

  getGreeting(): string {
    const hour = this.today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
