import {
    Component,
    OnDestroy,
    AfterContentInit,
    ViewEncapsulation,
    HostBinding,
    HostListener,
    ViewChild,
    TemplateRef,
    ContentChild,
    ContentChildren,
    QueryList,
    ElementRef,
    AfterViewInit,
    Input,
    Output,
    EventEmitter,
    forwardRef,
    Optional
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import {
    State, Action, action, reducer, SabItem,
    A_BLUR, A_CLICK, A_FOCUS, A_FILTER_INPUT, A_ITEMS, A_SELECT, A_SELECT_ACTIVE, A_UP, A_DOWN, A_FILTERING,
    A_DISABLE, A_ENABLE, A_AUTO_ADD, A_TEXT_FIELD,
    S_IDLE, S_FOCUSED, S_FILTERING, S_DISABLED
} from './reducer'

import { SabOption } from './option.component';

import { SabTemplateRef } from './template-ref.directive';

import { toBoolean } from './lib';

export const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SabSelect),
    multi: true
};

@Component({
    selector: 'sab-select',
    templateUrl: './select.component.html',
    styleUrls: [ './select.component.scss' ],
    encapsulation: ViewEncapsulation.None
})
export class SabSelect implements ControlValueAccessor, AfterContentInit, OnDestroy {
    private _state: State;
    private _itemsSub: Subscription;
    private _valueSub: Subscription;

    @ViewChild('selectInput')
    private _input: ElementRef;

    @ViewChild('defaultTemplate')
    private _defaultTemplate: TemplateRef<any>;

    private _itemTemplate: TemplateRef<any>;
    private _selectedTemplate: TemplateRef<any>;
    private _emptyTemplate: TemplateRef<any>;
    private _placeholderTemplate: TemplateRef<any>;
    private _headerTemplate: TemplateRef<any>;
    private _footerTemplate: TemplateRef<any>;

    @ContentChildren(SabTemplateRef)
    private _templates: QueryList<SabTemplateRef>;

    @ContentChildren(SabOption)
    private set _staticOptions(soq: QueryList<SabOption>) {
        const o = soq.toArray();
        if (o && o.length) {
            this.onItems(o);
        }
    }

    private get _filterValue() { return this._state && this._state.filterValue; }


    ///// inputs

    @Input()
    set value(v: any) {
        if (this.value != v) {
            this.onSelect(v);
        }
    }
    get value() {
        return this._state && this._state.selected
            ? this._state.selected.value
            : null;
    }

    @Input()
    set items(v: any[]|Observable<any[]>) {
        if (this._itemsSub) {
            this._itemsSub.unsubscribe();
            this._itemsSub = null;
        }

        const obs = <Observable<any[]>>v;
        if (obs.subscribe) {
            // looks like Observable
            this._itemsSub = obs.subscribe(items => this.onItems(items));
            return;
        }

        if (Array.isArray(v)) {
            this.onItems(v);
            return;
        }

        this.onItems([]);
    }
    get items() {
        return this._state
            ? this._state.name == S_FILTERING
                ? this._state.filteredItems
                : this._state.items
            : [];
    }

    @Input()
    placeholder: string;

    @Input()
    @HostBinding('class.sab-select_disabled')
    set disabled(v: boolean) { this.reduce({ type: v ? A_DISABLE : A_ENABLE }); }
    get disabled(): boolean { return this._state && this._state.name === S_DISABLED; }

    @Input()
    set filtering(v: any) { this.reduce({ type: A_FILTERING, payload: toBoolean(v) }); }

    @Input()
    set autoAdd(v: any) { this.reduce({ type: A_AUTO_ADD, payload: toBoolean(v) }); }

    @Input()
    set textField(field: string) { this.reduce({ type: A_TEXT_FIELD, payload: field }); }


    ///// outputs

    @Output() filter: EventEmitter<string> = new EventEmitter<string>();
    @Output() onNewItem: EventEmitter<string> = new EventEmitter<string>();
    @Output() valueChange: EventEmitter<any> = new EventEmitter<any>();


    ///// getters

    @HostBinding('class.sab-select_active')
    get focused() { return this._state ? this._state.name !== S_IDLE : false; }

    get opened() { return this._state ? [ S_IDLE, S_FOCUSED ].indexOf(this._state.name) < 0 : false;  }

