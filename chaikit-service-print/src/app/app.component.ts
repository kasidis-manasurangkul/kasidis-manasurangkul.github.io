import { Component } from '@angular/core';
import { bahttext } from 'bahttext';

interface PrintDetail {
    brand: string;
    plate: string;
    claimNo: string;
    policyNo: string;
    amount: number;
}
interface PrintData {
    docNo: string;
    date: string;
    customer: string;
    address: string;
    detail: PrintDetail;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'chaikit-service-print';

    addressTabs = [
        {
            label: 'LMG',
            value: 'lmg',
            address: 'จัสมินซิตี้ชั้น 14,15,17,19 เลขที่ 2 ซ.สุขุมวิท 23 ถ.สุขุมวิท ขว.คลองเตยเหนือ ข.วัฒนา กทม 10110',
            customer: 'บริษัท แอลเอ็มจี ประกันภัย จำกัด (มหาชน)'
        },
        {
            label: 'ไทยประกัน',
            value: 'thai',
            address: '34/3  ซอยหลังสวน ถนนเพลินจิต แขวงลุมพินี เขตปทุมวัน กทม.10330',
            customer: 'บริษัท ไทยประกันภัย จำกัด (มหาชน)'
        },
        {
            label: 'อื่นๆ',
            value: 'other',
            address: '',
            customer: ''
        }
    ];
    activeTab = 'lmg';

    copies: number = 3;

    printData: PrintData = {
        docNo: '1',
        date: '',
        customer: '',
        address: '',
        detail: {
            brand: '',
            plate: '',
            claimNo: '',
            policyNo: '',
            amount: 0,
        }
    };

    // Receipt titles
    receiptTitle = 'ใบเสร็จรับเงิน/ใบกำกับภาษี';
    copyReceiptTitle = 'สำเนาใบเสร็จรับเงิน/ใบกำกับภาษี';

    // Print state
    isPrinting = false;
    isPrintingPageIndex = 0;

    constructor() {
        this.setTab(this.activeTab);
    }

    setTab(tab: string) {
        this.activeTab = tab;
        this.restoreDataForTab(tab);
    }

    setAddressByTab(tab: string) {
        const found = this.addressTabs.find(t => t.value === tab);
        if (found) {
            this.printData.address = found.address;
            this.printData.customer = found.customer;
        } else {
            this.printData.address = '';
            this.printData.customer = '';
        }
    }

    restoreDataForTab(tab: string) {
        const key = 'printData_' + tab;
        const data = localStorage.getItem(key);
        if (data) {
            try {
                this.printData = JSON.parse(data);
            } catch (e) {
                this.resetPrintDataToTabDefault(tab);
            }
        } else {
            this.resetPrintDataToTabDefault(tab);
        }
    }

    resetPrintDataToTabDefault(tab: string) {
        const found = this.addressTabs.find(t => t.value === tab);
        this.printData = {
            docNo: '654',
            date: '19/04/2568',
            customer: found ? found.customer : '',
            address: found ? found.address : '',
            detail: {
                brand: '',
                plate: '',
                claimNo: '',
                policyNo: '',
                amount: 0,
            }
        };
    }

    saveDataForTab(tab: string) {
        const key = 'printData_' + tab;
        localStorage.setItem(key, JSON.stringify(this.printData));
    }

    get subtotal(): number {
        return Number(this.printData.detail.amount) || 0;
    }
    get vat(): number {
        return +(this.subtotal * 0.07).toFixed(2);
    }
    get total(): number {
        return +(this.subtotal + this.vat).toFixed(2);
    }
    get bahtText(): string {
        return bahttext(this.total || 0);
    }

    getCopyPages() {
        // Number of copies, exclude original (first), but minimum is 0
        const n = Math.max(0, Math.min(Number(this.copies) || 1, 10) - 1);
        return Array(n).fill(0);
    }

    printDiv(): void {
        this.saveDataForTab(this.activeTab);

        this.isPrinting = true;

        setTimeout(() => {
            window.print();
            this.isPrinting = false;
        }, 150);
    }
}
