import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { decrypt } from '../../../helper/encryptionHelper';
import { generateInvoiceFilePDFName } from '../../../helper/generateInvoiceFilePDFName';
import { amountToWords } from '../../../helper/numbersToWords';
import { SharedModule } from '../../../modules/shared.module';
import { InvoiceService } from '../../../services/invoice.service';
import { ClientService } from './../../../services/client.service';
import { CompanyService } from './../../../services/company.service';

@Component({
  selector: 'app-create-invoice',
  imports: [SharedModule],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.scss',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class CreateInvoice implements OnInit {
  companyService: CompanyService = inject(CompanyService);
  clientService: ClientService = inject(ClientService);
  invoiceService: InvoiceService = inject(InvoiceService);
  messageService: MessageService = inject(MessageService);
  route: ActivatedRoute = inject(ActivatedRoute);
  sanitizer: DomSanitizer = inject(DomSanitizer);
  cd: ChangeDetectorRef = inject(ChangeDetectorRef);

  invoiceId?: string;

  invoiceSuffix: string = '';
  displayHtml: boolean = false;
  displayPdf: boolean = false;
  pdfSrc: SafeResourceUrl | null = null;
  invoiceHtml: SafeHtml = '';

  ngOnInit(): void {
    this.loadLookupsData();

    // ✅ check if editing
    this.route.paramMap.subscribe((params) => {
      this.invoiceId = params.get('id') || undefined;
      if (this.invoiceId) {
        this.loadInvoice();
      }
    });
  }

  loadLookupsData() {
    forkJoin({
      companies: this.companyService.getCompanies(),
      clients: this.clientService.getClients(),
      particulars: this.invoiceService.getParticulars(),
      vehicles: this.invoiceService.getVehicles(),
    })
      .pipe(
        tap(({ companies, clients, particulars, vehicles }) => {
          this.companies = [...companies];
          this.clients = clients;
          this.particularsList = particulars;
          this.vehiclesList = vehicles;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error loading lookups:', error);
          // Fallback to default values if API fails
          this.particularsList = ['Item A', 'Item B', 'Item C', 'New'];
          this.vehiclesList = ['MH12AB1234', 'MH14CD5678', 'MH20EF9012'];
        },
      });
  }

  loadInvoice() {
    this.invoiceService.getById(this.invoiceId!)
      .pipe(
        tap((invoice) => {
          console.log(invoice);
          this.selectedCompany = invoice.company;
          this.selectedClient = invoice.client;
          this.invoice = invoice;
          this.invoice.invoiceDate = new Date(invoice.invoiceDate);
          this.invoiceItems = invoice.items;
          this.invoiceItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          this.invoiceSuffix = invoice.invoiceNumber?.replace(
            this.selectedCompany?.invoicePrefix ?? 'Invoice -',
            '',
          );
          this.recalculate();
          Promise.resolve().then(() => this.cd.detectChanges());
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Error loading invoice:', err);
        },
      });
  }

  invoice: any = {
    invoiceNumber: '',
    invoiceDate: new Date(),
    client: null,
    company: null,
    cgstRate: 9,
    sgstRate: 9,
    status: 'Draft',
  };

  invoiceItems: any[] = [];

  invoiceAmount: any = {
    subtotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    grandTotal: 0,
    amountInWords: '',
  };

  companies: any[] = [];

  clients: any[] = [];

  selectedCompany: any = null;
  selectedClient: any = null;

  editingIndex: number | null = null;
  submitted = false;

  particularsList: string[] = [];
  vehiclesList: string[] = [];
  filteredParticulars: string[] = [];
  filteredVehicles: string[] = [];

  // Filter suggestions dynamically
  filterVehicles(event: any) {
    const query = event.query.toLowerCase();
    this.filteredVehicles = this.vehiclesList.filter((v) => v.toLowerCase().includes(query));
  }

  // Add new vehicle number if it doesn't exist
  addNewVehicle(value: string) {
    if (value && !this.vehiclesList.includes(value)) {
      this.vehiclesList.push(value);
    }
  }

  // Filter methods for autocomplete
  filterParticulars(event: any) {
    const query = event.query.toLowerCase();
    this.filteredParticulars = this.particularsList.filter((p) => p.toLowerCase().includes(query));
  }

  addNewParticular(value: string) {
    if (value && !this.particularsList.includes(value)) {
      this.particularsList.push(value);
    }
  }

  get fullInvoiceNumber(): string {
    return (this.selectedCompany?.invoicePrefix ?? 'Invoice -') + this.invoiceSuffix;
  }

  addItem() {
    // Find the latest date from all existing items
    const latestDate = this.invoiceItems.length
      ? new Date(Math.max(...this.invoiceItems.map((item) => new Date(item.date).getTime())))
      : null;

    const newItem = {
      date: latestDate, // use the latest date
      particulars: '',
      vehicleNo: '',
      quantity: 1, // default quantity
      rate: 0,
      amount: 0,
    };

    // Insert at TOP
    this.invoiceItems.unshift(newItem);

    // Set first row editable
    this.editingIndex = 0;
  }

  editItem(index: number) {
    this.editingIndex = index;
    this.submitted = false; // reset submitted when editing
    this.invoiceItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  saveItem(index: number) {
    this.submitted = true;

    const item = this.invoiceItems[index];

    this.invoiceItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!item.date || !item.particulars) {
      return; // stop saving if validation fails
    }

    item.amount = (item.quantity || 0) * (item.rate || 0);

    this.recalculate();

    this.editingIndex = null; // exit edit mode
    this.submitted = false; // reset submitted for next edit
  }

  removeItem(index: number) {
    this.invoiceItems.splice(index, 1);
    this.invoiceItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.recalculate();
  }

  recalculate() {
    // calculate each item amount
    this.invoiceItems.forEach((item) => {
      item.amount = (item.quantity || 0) * (item.rate || 0);
    });

    // calculate subtotal
    this.invoiceAmount.subtotal = this.invoiceItems.reduce(
      (total, item) => total + (item.amount || 0),
      0,
    );

    // calculate taxes
    this.invoiceAmount.cgstAmount =
      (this.invoiceAmount.subtotal * (this.invoice.cgstRate || 0)) / 100;
    this.invoiceAmount.sgstAmount =
      (this.invoiceAmount.subtotal * (this.invoice.sgstRate || 0)) / 100;

    // calculate grand total
    this.invoiceAmount.grandTotal =
      this.invoiceAmount.subtotal + this.invoiceAmount.cgstAmount + this.invoiceAmount.sgstAmount;

    // amount in words
    this.invoiceAmount.amountInWords = amountToWords(this.invoiceAmount.grandTotal);
  }

  onCompanyChange(company: any) {
    this.selectedCompany = company;
    this.invoice.company = company;
    this.invoice.cgstRate = company?.cgstRate ?? 6;
    this.invoice.sgstRate = company?.sgstRate ?? 6;
    this.recalculate();
    this.cd.detectChanges();
  }

  onClientChange(client: any) {
    this.selectedClient = client;
    this.invoice.client = client;
    this.cd.detectChanges();
  }

  convertToWords(amount: number): string {
    return amountToWords(amount);
  }

  createInvoice(model: any) {
    this.invoiceService.create(model)
      .pipe(
        tap((data) => {
          console.log(data);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Invoice created successfully',
          });
        })
      )
      .subscribe({
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error creating invoice',
          });
        },
      });
  }

  updateInvoice(model: any) {
    this.invoiceService.update(this.invoiceId!, model)
      .pipe(
        tap((data) => {
          console.log(data);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Invoice updated successfully',
          });
        })
      )
      .subscribe({
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error updating invoice',
          });
        },
      });
  }

  saveInvoice() {
    let model = {
      invoiceNumber: this.fullInvoiceNumber,
      invoiceDate: this.invoice.invoiceDate,
      client: this.invoice.client._id,
      company: this.invoice.company._id,
      items: this.invoiceItems,
    };

    console.log(model);

    if (this.invoiceId) {
      this.updateInvoice(model);
    } else {
      this.createInvoice(model);
    }
  }

  onDateInputChange(item: any) {
    if (!item.dateString) {
      item.date = null;
      return;
    }

    const parts = item.dateString.split('/');
    if (parts.length === 3) {
      const day = +parts[0];
      const month = +parts[1] - 1; // JS months are 0-based
      const year = +parts[2];
      const parsed = new Date(year, month, day);

      if (!isNaN(parsed.getTime())) {
        item.date = parsed;
      } else {
        item.date = null;
      }
    } else {
      item.date = null;
    }
  }

  downloadPDFInvoice() {
    if (!this.invoiceId) return;

    this.invoiceService.downloadPDFInvoice(`${this.invoiceId}`).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          console.error('Empty PDF response');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateInvoiceFilePDFName(
          this.selectedCompany?.name,
          this.selectedClient?.name,
          this.invoice.invoiceDate,
        );
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      },
    });
  }

  openPreview() {
    this.displayHtml = true;
    this.displayPdf = false;
    this.invoiceHtml = '';
    this.pdfSrc = null;
    this.cd.detectChanges();

    const previewData = {
      company: this.selectedCompany?._id,
      client: this.selectedClient?._id,
      items: this.invoiceItems,
    };

    this.invoiceService.previewInvoice(previewData)
      .pipe(
        tap((data) => {
          const invoiceHtml = decrypt(data?.html);
          this.invoiceHtml = this.sanitizer.bypassSecurityTrustHtml(invoiceHtml);
          this.cd.detectChanges();
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error generating preview:', error);
        },
      });
  }

  previewPdf(): void {
    if (!this.invoiceId) return;
    this.displayPdf = true;
    this.displayHtml = false;
    this.invoiceHtml = '';
    this.pdfSrc = null;
    this.cd.detectChanges();

    this.invoiceService.downloadPDFInvoice(`${this.invoiceId}`)
      .pipe(
        tap((blob: Blob) => {
          if (!blob || blob.size === 0) {
            console.error('Empty PDF response');
            return;
          }
          const url = URL.createObjectURL(blob);
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.cd.detectChanges();
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error downloading PDF:', error);
        },
      });
  }

  changeDate(item: any, days: number): void {
    if (!item.date) {
      item.date = new Date(); // fallback to today if empty
    }
    const newDate = new Date(item.date);
    newDate.setDate(newDate.getDate() + days);
    item.date = newDate;
  }
}
