import { Directive, Input, TemplateRef, ViewContainerRef, EmbeddedViewRef } from '@angular/core';

class SabTemplateContext {
    $implicit: any = null;
    context: any = null;
}

@Directive({
    selector: '[sabTemplate]'
})
export class SabTemplate {
    private _context: SabTemplateContext = new SabTemplateContext();
    private _viewRef: EmbeddedViewRef<SabTemplateContext>;
    private _tplRef: TemplateRef<any>;

    constructor(private _viewContainer: ViewContainerRef) {

    }

    @Input('sabTemplate')
    set templateRef(tplRef: TemplateRef<any>) {
        this._tplRef = tplRef;
        this.updateViewRef();
    }

    @Input('sabTemplateItem')
    set item(value: any) {
        this._context.$implicit = value;
        this.updateViewRef();
    }

    @Input('sabTemplateContext')
    set context(value: any) {
        this._context.context = value;
        this.updateViewRef();
    }

    private updateViewRef() {
        this._viewContainer.clear();
        this._viewRef = this._viewContainer.createEmbeddedView(this._tplRef, this._context);
    }
}
