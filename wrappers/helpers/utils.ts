import { DictionaryValue } from "ton-core";

export type PoolSlice = {
    isActive: number;
};

export const PoolValue: DictionaryValue<PoolSlice> = {
    serialize(src, builder) {
        builder.storeUint(src.isActive, 1);
    },

    parse() {
        return {
            isActive: 1
        }
    }
};