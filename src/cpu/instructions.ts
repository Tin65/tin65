import { clamp, convertToSignedValue, CPU } from "./cpu.ts";


export const instructionHandlers: { [key: number]: InstructionHandler } = {
    // ARITHMETIC (ADDITION, SUBTRACTION)
    0x69: { name: 'ADC imm',     dataBytes: 1, func(cpu, data) { handleADC(cpu, data); }, },
    0x65: { name: 'ADC zpg',     dataBytes: 1, func(cpu, data) { handleADC(cpu, cpu.readByte(data)); }, },
    0x75: { name: 'ADC zpg,x',   dataBytes: 1, func(cpu, data) { handleADC(cpu, cpu.readByte(data+cpu.getRegister('X'))); }, },
    0x6D: { name: 'ADC abs',     dataBytes: 2, func(cpu, data) { handleADC(cpu, cpu.readByte(data)); }, },
    0x7D: { name: 'ADC abs,x',   dataBytes: 2, func(cpu, data) { handleADC(cpu, cpu.readByte(data+cpu.getRegister('X'))); }, },
    0x61: { name: 'ADC (ind,x)', dataBytes: 2, func(cpu, data) { handleADC(cpu, cpu.readByte(cpu.readByte(data+cpu.getRegister('X')))); }, },
    0x71: { name: 'ADC (ind),y', dataBytes: 1, func(cpu, data) { handleADC(cpu, cpu.readByte(cpu.readByte(data)+cpu.getRegister('Y'))); }, },

    0xE9: { name: 'SBC imm',     dataBytes: 1, func(cpu, data) { handleSBC(cpu, data); }, },
    0xE5: { name: 'SBC zpg',     dataBytes: 1, func(cpu, data) { handleSBC(cpu, cpu.readByte(data)); }, },
    0xF5: { name: 'SBC zpg,x',   dataBytes: 1, func(cpu, data) { handleSBC(cpu, cpu.readByte(data+cpu.getRegister('X'))); }, },
    0xED: { name: 'SBC abs',     dataBytes: 2, func(cpu, data) { handleSBC(cpu, cpu.readByte(data)); }, },
    0xFD: { name: 'SBC abs,x',   dataBytes: 2, func(cpu, data) { handleSBC(cpu, cpu.readByte(data+cpu.getRegister('X'))); }, },
    0xE1: { name: 'SBC (ind,x)', dataBytes: 2, func(cpu, data) { handleSBC(cpu, cpu.readByte(cpu.readByte(data+cpu.getRegister('X')))); }, },
    0xF1: { name: 'SBC (ind),y', dataBytes: 1, func(cpu, data) { handleSBC(cpu, cpu.readByte(cpu.readByte(data)+cpu.getRegister('Y'))); }, },

    // BITFIELD OPERATIONS
    0x29: { name: 'AND imm',     dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & data); updateFlagsForA(cpu); }, },
    0x25: { name: 'AND zpg',     dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0x35: { name: 'AND zpg,x',   dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(data+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0x2D: { name: 'AND abs',     dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0x3D: { name: 'AND abs,x',   dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(data+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0x39: { name: 'AND abs,y',   dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(data+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },
    0x21: { name: 'AND (ind,x)', dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(cpu.readByte(data+cpu.getRegister('X')))); updateFlagsForA(cpu); }, },
    0x31: { name: 'AND (ind),y', dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') & cpu.readByte(cpu.readByte(data)+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },
    0x0A: { name: 'ASL acc',     dataBytes: 0, func(cpu)        { if((cpu.getRegister('A') << 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.setRegister('A', cpu.getRegister('A') << 1); updateFlagsForA(cpu); }, },
    0x06: { name: 'ASL zpg',     dataBytes: 1, func(cpu, data)  { if((cpu.readByte(data) << 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data) << 1); updateFlagsForAddr(cpu, data); }, },
    0x16: { name: 'ASL zpg,x',   dataBytes: 1, func(cpu, data)  { if((cpu.readByte(data+cpu.getRegister('X')) << 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data+cpu.getRegister('X')) << 1); updateFlagsForAddr(cpu, data); }, },
    0x0E: { name: 'ASL abs',     dataBytes: 2, func(cpu, data)  { if((cpu.readByte(data) << 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data) << 1); updateFlagsForAddr(cpu, data); }, },
    0x1E: { name: 'ASL abs,x',   dataBytes: 2, func(cpu, data)  { if((cpu.readByte(data+cpu.getRegister('X')) << 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data+cpu.getRegister('X')) << 1); updateFlagsForAddr(cpu, data); }, },
    0x24: { name: 'BIT zpg',     dataBytes: 1, func(cpu, data)  { const byte = cpu.getRegister('A') & cpu.readByte(data); cpu.flags.N = (byte & 0x80) > 1; cpu.flags.V = (0x40 & byte) > 1; cpu.flags.Z = byte == 0; }, },
    0x2C: { name: 'BIT abs',     dataBytes: 2, func(cpu, data)  { const byte = cpu.getRegister('A') & cpu.readByte(data); cpu.flags.N = (byte & 0x80) > 1; cpu.flags.V = (0x40 & byte) > 1; cpu.flags.Z = byte == 0; }, },
    0x4A: { name: 'ASL acc',     dataBytes: 0, func(cpu)        { if((cpu.getRegister('A') >> 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.setRegister('A', cpu.getRegister('A') >> 1); updateFlagsForA(cpu); }, },
    0x46: { name: 'ASL zpg',     dataBytes: 1, func(cpu, data)  { if((cpu.readByte(data) >> 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data) >> 1); updateFlagsForAddr(cpu, data); }, },
    0x56: { name: 'ASL zpg,x',   dataBytes: 1, func(cpu, data)  { if((cpu.readByte(data+cpu.getRegister('X')) >> 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data+cpu.getRegister('X')) << 1); updateFlagsForAddr(cpu, data); }, },
    0x4E: { name: 'ASL abs',     dataBytes: 2, func(cpu, data)  { if((cpu.readByte(data) >> 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data) >> 1); updateFlagsForAddr(cpu, data); }, },
    0x5E: { name: 'ASL abs,x',   dataBytes: 2, func(cpu, data)  { if((cpu.readByte(data+cpu.getRegister('X')) >> 1 & 0x100) > 1) { cpu.flags.C = true; } cpu.writeByte(data, cpu.readByte(data+cpu.getRegister('X')) << 1); updateFlagsForAddr(cpu, data); }, },
    0x09: { name: 'ORA imm',     dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | data); updateFlagsForA(cpu); }, },
    0x05: { name: 'ORA zpg',     dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0x15: { name: 'ORA zpg,x',   dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(data+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0x0D: { name: 'ORA abs',     dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0x1D: { name: 'ORA abs,x',   dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(data+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0x19: { name: 'ORA abs,y',   dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(data+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },
    0x01: { name: 'ORA (ind,x)', dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(cpu.readByte(data+cpu.getRegister('X')))); updateFlagsForA(cpu); }, },
    0x11: { name: 'ORA (ind),y', dataBytes: 1, func(cpu, data)  { cpu.setRegister('A', cpu.getRegister('A') | cpu.readByte(cpu.readByte(data)+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },
    

    // JUMP INSTRUCTIONS
    0x4C: { name: 'JMP abs',     dataBytes: 2, func(cpu, param) { cpu.setRegister('PC', param); }, },
    0x6C: { name: 'JMP ind',     dataBytes: 2, func(cpu, param) { cpu.setRegister('PC', cpu.readShort(param));  }, },
    0x20: { name: 'JSR abs',     dataBytes: 2, func(cpu, param) { cpu.push16(cpu.getRegister('PC')); cpu.setRegister('PC', param) } },
    0x40: { name: 'RTI impl',    dataBytes: 0, func(cpu)        { cpu.setFlagFromByte(cpu.pop8()); cpu.setRegister('PC', cpu.pop16()); } },
    0x60: { name: 'RTS impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('PC', cpu.pop16()); } },

    // BRANCH INSTRUCTIONS
    0x90: { name: 'BCC rel',     dataBytes: 1, func(cpu, param) { if(!cpu.flags.C) { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0xB0: { name: 'BCS rel',     dataBytes: 1, func(cpu, param) { if(cpu.flags.C)  { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0xF0: { name: 'BEQ rel',     dataBytes: 1, func(cpu, param) { if(cpu.flags.Z)  { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0xD0: { name: 'BNE rel',     dataBytes: 1, func(cpu, param) { if(!cpu.flags.Z) { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0x30: { name: 'BMI rel',     dataBytes: 1, func(cpu, param) { if(cpu.flags.N)  { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0x10: { name: 'BPL rel',     dataBytes: 1, func(cpu, param) { if(!cpu.flags.N) { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0x50: { name: 'BVC rel',     dataBytes: 1, func(cpu, param) { if(!cpu.flags.V) { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },
    0x70: { name: 'BVS rel',     dataBytes: 1, func(cpu, param) { if(cpu.flags.V)  { cpu.setRegister('PC', cpu.getRegister('PC')+convertToSignedValue(param)); } } },

    // SET & CLEAR FLAGS
    0x38: { name: 'SEC impl',    dataBytes: 0, func(cpu)        { cpu.flags.C = true;  } },
    0x18: { name: 'CLC impl',    dataBytes: 0, func(cpu)        { cpu.flags.C = false; } },
    0xF8: { name: 'SED impl',    dataBytes: 0, func(cpu)        { cpu.flags.D = true;  } }, // Oh god. Please no-
    0xD8: { name: 'CLD impl',    dataBytes: 0, func(cpu)        { cpu.flags.D = false; } },
    0x78: { name: 'SEI impl',    dataBytes: 0, func(cpu)        { cpu.flags.I = true;  } },
    0x58: { name: 'CLI impl',    dataBytes: 0, func(cpu)        { cpu.flags.I = false; } },

    // COMPARE ACCUMULATOR
    0xC9: { name: 'CMP imm',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), param); } },
    0xC5: { name: 'CMP zpg',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(param)); } },
    0xD5: { name: 'CMP zpg,x',   dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(param+cpu.getRegister('X'))); } },
    0xCD: { name: 'CMP abs',     dataBytes: 2, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(param)); } },
    0xDD: { name: 'CMP abs,x',   dataBytes: 2, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(param+cpu.getRegister('X'))); } },
    0xD9: { name: 'CMP abs,y',   dataBytes: 2, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(param+cpu.getRegister('Y'))); } },
    0xC1: { name: 'CMP (ind,x)', dataBytes: 1, func(cpu, data)  { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(cpu.readByte(data+cpu.getRegister('X')))); }, },
    0xD1: { name: 'CMP (ind),y', dataBytes: 1, func(cpu, data)  { compareAndSetFlags(cpu, cpu.getRegister('A'), cpu.readByte(cpu.readByte(data)+cpu.getRegister('Y'))); }, },
    
    // COMPARE X
    0xE0: { name: 'CPX imm',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('X'), param); } },
    0xE4: { name: 'CPX zpg',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('X'), cpu.readByte(param)); } },
    0xEC: { name: 'CPX abs',     dataBytes: 2, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('X'), param); } },

    // COMPARE Y
    0xC0: { name: 'CPY imm',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('Y'), param); } },
    0xC4: { name: 'CPY zpg',     dataBytes: 1, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('Y'), cpu.readByte(param)); } },
    0xCC: { name: 'CPY abs',     dataBytes: 2, func(cpu, param) { compareAndSetFlags(cpu, cpu.getRegister('Y'), param); } },

    // INCREMENT & DECREMENT
    0xE6: { name: 'INC zpg',     dataBytes: 1, func(cpu, addr)  { cpu.writeByte(addr, cpu.readByte(addr)+1) }, },
    0xF6: { name: 'INC zpg,x',   dataBytes: 1, func(cpu, addr)  { cpu.writeByte(addr+cpu.getRegister('X'), cpu.readByte(addr)+1) }, },
    0xEE: { name: 'INC abs',     dataBytes: 2, func(cpu, addr)  { cpu.writeByte(addr, cpu.readByte(addr)+1) }, },
    0xFE: { name: 'INC abs,x',   dataBytes: 2, func(cpu, addr)  { cpu.writeByte(addr+cpu.getRegister('X'), cpu.readByte(addr)+1) }, },
    0xE8: { name: 'INX',         dataBytes: 0, func(cpu)        { cpu.setRegister('X', cpu.getRegister('X')+1); }, },
    0xC8: { name: 'INY',         dataBytes: 0, func(cpu)        { cpu.setRegister('Y', cpu.getRegister('Y')+1); }, },

    0xC6: { name: 'DEC zpg',     dataBytes: 1, func(cpu, addr)  { cpu.writeByte(addr, cpu.readByte(addr)-1) }, },
    0xD6: { name: 'DEC zpg,x',   dataBytes: 1, func(cpu, addr)  { cpu.writeByte(addr+cpu.getRegister('X'), cpu.readByte(addr)-1) }, },
    0xCE: { name: 'DEC abs',     dataBytes: 2, func(cpu, addr)  { cpu.writeByte(addr, cpu.readByte(addr)-1) }, },
    0xDE: { name: 'DEC abs,x',   dataBytes: 2, func(cpu, addr)  { cpu.writeByte(addr+cpu.getRegister('X'), cpu.readByte(addr)-1) }, },
    0xCA: { name: 'DEX',         dataBytes: 0, func(cpu)        { cpu.setRegister('X', cpu.getRegister('X')-1); }, },
    0x88: { name: 'DEY',         dataBytes: 0, func(cpu)        { cpu.setRegister('Y', cpu.getRegister('Y')-1); }, },

    // XOR ACCUMULATOR
    0x49: { name: 'EOR imm',     dataBytes: 1, func(cpu, param) { accumulatorXOR(cpu, param); } },
    0x45: { name: 'EOR zpg',     dataBytes: 1, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(param)); } },
    0x55: { name: 'EOR zpg,x',   dataBytes: 1, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(param+cpu.getRegister('X'))); } },
    0x4D: { name: 'EOR abs',     dataBytes: 2, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(param)); } },
    0x5D: { name: 'EOR abs,x',   dataBytes: 2, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(param+cpu.getRegister('X'))); } },
    0x59: { name: 'EOR abs,y',   dataBytes: 2, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(param+cpu.getRegister('Y'))); } },
    0x41: { name: 'EOR (ind,x)', dataBytes: 1, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(cpu.readByte(param+cpu.getRegister('X')))); }, },
    0x51: { name: 'EOR (ind),y', dataBytes: 1, func(cpu, param) { accumulatorXOR(cpu, cpu.readByte(cpu.readByte(param)+cpu.getRegister('Y'))); }, },

    // PUSH & PULL INSTRUCTIONS
    0x48: { name: 'PHA impl',    dataBytes: 0, func(cpu)        { cpu.push8(cpu.getRegister('A')); } },
    0x08: { name: 'PHP impl',    dataBytes: 0, func(cpu)        { cpu.push8(cpu.getFlagWithBreak()); } },
    0x68: { name: 'PLA impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('A', cpu.pop8()); } },
    0x28: { name: 'PLP impl',    dataBytes: 0, func(cpu)        { cpu.setFlagFromByte(cpu.pop8()); } },
    
    // ROTATE BIT INSTRUCTIONS
    0x2A: { name: 'ROL acc',     dataBytes: 0, func(cpu)        { cpu.setRegister('A', rollLeft(cpu.getRegister('A'))); } },
    0x26: { name: 'ROL zpg',     dataBytes: 1, func(cpu, param) { cpu.setRegister('A', rollLeft(cpu.readByte(param))); } },
    0x36: { name: 'ROL zpg,x',   dataBytes: 1, func(cpu, param) { cpu.setRegister('A', rollLeft(cpu.readByte(param+cpu.getRegister('X')))); } },
    0x2E: { name: 'ROL abs',     dataBytes: 2, func(cpu, param) { cpu.setRegister('A', rollLeft(cpu.readByte(param))); } },
    0x3E: { name: 'ROL abs,x',   dataBytes: 2, func(cpu, param) { cpu.setRegister('A', rollLeft(cpu.readByte(param+cpu.getRegister('X')))); } },

    0x6A: { name: 'ROR acc',     dataBytes: 0, func(cpu)        { cpu.setRegister('A', rollRight(cpu.getRegister('A'))); } },
    0x66: { name: 'ROR zpg',     dataBytes: 1, func(cpu, param) { cpu.setRegister('A', rollRight(cpu.readByte(param))); } },
    0x76: { name: 'ROR zpg,x',   dataBytes: 1, func(cpu, param) { cpu.setRegister('A', rollRight(cpu.readByte(param+cpu.getRegister('X')))); } },
    0x6E: { name: 'ROR abs',     dataBytes: 2, func(cpu, param) { cpu.setRegister('A', rollRight(cpu.readByte(param))); } },
    0x7E: { name: 'ROR abs,x',   dataBytes: 2, func(cpu, param) { cpu.setRegister('A', rollRight(cpu.readByte(param+cpu.getRegister('X')))); } },

    // LOAD ACCUMULATOR
    0xA9: { name: 'LDA #',       dataBytes: 1, func(cpu, param) { cpu.setRegister('A', param); updateFlagsForA(cpu); }, },
    0xA5: { name: 'LDA zpg',     dataBytes: 1, func(cpu)        { cpu.setRegister('A', cpu.readByte(cpu.fetch8())); updateFlagsForA(cpu); }, },
    0xB5: { name: 'LDA zpg,x',   dataBytes: 1, func(cpu, val)   { cpu.setRegister('A', cpu.readByte(val+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0xAD: { name: 'LDA abs',     dataBytes: 2, func(cpu, data)  { cpu.setRegister('A', cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0xBD: { name: 'LDA abs,x',   dataBytes: 2, func(cpu)        { cpu.setRegister('A', cpu.readByte(cpu.fetch16()+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0xB9: { name: 'LDA abs,y',   dataBytes: 2, func(cpu)        { cpu.setRegister('A', cpu.readByte(cpu.fetch16())); updateFlagsForA(cpu); }, },
    0xA1: { name: 'LDA (ind,x)', dataBytes: 1, func(cpu, val)   { cpu.setRegister('A', cpu.readByte(cpu.readByte(val+cpu.getRegister('X')))); updateFlagsForA(cpu); }, },
    0xB1: { name: 'LDA (ind),y', dataBytes: 1, func(cpu, val)   { cpu.setRegister('A', cpu.readByte(cpu.readByte(val)+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },

    // LOAD X
    0xA2: { name: 'LDX #',       dataBytes: 1, func(cpu, param) { cpu.setRegister('X', param); updateFlagsForA(cpu); }, },
    0xA6: { name: 'LDX zpg',     dataBytes: 1, func(cpu)        { cpu.setRegister('X', cpu.readByte(cpu.fetch8())); updateFlagsForA(cpu); }, },
    0xB6: { name: 'LDX zpg,y',   dataBytes: 1, func(cpu, val)   { cpu.setRegister('X', cpu.readByte(val+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },
    0xAE: { name: 'LDX abs',     dataBytes: 2, func(cpu, data)  { cpu.setRegister('X', cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0xBE: { name: 'LDX abs,y',   dataBytes: 2, func(cpu)        { cpu.setRegister('X', cpu.readByte(cpu.fetch16()+cpu.getRegister('Y'))); updateFlagsForA(cpu); }, },

    // LOAD Y
    0xA0: { name: 'LDY #',       dataBytes: 1, func(cpu, param) { cpu.setRegister('Y', param); updateFlagsForA(cpu); }, },
    0xA4: { name: 'LDY zpg',     dataBytes: 1, func(cpu)        { cpu.setRegister('Y', cpu.readByte(cpu.fetch8())); updateFlagsForA(cpu); }, },
    0xB4: { name: 'LDY zpg,x',   dataBytes: 1, func(cpu, val)   { cpu.setRegister('Y', cpu.readByte(val+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },
    0xAC: { name: 'LDY abs',     dataBytes: 2, func(cpu, data)  { cpu.setRegister('Y', cpu.readByte(data)); updateFlagsForA(cpu); }, },
    0xBC: { name: 'LDY abs,x',   dataBytes: 2, func(cpu)        { cpu.setRegister('Y', cpu.readByte(cpu.fetch16()+cpu.getRegister('X'))); updateFlagsForA(cpu); }, },

    // STORE ACCUMULATOR
    0x85: { name: 'STA zpg',     dataBytes: 1, func(cpu, param) { cpu.writeByte(param, cpu.getRegister('A')); }, },
    0x8D: { name: 'STA abs',     dataBytes: 2, func(cpu, param) { cpu.writeByte(param, cpu.getRegister('A')); }, },
    0x95: { name: 'STA zpg,x',   dataBytes: 1, func(cpu, param) { cpu.writeByte(param + cpu.getRegister('X'), cpu.getRegister('A')); }, },
    0x9D: { name: 'STA abs,x',   dataBytes: 2, func(cpu, param) { cpu.writeByte(param + cpu.getRegister('X'), cpu.getRegister('A')); }, },
    0x81: { name: 'STA (ind,x)', dataBytes: 1, func(cpu, val)   { cpu.writeByte(cpu.readByte(cpu.readByte(val+cpu.getRegister('X'))), cpu.getRegister('A')); }, },
    0x91: { name: 'STA (ind),y', dataBytes: 1, func(cpu, val)   { cpu.writeByte(cpu.readByte(cpu.readByte(val)+cpu.getRegister('Y')), cpu.getRegister('A')); }, },

    // TRANSFER DATA TO PLACES
    0xAA: { name: 'TAX impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('X',  cpu.getRegister('A'));  } },
    0xA8: { name: 'TAY impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('Y',  cpu.getRegister('A'));  } },
    0xBA: { name: 'TSX impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('X',  cpu.getRegister('SP')); } },
    0x8A: { name: 'TXA impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('A',  cpu.getRegister('X'));  } },
    0x9A: { name: 'TXS impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('SP', cpu.getRegister('X'));  } },
    0x98: { name: 'TYA impl',    dataBytes: 0, func(cpu)        { cpu.setRegister('A',  cpu.getRegister('Y'));  } },

    // RANDOM/MISC
    0xEA: { name: 'NOP', dataBytes: 0, func() {}, },
    0x00: { name: 'BRK', dataBytes: 1, func(cpu) { cpu.flags.B = true; }, }, // Need to finish implementhing this!!!
};

enum ProcessorStatusBits {
    negative    = 0b10000000,
    overflow    = 0b01000000,
    const       = 0b00100000,
    brk         = 0b00010000,
    decimalMode = 0b00001000,
    disableIrqb = 0b00000100,
    zero        = 0b00000010,
    carry       = 0b00000001,
}

enum ReadWriteEnum {
    read  = 'READ',
    write = 'WRITE'
}

type AccessMemoryFunc = (
    readWrite: ReadWriteEnum,
    address: number,
    value: number
) => number;

interface InstructionHandler {
    name: string;
    dataBytes: 0 | 1 | 2;
    func: (cpu: CPU, param: number) => void
}

export type AddressingModeLabel =
  | "#"
  | "a"
  | "zp"
  | "zp,x"
  | "zp,y"
  | "abs"
  | "abs,x"
  | "abs,y"
  | "(ind,x)"
  | "(ind),y";

export { ReadWriteEnum, ProcessorStatusBits };
export type { AccessMemoryFunc };

/**
 * @param cpu The CPU object
 * @param data The data to compare with the Accumulator
 */
function compareAndSetFlags(cpu: CPU, dataOne: number, dataTwo: number) {
    
    cpu.flags.Z = (dataOne-dataTwo == 0);
    cpu.flags.N = (dataOne-dataTwo < 0);
    // @TODO make the carry flag work. No clue how it does do stuff though 😭😭
}

function updateFlagsForA(cpu: CPU) {
    cpu.flags.Z = (cpu.getRegister('A') == 0);
    cpu.flags.N = (cpu.getRegister('A') & 0x80) > 0;
}

function updateFlagsForAddr(cpu: CPU, addr: number) {
    const data = cpu.readByte(addr);

    cpu.flags.Z = (data == 0);
    cpu.flags.N = (data & 0x80) > 0;
}

function accumulatorXOR(cpu: CPU, num: number) {
    cpu.setRegister('A', cpu.getRegister('A') ^ num);
    updateFlagsForA(cpu);
}

function handleADC(cpu: CPU, num: number) {
    cpu.setRegister('A', clamp(cpu.getRegister('A') + num, 0, 255));

    cpu.flags.Z = (cpu.getRegister('A') == 0);
    cpu.flags.N = (cpu.getRegister('A') & 0x80) > 0;
    
    if((num + cpu.getRegister('A')) >= 256) { cpu.flags.C = true; }
    if((num + cpu.getRegister('A')) >= 128) { cpu.flags.V = true; }
}

function handleSBC(cpu: CPU, num: number) {
    cpu.setRegister('A', clamp(cpu.getRegister('A') - num, 0, 255));

    cpu.flags.Z = (cpu.getRegister('A') == 0);
    cpu.flags.N = (cpu.getRegister('A') & 0x80) > 0;
    
    if((num + cpu.getRegister('A')) >= 256) { cpu.flags.C = true; }
    if((num + cpu.getRegister('A')) >= 128) { cpu.flags.V = true; }
}

function rollLeft(val: number) {
    return (val << 1)|(val >> (8 - 1));
}

function rollRight(val: number) {
    return (val >> 1)|(val << (8 - 1));
}