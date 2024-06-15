
import { ReturnType } from '../off-chain/types';

// Execution Cost Report
export function generateReport (result: ReturnType[]) {

    console.log("Transaction Name     | CPU             | MEM         | FEE       ");
    console.log("-----------------------------------------------------------------");
    
    result.forEach((value) => {

        const name = value.txName.padEnd(20, ' ');
        const c = value.cpu?value.cpu.toLocaleString():'';
        const cpu = c.padEnd(15, ' ');
        const m = value.mem?value.mem.toLocaleString():'';
        const mem = m.padEnd(11, ' ');
        const fee = value.fee?.toLocaleString();
        
        console.log(`${name} | ${cpu} | ${mem} | ${fee} `)
    })
}