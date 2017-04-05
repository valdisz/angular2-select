import { Directive, TemplateRef, Input } from '@angular/core';

@Directive({ selector: '[sabTemplateRef]' })
export class SabTemplateRef {
    constructor(public template: TemplateRef<any>) {

    }

    @Input('sabTemplateRef') name: string;
}