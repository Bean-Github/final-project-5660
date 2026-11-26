export class Time {
    private _currTime = 0;

    set time(value: number) {
        this._currTime = value;
    }

    get time(): number {
        return this._currTime;
    }
}

const timeRef = new Time();

export function getTime(): Time {
    return timeRef;
}
