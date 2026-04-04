import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InvoiceService } from '../../../services/invoice.service';
import { BehaviorSubject, catchError, of, shareReplay, combineLatest, map, tap } from 'rxjs';
import { SharedModule } from '../../../modules/shared.module';
import { InvoiceItemsService } from '../../../services/invoiceItems.service';

@Component({
  selector: 'app-quick-add-invoice-item',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule
  ],
  templateUrl: './quick-add-invoice-item.html',
  styleUrls: ['./quick-add-invoice-item.scss'],
})
export class QuickAddInvoiceItem {
  private invoiceService = inject(InvoiceService);
  private invoiceItemsService = inject(InvoiceItemsService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  isLoading = false;

  // Streams
  private selectedInvoiceId$ = new BehaviorSubject<string | null>(null);

  // Item model
  item = {
    particulars: '',
    vehicleNo: '',
    quantity: 1,
    rate: 0,
    date: new Date(),
  };

  dateString = '';

  // Load invoices
  invoices$ = this.invoiceService.searchInvoices({}).pipe(
    catchError(err => {
      console.error('Invoice load failed', err);
      return of([]);
    }),
    shareReplay(1)
  );

  // Selected invoice object
  selectedInvoice$ = combineLatest([
    this.invoices$,
    this.selectedInvoiceId$
  ]).pipe(
    map(([invoices, id]) => invoices.find((x: any) => x.id === id)),
    shareReplay(1)
  );

  setInvoice(id: string) {
    this.selectedInvoiceId$.next(id);
  }

  getAmount(): number {
    return (this.item.quantity || 0) * (this.item.rate || 0);
  }

  onDateChange() {
    this.item.date = new Date(this.dateString);
  }

  clearForm() {
    this.item = {
      particulars: '',
      vehicleNo: '',
      quantity: 1,
      rate: 0,
      date: new Date(),
    };
    this.dateString = '';
  }

  addItem() {
    const invoiceId = this.selectedInvoiceId$.value;

    if (!invoiceId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Select invoice',
        detail: 'Please select an invoice first.',
      });
      return;
    }

    this.isLoading = true;

    this.invoiceItemsService.create({
      ...this.item,
      amount: this.getAmount(),
    })
    .pipe(
      tap(() => {
        this.isLoading = false;
        this.clearForm();
        this.messageService.add({
          severity: 'success',
          summary: 'Item added',
          detail: 'Line item has been added to the invoice.',
        });
      }),
      catchError(err => {
        console.error('Failed to add item', err);
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Could not add item. Please try again.',
        });
        return of(null);
      })
    )
    .subscribe();
  }

  navigateToInvoice() {
    const id = this.selectedInvoiceId$.value;
    if (id) {
      this.router.navigate(['/invoice/form', id]);
    }
  }
}
