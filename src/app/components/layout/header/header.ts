import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { SharedModule } from '../../../modules/shared.module';

@Component({
  selector: 'app-header',
  imports: [SharedModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  items: MenuItem[] = [];

  ngOnInit() {
    this.items = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/dashboard',
      },
      {
        label: 'Company',
        icon: 'pi pi-briefcase',
        items: [
          { label: 'Search Company', icon: 'pi pi-search', routerLink: '/company/search' },
          { label: 'Create Company', icon: 'pi pi-plus', routerLink: '/company/form' },
        ],
      },
      {
        label: 'Client',
        icon: 'pi pi-users',
        items: [
          { label: 'Search Clients', icon: 'pi pi-search', routerLink: '/client/search' },
          { label: 'Create Client', icon: 'pi pi-plus', routerLink: '/client/form' },
        ],
      },
      {
        label: 'Invoice',
        icon: 'pi pi-file-edit',
        items: [
          { label: 'Search Invoices', icon: 'pi pi-search', routerLink: '/invoice/search' },
          { label: 'Create Invoice', icon: 'pi pi-plus', routerLink: '/invoice/form' },
        ],
      },
    ];
  }
}
