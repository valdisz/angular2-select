export class SabItem {
    constructor(public value: any, public placeholder: boolean = false) {
    }
}

export function action(type, reducer) {
    return (payload?: any) => reducer({ type, payload });
}

export interface ItemsFilter {
    (item: SabItem): boolean;
}

export interface ItemsFilterFactory {
    (text: string, textGetter: TextGetter): ItemsFilter;
}

export interface TextGetter {
    (value: any): string;
}

export interface State {
    name: string;           // state name

    text: string;
    textGetter: TextGetter;

    autoAdd: boolean;
    items: SabItem[];       // all items

    selected?: SabItem;     // selected value
    active?: SabItem;       // active item index in expanded or filtering state

    filterValue: string;   // input text (for filtering)
    filtering: boolean;
    filter: ItemsFilterFactory;    // filter function
    filteredItems: SabItem[];   // filtereds items
}

export interface Action {
    type: string;
    payload?: any;
}

export const A_ITEMS         = 'ITEMS';         // set new items
export const A_BLUR          = 'BLUR';          // lost focus, deactivate control
export const A_FOCUS         = 'FOCUS';         // got focus, make control focused and editable
export const A_CLICK         = 'CLICK';         // click on expand button, FOCUS + expand items
export const A_SELECT        = 'SELECT';        // select item with mouse
export const A_SELECT_ACTIVE = 'SELECT-ACTIVE'; // select item with enter
export const A_FILTER        = 'FILTER';        // filtering function
export const A_FILTER_INPUT  = 'FILTER_INPUT';  // filtering input
export const A_UP            = 'UP';            // move up selection
export const A_DOWN          = 'DOWN';          // move down selection
export const A_FILTERING     = 'FILTERING';     // turns on/off internal filtering
export const A_ENABLE        = 'ENABLE';        //
export const A_DISABLE       = 'DISABLE';       //
export const A_AUTO_ADD      = 'AUTO_ADD';      //
export const A_TEXT_FIELD    = 'TEXT_FIELD';    //

export const S_IDLE          = 'IDLE';      // inactive
export const S_DISABLED      = 'DISABLED';  // disabled
export const S_FOCUSED       = 'FOCUSED';   // got focus
export const S_EXPANDED      = 'EXPANDED';  // epanded popover
export const S_FILTERING     = 'FILTERING'; // filtering items


///// filters

function identity() { return true; }

function idenityFilter(text: string, textGetter: TextGetter): ItemsFilter {
    return identity;
}

function defaultFilter(text: string, textGetter: TextGetter): ItemsFilter {
    return (item: SabItem) => {
        if (!text) return true;
        if (!item ) return false;

        const itemText = textGetter(item.value) || '';
        return itemText.toLowerCase().includes(text.toLowerCase())
    };
}

function textGetterFactory(field: string): TextGetter {
    return (value: any) => {
        if (!value) return null;
        const text = field ? value[field] : value;
        return text && text.toString();
    };
}

///// initial state

const INITIAL: State = {
    name: S_IDLE,
    autoAdd: false,
    text: null,
    textGetter: textGetterFactory(null),
    items: [],
    filtering: true,
    filterValue: null,
    filter: defaultFilter,
    filteredItems: []
};


///// action handlers

function applyFilter(state: State, filterValue: string): State {
    filterValue = filterValue === '' ? null : filterValue;

    // current active item
    let active = state.active;

    // current selected item
    let selected = state.selected;

    // new filtered items
    const filteredItems = state.items.filter(state.filter(filterValue, state.textGetter));
    if (!filteredItems.length && state.autoAdd) {
        filteredItems.push(new SabItem(filterValue, true));
    }

    active = filteredItems.indexOf(active) >= 0 ? active : null;
    if (!active && filteredItems.length) {
        // if active index is out of filtered items
        // and there are items
        // then select first item
        active = filteredItems[0];
    }

    // when text is empty, but item was selected, then nothin is selected
    if ((filterValue == null || filterValue == '') && selected)
    {
        selected = null;
        active = null;
    }

    return Object.assign({}, state, <State>{
        text: filterValue,
        filterValue,
        selected,
        filteredItems,
        active
    });
}

function moveUp(state: State): State {
    let active;
    if (state.filteredItems.length) {
        const items = state.filteredItems;

        const i = items.indexOf(state.active) - 1;
        active = items[Math.max(0, i)];
    }
    else {
        active = null;
    }

    return Object.assign({}, state, <State>{ active });
}

function moveDown(state: State, len: number): State {
    let active;
    if (state.filteredItems.length) {
        const items = state.filteredItems;

        const i = items.indexOf(state.active) + 1;
        active = items[Math.min(items.length - 1, i)];
    }
    else {
        active = null;
    }

    return Object.assign({}, state, <State>{ active });
}

function selectValue(state: State, value: SabItem|any): State {
    let items = state.items;
    let selected = findByValue(items, value);

    if (selected && selected.placeholder) {
        selected = null;
    }

    return Object.assign({}, state, <State>{
        name: S_IDLE,
        items,
        selected,
        active: null
    });
}

