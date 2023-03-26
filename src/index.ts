import { readKeypress } from 'https://deno.land/x/keypress@0.0.10/mod.ts';
import { CPU6502, ReadWrite } from './cpu/index.ts';

const mem = new Uint8ClampedArray(0x10000).fill(0);

function accessMemory(rw: ReadWrite, addr: number, data?: number) {
    if(rw == ReadWrite.read) {
        return mem[addr];
    }

    mem[addr] = data as number;
}

const cpu = new CPU6502({ accessMemory });

cpu.reset();

for await(const key of readKeypress()) {
    console.log(key);

    if(key.ctrlKey && key.key == 'c') {
        cpu.pauseClock();
        break;
    }
}