import { Component, Input } from '@angular/core';

@Component({
    selector: 'sab-option',
    template: ''
})
export class SabOption {
    @Input()
    value: any;

    @Input()
    text: string;

    toString() { return this.text; }
}
