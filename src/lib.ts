export function toBoolean(value: any): boolean {
    if (!value) {
        return false;
    }

    switch (typeof value) {
        case 'string':
            switch (<string>value.toLowerCase().trim()) {
                case '': case 'false': case 'no': case 'off': case '0':
                    return false;

                default:
                    return true;
            }

        default: return <boolean>new Boolean(value);
    }
}