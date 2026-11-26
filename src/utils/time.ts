
export class Time {
    private _currTime = 0;
    // private _deltaTime = 0;

    set time(value: number) {
        this._currTime = value;
    }

    get time(): number {
        return this._currTime;
    }

    // set deltaTime(value: number) {
    //     this._deltaTime = value;
    // }

    // get deltaTime(): number {
    //     return this._deltaTime;
    // }

}

const timeRef = new Time();

export function getTime(): Time {
    return timeRef;
}



