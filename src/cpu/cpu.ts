import { AccessMemoryFunc, ReadWriteEnum, instructionHandlers } from "./instructions.ts";

export function convertToSignedValue(value: number): number {
    return value >= 128 ? value - 256 : value;
}

export function clamp(num: number, min: number, max: number) {
    if(num > max) return max;
    if(num < min) return min;
    
    return num;
}

class CPU {
    private registers = {
        a: 0, x: 0, y: 0,
        pc: 0, sp: 0xFF
    };

    flags = {
        C: false,
        Z: false,
        I: false,
        D: false,
        B: false,
        V: false,
        N: false,
    };

    private mem: AccessMemoryFunc;
    private finishedInitiation: boolean;

    constructor(mem: AccessMemoryFunc) {
        this.finishedInitiation = false;
        this.mem = mem;
    }

    outputStats() {
        console.log('-- CPU STATS --');
        console.log(`Accumulator:     0x${this.registers.a.toString(16).toUpperCase().padStart(2, '0')}`);
        console.log(`X Index:         0x${this.registers.x.toString(16).toUpperCase().padStart(2, '0')}`);
        console.log(`Y Index:         0x${this.registers.y.toString(16).toUpperCase().padStart(2, '0')}`);
        console.log(`Stack Pointer:   0x${this.registers.sp.toString(16).toUpperCase().padStart(2, '0')}`);
        console.log(`Program Counter: 0x${this.registers.pc.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`Status Register: 0b${(this.getFlagWithBreak()).toString(2).padStart(8, '0')}`);
        console.log('-- CPU STATS --');
    }

    // Reading & Writing memory
    readByte(addr: number) {
        return this.mem(ReadWriteEnum.read, addr, -1);
    }

    writeByte(addr: number, data: number) {
        this.mem(ReadWriteEnum.write, addr, data);
    }

    readShort(addr: number) {
        const lo = this.readByte(addr);
        const hi = this.readByte(addr+1);

        return (hi << 8) + lo;
    }

    writeShort(addr: number, data: number) {
        const hi = data & 0xFF;
        const lo = data>>8;

        this.writeByte(addr, hi);
        this.writeByte(addr+1, lo);
    }

    fetch8() { this.registers.pc++; return this.readByte(this.registers.pc-1); }
    fetch16() { this.registers.pc+=2; return this.readShort(this.registers.pc-2); }

    private initiate() {
        // Emulate the reads & writes

        this.readByte(0x802E);
        this.readByte(0x802F);
        this.readByte(0x01B6);
        this.writeByte(0x01B6, 0x80);
        this.writeByte(0x01B5, 0x30);
        this.readByte(0x8030);
        this.readByte(0x8014);

        const lo = this.readByte(0xFFFC);
        const hi = this.readByte(0xFFFD);

        this.registers.pc = (hi << 8) + lo;
        this.flags.I = true;

        this.finishedInitiation = true;
    }

    protected execInstruction(inst: number) {
        const han = instructionHandlers[inst];
        let data = 0;

        if(!han) { throw new Error('Invalid opcode: ' + inst); }

        if(han.dataBytes == 1) {
            data = this.fetch8();
        } else if(han.dataBytes == 2) {
            data = this.fetch16();
        }

        han.func(this, data);
    }

    setRegister(reg: 'A' | 'X' | 'Y' | 'PC' | 'SP', val: number) {
        const pval = clamp(val, 0, 255);

        switch(reg) {
            case 'A':  this.registers.a  = pval; break;
            case 'X':  this.registers.x  = pval; break;
            case 'Y':  this.registers.y  = pval; break;
            case 'PC': this.registers.pc = pval; break;
            case 'SP': this.registers.sp = pval; break;
        }
    }

    getRegister(reg: 'A' | 'X' | 'Y' | 'PC' | 'SP'): number {
        switch(reg) {
            case 'A':  return this.registers.a; 
            case 'X':  return this.registers.x; 
            case 'Y':  return this.registers.y; 
            case 'PC': return this.registers.pc;
            case 'SP': return this.registers.sp;
        }
    }

    getRegisters() {
        return this.registers;
    }

    setFlagFromByte(byte: number) {
        if((byte &  1)  >= 1) this.flags.C = true;
        if((byte &  2)  >= 1) this.flags.Z = true;
        if((byte &  4)  >= 1) this.flags.I = true;
        if((byte &  8)  >= 1) this.flags.D = true;
        if((byte & 16)  >= 1) this.flags.B = true;
        if((byte & 64)  >= 1) this.flags.V = true;
        if((byte & 128) >= 1) this.flags.N = true;
    }

    getFlagWithBreak() {
                      // NV-BDIZC
        let flagByte = 0b00000000;

        if(this.flags.C) flagByte |= 1;
        if(this.flags.Z) flagByte |= 2;
        if(this.flags.I) flagByte |= 4;
        if(this.flags.D) flagByte |= 8;
        if(this.flags.V) flagByte |= 64;
        if(this.flags.N) flagByte |= 128;

        return flagByte
    }

    push8(val: number) {
        const f = clamp(val, 0, 255);

        this.writeByte(this.registers.sp+0x100, f);
        
        if(this.registers.sp == 0) this.registers.sp = 0xFF; // Stack overflow. Learn to actually make this realistic 🙏
        this.registers.sp--;
    }

    pop8(): number {
        this.registers.sp++;
        const f = this.readByte(this.registers.sp+0x100);
        this.writeByte(this.registers.sp, 0);
        return f;
    }

    push16(val: number) {
        const f = clamp(val, 0, 0xFFFF);
        
        const hi = f & 0xFF00 >> 8;
        const lo = f & 0xFF;

        // Hopefully this is right, documentation is hard to find 😭
        this.push8(lo);
        this.push8(hi);
    }

    pop16(): number {
        const hi = this.pop8();
        const lo = this.pop8();

        return (hi << 8) + lo;
    }

    reset() {
        this.finishedInitiation = false;
        this.registers = { a: 0, x: 0, y: 0, pc: 0, sp: 0xFF };
    }

    start() {
        if(!this.finishedInitiation) {
            this.initiate();
        }

        while(!this.flags.B) {
            const inst = this.fetch8();
            this.execInstruction(inst);

        }
    }
}

export { CPU };