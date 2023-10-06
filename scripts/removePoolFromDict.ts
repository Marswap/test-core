import { Address } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router';

export async function run(provider: NetworkProvider, args: string[]) {

    const routerAddress = Address.parse('')

    const router = provider.open(Router.createFromAddress(routerAddress));

    await router.sendRemovePoolFromDict(provider.sender(), {
        poolToRemove: Address.parse('EQA018oSqCM3dWh-IAaxRQbbX40OT2OGBvVtqFgLwZkLcNTJ') 
    });
}