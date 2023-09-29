import { Address } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { LpAccount } from '../wrappers/LpAccount';

export async function run(provider: NetworkProvider, args: string[]) {
    
    const lpAccountAddress = Address.parse('EQCHuNaHCGxHoyasSprEbhKQbPboCXhjVOE7fnIYYQIyShnW');

    const lpAccount = provider.open(LpAccount.createFromAddress(lpAccountAddress));

    await lpAccount.sendRefundLiquidity(provider.sender());
}