import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpOperationsService } from './http-operations.service';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly baseUrl = 'invoices'; // Base API endpoint

  constructor(private http: HttpOperationsService) {}

  getParticulars(): Observable<any> {
    return this.http.getAPI(`${this.baseUrl}/particulars`);
  }

  getVehicles(): Observable<any> {
    return this.http.getAPI(`${this.baseUrl}/vehicles`);
  }

  /** GET all invoices */
  getAll(): Observable<any> {
    return this.http.getAPI(`${this.baseUrl}`);
  }

  /** GET a single invoice by ID */
  getById(id: string): Observable<any> {
    return this.http.getAPI(`${this.baseUrl}/${id}`);
  }

  /** CREATE a new invoice */
  create(data: any): Observable<any> {
    return this.http.postAPI(`${this.baseUrl}`, data);
  }

  /** UPDATE an existing invoice */
  update(id: string, data: any): Observable<any> {
    return this.http.putAPI(`${this.baseUrl}/${id}`, data);
  }

  /** DELETE an invoice by ID */
  delete(id: string): Observable<any> {
    return this.http.deleteAPI(`${this.baseUrl}/${id}`);
  }

  downloadPDFInvoice(id: string): Observable<any> {
    return this.http.getDownloadFileAPI(`${this.baseUrl}/${id}/pdf`);
  }

  previewInvoice(previewData: any): Observable<any> {
    return this.http.postAPI(`${this.baseUrl}/preview`, previewData);
  }

  searchInvoices(filters?: any): Observable<any[]> {
    return this.http.postAPI(`${this.baseUrl}/search`, filters || {});
  }

  addInvoiceItem(invoiceId: string, item: any): Observable<any[]> {
    return this.http.postAPI(`${this.baseUrl}/${invoiceId}/items`, item || {});
  }

}
