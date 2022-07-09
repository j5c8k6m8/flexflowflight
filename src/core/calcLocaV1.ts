import { Size, ItemId, getCompassAxis } from "./astC0.ts"
import { Item } from "./astL4.ts"
import { ItemLoca } from "./astL5.ts"

// FILE ERROR ID = '31'
// deno-lint-ignore require-await
export const calcLoca = async (items: Item[]): Promise<ItemLoca[]> => {
    // FUNCTION ERROR ID = '01'
    const sizes: Size[] = [];
    getCalcSizeRecursive(0, items, sizes);
    const itemLocas: ItemLoca[] = [];
    const rootSize = sizes[0];
    itemLocas[0] = {
        itemId: 0,
        size: rootSize,
        coord: [0, 0],
    }
    getCalcItemCoordRecursive(0, items, sizes, itemLocas);
    return itemLocas;
}

const getCalcSizeRecursive = (itemId: ItemId, items: Item[], sizes: Size[]): Size => {
    // FUNCTION ERROR ID = '02'
    const item = items[itemId];
    const itemType = item.type;
    if (itemType === 'Cell') {
        const size = item.size;
        sizes[itemId] = size;
        return size;
    } else if (itemType === 'Road') {
        throw new Error(`[E310201] invalid unreachable code.`);
    } else if (itemType === 'Group' || itemType === 'Unit') {
        let maxMainItemWidth = 0;
        const size: Size = [0, 0];
        const compassAxis = getCompassAxis(item.compassItems);
        item.crossItems.forEach(eachCrossItem => {
            eachCrossItem.forEach(itemId => {
                const item = items[itemId];
                if (item.type !== 'Road') {
                    throw new Error(`[E310201] invalid unreachable code.`);
                }
                size[compassAxis[1]] += item.width;
            });
        });
        item.mainItems.forEach(itemId => {
            const item = items[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                size[compassAxis[0]] += item.width;
            } else if (itemType === 'Cell' || itemType === 'Group' || itemType === 'Unit') {
                const itemSize = getCalcSizeRecursive(item.itemId, items, sizes)
                size[compassAxis[0]] += itemSize[compassAxis[0]];
                if (maxMainItemWidth < itemSize[compassAxis[1]]) {
                    maxMainItemWidth = itemSize[compassAxis[1]];
                }
            } else {
                const _: never = itemType;
                return _;
            }
        });
        size[compassAxis[1]] += maxMainItemWidth;
        size[0] += (item.space[0] + item.space[2])
        size[1] += (item.space[1] + item.space[3])
        sizes[itemId] = size;
        item.mainItems.forEach(itemId => {
            const item = items[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                const mainItemSize: Size = [0, 0];
                mainItemSize[compassAxis[0]] = item.width;
                mainItemSize[compassAxis[1]] = maxMainItemWidth;
                sizes[itemId] = mainItemSize;
            } else if (itemType === 'Cell' || itemType === 'Group' || itemType === 'Unit') {
                // pass
            } else {
                const _: never = itemType;
                return _;
            }
        });
        item.crossItems.forEach(eachCrossItem => {
            eachCrossItem.forEach(itemId => {
                const item = items[itemId];
                if (item.type !== 'Road') {
                    throw new Error(`[E310201] invalid unreachable code.`);
                }
                const crossItemSize: Size = [0, 0];
                crossItemSize[compassAxis[0]] = size[compassAxis[0]];
                crossItemSize[compassAxis[1]] = item.width;
                sizes[itemId] = crossItemSize;
            });
        });
        return size;
    } else {
        const _: never = itemType;
        return _;
    }
}

const getCalcItemCoordRecursive = (itemId: ItemId, items: Item[], sizes: Size[], itemLocas: ItemLoca[]): void => {
    // FUNCTION ERROR ID = '03'
    const item = items[itemId];
    const itemType = item.type;
    if (itemType === 'Group' || itemType === 'Unit') {
        const compassAxis = getCompassAxis(item.compassItems);
        const mainCood = item.space[compassAxis[0]];
        let crossCood = item.space[compassAxis[1]];
        item.crossItems[0].forEach(itemId => {
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType !== 'Road') {
                throw new Error(`[E310201] invalid unreachable code.`);
            }
            itemLocas[itemId] = {
                itemId: itemId,
                size: size,
                coord: [mainCood, crossCood],
            }
            crossCood += size[compassAxis[1]];
        });
        let mainItemMainCood = mainCood;
        const mainItemCrossCood = crossCood;
        let maxMainItemWidth = 0;
        item.mainItems.forEach(itemId => {
            const size = sizes[itemId];
            if (maxMainItemWidth < size[compassAxis[1]]) {
                maxMainItemWidth = size[compassAxis[1]];
            }
        });
        crossCood += maxMainItemWidth;
        item.crossItems[1].forEach(itemId => {
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType !== 'Road') {
                throw new Error(`[E310201] invalid unreachable code.`);
            }
            itemLocas[itemId] = {
                itemId: itemId,
                size: size,
                coord: [mainCood, crossCood],
            }
            crossCood += size[compassAxis[1]];
        });
        item.mainItems.forEach(itemId => {
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [mainItemMainCood, mainItemCrossCood],
                }
                mainItemMainCood += size[compassAxis[0]];
            } else if (itemType === 'Cell') {
                let cellCrossCood;
                if (item.align === 'start') {
                    cellCrossCood = mainItemCrossCood;
                } else if (item.align === 'center') {
                    cellCrossCood = mainItemCrossCood + Math.floor((maxMainItemWidth - size[compassAxis[1]]) / 2);
                } else if (item.align === 'end') {
                    cellCrossCood = mainItemCrossCood + maxMainItemWidth - size[compassAxis[1]];
                } else {
                    const _: never = item.align;
                    return _;
                }
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [mainItemMainCood, cellCrossCood],
                }
                mainItemMainCood += size[compassAxis[0]];
            } else if (itemType === 'Group' || itemType === 'Unit') {
                let cellCrossCood;
                if (item.align === 'start') {
                    cellCrossCood = mainItemCrossCood;
                } else if (item.align === 'center') {
                    cellCrossCood = mainItemCrossCood + Math.floor((maxMainItemWidth - size[compassAxis[1]]) / 2);
                } else if (item.align === 'end') {
                    cellCrossCood = mainItemCrossCood + maxMainItemWidth - size[compassAxis[1]];
                } else {
                    const _: never = item.align;
                    return _;
                }
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [mainItemMainCood, cellCrossCood],
                }
                getCalcItemCoordRecursive(itemId, items, sizes, itemLocas);
                mainItemMainCood += size[compassAxis[0]];
            } else {
                const _: never = itemType;
                return _;
            }
        });
    } else if (itemType === 'Cell' || itemType === 'Road') {
        // pass
    } else {
        const _: never = itemType;
        return _;
    }
}