function selectActiveValue(state: State, items: any[]): State {
    return selectValue(state, state.active);
}

function goTo(state: State, name: string): State {
    return Object.assign({}, state, <State>{ name });
}

function activate(state: State, item: SabItem) {
    return Object.assign({}, state, <State>{ active: item });
}

function setAutoAdding(state: State, enabled: boolean) {
    return Object.assign({}, state, <State>{ autoAdd: enabled });
}

function setTextField(state: State, field: string) {
    return Object.assign({}, state, <State>{ textGetter: textGetterFactory(field) });
}

///// helpers

function valueToItem(value: SabItem|any): SabItem {
    return value instanceof SabItem ? value : new SabItem(value);
}

function findByValue(items: SabItem[], value: SabItem|any): SabItem {
    return value instanceof SabItem
        ? items.find(x => x.value === (<SabItem>value).value)
        : items.find(x => x.value === value);
}

///// states

function idle(state: State = INITIAL, { type, payload }: Action): State {
    switch (type) {
        case A_FOCUS:
            return Object.assign({}, state, <State>{
                name: S_FOCUSED,
                text: state.selected &&  state.textGetter(state.selected.value)
            });

        case A_CLICK:
            const text = state.selected && state.textGetter(state.selected.value)
            const filterValue = text === '' ? null : text;
            return Object.assign({}, state, <State>{
                name: S_EXPANDED,
                active: state.selected,
                text,
                filterValue
            });

        default:
            return state;
    }
}

function disabled(state: State = INITIAL, { type, payload }: Action): State {
    switch (type) {
        case A_ENABLE: return goTo(state, S_IDLE);
        default:
            return state;
    }
}

function focused(state: State = INITIAL, { type, payload }: Action): State {
    switch (type) {
        case A_CLICK:        return goTo(activate(state, state.selected), S_EXPANDED);
        case A_FILTER_INPUT: return goTo(applyFilter(state, payload), S_FILTERING);
        case A_BLUR:         return goTo(state, S_IDLE);
        case A_DOWN:
            const active = state.selected || (state.items.length && state.items[0]);
            return goTo(activate(state, active), S_EXPANDED);

        default:
            return state;
    }
}

function expanded(state: State = INITIAL, { type, payload }: Action): State {
    switch (type) {
        case A_UP:            return moveUp(state);
        case A_DOWN:          return moveDown(state, state.items.length);
        case A_SELECT_ACTIVE: return selectActiveValue(state, state.items);
        case A_BLUR:          return goTo(state, S_IDLE);
        case A_CLICK:         return goTo(state, S_FOCUSED);
        case A_FILTER_INPUT:  return goTo(applyFilter(state, payload), S_FILTERING);

        default:
            return state;
    }
}

function filtering(state: State = INITIAL, { type, payload }: Action): State {
    switch (type) {
        case A_FILTER_INPUT:  return applyFilter(state, payload);
        case A_UP:            return moveUp(state);
        case A_DOWN:          return moveDown(state, state.filteredItems.length);
        case A_BLUR:          return goTo(state, S_IDLE);
        case A_SELECT_ACTIVE: return selectActiveValue(state, state.filteredItems);
        default:
            return state;
    }
}

///// root reducer

export function reducer(state: State = INITIAL, action: Action): State {
    const { type, payload } = action;

    switch (type) {
        case A_SELECT:     return selectValue(state, payload);
        case A_DISABLE:    return goTo(state, S_DISABLED);
        case A_FILTERING:  return reducer(state, { type: A_FILTER, payload: payload ? defaultFilter : idenityFilter });
        case A_AUTO_ADD:   return setAutoAdding(state, payload);
        case A_TEXT_FIELD: return setTextField(state, payload);

        case A_FILTER: {
            let newState = Object.assign({}, state, <State>{ filter: payload });

            if (state.name == S_FILTERING) {
                newState = applyFilter(newState, state.filterValue);
            }

            return newState;
        }

        case A_ITEMS: {
            const items: SabItem[] = (<any[]>payload).map(valueToItem);
            let newState = Object.assign({}, state, <State>{ items });

            if (state.selected) {
                newState = selectValue(newState, newState.selected.value);
            }

            if (state.name == S_FILTERING) {
                newState = applyFilter(newState, state.filterValue);
            }
            else if (state.name == S_EXPANDED) {
                const active = state.active;
                const i = newState.items.indexOf(state.active);
                newState.active = i >= 0 ? newState.items[i] : null;
            }

            return newState;
        }

        default:
            switch (state.name) {
                case S_IDLE:      return idle(state, action);
                case S_DISABLED:  return disabled(state, action);
                case S_FOCUSED:   return focused(state, action);
                case S_EXPANDED:  return expanded(state, action);
                case S_FILTERING: return filtering(state, action);
                default:
                    return state;
            }
    }
}
