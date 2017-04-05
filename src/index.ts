import { SabSelect, CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR } from './select.component';
import { SabOption } from './option.component';
import { SabTemplate } from './template.directive';
import { SabTemplateRef } from './template-ref.directive';

export * from './select.component';
export * from './template.directive';

export const SELECT_COMPONENTS = [
    SabSelect,
    SabOption,
    SabTemplateRef,
    SabTemplate
];

export const SELECT_PROVIDERS = [
    CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR
];