    get text(): any {
        const v = this._state
            ? this._state.text
            : null;

        return v == null ? '' : v;
    }

    get placeholderVisible() {
        if (!this._state) {
            return true;
        }

        return !(this._state.name == S_IDLE
            ? this._state.selected
            : this._state.text);
    }

    get active() { return this._state && this._state.active; }
    get selected() { return this._state && this._state.selected; }

    get itemTemplate() { return this._itemTemplate || this._defaultTemplate; }
    get selectedTemplate() { return this._selectedTemplate || this.itemTemplate; }
    get placeholderTemplate() { return this._placeholderTemplate || this._defaultTemplate; }
    get emptyTemplate() { return this._emptyTemplate; }
    get headerTemplate() { return this._headerTemplate; }
    get footerTemplate() { return this._footerTemplate; }

    get state() { return this._state; }

    private getTemplate(name: string): TemplateRef<any> {
        const tplRef = this._templates.find(tpl => tpl.name === name);
        return tplRef && tplRef.template;
    }


    ///// event handlers

    ngAfterContentInit() {
        this._templates.forEach(tpl => {
            switch (tpl.name) {
                case 'item': this._itemTemplate = tpl.template; break;
                case 'selected': this._selectedTemplate = tpl.template; break;
                case 'placeholder': this._placeholderTemplate = tpl.template; break;
                case 'empty': this._emptyTemplate = tpl.template; break;
                case 'header': this._headerTemplate = tpl.template; break;
                case 'footer': this._footerTemplate = tpl.template; break;
            }
        });
    }

    ngOnDestroy() {
        if (this._itemsSub) this._itemsSub.unsubscribe();
        if (this._valueSub) this._valueSub.unsubscribe();
    }


    ///// reducer

    reduce(action: Action) {
        const isFocused = this.focused;
        const isOpened = this.opened;
        const oldValue = this.value;
        const oldFilterValue = this._filterValue;
        const oldState = this._state && this._state.name;

        this._state = reducer(this._state, action);

        const el = this._input.nativeElement;
        const focusCh = this.focused !== isFocused;
        const valueCh = this.value !== oldValue;
        const filterValueCh = this._filterValue !== oldFilterValue;

        if (valueCh) {
            this.valueChange.emit(this.value);
        }

        if (focusCh) {
            setTimeout(() => {
                const elFocused = window.document.activeElement === el;

                if (this.focused && !elFocused) {
                    el.focus()
                    setTimeout(() => el.select());
                }
                else if(!this.focused && elFocused) {
                    el.blur();
                }
            });
        }

        if (filterValueCh) {
            this.filter.emit(this._filterValue);
        }

        if (oldState !== this._state.name && this._state.name !== S_IDLE) {
            this._onTouched();
        }
    }

    private emitNewItem(item: SabItem) {
        if (item && item.placeholder) {
            this.onNewItem.emit(item.value);
        }
    }

    private _reducer = this.reduce.bind(this);

    onClick = action(A_CLICK, this._reducer);
    onFocus = action(A_FOCUS, this._reducer);
    onBlur = action(A_BLUR, this._reducer);
    onFilter = action(A_FILTER_INPUT, this._reducer);
    onItems = action(A_ITEMS, this._reducer);

    onSelect(item: SabItem) {
        this.reduce({ type: A_SELECT, payload: item });
        this.emitNewItem(item);
    }

    onKeyDown(e) {
        switch (e.code) {
            case 'ArrowUp':
                this.reduce({ type: A_UP });
                break;
            case 'ArrowDown':
                this.reduce({ type: A_DOWN });
                break;
            case 'Escape':
                this.reduce({ type: A_BLUR });
                break;
        }
    }

    onKeyPress(e) {
        switch (e.code) {
            case 'Enter':
                const active = this.active;
                this.reduce({ type: A_SELECT_ACTIVE });
                this.emitNewItem(active);

                break;
        }
    }


    ///// ControlValueAccessor

    @HostListener('click')
    private _onTouched: Function = () => { };

    writeValue(obj: any): void {
        this.onSelect(obj);
    }

    registerOnChange(fn: any): void {
        if (this._valueSub) this._valueSub.unsubscribe();

        this._valueSub = this.valueChange.subscribe(x => fn(x));
    }

    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
